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
    const yearsInBusinessRaw =
      (payload["Years in Business"] as string) ||
      (payload.years_in_business as string) ||
      "0";
    // Parse years: "5+" → 5, "3-5" → 5, "10" → 10
    const yearsInBusiness = parseInt(yearsInBusinessRaw.replace(/[^\d]/g, "").slice(0, 2) || "0", 10);
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

    // 4. Consolidated SEO + GBP Strategy Call (single Claude call)
    const seoPrompt = `You are an expert local SEO strategist specializing in ${niche.niche_name || nicheKey} businesses.

CLIENT DATA:
- Business: ${businessName}
- Location: ${enrichedAddress}, Service area: ${serviceArea}
- City: ${enrichedCity}, State: ${enrichedState}
- Phone: ${phone}
- Services: ${primaryServices}
- Years in business: ${yearsInBusiness}
- USP: ${usp}

NICHE CONTEXT:
- GBP Primary Category: ${niche.gbp_primary_category || ""}
- Secondary Categories: ${JSON.stringify(niche.gbp_secondary_categories || [])}
- Common search terms: ${JSON.stringify(niche.industry_terms || {})}
- Niche GBP Products templates: ${JSON.stringify(niche.gbp_products || [])}

AUDIT DATA (if available): ${audit ? JSON.stringify(audit.top_competitors) : "none"}
Market Level: ${audit?.market_competition_level || "unknown"}

TASK — Return ALL of the following in a single JSON response:

1. PRIMARY GBP CATEGORY — optimal category for this business
2. SECONDARY CATEGORIES — 3-5 based on actual services
3. TARGET KEYWORDS — top 10 (service + city combinations), ranked by impact
4. Q&A TOPICS — 10 topics for GBP seeding
5. GUARANTEE KEYWORD — most winnable high-volume term
6. BUSINESS DESCRIPTION (750 chars max) — factual GBP description mentioning services, location, years in business. No sales fluff. Include phone number. Must be under 750 characters.
7. GBP PRODUCTS — EXACTLY 12 products. Each description MUST be close to 1000 characters. Structure: what the service is → common problems it solves → how this business delivers it → full CTA with business name, address, phone. Factual and specific, NOT sales copy. Include service + city keywords naturally.
8. GBP SERVICES — 8-15 services with name and a one-liner description
9. PHOTO FILENAMES — 6 keyword-rich filename templates like "brake-repair-[city]-[business].jpg"

Output as JSON:
{
  "primary_category": "",
  "secondary_categories": [],
  "target_keywords": [{"keyword": "", "intent": "", "impact": ""}],
  "qa_topics": [{"question": "", "answer_outline": ""}],
  "guarantee_keyword": "",
  "business_description_750": "",
  "gbp_products": [{"title": "", "description": "", "category": ""}],
  "gbp_services": [{"name": "", "one_liner": ""}],
  "photo_filenames": []
}`;

    const seoStrategyRaw = await callClaude(seoPrompt, undefined, 8000);
    let seoStrategy: Record<string, unknown> = {};
    try {
      seoStrategy = JSON.parse(seoStrategyRaw.replace(/```json?\n?/g, "").replace(/```/g, "").trim());
    } catch {
      seoStrategy = {};
    }

    // Extract arrays with safe fallbacks
    const products = Array.isArray(seoStrategy.gbp_products) ? seoStrategy.gbp_products as Array<Record<string, string>> : [];
    const services = Array.isArray(seoStrategy.gbp_services) ? seoStrategy.gbp_services as Array<Record<string, string>> : [];
    const photoFilenames = Array.isArray(seoStrategy.photo_filenames) ? seoStrategy.photo_filenames as string[] : [];
    const targetKeywords = Array.isArray(seoStrategy.target_keywords) ? seoStrategy.target_keywords as Array<Record<string, string>> : [];
    const qaTopics = Array.isArray(seoStrategy.qa_topics) ? seoStrategy.qa_topics as Array<Record<string, string>> : [];
    const businessDescription = (seoStrategy.business_description_750 as string) || "";

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

    // 10. Email VA with comprehensive action kit
    const secondaryCategories = Array.isArray(seoStrategy.secondary_categories)
      ? seoStrategy.secondary_categories as string[]
      : [];

    const sectionHeader = (title: string) =>
      `<div style="background:#1a1a2e;color:white;padding:12px 20px;font-size:16px;margin-top:24px;">${title}</div>`;
    const contentBlock = (inner: string) =>
      `<div style="background:white;padding:20px;border:1px solid #e0e0e0;">${inner}</div>`;
    const copyBox = (text: string) =>
      `<div style="background:#f8f8f8;padding:12px;font-family:monospace;font-size:13px;border:1px solid #ddd;white-space:pre-wrap;">${text}</div>`;
    const charCount = (text: string, max: number) =>
      `<div style="color:#666;font-size:12px;">(${text.length} / ${max} characters)</div>`;

    const productsHtml = products.map((p, i) => `
      <div style="margin-top:16px;">
        <div style="color:#666;font-size:13px;letter-spacing:2px;">━━━ PRODUCT ${i + 1} of ${products.length} ━━━</div>
        <p><strong>${p.title}</strong></p>
        <p style="color:#666;font-size:13px;">Category: ${p.category || "General"}</p>
        ${copyBox(p.description || "")}
        ${charCount(p.description || "", 1000)}
      </div>`).join("");

    const servicesHtml = services.map((s, i) =>
      `<p>${i + 1}. <strong>${s.name}</strong> — ${s.one_liner || ""}</p>`
    ).join("");

    const photoFilenamesHtml = photoFilenames.map((f) =>
      `<li style="font-family:monospace;font-size:13px;">${f}</li>`
    ).join("");

    const keywordsTableRows = targetKeywords.map((kw) =>
      `<tr><td style="padding:6px 12px;border:1px solid #ddd;">${kw.keyword}</td><td style="padding:6px 12px;border:1px solid #ddd;">${kw.intent}</td><td style="padding:6px 12px;border:1px solid #ddd;">${kw.impact}</td></tr>`
    ).join("");

    const qaHtml = qaTopics.map((qa, i) =>
      `<p>${i + 1}. <strong>${qa.question}</strong><br/><span style="color:#555;">${qa.answer_outline || ""}</span></p>`
    ).join("");

    const guaranteeSection = (seoStrategy.guarantee_keyword as string)
      ? `${sectionHeader("J. GUARANTEE INFO")}${contentBlock(`
          <p><strong>Guarantee Keyword:</strong> ${seoStrategy.guarantee_keyword}</p>
          <p><strong>Market Qualification:</strong> ${audit?.market_competition_level || "N/A"}</p>
        `)}`
      : "";

    const emailHtml = `
<div style="background:#f4f4f4;font-family:Arial,sans-serif;padding:20px;">
  <div style="max-width:700px;margin:0 auto;">
    <h1 style="text-align:center;color:#1a1a2e;">New Client Action Kit</h1>

    ${sectionHeader("A. CLIENT OVERVIEW")}
    ${contentBlock(`
      <p><strong>Business Name:</strong> ${businessName}</p>
      <p><strong>Client ID:</strong> ${clientId}</p>
      <p><strong>Address:</strong> ${enrichedAddress}</p>
      <p><strong>Phone:</strong> ${phone}</p>
      <p><strong>Website:</strong> ${website || "N/A"}</p>
      <p><strong>Niche:</strong> ${niche.niche_name || nicheKey}</p>
      <p><strong>Service Area:</strong> ${serviceArea}</p>
      <p><strong>Services:</strong> ${primaryServices}</p>
      <p><strong>USP:</strong> ${usp}</p>
      <p><strong>Owner:</strong> ${ownerName || "N/A"} | ${ownerEmail || "N/A"} | ${ownerPhone || "N/A"}</p>
      <p><strong>Google Review URL:</strong> ${reviewUrl || "N/A"}</p>
    `)}

    ${sectionHeader("B. GBP CATEGORIES")}
    ${contentBlock(`
      <p><strong>Primary Category:</strong></p>
      ${copyBox((seoStrategy.primary_category as string) || "")}
      <p style="margin-top:12px;"><strong>Secondary Categories:</strong></p>
      ${secondaryCategories.map((cat) => copyBox(cat)).join("")}
    `)}

    ${sectionHeader("C. BUSINESS DESCRIPTION")}
    ${contentBlock(`
      ${copyBox(businessDescription)}
      ${charCount(businessDescription, 750)}
    `)}

    ${sectionHeader(`D. GBP PRODUCTS (${products.length})`)}
    ${contentBlock(productsHtml || "<p>No products generated</p>")}

    ${sectionHeader("E. GBP SERVICES")}
    ${contentBlock(servicesHtml || "<p>No services generated</p>")}

    ${sectionHeader("F. PHOTO UPLOAD FILENAMES")}
    ${contentBlock(`<ul>${photoFilenamesHtml || "<li>No filenames generated</li>"}</ul>`)}

    ${sectionHeader("G. TARGET KEYWORDS")}
    ${contentBlock(`
      <table style="width:100%;border-collapse:collapse;">
        <tr style="background:#eee;"><th style="padding:6px 12px;border:1px solid #ddd;text-align:left;">Keyword</th><th style="padding:6px 12px;border:1px solid #ddd;text-align:left;">Intent</th><th style="padding:6px 12px;border:1px solid #ddd;text-align:left;">Impact</th></tr>
        ${keywordsTableRows}
      </table>
    `)}

    ${sectionHeader("H. Q&A TOPICS")}
    ${contentBlock(qaHtml || "<p>No Q&A topics generated</p>")}

    ${sectionHeader("I. ONBOARDING CHECKLIST")}
    ${contentBlock(`
      <p>□ GBP — Set primary category: ${(seoStrategy.primary_category as string) || ""}</p>
      <p>□ GBP — Add 4 secondary categories (listed above)</p>
      <p>□ GBP — Paste business description (Section C)</p>
      <p>□ GBP — Confirm hours are correct</p>
      <p>□ GBP — Upload photos with filenames above</p>
      <p>□ GBP — Add all ${products.length} Products (Section D)</p>
      <p>□ GBP — Add all ${services.length} Services (Section E)</p>
      <p>□ Schema — Paste JSON-LD into client website &lt;head&gt; (separate email from WF19)</p>
      <p>□ Authority — Claim/create Yelp listing → save URL to GHL</p>
      <p>□ Authority — Claim/create BBB listing → save URL to GHL</p>
      <p>□ Authority — Claim/create Facebook Business Page → save URL to GHL</p>
      <p>□ Authority — Create LinkedIn Company Page → save URL to GHL</p>
      <p>□ BrightLocal — Create campaign in dashboard</p>
      <p>□ BrightLocal — Add keyword: ${(seoStrategy.guarantee_keyword as string) || ""}</p>
      <p>□ BrightLocal — Submit to data aggregators</p>
      <p>□ GHL — Verify client contact tags</p>
      <p>□ GHL — Build review request URL</p>
    `)}

    ${guaranteeSection}
  </div>
</div>`;

    try {
      await sendEmail(
        "henry@autobodyaccelerator.com",
        `New Client Ready: ${businessName} — Onboarding Kit`,
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

    // 12. Post Slack notification to #maps-onboarding
    try {
      const slackBotToken = process.env.SLACK_BOT_TOKEN;
      if (slackBotToken) {
        const descPreview = businessDescription.length > 200
          ? businessDescription.slice(0, 200) + "..."
          : businessDescription;
        const keywordsList = targetKeywords.map((kw) => `\`${kw.keyword}\` (${kw.impact})`).join(", ");
        const filenamesList = photoFilenames.map((f) => `\`${f}\``).join("\n• ");

        const slackMessage = `🎉 *New Client Onboarded!*

*📋 Business Overview:*
• *Name:* ${businessName}
• *Client ID:* \`${clientId}\`
• *Location:* ${enrichedAddress || `${enrichedCity}, ${enrichedState}`}
• *Phone:* ${phone}
• *Website:* ${website || "N/A"}
• *Niche:* ${niche.niche_name || nicheKey}
• *Service Area:* ${serviceArea}
• *Services:* ${primaryServices}
• *Owner:* ${ownerName || "N/A"} | ${ownerEmail || "N/A"} | ${ownerPhone || "N/A"}

*🏷️ GBP Categories:*
• *Primary:* \`${(seoStrategy.primary_category as string) || "N/A"}\`
• *Secondary:* ${secondaryCategories.map((c) => `\`${c}\``).join(", ") || "N/A"}

*📝 Business Description (preview):*
\`\`\`${descPreview}\`\`\`

*📦 GBP Products:* ${products.length} generated
*🔧 GBP Services:* ${services.length} generated
*📸 Photo Filenames:*
• ${filenamesList || "None generated"}

*🔑 Target Keywords:*
${keywordsList || "None generated"}

*✅ Onboarding Checklist:*
☐ GBP — Set primary category: \`${(seoStrategy.primary_category as string) || ""}\`
☐ GBP — Add 4 secondary categories
☐ GBP — Paste business description (750 chars)
☐ GBP — Confirm hours are correct
☐ GBP — Upload photos with filenames
☐ GBP — Add all ${products.length} Products
☐ GBP — Add all ${services.length} Services
☐ Schema — Paste JSON-LD into website <head>
☐ Authority — Claim/create Yelp listing → save URL to GHL
☐ Authority — Claim/create BBB listing → save URL to GHL
☐ Authority — Claim/create Facebook Business Page → save URL to GHL
☐ Authority — Create LinkedIn Company Page → save URL to GHL
☐ BrightLocal — Create campaign in dashboard
☐ BrightLocal — Add keyword: \`${(seoStrategy.guarantee_keyword as string) || ""}\`
☐ BrightLocal — Submit to data aggregators
☐ GHL — Verify client contact tags
☐ GHL — Build review request URL`;

        const slackResponse = await axios.post(
          "https://slack.com/api/chat.postMessage",
          {
            channel: "#maps-onboarding",
            text: slackMessage,
          },
          {
            headers: {
              Authorization: `Bearer ${slackBotToken}`,
              "Content-Type": "application/json",
            },
          }
        );

        if (slackResponse.data.ok) {
          console.log("[WF01] Posted onboarding notification to #maps-onboarding");
        } else {
          console.error(`[WF01] Slack error: ${slackResponse.data.error}`);
        }
      }
    } catch (slackErr) {
      console.error("[WF01] Slack notification failed (non-critical):", slackErr);
    }

    return { success: true, client_id: clientId };
  },
});
