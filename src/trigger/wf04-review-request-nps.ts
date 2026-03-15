import { task } from "@trigger.dev/sdk";
import { query } from "../lib/db";
import { sendSMS } from "../lib/ghl";
import { sendEmail } from "../lib/email";

interface ReviewRequestPayload {
  [key: string]: unknown;
}

export const wf04ReviewRequestNps = task({
  id: "wf04-review-request-nps",
  retry: { maxAttempts: 2 },
  run: async (rawPayload: ReviewRequestPayload) => {
    // Unwrap payload if wrapped by proxy, or use directly if already unwrapped
    const payload: ReviewRequestPayload =
      (rawPayload as any)["Client ID"] || (rawPayload as any).client_id || (rawPayload as any).customer_name
        ? rawPayload
        : ((rawPayload as any).payload || rawPayload);

    // === GHL Field Mapping (normalize webhook field names) ===
    const clientId =
      (payload["Client ID"] as string) ||
      (payload["client_id"] as string) ||
      "";
    const customerName =
      (payload["Customer Name"] as string) ||
      (payload["Full Name"] as string) ||
      (payload["customer_name"] as string) ||
      "";
    const customerPhone =
      (payload["Customer Phone"] as string) ||
      (payload["Phone"] as string) ||
      (payload["customer_phone"] as string) ||
      "";
    const ghlContactId =
      (payload["contact_id"] as string) ||
      (payload["Contact ID"] as string) ||
      (payload["ghl_contact_id"] as string) ||
      "";

    if (!clientId) {
      throw new Error("Missing client_id in review request payload");
    }

    const { rows: [client] } = await query(
      `SELECT c.*, nc.review_platforms FROM clients c
       JOIN niche_configs nc ON c.niche_key = nc.niche_key
       WHERE c.client_id = $1`,
      [clientId]
    );
    if (!client) throw new Error(`Client not found: ${clientId}`);

    // Log request
    const { rows: [request] } = await query(
      `INSERT INTO review_requests (client_id, customer_name, customer_phone, status)
       VALUES ($1, $2, $3, 'pending') RETURNING id`,
      [clientId, customerName, customerPhone]
    );

    // Send NPS text via GHL
    if (ghlContactId) {
      const npsMessage = `Hi ${customerName}! Thanks for visiting ${client.business_name}. How was your experience? Reply with a number 1-5 (5 = amazing, 1 = needs work)`;
      try {
        await sendSMS(ghlContactId, npsMessage);
        await query(
          "UPDATE review_requests SET status = 'nps_sent' WHERE id = $1",
          [request.id]
        );
      } catch (err) {
        console.error("SMS send failed:", err);
      }
    }

    return { success: true, review_request_id: request.id };
  },
});

// NPS Reply webhook handler
export const wf04NpsReplyHandler = task({
  id: "wf04-nps-reply-handler",
  run: async (payload: {
    review_request_id: number;
    nps_score: number;
    contact_id: string;
  }) => {
    const { rows: [request] } = await query(
      "SELECT * FROM review_requests WHERE id = $1",
      [payload.review_request_id]
    );
    if (!request) throw new Error("Review request not found");

    const { rows: [client] } = await query(
      "SELECT * FROM clients WHERE client_id = $1",
      [request.client_id]
    );

    const rating = payload.nps_score;

    if (rating >= 4) {
      // Determine platform by rotation
      const platforms = client.review_platform_urls || {};
      const rand = Math.floor(Math.random() * 100) + 1;
      let platform = "google";
      let link = client.google_review_url || "";

      if (rand <= 70 && platforms.google) {
        platform = "google";
        link = platforms.google;
      } else if (rand <= 85 && platforms.yelp) {
        platform = "yelp";
        link = platforms.yelp;
      } else if (rand <= 95 && platforms.bbb) {
        platform = "bbb";
        link = platforms.bbb;
      }

      await sendSMS(
        payload.contact_id,
        `Thank you! We'd really appreciate a quick review — it helps other people in ${client.service_area || client.city || ""} find ${client.business_name}. ${link}`
      );

      await query(
        `UPDATE review_requests SET nps_score = $1, routed_to = 'public_review',
         target_platform = $2, review_link = $3, status = 'review_sent' WHERE id = $4`,
        [rating, platform, link, payload.review_request_id]
      );
    } else {
      // Negative — capture privately
      await sendSMS(
        payload.contact_id,
        "We're sorry to hear that. What could we have done better? Your feedback stays private and helps us improve."
      );

      try {
        await sendEmail(
          "tom@haildentpro.com",
          `⚠️ Negative NPS — ${client.business_name} (${rating}⭐)`,
          `<p>Negative feedback from ${request.customer_name} for ${client.business_name}.</p>
           <p>Rating: ${rating}/5</p>
           <p>Phone: ${request.customer_phone}</p>
           <p>Follow up with the client.</p>`
        );
      } catch {
        console.error("Failed to send negative NPS alert email");
      }

      await query(
        `UPDATE review_requests SET nps_score = $1, routed_to = 'private_feedback',
         status = 'negative_captured' WHERE id = $2`,
        [rating, payload.review_request_id]
      );
    }

    return { success: true, rating, routed_to: rating >= 4 ? "public_review" : "private_feedback" };
  },
});
