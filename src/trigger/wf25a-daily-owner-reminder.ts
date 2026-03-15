import { task } from "@trigger.dev/sdk";
import { query } from "../lib/db";
import { sendSMS } from "../lib/ghl";
import { sendEmail } from "../lib/email";

export const wf25aDailyOwnerReminder = task({
  id: "wf25a-daily-owner-reminder",
  retry: { maxAttempts: 2 },
  run: async (_payload: Record<string, unknown>) => {
    const { rows: clients } = await query(
      `SELECT c.client_id, c.business_name, c.phone, c.name as owner_name,
              c.google_review_url, c.niche_key, c.ghl_contact_id
       FROM clients c
       WHERE c.status = 'active' AND c.nps_routing_active = true`
    );

    let remindersSent = 0;
    let amAlerts = 0;

    for (const client of clients) {
      try {
        // Check if they submitted customers today
        const { rows: [todayCheck] } = await query(
          `SELECT COUNT(*) as today_count FROM review_requests
           WHERE client_id = $1 AND created_at > CURRENT_DATE`,
          [client.client_id]
        );

        if (Number(todayCheck.today_count) > 0) continue;

        // Check days since last submission
        const { rows: [lastSubmission] } = await query(
          `SELECT MAX(created_at) as last_submit FROM review_requests WHERE client_id = $1`,
          [client.client_id]
        );
        const daysSinceSubmit = lastSubmission?.last_submit
          ? Math.floor(
              (Date.now() - new Date(lastSubmission.last_submit).getTime()) / 86400000
            )
          : 999;

        const formLink = `https://mapsautopilot.com/batch-review/${client.client_id}`;
        const ownerName = client.owner_name || client.business_name;

        if (daysSinceSubmit >= 15) {
          // Stop texting owner, alert AM instead
          try {
            await sendEmail(
              "tom@haildentpro.com",
              `⚠️ Review Stall: ${client.business_name}`,
              `<p>No customer submissions in ${daysSinceSubmit} days.</p>
               <p>Schedule a coaching call with ${ownerName}.</p>
               <p>Phone: ${client.phone || "N/A"}</p>`
            );
          } catch {
            console.error("Failed to send AM stall alert");
          }
          amAlerts++;
        } else if (client.ghl_contact_id) {
          const message =
            daysSinceSubmit >= 8
              ? `Hey ${ownerName}, it's been over a week since you submitted customers. The review system works best with consistent submissions — even 2-3 per day adds up fast. ${formLink}`
              : `Hi ${ownerName}! Closing up? Submit today's customers for Google reviews here: ${formLink}. Takes 2 min. Your clients will thank you!`;

          try {
            await sendSMS(client.ghl_contact_id, message);
            remindersSent++;
          } catch (err) {
            console.error(`SMS failed for ${client.client_id}:`, err);
          }
        }

        // Log reminder
        await query(
          `INSERT INTO system_alerts (alert_type, severity, source_workflow, affected_client_id, message)
           VALUES ('review_reminder_sent', 'info', 'wf25a', $1, $2)`,
          [client.client_id, `Reminder sent (${daysSinceSubmit} days since last submission)`]
        );
      } catch (err) {
        console.error(`WF25a failed for ${client.client_id}:`, err);
      }
    }

    return { clients_checked: clients.length, reminders_sent: remindersSent, am_alerts: amAlerts };
  },
});
