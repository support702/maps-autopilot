import { task } from "@trigger.dev/sdk";
import { query } from "../lib/db";
import { sendEmail } from "../lib/email";

interface OnboardingCompletePayload {
  client_id?: string;
  gbp_location_id?: string;
  brightlocal_campaign_id?: string;
  call_tracking_number?: string;
  late_account_id?: string;
  completed_tasks?: Record<string, boolean>;
  [key: string]: unknown;
}

export const wf09OnboardingCompletion = task({
  id: "wf09-onboarding-completion",
  retry: { maxAttempts: 2 },
  run: async (rawPayload: OnboardingCompletePayload) => {
    // Unwrap payload if wrapped by proxy, or use directly if already unwrapped
    const payload: OnboardingCompletePayload = rawPayload.client_id || rawPayload.gbp_location_id
      ? rawPayload
      : ((rawPayload as any).payload || rawPayload);

    // === GHL Field Mapping (normalize webhook field names) ===
    const clientId = (payload["Client ID"] as string) || payload.client_id || "";
    const gbpLocationId = (payload["GBP Location ID"] as string) || payload.gbp_location_id || "";
    const brightlocalCampaignId = (payload["BrightLocal Campaign ID"] as string) || payload.brightlocal_campaign_id || "";
    const callTrackingNumber = (payload["Call Tracking Number"] as string) || payload.call_tracking_number || "";
    const lateAccountId = (payload["Late Account ID"] as string) || payload.late_account_id || "";

    // Completed tasks: GHL may send individual fields or a nested object
    const completedTasks = (payload.completed_tasks as Record<string, boolean>) || {};
    const gbpCategoriesSet = (payload["GBP Categories Set"] as boolean)
      ?? completedTasks.gbp_categories_set ?? false;
    const gbpDescriptionUpdated = (payload["GBP Description Updated"] as boolean)
      ?? completedTasks.gbp_description_updated ?? false;
    const gbpPhotosUploaded = (payload["GBP Photos Uploaded"] as boolean)
      ?? completedTasks.gbp_photos_uploaded ?? false;

    if (!clientId) throw new Error("Missing client_id in payload");

    const { rows: [client] } = await query(
      "SELECT * FROM clients WHERE client_id = $1",
      [clientId]
    );
    if (!client) throw new Error(`Client not found: ${clientId}`);

    // Update client record
    await query(
      `UPDATE clients SET
        status = 'active',
        onboarding_status = 'complete',
        gbp_location_id = COALESCE($2, gbp_location_id),
        brightlocal_location_id = COALESCE($3, brightlocal_location_id),
        late_account_id = COALESCE($4, late_account_id)
       WHERE client_id = $1`,
      [
        clientId,
        gbpLocationId || null,
        brightlocalCampaignId || null,
        lateAccountId || null,
      ]
    );

    // Update onboarding tasks
    await query(
      `UPDATE onboarding_tasks SET
        onboarding_status = 'complete',
        va_completed_at = NOW(),
        gbp_categories_set = COALESCE($2, gbp_categories_set),
        gbp_description_updated = COALESCE($3, gbp_description_updated),
        gbp_photos_uploaded = COALESCE($4, gbp_photos_uploaded),
        brightlocal_campaign_id = COALESCE($5, brightlocal_campaign_id),
        call_tracking_number = COALESCE($6, call_tracking_number),
        updated_at = NOW()
       WHERE client_id = $1`,
      [
        clientId,
        gbpCategoriesSet || false,
        gbpDescriptionUpdated || false,
        gbpPhotosUploaded || false,
        brightlocalCampaignId || null,
        callTrackingNumber || null,
      ]
    );

    // Email operator
    try {
      await sendEmail(
        "tom@haildentpro.com",
        `Client Live: ${client.business_name} — QA Check Needed`,
        `<h2>${client.business_name} is now LIVE</h2>
         <p><strong>Client ID:</strong> ${clientId}</p>
         <p><strong>GBP Location:</strong> ${gbpLocationId || "not set"}</p>
         <p><strong>BrightLocal:</strong> ${brightlocalCampaignId || "not set"}</p>
         <p>Please run QA check on this client's setup.</p>`
      );
    } catch {
      console.error("Failed to send onboarding complete email");
    }

    return { success: true, client_id: clientId };
  },
});
