import { task } from "@trigger.dev/sdk";
import { query } from "../lib/db";
import { sendSMS, createContact } from "../lib/ghl";
import { sendEmail } from "../lib/email";

interface NpsPayload {
  review_request_id: number;
  client_id: string;
  customer_name: string;
  customer_phone: string;
  business_name: string;
  service_area: string;
  review_platform_urls: Record<string, string>;
  google_review_url: string;
  niche_key: string;
}

export const wf25cNpsHandler = task({
  id: "wf25c-nps-handler",
  retry: { maxAttempts: 2 },
  run: async (payload: NpsPayload) => {
    // Create or look up GHL contact
    let contactId: string;
    try {
      const contact = await createContact({
        firstName: payload.customer_name,
        phone: payload.customer_phone,
        tags: ["review_pending", `customer_of_${payload.client_id}`],
        customField: {
          review_google_link: payload.google_review_url,
          review_business_name: payload.business_name,
        },
      });
      contactId = contact?.id || "";
    } catch {
      console.error("GHL contact creation failed, proceeding without");
      contactId = "";
    }

    // Send NPS text
    if (contactId) {
      try {
        await sendSMS(
          contactId,
          `Hi ${payload.customer_name}! Thanks for visiting ${payload.business_name}. How was your experience? Reply with a number 1-5 (5 = amazing, 1 = needs work)`
        );
      } catch (err) {
        console.error("NPS SMS send failed:", err);
      }
    }

    // Update DB status
    await query(
      `UPDATE review_requests SET status = 'nps_sent' WHERE id = $1`,
      [payload.review_request_id]
    );

    return {
      success: true,
      review_request_id: payload.review_request_id,
      contact_id: contactId,
    };
  },
});

// NPS Reply handler (called by webhook when GHL receives inbound SMS)
export const wf25cNpsReplyHandler = task({
  id: "wf25c-nps-reply-handler",
  run: async (payload: {
    review_request_id: number;
    contact_id: string;
    nps_score: number;
  }) => {
    const { rows: [request] } = await query(
      `SELECT rr.*, c.business_name, c.service_area, c.city,
              c.review_platform_urls, c.google_review_url
       FROM review_requests rr
       JOIN clients c ON rr.client_id = c.client_id
       WHERE rr.id = $1`,
      [payload.review_request_id]
    );
    if (!request) throw new Error("Review request not found");

    const rating = payload.nps_score;

    if (rating >= 4) {
      // Platform rotation — weighted random
      const platforms = request.review_platform_urls || {};
      const rand = Math.floor(Math.random() * 100) + 1;
      let platform = "google";
      let link = request.google_review_url || "";

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

      try {
        await sendSMS(
          payload.contact_id,
          `Thank you! We'd really appreciate a quick review — it helps other people in ${request.service_area || request.city || ""} find ${request.business_name}. ${link}`
        );
      } catch {
        console.error("Failed to send review link SMS");
      }

      await query(
        `UPDATE review_requests SET nps_score = $1, routed_to = 'public_review',
         target_platform = $2, review_link = $3, status = 'review_sent' WHERE id = $4`,
        [rating, platform, link, payload.review_request_id]
      );
    } else {
      // Negative — capture privately
      try {
        await sendSMS(
          payload.contact_id,
          "We're sorry to hear that. What could we have done better? Your feedback stays private and helps us improve."
        );
      } catch {
        console.error("Failed to send negative feedback SMS");
      }

      try {
        await sendEmail(
          "tom@haildentpro.com",
          `⚠️ Negative NPS — ${request.business_name} (${rating}⭐)`,
          `<p>Negative feedback from ${request.customer_name} for ${request.business_name}.</p>
           <p>Rating: ${rating}/5</p>
           <p>Phone: ${request.customer_phone}</p>
           <p>Follow up with the client.</p>`
        );
      } catch {
        console.error("Failed to send negative NPS alert");
      }

      await query(
        `UPDATE review_requests SET nps_score = $1, routed_to = 'private_feedback',
         status = 'negative_captured' WHERE id = $2`,
        [rating, payload.review_request_id]
      );
    }

    return {
      success: true,
      rating,
      routed_to: rating >= 4 ? "public_review" : "private_feedback",
    };
  },
});
