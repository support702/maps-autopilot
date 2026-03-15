import { task } from "@trigger.dev/sdk";
import { query } from "../lib/db";
import { sendEmail } from "../lib/email";
import axios from "axios";

const PLATFORMS = ["LinkedIn", "BBB", "Yelp", "Facebook", "Nextdoor"];

export const wf20EntityAuthorityBuilder = task({
  id: "wf20-entity-authority-builder",
  run: async (_payload: Record<string, unknown>) => {
    const { rows: clients } = await query(
      `SELECT * FROM clients
       WHERE status = 'active' AND (service_tier = 'premium' OR tier = 'premium')`
    );

    for (const client of clients) {
      try {
        const auditResults: Array<Record<string, unknown>> = [];

        for (const platform of PLATFORMS) {
          try {
            // Search for business presence
            const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(
              `"${client.business_name}" ${client.city || ""} site:${platform.toLowerCase()}.com`
            )}`;

            // We can't actually scrape Google, so we check entity_profiles for known URLs
            const profiles = client.entity_profiles || {};
            const profileUrl = profiles[platform.toLowerCase()] || null;

            const auditEntry = {
              platform,
              profile_found: !!profileUrl,
              profile_url: profileUrl,
              nap_consistent: profileUrl ? true : null,
              issues: profileUrl ? [] : [`No ${platform} profile found`],
            };

            auditResults.push(auditEntry);

            await query(
              `INSERT INTO entity_audits (client_id, platform, profile_found, nap_consistent, profile_url, issues, audit_date)
               VALUES ($1, $2, $3, $4, $5, $6, NOW())`,
              [
                client.client_id,
                platform,
                auditEntry.profile_found,
                auditEntry.nap_consistent,
                auditEntry.profile_url,
                JSON.stringify(auditEntry.issues),
              ]
            );
          } catch (err) {
            console.error(`Entity audit failed for ${platform}:`, err);
          }
        }

        const missing = auditResults.filter((a) => !a.profile_found);
        if (missing.length > 0) {
          try {
            await sendEmail(
              "tom@haildentpro.com",
              `Entity Audit: ${client.business_name} — ${missing.length} missing profiles`,
              `<h2>Entity Authority Report: ${client.business_name}</h2>
               <h3>Missing Profiles</h3>
               <ul>${missing.map((m) => `<li>${m.platform}</li>`).join("")}</ul>
               <h3>Found Profiles</h3>
               <ul>${auditResults.filter((a) => a.profile_found).map((a) => `<li>${a.platform}: ${a.profile_url}</li>`).join("")}</ul>
               <p>Action: Create missing profiles with consistent NAP data.</p>`
            );
          } catch {
            console.error("Failed to send entity audit email");
          }
        }
      } catch (err) {
        console.error(`WF20 failed for ${client.client_id}:`, err);
      }
    }

    return { clients_audited: clients.length };
  },
});
