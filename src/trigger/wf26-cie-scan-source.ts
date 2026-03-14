/**
 * WF26 CIE — Scan Source
 * Location: src/trigger/wf26-cie-scan-source.ts
 *
 * Searches a single content source category via Brave Search API.
 * Called by wf26-cie-sunday-scan and wf26-cie-wednesday-scan orchestrators
 * via batchTriggerAndWait(). Returns an array of discovered items.
 */

import { schemaTask } from "@trigger.dev/sdk/v3";
import { z } from "zod";
import axios from "axios";

const scanSourceInput = z.object({
  source: z.string(),
  query: z.string(),
  scanDate: z.string(),
  maxResults: z.number().default(10),
});

export interface ScanResult {
  title: string;
  url: string;
  description: string;
  source: string;
  publishedDate: string;
  age: string;
}

export const wf26CieScanSource = schemaTask({
  id: "wf26-cie-scan-source",
  schema: scanSourceInput,
  retry: {
    maxAttempts: 3,
    factor: 2,
    minTimeoutInMs: 1000,
    maxTimeoutInMs: 30000,
    randomize: true,
  },
  run: async (payload): Promise<ScanResult[]> => {
    const { source, query: searchQuery, maxResults } = payload;

    try {
      const response = await axios.get(
        "https://api.search.brave.com/res/v1/web/search",
        {
          params: {
            q: searchQuery,
            count: maxResults,
            freshness: "pw", // past week
          },
          headers: {
            Accept: "application/json",
            "X-Subscription-Token": process.env.BRAVE_SEARCH_API_KEY!,
          },
        }
      );

      const webResults = response.data?.web?.results || [];

      return webResults.map(
        (result: {
          title?: string;
          url?: string;
          description?: string;
          age?: string;
          page_age?: string;
        }) => ({
          title: result.title || "",
          url: result.url || "",
          description: result.description || "",
          source,
          publishedDate: result.page_age || "",
          age: result.age || "",
        })
      );
    } catch (error) {
      const message =
        error instanceof Error ? error.message : String(error);
      console.error(
        `WF26 scan-source failed for source="${source}":`,
        message
      );
      return [];
    }
  },
});
