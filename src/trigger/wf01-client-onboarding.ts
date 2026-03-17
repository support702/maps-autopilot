import { task } from "@trigger.dev/sdk";
import { query } from "../lib/db";
import { callClaude } from "../lib/anthropic";
import { sendEmail } from "../lib/email";
import axios from "axios";

interface OnboardingPayload {
  [key: string]: unknown;
}

export const wf01ClientOnboarding = task({
  id: "wf01-client-onboarding",
  retry: { maxAttempts: 3, minTimeoutInMs: 5000 },
  run: async (rawPayload: OnboardingPayload) => {
    // Unwrap payload if wrapped by proxy, or use directly if already unwrapped
    const payload: OnboardingPayload = (rawPayload as any)["Business Name"] || (rawPayload as any).business_name
      ? rawPayload
      : ((rawPayload as any).payload || rawPayload);

    // 1. Flatten webhook data — handle GHL field names
    const businessName =
      (payload["Business Name"] as string) ||
      (payload.business_name as string) ||
      "";
    const address =
      (payload["Complete Business Address"] as string) ||
      (payload.business_address as string) ||
      "";
    const phone =
      (payload["Business Phone"] as string) ||
      (payload.business_phone as string) ||
      "";
    const website =
      (payload["Website (if any)"] as string) ||
      (payload["Website URL"] as string) ||
      (payload.business_website as string) ||
      "";
    const yearsInBusiness =
      (payload["Years in Business"] as string) ||
      (payload.years_in_business as string) ||
      "0";
    const primaryServices =
      (payload["Primary Services"] as string) ||
      (payload.primary_services as string) ||
      "";
    const serviceArea =
      (payload["Target Service Area"] as string) ||
      (payload.service_area as string) ||
      "";
    const usp =
      (payload["What Makes You Different?"] as string) ||
      (payload.unique_selling_points as string) ||
      "";
    const reviewUrl =
      (payload["Google Review Link | URL"] as string) ||
      (payload.google_review_url as string) ||
      "";
    const contactId =
      (payload.contact_id as string) || "";
    const nicheKeyRaw =
      (payload.customData as Record<string, string>)?.niche_key ||
      (payload["Niche Key"] as string) ||
      (payload["Niche"] as string | string[]) ||
      (payload.niche_key as string) ||
      "mechanical";
    const nicheKey = Array.isArray(nicheKeyRaw) ? nicheKeyRaw[0] : nicheKeyRaw;
    const businessPhotos =
      (payload["Business Photos"] as string) ||
      (payload.business_photos as string) ||
      "";
    const clientIdFromPayload =
      (payload["Client ID"] as string) ||
      (payload.client_id as string) ||
      "";
    const city =
      (payload["City"] as string) ||
      (payload.city as string) ||
      "";
    const state =
      (payload["State"] as string) ||
      (payload.state as string) ||
      "TX";
    const email =
      (payload["Email"] as string) ||
      (payload.email as string) ||
      "";
    const ownerName =
      (payload["Owner Name"] as string) ||
      (payload.owner_name as string) ||
      "";
    const ownerEmail =
      (payload["Owner Email"] as string) ||
      (payload.owner_email as string) ||
      email;
    const ownerPhone =
      (payload["Owner Phone"] as string) ||
      (payload.owner_phone as string) ||
      phone;
    const gbpLocationId =
      (payload["GBP Location ID"] as string) ||
      (payload.gbp_location_id as string) ||
      "";
    const primaryKeyword =
      (payload["Primary Keyword"] as string) ||
      (payload.primary_keyword as string) ||
      "";

    // 2. Load niche config
    const { rows: nicheRows } = await query(
      "SELECT * FROM niche_configs WHERE niche_key = $1",
      [nicheKey]
    );
    const niche = nicheRows[0] || {};

    // 2b. Enrich missing fields from Google Places API
    let enrichedCity = city;
    let enrichedState = state;
    let enrichedAddress = address;
    let enrichedGbpLocationId = "";

    if (businessName && (!city || !state || state === "TX")) {
      console.log("Missing city/state — enriching from Google Places API", { businessName, phone });

      try {
        const searchQuery = phone ? `${businessName} ${phone}` : businessName;
        const placesUrl = `https://maps.googleapis.com/maps/api/place/findplacefromtext/json?input=${encodeURIComponent(searchQuery)}&inputtype=textquery&fields=place_id,name,formatted_address,geometry&key=${process.env.GOOGLE_API_KEY}`;
        const placesResponse = await fetch(placesUrl);
        const placesData = (await placesResponse.json()) as {
          candidates?: Array<{ formatted_address?: string; place_id?: string }>;
        };

        if (placesData.candidates && placesData.candidates.length > 0) {
          const place = placesData.candidates[0];
          const formattedAddress = place.formatted_address || "";

          // Extract city and state from formatted_address
          // Format: "123 Main St, Houston, TX 77001, USA"
          const addressParts = formattedAddress.split(",").map((p: string) => p.trim());
          if (addressParts.length >= 3) {
            if (!city) {
              enrichedCity = addressParts[addressParts.length - 3];
            }
            if (!state || state === "TX") {
              const stateZip = addressParts[addressParts.length - 2];
              const parsedState = stateZip.split(" ")[0];
              if (parsedState && parsedState.length === 2) {
                enrichedState = parsedState;
              }
            }
          }

          // Use Places address if original address is empty
          if (!address && formattedAddress) {
            enrichedAddress = formattedAddress;
          }

          // Capture place_id for GBP location
          enrichedGbpLocationId = place.place_id || "";

          console.log("Enriched from Google Places", {
            city: enrichedCity,
            state: enrichedState,
            address: enrichedAddress,
          });
        }
      } catch (placesError) {
        console.warn("Failed to enrich from Google Places", placesError);
      }
    }

    // 2c. Resolve final GBP location ID (prefer enriched from Places API)
    const finalGbpLocationId = enrichedGbpLocationId || gbpLocationId;

    // 2d. Auto-generate primary_keyword if missing
    let enrichedPrimaryKeyword = primaryKeyword;
    if (!enrichedPrimaryKeyword && enrichedCity) {
      const categoryName = (niche.gbp_primary_category as string) || (niche.niche_name as string) || "";
      if (categoryName) {
        enrichedPrimaryKeyword = `${categoryName.toLowerCase()} ${enrichedCity.toLowerCase()}`;
        console.log("Auto-generated primary_keyword", { enrichedPrimaryKeyword });
      }
    }

    // 2e. Use contact email if email is missing
    let enrichedEmail = email;
    if (!enrichedEmail) {
      enrichedEmail =
        (payload["contact_email"] as string) ||
        (payload["Contact Email"] as string) ||
        "";
      if (enrichedEmail) {
        console.log("Using contact email as fallback", { enrichedEmail });
      }
    }

    // 3. Check quick audit data
    const { rows: auditRows } = await query(
      "SELECT * FROM prospect_audits WHERE LOWER(business_name) = LOWER($1) AND LOWER(city) = LOWER($2) LIMIT 1",
      [businessName, serviceArea.split(",")[0]?.trim() || ""]
    );
    const audit = auditRows[0];

    // 4. Agent 1 — SEO Strategist
    const seoPrompt = `You are an expert local SEO strategist specializing in ${niche.niche_name || nicheKey} businesses.

CLIENT DATA:
- Business: ${businessName}
- Location: ${address}, Service area: ${serviceArea}
- Services: ${primaryServices}
- Years in business: ${yearsInBusiness}
- USP: ${usp}

NICHE CONTEXT:
- GBP Primary Category: ${niche.gbp_primary_category || ""}
- Secondary Categories: ${JSON.stringify(niche.gbp_secondary_categories || [])}
- Common search terms: ${JSON.stringify(niche.industry_terms || {})}

AUDIT DATA (if available): ${audit ? JSON.stringify(audit.top_competitors) : "none"}
Market Level: ${audit?.market_competition_level || "unknown"}

TASK:
1. Recommend optimal PRIMARY GBP category
2. Recommend 3-5 SECONDARY categories based on actual services
3. Generate top 10 target keywords (service + city combinations)
4. Rank keywords by estimated impact (high/medium/low)
5. Suggest 10 Q&A topics for GBP seeding
6. Recommend primary guarantee keyword (most winnable high-volume term)

Output as JSON:
{
  "primary_category": "",
  "secondary_categories": [],
  "target_keywords": [{"keyword": "", "intent": "", "impact": ""}],
  "qa_topics": [{"question": "", "answer_outline": ""}],
  "guarantee_keyword": ""
}`;

    const seoStrategyRaw = await callClaude(seoPrompt, undefined, 2000);
    let seoStrategy: Record<string, unknown> = {};
    try {
      seoStrategy = JSON.parse(seoStrategyRaw.replace(/```json?\n?/g, "").replace(/```/g, "").trim());
    } catch {
      seoStrategy = {};
    }

    // 5. Agent 3 — GBP Products Generator
    const productsPrompt = `Create 8-12 GBP Product listings for ${businessName}, a ${niche.niche_name || nicheKey} in ${serviceArea}.

Services offered: ${primaryServices}
Years in business: ${yearsInBusiness}
USP: ${usp}
Niche GBP Products templates: ${JSON.stringify(niche.gbp_products || [])}

For EACH Product:
- Max 1000 characters description
- Structure: what the service is → common problems it solves → how this business delivers it → full CTA with business name, address, phone
- Factual and specific — NOT sales copy
- Include relevant stats, timelines, or data points
- Naturally include service + city keywords

Output as JSON array: [{"title": "", "description": "", "category": ""}]`;

    const productsRaw = await callClaude(productsPrompt, undefined, 4000);
    let products: Array<Record<string, string>> = [];
    try {
      products = JSON.parse(productsRaw.replace(/```json?\n?/g, "").replace(/```/g, "").trim());
    } catch {
      products = [];
    }

    // 6. Generate client_id and save to DB
    const clientId = clientIdFromPayload || `client-${Date.now()}`;
    await query(
      `INSERT INTO clients (
        client_id, name, business_name, address, phone, website,
        years_in_business, services, service_area, unique_selling_points,
        google_review_url, niche_key, status, onboarding_status,
        tier, service_tier, gbp_primary_category, gbp_secondary_categories,
        gbp_category_analysis, guarantee_keyword, market_qualification,
        wp_url, wp_username, wp_app_password, ghl_contact_id,
        owner_name, owner_phone, gbp_location_id, primary_keyword,
        city, state
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26,$27,$28,$29,$30,$31)
      RETURNING client_id`,
      [
        clientId,
        businessName,
        businessName,
        enrichedAddress,
        phone,
        website,
        yearsInBusiness,
        `{${primaryServices}}`,
        serviceArea,
        usp,
        reviewUrl,
        nicheKey,
        "active",
        "survey_completed",
        "core",
        "core",
        (seoStrategy.primary_category as string) || niche.gbp_primary_category || "",
        niche.gbp_secondary_categories || [],
        JSON.stringify(seoStrategy),
        (seoStrategy.guarantee_keyword as string) || "",
        audit?.market_competition_level || "",
        "",
        "",
        "",
        contactId,
        ownerName,
        ownerPhone,
        finalGbpLocationId,
        enrichedPrimaryKeyword,
        enrichedCity,
        enrichedState,
      ]
    );

    // 6b. Log GBP Location ID status
    if (!finalGbpLocationId) {
      console.warn("No GBP Location ID available - skipping automation steps");
    } else {
      console.log("Proceeding with full onboarding automation", { gbpLocationId: finalGbpLocationId });
    }

    // 7. Save client photos
    if (businessPhotos) {
      const photoUrls = Array.isArray(businessPhotos)
        ? businessPhotos
        : businessPhotos.split(",").map((u: string) => u.trim()).filter(Boolean);
      for (const photoUrl of photoUrls) {
        await query(
          `INSERT INTO client_photos (client_id, photo_url, photo_source)
           VALUES ($1, $2, $3) ON CONFLICT DO NOTHING`,
          [clientId, photoUrl, "onboarding"]
        );
      }
    }

    // 8. Save GBP products
    for (const product of products) {
      await query(
        `INSERT INTO gbp_products (client_id, product_name, product_description, product_category, status)
         VALUES ($1, $2, $3, $4, 'draft')`,
        [clientId, product.title, product.description, product.category]
      );
    }

    // 9. Create onboarding tasks record
    await query(
      `INSERT INTO onboarding_tasks (client_id, onboarding_status) VALUES ($1, 'survey_completed')
       ON CONFLICT (client_id) DO UPDATE SET onboarding_status = 'survey_completed', updated_at = NOW()`,
      [clientId]
    );

    // 10. Email VA with setup instructions
    const emailHtml = `
      <h2>New Client Onboarding: ${businessName}</h2>
      <p><strong>Client ID:</strong> ${clientId}</p>
      <p><strong>Business:</strong> ${businessName}</p>
      <p><strong>Address:</strong> ${enrichedAddress}</p>
      <p><strong>Phone:</strong> ${phone}</p>
      <p><strong>Website:</strong> ${website}</p>
      <p><strong>Niche:</strong> ${niche.niche_name || nicheKey}</p>
      <p><strong>Services:</strong> ${primaryServices}</p>
      <p><strong>Service Area:</strong> ${serviceArea}</p>
      <h3>SEO Strategy</h3>
      <p><strong>Primary Category:</strong> ${seoStrategy.primary_category || ""}</p>
      <p><strong>Secondary Categories:</strong> ${JSON.stringify(seoStrategy.secondary_categories || [])}</p>
      <p><strong>Guarantee Keyword:</strong> ${seoStrategy.guarantee_keyword || ""}</p>
      <h3>GBP Products Generated: ${products.length}</h3>
      <ul>${products.map((p) => `<li>${p.title}</li>`).join("")}</ul>
    `;

    try {
      await sendEmail(
        "henry@mapsautopilot.com",
        `New Client Setup: ${businessName} — ${clientId}`,
        emailHtml
      );
    } catch (emailErr) {
      console.error("Email send failed:", emailErr);
    }

    // 11. Mark activation complete
    await query(
      "UPDATE clients SET activation_complete = true WHERE client_id = $1",
      [clientId]
    );

    // 12. Post Slack notification
    try {
      const slackBotToken = process.env.SLACK_BOT_TOKEN;
      if (slackBotToken) {
        const slackMessage = `🎉 *New Client Onboarded!*

*Business:* ${businessName}
*Location:* ${enrichedCity}, ${enrichedState}
*Niche:* ${niche.niche_name || nicheKey}
*Client ID:* \`${clientId}\`

*Contact Info:*
• Phone: ${phone}
• Email: ${ownerEmail}
• Website: ${website || 'N/A'}

*SEO Setup:*
• Primary Keyword: ${enrichedPrimaryKeyword}
• GBP Location ID: ${enrichedGbpLocationId || 'N/A'}
• Products Generated: ${products.length}
• Activation Status: ✅ Complete

*Next Steps:*
• WF01B will push GBP products to Google
• WF02 will generate blog content
• WF05 will submit citations
• WF03 will start monitoring reviews`;

        const slackResponse = await axios.post(
          'https://slack.com/api/chat.postMessage',
          {
            channel: '#maps-sales',
            text: slackMessage,
          },
          {
            headers: {
              'Authorization': `Bearer ${slackBotToken}`,
              'Content-Type': 'application/json',
            },
          }
        );

        if (slackResponse.data.ok) {
          console.log(`[WF01] ✅ Posted onboarding notification to #maps-sales`);
        } else {
          console.error(`[WF01] Slack error: ${slackResponse.data.error}`);
        }
      }
    } catch (slackErr) {
      console.error('[WF01] Slack notification failed (non-critical):', slackErr);
    }

    return { success: true, client_id: clientId };
  },
});
