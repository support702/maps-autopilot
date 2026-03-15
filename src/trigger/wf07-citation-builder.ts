import { schedules } from "@trigger.dev/sdk/v3";
import { query } from "../lib/db";
import { sendEmail } from "../lib/email";
import { checkCitations } from "../lib/brightlocal";

export const wf07CitationBuilder = schedules.task({
  id: "wf07-citation-builder",
  cron: "0 13 * * 1",
  run: async () => {
    const { rows: clients } = await query(
      `SELECT * FROM clients WHERE status = 'active' AND brightlocal_location_id IS NOT NULL`
    );

    const issues: Array<{ client: string; problems: string[] }> = [];

    for (const client of clients) {
      try {
        const citationData = await checkCitations(client.brightlocal_location_id);
        const problems: string[] = [];

        if (citationData?.citations) {
          for (const citation of citationData.citations) {
            if (citation.nap_correct === false) {
              problems.push(
                `${citation.directory}: NAP inconsistency — ${citation.issue || "name/address/phone mismatch"}`
              );
            }
          }
        }

        if (problems.length > 0) {
          issues.push({ client: client.business_name, problems });
        }
      } catch (err) {
        console.error(`WF07 citation check failed for ${client.client_id}:`, err);
      }
    }

    if (issues.length > 0) {
      try {
        const html = `<h2>Weekly Citation Report</h2>
          ${issues
            .map(
              (i) =>
                `<h3>${i.client}</h3><ul>${i.problems.map((p) => `<li>${p}</li>`).join("")}</ul>`
            )
            .join("")}`;
        await sendEmail("tom@haildentpro.com", `Citation Issues: ${issues.length} clients`, html);
      } catch {
        console.error("Failed to send citation report");
      }
    }

    return { clients_checked: clients.length, with_issues: issues.length };
  },
});
