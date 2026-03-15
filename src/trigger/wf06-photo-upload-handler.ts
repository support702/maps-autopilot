import { task } from "@trigger.dev/sdk";
import { query } from "../lib/db";
import { sendEmail } from "../lib/email";

interface PhotoUploadPayload {
  client_id?: string;
  photo_urls?: string[];
  captions?: string[];
  [key: string]: unknown;
}

export const wf06PhotoUploadHandler = task({
  id: "wf06-photo-upload-handler",
  retry: { maxAttempts: 2 },
  run: async (rawPayload: PhotoUploadPayload) => {
    // Unwrap payload if wrapped by proxy, or use directly if already unwrapped
    const payload: PhotoUploadPayload = rawPayload.client_id || rawPayload.photo_urls
      ? rawPayload
      : ((rawPayload as any).payload || rawPayload);

    // === GHL Field Mapping (normalize webhook field names) ===
    const clientId = (payload["Client ID"] as string) || payload.client_id || "";

    // Photo URLs: GHL may send as array, comma-separated string, or single URL
    const rawPhotos = payload["Business Photos"] || payload["Photo URLs"] || payload.photo_urls;
    const photoUrls: string[] = Array.isArray(rawPhotos)
      ? rawPhotos.map(String)
      : typeof rawPhotos === "string"
        ? rawPhotos.split(",").map((s: string) => s.trim()).filter(Boolean)
        : [];

    // Captions: GHL may send as array or comma-separated string
    const rawCaptions = payload["Photo Captions"] || payload.captions;
    const captions: string[] = Array.isArray(rawCaptions)
      ? rawCaptions.map(String)
      : typeof rawCaptions === "string"
        ? rawCaptions.split(",").map((s: string) => s.trim())
        : [];

    if (!clientId) throw new Error("Missing client_id in payload");

    const { rows: [client] } = await query(
      "SELECT * FROM clients WHERE client_id = $1",
      [clientId]
    );
    if (!client) throw new Error(`Client not found: ${clientId}`);

    for (let i = 0; i < photoUrls.length; i++) {
      await query(
        `INSERT INTO client_photos (client_id, photo_url, caption)
         VALUES ($1, $2, $3)`,
        [clientId, photoUrls[i], captions[i] || ""]
      );
    }

    // Email AM
    try {
      await sendEmail(
        "tom@haildentpro.com",
        `New Photos: ${client.business_name} (${photoUrls.length} photos)`,
        `<h2>New photos from ${client.business_name}</h2>
         <p>${photoUrls.length} photos uploaded. Download, keyword-rename, and upload to GBP.</p>
         <ul>${photoUrls.map((url: string, i: number) => `<li><a href="${url}">${captions[i] || `Photo ${i + 1}`}</a></li>`).join("")}</ul>`
      );
    } catch {
      console.error("Failed to send photo notification email");
    }

    return { success: true, photos_saved: photoUrls.length };
  },
});
