import { task } from "@trigger.dev/sdk";
import { query } from "../lib/db";
import { sendEmail } from "../lib/email";
import axios from "axios";

interface HealthCheckPayload {
  client_id: string;
  website: string;
}

interface HealthResult {
  health_grade: string;
  issues: string[];
  critical_count: number;
  warning_count: number;
  am_summary: string;
}

async function runHealthCheck(website: string): Promise<HealthResult> {
  const issues: string[] = [];
  let criticalIssues = 0;
  let warningIssues = 0;

  if (!website) {
    return {
      health_grade: "F",
      issues: ["No website URL provided"],
      critical_count: 1,
      warning_count: 0,
      am_summary: "No website URL on file.",
    };
  }

  const url = website.startsWith("http") ? website : `https://${website}`;

  // Check 1: Site loads
  try {
    await axios.get(url, { timeout: 10000, maxRedirects: 5 });
  } catch {
    criticalIssues++;
    issues.push("Site failed to load within 10 seconds");
  }

  // Check 2: SSL certificate
  if (!url.startsWith("https://")) {
    criticalIssues++;
    issues.push("No SSL certificate (not HTTPS)");
  }

  // Check 3-4: PageSpeed (mobile)
  try {
    const psUrl = `https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url=${encodeURIComponent(url)}&strategy=mobile&category=performance`;
    const { data } = await axios.get(psUrl, { timeout: 60000 });
    const perfScore = data.lighthouseResult?.categories?.performance?.score;
    if (perfScore !== undefined) {
      const score = Math.round(perfScore * 100);
      if (score < 50) {
        criticalIssues++;
        issues.push(`Poor mobile performance score: ${score}/100`);
      } else if (score < 70) {
        warningIssues++;
        issues.push(`Mediocre mobile performance score: ${score}/100`);
      }
    }
  } catch {
    warningIssues++;
    issues.push("Could not run PageSpeed analysis");
  }

  // Check 5: LocalBusiness schema
  try {
    const { data: html } = await axios.get(url, { timeout: 10000 });
    const hasSchema =
      html.includes("LocalBusiness") ||
      html.includes("AutoRepair") ||
      html.includes("schema.org");
    if (!hasSchema) {
      warningIssues++;
      issues.push("No LocalBusiness schema markup detected");
    }
  } catch {
    // Already caught in check 1
  }

  // Determine grade
  let grade: string;
  if (issues.some((i) => i.includes("failed to load"))) {
    grade = "F";
  } else if (criticalIssues >= 2) {
    grade = "D";
  } else if (criticalIssues === 1) {
    grade = "C";
  } else if (warningIssues >= 2) {
    grade = "B";
  } else {
    grade = "A";
  }

  return {
    health_grade: grade,
    issues,
    critical_count: criticalIssues,
    warning_count: warningIssues,
    am_summary: issues.length === 0
      ? "Website is healthy — no issues detected."
      : `Grade ${grade}: ${issues.join("; ")}`,
  };
}

// On-demand task (called by WF01)
export const wf01bWebsiteHealthCheck = task({
  id: "wf01b-website-health-check",
  retry: { maxAttempts: 2 },
  run: async (payload: HealthCheckPayload) => {
    const result = await runHealthCheck(payload.website);

    await query(
      `UPDATE clients SET website_health = $1, website_health_grade = $2, website_health_checked_at = NOW()
       WHERE client_id = $3`,
      [JSON.stringify(result), result.health_grade, payload.client_id]
    );

    return result;
  },
});

// Weekly check for all active clients (schedule via Trigger.dev dashboard)
export const wf01bWeeklyHealthCheck = task({
  id: "wf01b-weekly-health-check",
  run: async (_payload: Record<string, unknown>) => {
    const { rows: clients } = await query(
      "SELECT client_id, website FROM clients WHERE status = 'active' AND website IS NOT NULL AND website != ''"
    );

    const results: Array<{ client_id: string; grade: string }> = [];

    for (const client of clients) {
      try {
        const result = await runHealthCheck(client.website);
        await query(
          `UPDATE clients SET website_health = $1, website_health_grade = $2, website_health_checked_at = NOW()
           WHERE client_id = $3`,
          [JSON.stringify(result), result.health_grade, client.client_id]
        );
        results.push({ client_id: client.client_id, grade: result.health_grade });
      } catch (err) {
        console.error(`Health check failed for ${client.client_id}:`, err);
      }
    }

    const failing = results.filter((r) => ["D", "F"].includes(r.grade));
    if (failing.length > 0) {
      try {
        await sendEmail(
          "tom@haildentpro.com",
          `Website Health Check: ${failing.length} clients need attention`,
          `<h2>Weekly Website Health Report</h2>
           <p>${results.length} clients checked. ${failing.length} with critical issues.</p>
           <ul>${failing.map((f) => `<li>${f.client_id}: Grade ${f.grade}</li>`).join("")}</ul>`
        );
      } catch {
        console.error("Failed to send health check digest email");
      }
    }

    return { checked: results.length, failing: failing.length };
  },
});
