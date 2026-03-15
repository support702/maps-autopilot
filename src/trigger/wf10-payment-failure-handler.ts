import { task } from "@trigger.dev/sdk";
import { query } from "../lib/db";
import { sendEmail } from "../lib/email";

interface PaymentFailurePayload {
  customer_id: string;
  failure_reason?: string;
  invoice_id?: string;
}

export const wf10PaymentFailureHandler = task({
  id: "wf10-payment-failure-handler",
  retry: { maxAttempts: 2 },
  run: async (rawPayload: PaymentFailurePayload) => {
    // Unwrap payload if wrapped by proxy, or use directly if already unwrapped
    const payload: PaymentFailurePayload = rawPayload.customer_id || rawPayload.invoice_id
      ? rawPayload
      : ((rawPayload as any).payload || rawPayload);

    const { rows: [client] } = await query(
      "SELECT * FROM clients WHERE stripe_customer_id = $1",
      [payload.customer_id]
    );
    if (!client) {
      console.error(`No client found for Stripe customer: ${payload.customer_id}`);
      return { success: false, error: "Client not found" };
    }

    // Increment failed count
    const newCount = (client.failed_payment_count || 0) + 1;
    await query(
      "UPDATE clients SET failed_payment_count = $1 WHERE client_id = $2",
      [newCount, client.client_id]
    );

    if (newCount === 1) {
      // Gentle reminder
      try {
        await sendEmail(
          client.email || "tom@haildentpro.com",
          `Payment Update Needed — ${client.business_name}`,
          `<p>Hi ${client.owner_name || client.name},</p>
           <p>We noticed your recent payment for Maps Autopilot didn't go through. This is usually a simple card issue.</p>
           <p>Please update your payment method at your earliest convenience.</p>
           <p>If you have any questions, reply to this email.</p>`
        );
      } catch {
        console.error("Failed to send payment reminder");
      }
    } else if (newCount === 2) {
      // Email AM to call client
      try {
        await sendEmail(
          "tom@haildentpro.com",
          `⚠️ 2nd Payment Failure: ${client.business_name}`,
          `<p><strong>${client.business_name}</strong> has failed payment 2 times.</p>
           <p>Reason: ${payload.failure_reason || "unknown"}</p>
           <p>Please call the client to resolve.</p>
           <p>Phone: ${client.phone || "N/A"}</p>`
        );
      } catch {
        console.error("Failed to send AM payment alert");
      }
    } else if (newCount >= 3) {
      // Pause account
      await query(
        "UPDATE clients SET status = 'paused', payment_status = 'past_due' WHERE client_id = $1",
        [client.client_id]
      );

      try {
        await sendEmail(
          "tom@haildentpro.com",
          `🚨 Account Paused: ${client.business_name} (${newCount} failures)`,
          `<p><strong>${client.business_name}</strong> has been paused after ${newCount} payment failures.</p>
           <p>Reason: ${payload.failure_reason || "unknown"}</p>
           <p>All automated workflows have been suspended.</p>`
        );
      } catch {
        console.error("Failed to send pause notification");
      }
    }

    return { success: true, client_id: client.client_id, failed_count: newCount };
  },
});
