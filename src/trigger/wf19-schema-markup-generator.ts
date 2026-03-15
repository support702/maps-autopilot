import { task } from "@trigger.dev/sdk";
import { query } from "../lib/db";
import { callClaude } from "../lib/anthropic";
import { sendEmail } from "../lib/email";

interface SchemaPayload {
  client_id: string;
}

export const wf19SchemaMarkupGenerator = task({
  id: "wf19-schema-markup-generator",
  retry: { maxAttempts: 2 },
  run: async (payload: SchemaPayload) => {
    const { rows: [client] } = await query(
      `SELECT c.*, nc.schema_type FROM clients c
       LEFT JOIN niche_configs nc ON c.niche_key = nc.niche_key
       WHERE c.client_id = $1`,
      [payload.client_id]
    );
    if (!client) throw new Error(`Client not found: ${payload.client_id}`);

    const schemaPrompt = `Generate LocalBusiness JSON-LD schema for:
Business: ${client.business_name}
Type: ${client.schema_type || "LocalBusiness"}
Address: ${client.address || ""}
Phone: ${client.phone || ""}
Website: ${client.website || ""}
Services: ${client.services || ""}
Geo: ${client.latitude || ""}, ${client.longitude || ""}

Return valid JSON-LD only. No explanation.`;

    const schemaRaw = await callClaude(
      schemaPrompt,
      "You are a structured data expert. Return only valid JSON-LD markup.",
      2000
    );

    // Clean up response
    const schema = schemaRaw.replace(/```json?\n?/g, "").replace(/```/g, "").trim();

    // Email AM
    try {
      await sendEmail(
        "tom@haildentpro.com",
        `Schema Markup: ${client.business_name}`,
        `<h2>Schema Markup for ${client.business_name}</h2>
         <p>Add this to the client's website &lt;head&gt; section:</p>
         <pre style="background:#f5f5f5;padding:16px;border-radius:4px;overflow-x:auto"><code>&lt;script type="application/ld+json"&gt;
${schema}
&lt;/script&gt;</code></pre>`
      );
    } catch {
      console.error("Failed to send schema email");
    }

    return { success: true, client_id: payload.client_id };
  },
});
