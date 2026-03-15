import { task } from "@trigger.dev/sdk";
import { query } from "../lib/db";
import { sendSMS } from "../lib/ghl";
import { wf25cNpsHandler } from "./wf25c-nps-handler";

interface BatchPayload {
  client_id: string;
  customers: Array<{ name: string; phone: string }>;
}

export const wf25bBatchProcessor = task({
  id: "wf25b-batch-processor",
  retry: { maxAttempts: 2 },
  run: async (payload: BatchPayload) => {
    const { rows: [client] } = await query(
      `SELECT c.*, nc.review_platforms FROM clients c
       LEFT JOIN niche_configs nc ON c.niche_key = nc.niche_key
       WHERE c.client_id = $1`,
      [payload.client_id]
    );
    if (!client) throw new Error(`Client not found: ${payload.client_id}`);

    let processed = 0;
    let skipped = 0;

    for (const customer of payload.customers) {
      // Deduplication check
      const { rows: existing } = await query(
        `SELECT id FROM review_requests
         WHERE client_id = $1 AND customer_phone = $2
         AND created_at > CURRENT_DATE`,
        [payload.client_id, customer.phone]
      );
      if (existing.length > 0) {
        skipped++;
        continue;
      }

      // Insert into review_requests
      const { rows: [request] } = await query(
        `INSERT INTO review_requests (client_id, customer_name, customer_phone, status, created_at)
         VALUES ($1, $2, $3, 'pending', NOW()) RETURNING id`,
        [payload.client_id, customer.name, customer.phone]
      );

      // Trigger WF25c with 2-hour delay
      await wf25cNpsHandler.trigger(
        {
          review_request_id: request.id,
          client_id: client.client_id,
          customer_name: customer.name,
          customer_phone: customer.phone,
          business_name: client.business_name,
          service_area: client.service_area || client.city || "",
          review_platform_urls: client.review_platform_urls || {},
          google_review_url: client.google_review_url || "",
          niche_key: client.niche_key,
        },
        { delay: "2h" }
      );

      processed++;
    }

    // Send confirmation to owner via SMS
    if (client.ghl_contact_id && processed > 0) {
      try {
        await sendSMS(
          client.ghl_contact_id,
          `Got it! ${processed} customer${processed > 1 ? "s" : ""} submitted. They'll each get a review request in about 2 hours. Thanks for keeping up the momentum!`
        );
      } catch {
        console.error("Failed to send owner confirmation SMS");
      }
    }

    // Log batch submission
    await query(
      `INSERT INTO system_alerts (alert_type, severity, source_workflow, affected_client_id, message)
       VALUES ('batch_review_submitted', 'info', 'wf25b', $1, $2)`,
      [payload.client_id, `${processed} customers submitted, ${skipped} skipped (duplicates)`]
    );

    return { processed, skipped, client_id: payload.client_id };
  },
});
