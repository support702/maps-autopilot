import { task } from "@trigger.dev/sdk";
import { query } from "../lib/db";
import { sendEmail } from "../lib/email";
import { wf25aDailyOwnerReminder } from "./wf25a-daily-owner-reminder";
import { wf25bBatchProcessor } from "./wf25b-batch-processor";

interface BatchWebhookPayload {
  client_id?: string;
  customers?: Array<{ name: string; phone: string }> | string;
  [key: string]: unknown;
}

// Cron trigger — daily at 6PM CT (schedule via Trigger.dev dashboard)
export const wf25BatchReviewCron = task({
  id: "wf25-batch-review-cron",
  run: async (_payload: Record<string, unknown>) => {
    // Trigger daily owner reminders
    await wf25aDailyOwnerReminder.trigger({});

    return { success: true, triggered: "wf25a-daily-owner-reminder" };
  },
});

// Webhook trigger — batch review submission
export const wf25BatchReviewWebhook = task({
  id: "wf25-batch-review-webhook",
  retry: { maxAttempts: 2 },
  run: async (rawPayload: BatchWebhookPayload) => {
    // Unwrap payload if wrapped by proxy, or use directly if already unwrapped
    const payload: BatchWebhookPayload = rawPayload.client_id || rawPayload.customers
      ? rawPayload
      : ((rawPayload as any).payload || rawPayload);

    // === GHL Field Mapping (normalize webhook field names) ===
    const clientId = (payload["Client ID"] || payload.client_id || "") as string;

    // Customers may arrive as JSON string from GHL or as a proper array
    let rawCustomers: unknown = payload["Customers"] || payload.customers;
    if (typeof rawCustomers === "string") {
      try {
        rawCustomers = JSON.parse(rawCustomers);
      } catch {
        rawCustomers = [];
      }
    }
    const customers: Array<{ name: string; phone: string }> = Array.isArray(rawCustomers)
      ? rawCustomers.map((c: Record<string, unknown>) => ({
          name: ((c["Customer Name"] || c.name || "") as string),
          phone: ((c["Customer Phone"] || c.phone || "") as string),
        }))
      : [];

    if (!clientId || !customers.length) {
      throw new Error("Invalid payload: client_id and customers required");
    }

    // Validate client exists
    const { rows: [client] } = await query(
      "SELECT * FROM clients WHERE client_id = $1 AND status = 'active'",
      [clientId]
    );
    if (!client) throw new Error(`Active client not found: ${clientId}`);

    // Trigger batch processor
    await wf25bBatchProcessor.trigger({
      client_id: clientId,
      customers: customers,
    });

    return {
      success: true,
      client_id: clientId,
      customers_submitted: customers.length,
    };
  },
});

// End-of-day digest (schedule via Trigger.dev dashboard)
export const wf25DailyDigest = task({
  id: "wf25-daily-digest",
  run: async (_payload: Record<string, unknown>) => {
    const today = new Date().toISOString().split("T")[0];

    const { rows: submissions } = await query(
      `SELECT c.business_name, COUNT(rr.id) as submitted,
              SUM(CASE WHEN rr.status = 'nps_sent' THEN 1 ELSE 0 END) as nps_sent,
              SUM(CASE WHEN rr.status = 'review_sent' THEN 1 ELSE 0 END) as reviews
       FROM review_requests rr
       JOIN clients c ON rr.client_id = c.client_id
       WHERE rr.created_at::date = $1::date
       GROUP BY c.business_name`,
      [today]
    );

    // Find clients with zero submissions
    const { rows: activeClients } = await query(
      "SELECT business_name, client_id FROM clients WHERE status = 'active' AND nps_routing_active = true"
    );
    const submittedClients = submissions.map((s) => s.business_name);
    const inactiveClients = activeClients
      .filter((c) => !submittedClients.includes(c.business_name))
      .map((c) => c.business_name);

    const totalSubmitted = submissions.reduce((s, r) => s + Number(r.submitted), 0);
    const totalNps = submissions.reduce((s, r) => s + Number(r.nps_sent), 0);
    const totalReviews = submissions.reduce((s, r) => s + Number(r.reviews), 0);

    if (submissions.length > 0 || inactiveClients.length > 0) {
      try {
        await sendEmail(
          "tom@haildentpro.com",
          `Daily Review Summary — ${today}`,
          `<h2>Daily Review Request Summary — ${today}</h2>
           <table border="1" cellpadding="6" cellspacing="0">
             <tr><th>Client</th><th>Submitted</th><th>NPS Sent</th><th>Reviews</th></tr>
             ${submissions.map((s) => `<tr><td>${s.business_name}</td><td>${s.submitted}</td><td>${s.nps_sent}</td><td>${s.reviews}</td></tr>`).join("")}
           </table>
           <p><strong>TOTAL:</strong> ${totalSubmitted} submitted | ${totalNps} NPS sent | ${totalReviews} reviews posted</p>
           ${inactiveClients.length > 0 ? `<p>⚠️ <strong>Clients with ZERO submissions today:</strong> ${inactiveClients.join(", ")}</p>` : ""}`
        );
      } catch {
        console.error("Failed to send daily digest");
      }
    }

    return { submissions: submissions.length, inactive: inactiveClients.length };
  },
});
