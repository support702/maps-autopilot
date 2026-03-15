// src/trigger/wf08-client-health-check.ts
// Daily client health check: runs alert checks (reviews, posts, guarantee, payment)
// and pre-call scoring (0-100) for all active clients. Sends a single combined
// digest email with alerts and scored client list.

import { schedules } from "@trigger.dev/sdk/v3";
import { query } from "../lib/db";
import { sendEmail } from "../lib/email";

export const wf08ClientHealthCheck = schedules.task({
  id: "wf08-client-health-check",
  cron: "0 11 * * *",
  run: async () => {
    const { rows: clients } = await query(
      "SELECT * FROM clients WHERE status = 'active'"
    );

    const alerts: Array<{ client: string; severity: string; message: string }> = [];
    const scored: Array<{
      client_id: string;
      name: string;
      score: number;
      tag: string;
    }> = [];

    for (const client of clients) {
      try {
        // ── HEALTH ALERTS ──

        // No new reviews in 30+ days
        const { rows: [reviewCheck] } = await query(
          `SELECT COUNT(*) as cnt FROM reviews
           WHERE client_id = $1 AND review_date > NOW() - INTERVAL '30 days'`,
          [client.client_id]
        );
        if (Number(reviewCheck.cnt) === 0) {
          alerts.push({
            client: client.business_name,
            severity: "warning",
            message: "No new reviews in 30+ days",
          });
          await query(
            `INSERT INTO system_alerts (alert_type, severity, source_workflow, affected_client_id, message)
             VALUES ('no_reviews', 'warning', 'wf08', $1, 'No new reviews in 30+ days')`,
            [client.client_id]
          );
        }

        // No GBP post in 7+ days
        const { rows: [postCheck] } = await query(
          `SELECT COUNT(*) as cnt FROM published_content
           WHERE client_id = $1 AND publish_date > NOW() - INTERVAL '7 days'`,
          [client.client_id]
        );
        if (Number(postCheck.cnt) === 0) {
          alerts.push({
            client: client.business_name,
            severity: "warning",
            message: "No GBP post published in 7+ days",
          });
          await query(
            `INSERT INTO system_alerts (alert_type, severity, source_workflow, affected_client_id, message)
             VALUES ('no_posts', 'warning', 'wf08', $1, 'No GBP post in 7+ days')`,
            [client.client_id]
          );
        }

        // Guarantee deadline checks
        if (client.guarantee_active && client.guarantee_deadline) {
          const deadline = new Date(client.guarantee_deadline);
          const daysToDeadline = Math.floor(
            (deadline.getTime() - Date.now()) / 86400000
          );
          if (daysToDeadline < 0) {
            alerts.push({
              client: client.business_name,
              severity: "critical",
              message: `Guarantee deadline PASSED (${Math.abs(daysToDeadline)} days ago)`,
            });
            await query(
              `INSERT INTO system_alerts (alert_type, severity, source_workflow, affected_client_id, message)
               VALUES ('guarantee_expired', 'critical', 'wf08', $1, $2)`,
              [client.client_id, `Guarantee deadline passed ${Math.abs(daysToDeadline)} days ago`]
            );
          } else if (daysToDeadline <= 14) {
            alerts.push({
              client: client.business_name,
              severity: "warning",
              message: `Guarantee deadline in ${daysToDeadline} days`,
            });
          }
        }

        // Payment failures
        if ((client.failed_payment_count || 0) >= 2) {
          alerts.push({
            client: client.business_name,
            severity: "critical",
            message: `${client.failed_payment_count} failed payments`,
          });
        }

        // ── PRE-CALL SCORING ──

        // Review velocity (0-20) — reuse reviewCheck from above for recent count
        const { rows: [prev] } = await query(
          `SELECT COUNT(*) as cnt FROM reviews
           WHERE client_id = $1 AND review_date BETWEEN NOW() - INTERVAL '60 days' AND NOW() - INTERVAL '30 days'`,
          [client.client_id]
        );
        const recentReviews = Number(reviewCheck.cnt);
        const prevReviews = Number(prev.cnt);
        const reviewScore = Math.min(20, prevReviews > 0 ? (recentReviews / prevReviews) * 20 : recentReviews > 0 ? 20 : 0);

        // Content health (0-20)
        const { rows: [postCount] } = await query(
          `SELECT COUNT(*) as cnt FROM published_content
           WHERE client_id = $1 AND publish_date > NOW() - INTERVAL '30 days'`,
          [client.client_id]
        );
        const expectedPosts = 12; // 3 per week * 4 weeks
        const contentScore = Math.min(20, (Number(postCount.cnt) / expectedPosts) * 20);

        // Engagement signals (0-20) — placeholder until call tracking
        const callScore = 10;

        // Onboarding completeness (0-20)
        const { rows: [onboarding] } = await query(
          `SELECT * FROM onboarding_tasks WHERE client_id = $1`,
          [client.client_id]
        );
        let onboardingScore = 20;
        if (onboarding && onboarding.onboarding_status !== "complete") {
          const fields = [
            "gbp_categories_set",
            "gbp_description_updated",
            "gbp_photos_uploaded",
          ];
          const done = fields.filter((f) => onboarding[f] === true).length;
          onboardingScore = (done / fields.length) * 20;
        }

        // Guarantee risk (0-20)
        let guaranteeScore = 20;
        if (client.guarantee_active && client.guarantee_deadline) {
          const daysToDeadline = Math.floor(
            (new Date(client.guarantee_deadline).getTime() - Date.now()) / 86400000
          );
          guaranteeScore =
            daysToDeadline > 30 ? 20 : Math.max(0, (daysToDeadline / 30) * 20);
        }

        const totalScore = Math.round(
          reviewScore + contentScore + callScore + onboardingScore + guaranteeScore
        );
        const tag =
          totalScore >= 80
            ? "healthy"
            : totalScore >= 60
              ? "watch"
              : totalScore >= 40
                ? "at_risk"
                : "critical";

        await query(
          `UPDATE clients SET health_score = $1, health_tag = $2, health_scored_at = NOW()
           WHERE client_id = $3`,
          [totalScore, tag, client.client_id]
        );

        scored.push({
          client_id: client.client_id,
          name: client.business_name,
          score: totalScore,
          tag,
        });
      } catch (err) {
        console.error(`WF08 health check failed for ${client.client_id}:`, err);
      }
    }

    // Sort scores worst-first for the email
    scored.sort((a, b) => a.score - b.score);
    const criticalAlerts = alerts.filter((a) => a.severity === "critical");
    const warningAlerts = alerts.filter((a) => a.severity === "warning");
    const priorityClients = scored.filter((s) => s.tag === "critical" || s.tag === "at_risk");

    // Send combined digest email
    if (alerts.length > 0 || scored.length > 0) {
      let html = `<h2>Daily Health Check &amp; Scores — ${new Date().toLocaleDateString()}</h2>`;

      // Alerts section
      if (criticalAlerts.length > 0) {
        html += `<h3 style="color:red">CRITICAL ALERTS (${criticalAlerts.length})</h3>
          <ul>${criticalAlerts.map((a) => `<li><strong>${a.client}:</strong> ${a.message}</li>`).join("")}</ul>`;
      }
      if (warningAlerts.length > 0) {
        html += `<h3 style="color:orange">WARNINGS (${warningAlerts.length})</h3>
          <ul>${warningAlerts.map((a) => `<li><strong>${a.client}:</strong> ${a.message}</li>`).join("")}</ul>`;
      }

      // Scores section
      if (scored.length > 0) {
        if (priorityClients.length > 0) {
          html += `<h3 style="color:red">Priority Clients (${priorityClients.length} need attention)</h3>`;
        }
        html += `<table border="1" cellpadding="6" cellspacing="0">
          <tr><th>Client</th><th>Score</th><th>Status</th></tr>
          ${scored
            .map(
              (s) =>
                `<tr style="background:${s.tag === "critical" ? "#ffcccc" : s.tag === "at_risk" ? "#fff3cd" : "white"}">
                  <td>${s.name}</td><td>${s.score}</td><td>${s.tag.toUpperCase()}</td></tr>`
            )
            .join("")}
        </table>`;
      }

      html += `<p>Total clients checked: ${clients.length}</p>`;

      try {
        await sendEmail(
          "tom@haildentpro.com",
          `Daily Health: ${criticalAlerts.length} critical, ${warningAlerts.length} warnings | ${priorityClients.length} clients need attention`,
          html
        );
      } catch {
        console.error("Failed to send health digest");
      }
    }

    return {
      clients_checked: clients.length,
      alerts: alerts.length,
      critical_alerts: criticalAlerts.length,
      scored: scored.length,
      priority_clients: priorityClients.length,
    };
  },
});
