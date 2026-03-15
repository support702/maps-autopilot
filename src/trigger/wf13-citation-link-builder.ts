import { task } from "@trigger.dev/sdk";
import { query } from "../lib/db";
import { sendEmail } from "../lib/email";
import { checkCitations } from "../lib/brightlocal";

export const wf13CitationLinkBuilder = task({
  id: "wf13-citation-link-builder",
  run: async (_payload: Record<string, unknown>) => {
    const { rows: clients } = await query(
      `SELECT c.*, nc.directories FROM clients c
       JOIN niche_configs nc ON c.niche_key = nc.niche_key
       WHERE c.status = 'active' AND (c.service_tier = 'premium' OR c.tier = 'premium')`
    );

    const results: Array<{ client: string; missing: number }> = [];

    for (const client of clients) {
      try {
        let missingDirs: string[] = [];

        if (client.brightlocal_location_id) {
          const citationData = await checkCitations(client.brightlocal_location_id);
          const existingDirs = (citationData?.citations || []).map(
            (c: Record<string, string>) => c.directory?.toLowerCase()
          );

          const allDirs = client.directories || {};
          const primary = (allDirs.primary || []) as string[];
          const secondary = (allDirs.secondary || []) as string[];
          const allTargetDirs = [...primary, ...secondary];

          missingDirs = allTargetDirs.filter(
            (d: string) => !existingDirs.includes(d.toLowerCase())
          );
        }

        results.push({ client: client.business_name, missing: missingDirs.length });

        if (missingDirs.length > 0) {
          await sendEmail(
            "tom@haildentpro.com",
            `Citation Gaps: ${client.business_name} (${missingDirs.length} missing)`,
            `<h3>${client.business_name}</h3>
             <p>Missing from ${missingDirs.length} directories:</p>
             <ul>${missingDirs.map((d) => `<li>${d}</li>`).join("")}</ul>
             <p>Submit manually or via data aggregators.</p>`
          );
        }
      } catch (err) {
        console.error(`WF13 failed for ${client.client_id}:`, err);
      }
    }

    return { clients_checked: clients.length, results };
  },
});
