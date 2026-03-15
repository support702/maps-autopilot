/**
 * WF28 Creative Intelligence — Generate Report
 * Creates weekly Slack report with Tier 1 insights, Tier 2 competitive intel, and patterns.
 */

import { schemaTask } from "@trigger.dev/sdk/v3";
import { z } from "zod";

const reportInput = z.object({
  scan_date: z.string(),
  tier1_results: z.array(z.any()),
  tier2_results: z.array(z.any()),
  patterns: z.any().optional(),
});

export const wf28CreativeIntelReport = schemaTask({
  id: "wf28-creative-intel-report",
  schema: reportInput,
  run: async (payload) => {
    const { scan_date, tier1_results, tier2_results } = payload;

    const weekOf = new Date(scan_date).toLocaleDateString("en-US", {
      month: "numeric",
      day: "numeric",
      year: "numeric",
    });

    let report = `**Weekly Creative Intelligence Report — Week of ${weekOf}**\n\n`;

    // Tier 1 Study Accounts
    report += `━━━ **TIER 1: STUDY ACCOUNTS** ━━━\n\n`;
    for (const result of tier1_results) {
      const { page_name, ad_count, analysis } = result;
      
      if (!analysis) {
        report += `**${page_name}** (${ad_count} active ads)\n• No analysis available\n\n`;
        continue;
      }

      const tv = analysis.testing_velocity || {};
      const longest = analysis.longevity_insights?.longest_running_ad;
      
      report += `**${page_name}** (${ad_count} active ads)\n`;
      report += `• New this week: ${tv.new_this_week || 0} ads\n`;
      report += `• Killed this week: ${tv.killed_this_week || 0} ads\n`;
      
      if (longest) {
        report += `• Longest runner: "${longest.copy?.substring(0, 50)}..." — ${longest.days} days\n`;
      }
      
      const takeaways = analysis.actionable_takeaways || [];
      if (takeaways.length > 0) {
        report += `• Takeaway: ${takeaways[0]}\n`;
      }
      
      report += `\n`;
    }

    // Tier 2 Competitors
    report += `━━━ **TIER 2: COMPETITORS** ━━━\n\n`;
    for (const result of tier2_results) {
      const { page_name, ad_count, analysis } = result;
      
      if (!analysis) {
        report += `**${page_name}** (${ad_count} active ads)\n• No analysis available\n\n`;
        continue;
      }

      report += `**${page_name}** (${ad_count} active ads)\n`;
      
      const offers = analysis.primary_offers || [];
      if (offers.length > 0) {
        report += `• Offer: ${offers.join(", ")}\n`;
      }
      
      const angles = analysis.angles_pushed || [];
      if (angles.length > 0) {
        report += `• New angle: ${angles[0]}\n`;
      }
      
      if (analysis.positioning_notes) {
        report += `• Positioning: ${analysis.positioning_notes}\n`;
      }
      
      report += `\n`;
    }

    // Post to Slack
    const slackUrl = process.env.SLACK_WEBHOOK_URL;
    const channel = process.env.SLACK_CREATIVE_INTEL_CHANNEL || "maps-creative-intel";

    if (!slackUrl) {
      console.error("WF28 report: Missing SLACK_WEBHOOK_URL");
      return { report, posted: false };
    }

    try {
      await fetch(slackUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          channel: `#${channel}`,
          text: report,
        }),
      });

      console.log(`WF28 report: Posted to #${channel}`);
      return { report, posted: true };
    } catch (error) {
      console.error("WF28 report: Error posting to Slack:", error);
      return { report, posted: false };
    }
  },
});
