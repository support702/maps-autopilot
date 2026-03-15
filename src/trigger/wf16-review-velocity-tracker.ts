import { schedules } from "@trigger.dev/sdk/v3";
import { query } from "../lib/db";
import { sendEmail } from "../lib/email";

export const wf16ReviewVelocityTracker = schedules.task({
  id: "wf16-review-velocity-tracker",
  cron: "0 13 * * 5",
  run: async () => {
    const { rows: clients } = await query(
      "SELECT * FROM clients WHERE status = 'active'"
    );

    const flags: Array<{ name: string; issue: string }> = [];

    for (const client of clients) {
      try {
        const { rows: [thisWeek] } = await query(
          `SELECT COUNT(*) as cnt FROM reviews
           WHERE client_id = $1 AND review_date > NOW() - INTERVAL '7 days'`,
          [client.client_id]
        );
        const { rows: [lastWeek] } = await query(
          `SELECT COUNT(*) as cnt FROM reviews
           WHERE client_id = $1 AND review_date BETWEEN NOW() - INTERVAL '14 days' AND NOW() - INTERVAL '7 days'`,
          [client.client_id]
        );

        const thisCount = Number(thisWeek.cnt);
        const lastCount = Number(lastWeek.cnt);

        const velocity = { this_week: thisCount, last_week: lastCount };
        await query(
          "UPDATE clients SET last_review_velocity = $1 WHERE client_id = $2",
          [JSON.stringify(velocity), client.client_id]
        );

        // Check for no reviews in 14 days
        const { rows: [twoWeeks] } = await query(
          `SELECT COUNT(*) as cnt FROM reviews
           WHERE client_id = $1 AND review_date > NOW() - INTERVAL '14 days'`,
          [client.client_id]
        );

        if (Number(twoWeeks.cnt) === 0) {
          flags.push({
            name: client.business_name,
            issue: "0 reviews in 14 days — coach client on asking for reviews",
          });
        } else if (lastCount > 0 && thisCount < lastCount * 0.5) {
          flags.push({
            name: client.business_name,
            issue: `Review velocity dropped >50% (${lastCount} → ${thisCount})`,
          });
        }
      } catch (err) {
        console.error(`WF16 failed for ${client.client_id}:`, err);
      }
    }

    if (flags.length > 0) {
      try {
        await sendEmail(
          "tom@haildentpro.com",
          `Review Velocity: ${flags.length} clients flagged`,
          `<h2>Weekly Review Velocity Report</h2>
           <ul>${flags.map((f) => `<li><strong>${f.name}:</strong> ${f.issue}</li>`).join("")}</ul>`
        );
      } catch {
        console.error("Failed to send velocity report");
      }
    }

    return { clients_tracked: clients.length, flagged: flags.length };
  },
});
