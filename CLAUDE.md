# MAPS AUTOPILOT — CLAUDE CODE MASTER BRIEF
## Build All 25 Workflows on Trigger.dev Autonomously

---

## YOUR MISSION

You are building **Maps Autopilot** — a local SEO automation SaaS — entirely on Trigger.dev using TypeScript. You will:

1. Set up the Trigger.dev TypeScript project
2. Build all 29 workflows as Trigger.dev tasks (25 main + WF01B + WF25a/b/c sub-tasks)
3. Deploy each one to Trigger.dev cloud
4. Test each one against the live database
5. Fix any errors autonomously and redeploy
6. Do NOT stop until all 25 tasks are deployed and passing basic tests

Run autonomously. Do not ask questions unless absolutely blocked. Fix errors yourself.

---

## SERVER ACCESS

```
VPS IP:        147.182.235.147
SSH:           ssh root@147.182.235.147
SSH Password:  Auto123!Accelerator
OS:            Ubuntu (Docker installed)
Project dir:   /opt/maps-autopilot
```

**Docker containers running on the VPS:**
```
n8n              → port 5678 (ignore — being replaced)
maps-autopilot-db → PostgreSQL, port 5432
redis            → port 6379
```

**Database connection:**
```
Host:     localhost (or 147.182.235.147 from outside)
Port:     5432
Database: maps_autopilot
User:     n8n_user
Password: (get from /opt/maps-autopilot/.env on the server)
```

---

## CREDENTIALS & API KEYS

Retrieve live values from `/opt/maps-autopilot/.env` on the server via SSH. Key variables:

```
ANTHROPIC_API_KEY         → Claude API (claude-sonnet-4-6 model)
GHL_API_KEY               → GoHighLevel
GHL_LOCATION_ID           → GoHighLevel Location
BRIGHTLOCAL_API_KEY       → BrightLocal
BRIGHTLOCAL_API_SECRET    → BrightLocal
GOOGLE_CLIENT_ID          → Google OAuth
GOOGLE_CLIENT_SECRET      → Google OAuth
GOOGLE_REFRESH_TOKEN      → Google OAuth (pre-authorized)
CANVA_API_KEY             → Canva graphic generation
SMTP_HOST                 → smtp.gmail.com
SMTP_PORT                 → 587
SMTP_USER                 → notification email
SMTP_PASS                 → Gmail app password
LATE_DEV_API_KEY          → sk_d6a0e5c782fe840a966e2e53c5a3fabd228d305d3cdf3fc2c60e6b2f304eadd4
LATE_DEV_PROFILE_ID       → 69a79df642acee650b6da78d
BANNERBEAR_API_KEY        → Bannerbear image generation
BANNERBEAR_TEMPLATE_ID    → YJBpekZX8BPrZ2XPnO
KIE_AI_API_KEY            → 3643c098f1eed0653528201263e662bc
```

Store all as environment variables in `.env` in the project root. Load with `dotenv`.

---

## TRIGGER.DEV PROJECT SETUP

```bash
# On your LOCAL machine (not the VPS):
mkdir maps-autopilot-trigger && cd maps-autopilot-trigger
npm init -y
npx trigger.dev@latest init -p proj_hbfzjpevxqjdpqoxwxik
npm install dotenv pg @anthropic-ai/sdk nodemailer axios

# Create .env with all credentials from VPS
# Then deploy:
npx trigger.dev@latest deploy
```

**Project structure:**
```
maps-autopilot-trigger/
├── .env                    ← all credentials
├── trigger.config.ts       ← Trigger.dev config
├── src/
│   └── trigger/
│       ├── wf01-client-onboarding.ts
│       ├── wf02-content-engine.ts
│       ├── wf03-review-monitor.ts
│       ├── wf04-review-request-nps.ts
│       ├── wf05-monthly-reports.ts
│       ├── wf06-photo-upload-handler.ts
│       ├── wf07-citation-builder.ts
│       ├── wf08-client-health-check.ts
│       ├── wf09-onboarding-completion.ts
│       ├── wf10-payment-failure-handler.ts
│       ├── wf11-sales-quick-audit.ts
│       ├── wf01b-website-health-check.ts
│       ├── wf12-pre-call-scoring.ts
│       ├── wf13-citation-link-builder.ts
│       ├── wf14-competitor-monitoring.ts
│       ├── wf15-geo-grid-tracker.ts
│       ├── wf16-review-velocity-tracker.ts
│       ├── wf17-content-gap-analysis.ts
│       ├── wf18-gbp-completeness-audit.ts
│       ├── wf19-schema-markup-generator.ts
│       ├── wf20-entity-authority-builder.ts
│       ├── wf21-local-link-builder.ts
│       ├── wf22-ai-search-visibility-audit.ts
│       ├── wf23-full-seo-keyword-research.ts
│       ├── wf24-automated-content-writer.ts
│       ├── wf25-batch-review-request.ts
│       ├── wf25a-daily-owner-reminder.ts
│       ├── wf25b-batch-processor.ts
│       └── wf25c-nps-handler.ts
└── src/lib/
    ├── db.ts               ← PostgreSQL connection helper
    ├── email.ts            ← SMTP helper
    ├── anthropic.ts        ← Claude API helper
    ├── ghl.ts              ← GoHighLevel helper
    ├── latedev.ts          ← Late.dev GBP posting (domain: getlate.dev)
    ├── images.ts           ← Kie.ai + Bannerbear image generation
    ├── perplexity.ts       ← Perplexity API (WF17, WF22, WF23, WF24)
    └── brightlocal.ts      ← BrightLocal API v4 with sig auth (WF03, WF07)
```

---

## DATABASE SCHEMA (Key Tables)

```sql
-- CLIENTS (main table)
clients (
  id SERIAL PRIMARY KEY,
  client_id VARCHAR UNIQUE,          -- 'client-XXXXXXXX'
  name VARCHAR,                       -- business display name
  business_name VARCHAR,
  phone VARCHAR,
  address VARCHAR,
  city VARCHAR,
  state VARCHAR,
  zip VARCHAR,
  website VARCHAR,
  years_in_business VARCHAR,
  services TEXT,                      -- Postgres array string: '{"Brake Repair","Oil Change"}'
  service_area VARCHAR,
  unique_selling_points TEXT,
  google_review_url VARCHAR,          -- NOTE: actual column name (not google_review_url)
  niche_key VARCHAR,                  -- FK to niche_configs
  tier VARCHAR DEFAULT 'core',        -- 'core', 'premium', 'full_seo'
  service_tier VARCHAR DEFAULT 'core', -- alias for tier (Premium workflows query this)
  status VARCHAR DEFAULT 'active',    -- 'active', 'paused', 'cancelled'
  onboarding_status VARCHAR DEFAULT 'survey_pending',
  
  -- GBP
  gbp_location_id VARCHAR,            -- Google Business Profile ID
  gbp_place_id VARCHAR,               -- Google Places API place_id
  gbp_primary_category VARCHAR,
  gbp_secondary_categories TEXT[],
  gbp_category_analysis JSONB,
  gbp_completeness_score INTEGER DEFAULT 0,
  gbp_completeness_audit JSONB,
  gbp_last_audit TIMESTAMP,
  
  -- Location (required for WF14 Competitor Monitoring + WF15 Geo-Grid)
  latitude DECIMAL(10,7),
  longitude DECIMAL(10,7),
  primary_keyword VARCHAR,             -- main ranking keyword (WF14/15 use this)
  territory_radius_miles INTEGER DEFAULT 5,
  
  -- Late.dev / posting
  late_account_id VARCHAR,             -- Late.dev account ID
  photo_url TEXT,                      -- single default photo (WF02 fallback)
  
  -- Reviews
  review_platform_urls JSONB,          -- {google, yelp, bbb, facebook}
  review_platform_distribution JSONB DEFAULT '{}',
  nps_routing_active BOOLEAN DEFAULT false,
  last_review_check TIMESTAMP,
  last_review_velocity JSONB,
  
  -- BrightLocal
  brightlocal_location_id VARCHAR,
  
  -- GHL
  ghl_contact_id VARCHAR,
  
  -- Owner info (for WF25 batch review reminders)
  owner_name VARCHAR,
  owner_phone VARCHAR,
  
  -- Payment
  monthly_price INTEGER,
  stripe_customer_id VARCHAR,
  stripe_subscription_id VARCHAR,
  payment_status VARCHAR DEFAULT 'active',
  failed_payment_count INTEGER DEFAULT 0,
  
  -- Guarantee
  guarantee_active BOOLEAN DEFAULT false,
  guarantee_keyword VARCHAR,
  guarantee_deadline DATE,
  market_qualification VARCHAR,
  
  -- Health scoring (WF12 Pre-Call Scoring)
  health_score INTEGER DEFAULT 100,
  health_tag VARCHAR DEFAULT 'healthy',
  health_scored_at TIMESTAMP,
  
  -- Website health (WF01B)
  website_health JSONB,
  website_health_grade VARCHAR(1),
  website_health_checked_at TIMESTAMP,
  
  -- Entity authority
  entity_profiles JSONB DEFAULT '{}',
  
  -- WordPress (Full SEO tier)
  wp_url VARCHAR,
  wp_username VARCHAR,
  wp_app_password VARCHAR,
  
  -- Tracking
  months_active INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW()
)

-- NICHE_CONFIGS (industry engine)
niche_configs (
  id SERIAL PRIMARY KEY,
  niche_key VARCHAR UNIQUE,           -- 'mechanical', 'hvac', 'dental', etc.
  niche_name VARCHAR,
  gbp_primary_category VARCHAR,
  gbp_secondary_categories TEXT[],
  industry_terms JSONB,               -- {technician_title, certification_name, search_terms}
  content_topics JSONB,               -- {topics: [...]}
  seasonal_calendar JSONB,
  post_templates JSONB,
  qa_library JSONB,
  directories JSONB,
  review_context JSONB,
  review_platforms JSONB,             -- [{name, priority}]
  call_scoring_keywords JSONB,
  gbp_products JSONB,
  geo_content_rules JSONB,
  suggested_price INTEGER
)

-- PUBLISHED_CONTENT
published_content (
  id SERIAL PRIMARY KEY,
  client_id VARCHAR,
  content_text TEXT,
  image_url VARCHAR,
  post_type VARCHAR,                  -- 'educational', 'service', 'story'
  gbp_post_id VARCHAR,               -- Late.dev post ID
  publish_date TIMESTAMP DEFAULT NOW(),
  utm_source VARCHAR DEFAULT 'google',
  utm_medium VARCHAR DEFAULT 'gbp',
  utm_campaign VARCHAR
)

-- REVIEWS
reviews (
  id SERIAL PRIMARY KEY,
  client_id VARCHAR,
  platform VARCHAR,                   -- 'google', 'yelp', 'bbb'
  reviewer_name VARCHAR,
  rating INTEGER,
  review_text TEXT,
  review_date TIMESTAMP,
  responded BOOLEAN DEFAULT false,
  response_text TEXT,
  brightlocal_review_id VARCHAR
)

-- REVIEW_REQUESTS
review_requests (
  id SERIAL PRIMARY KEY,
  client_id VARCHAR,
  customer_name VARCHAR,
  customer_phone VARCHAR,
  target_platform VARCHAR,
  review_link VARCHAR,
  nps_score INTEGER,
  routed_to VARCHAR,                  -- 'public_review' or 'private_feedback'
  status VARCHAR DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT NOW()
)

-- CLIENT_PHOTOS
client_photos (
  id SERIAL PRIMARY KEY,
  client_id VARCHAR,
  photo_url VARCHAR,
  caption VARCHAR,
  status VARCHAR DEFAULT 'pending',
  uploaded_at TIMESTAMP DEFAULT NOW()
)

-- SYSTEM_ALERTS
system_alerts (
  id SERIAL PRIMARY KEY,
  alert_type VARCHAR,
  severity VARCHAR,                   -- 'critical', 'warning', 'info'
  source_workflow VARCHAR,
  affected_client_id VARCHAR,
  message TEXT,
  resolved BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW()
)

-- PROSPECT_AUDITS
prospect_audits (
  id SERIAL PRIMARY KEY,
  business_name VARCHAR,
  city VARCHAR,
  niche_key VARCHAR,
  gbp_review_count INTEGER,
  gbp_avg_rating DECIMAL,
  top_competitors JSONB,
  market_competition_level VARCHAR,
  guarantee_eligible BOOLEAN,
  existing_client_conflict BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW()
)

-- ONBOARDING_TASKS (VA workflow tracking)
onboarding_tasks (
  id SERIAL PRIMARY KEY,
  client_id VARCHAR REFERENCES clients(client_id),
  survey_sent_at TIMESTAMP,
  survey_completed_at TIMESTAMP,
  survey_reminder_count INTEGER DEFAULT 0,
  onboarding_status VARCHAR DEFAULT 'survey_pending',
  va_started_at TIMESTAMP,
  va_completed_at TIMESTAMP,
  va_name VARCHAR,
  gbp_categories_set BOOLEAN DEFAULT false,
  gbp_description_updated BOOLEAN DEFAULT false,
  gbp_photos_uploaded BOOLEAN DEFAULT false,
  gbp_products_created BOOLEAN DEFAULT false,
  gbp_products_count INTEGER DEFAULT 0,
  gbp_services_created BOOLEAN DEFAULT false,
  gbp_qa_seeded BOOLEAN DEFAULT false,
  gbp_qa_count INTEGER DEFAULT 0,
  yelp_listing_url VARCHAR,
  bbb_listing_url VARCHAR,
  facebook_listing_url VARCHAR,
  linkedin_listing_url VARCHAR,
  citation_email_created VARCHAR,
  brightlocal_campaign_id VARCHAR,
  call_tracking_number VARCHAR,
  review_kit_sent BOOLEAN DEFAULT false,
  qa_verified BOOLEAN DEFAULT false,
  qa_verified_by VARCHAR,
  qa_verified_at TIMESTAMP,
  qa_notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
)

-- GBP_PRODUCTS
gbp_products (
  id SERIAL PRIMARY KEY,
  client_id VARCHAR REFERENCES clients(client_id),
  product_name VARCHAR NOT NULL,
  product_description TEXT NOT NULL,
  product_category VARCHAR,
  gbp_product_id VARCHAR,
  image_url VARCHAR,
  image_generated_by VARCHAR DEFAULT 'kie_ai',
  status VARCHAR DEFAULT 'draft',
  published_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
)

-- COMPETITOR_ANALYSIS
competitor_analysis (
  id SERIAL PRIMARY KEY,
  client_id VARCHAR REFERENCES clients(client_id),
  competitor_name VARCHAR NOT NULL,
  competitor_gbp_id VARCHAR,
  competitor_address TEXT,
  competitor_categories TEXT[],
  competitor_review_count INTEGER,
  competitor_avg_rating DECIMAL(3,2),
  competitor_gbp_post_frequency VARCHAR,
  target_keyword VARCHAR,
  rank_position INTEGER,
  analysis_date DATE NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
)

-- CANCELLATION_EVENTS
cancellation_events (
  id SERIAL PRIMARY KEY,
  client_id VARCHAR REFERENCES clients(client_id),
  requested_at TIMESTAMP DEFAULT NOW(),
  requested_reason TEXT,
  client_month_number INTEGER,
  save_offer_type VARCHAR,
  save_offer_details TEXT,
  outcome VARCHAR DEFAULT 'pending',
  outcome_date TIMESTAMP,
  final_reason TEXT,
  feedback TEXT,
  save_discount_amount INTEGER,
  save_discount_months INTEGER,
  created_at TIMESTAMP DEFAULT NOW()
)

-- CLIENT_CALLS (AM call logging)
client_calls (
  id SERIAL PRIMARY KEY,
  client_id VARCHAR REFERENCES clients(client_id),
  call_date TIMESTAMP DEFAULT NOW(),
  call_completed BOOLEAN DEFAULT false,
  caller_name VARCHAR,
  sentiment VARCHAR,
  notes TEXT,
  upsell_opportunity BOOLEAN DEFAULT false,
  upsell_details TEXT,
  review_coaching_level INTEGER,
  client_asking_for_reviews BOOLEAN,
  follow_up_needed BOOLEAN DEFAULT false,
  follow_up_notes TEXT,
  follow_up_completed BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW()
)

-- SEO_STRATEGIES (Full SEO tier)
seo_strategies (
  id SERIAL PRIMARY KEY,
  client_id VARCHAR REFERENCES clients(client_id),
  target_keywords JSONB,
  location_pages JSONB,
  content_calendar JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
)

-- CONTENT_QUEUE (Full SEO tier — pages to write)
content_queue (
  id SERIAL PRIMARY KEY,
  client_id VARCHAR REFERENCES clients(client_id),
  page_title VARCHAR NOT NULL,
  target_keyword VARCHAR NOT NULL,
  target_city VARCHAR NOT NULL,
  slug VARCHAR,
  status VARCHAR DEFAULT 'pending',
  wordpress_post_id INTEGER,
  published_url VARCHAR,
  published_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
)

-- PREMIUM TABLES

-- GEO_GRID_SNAPSHOTS (WF15 output)
geo_grid_snapshots (
  id SERIAL PRIMARY KEY,
  client_id VARCHAR REFERENCES clients(client_id),
  keyword VARCHAR NOT NULL,
  grid_size VARCHAR DEFAULT '7x7',
  grid_data JSONB,
  avg_rank DECIMAL,
  top3_percentage DECIMAL,
  scan_date TIMESTAMP DEFAULT NOW()
)

-- CONTENT_GAP_REPORTS (WF17 output)
content_gap_reports (
  id SERIAL PRIMARY KEY,
  client_id VARCHAR REFERENCES clients(client_id),
  trending_queries JSONB,
  gaps_identified JSONB,
  recommended_topics JSONB,
  report_date TIMESTAMP DEFAULT NOW()
)

-- AI_SEARCH_AUDITS (WF22 output)
ai_search_audits (
  id SERIAL PRIMARY KEY,
  client_id VARCHAR REFERENCES clients(client_id),
  perplexity_visible BOOLEAN DEFAULT false,
  brave_visible BOOLEAN DEFAULT false,
  chatgpt_visible BOOLEAN DEFAULT false,
  visibility_score INTEGER DEFAULT 0,
  cited_urls JSONB,
  recommendations JSONB,
  audit_date TIMESTAMP DEFAULT NOW()
)

-- COMPETITOR_SNAPSHOTS (WF14 — overwritten weekly)
competitor_snapshots (
  id SERIAL PRIMARY KEY,
  client_id VARCHAR REFERENCES clients(client_id),
  competitor_place_id VARCHAR(200),
  competitor_name TEXT,
  review_count INTEGER,
  rating DECIMAL(2,1),
  rank_position INTEGER,
  scan_date DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
)

-- COMPETITOR_HISTORY (WF14 — append-only)
competitor_history (
  id SERIAL PRIMARY KEY,
  client_id VARCHAR REFERENCES clients(client_id),
  competitor_place_id VARCHAR(200),
  competitor_name TEXT,
  review_count INTEGER,
  rating DECIMAL(2,1),
  rank_position INTEGER,
  review_delta INTEGER,
  client_position INTEGER,
  scan_date DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
)

-- GEO_GRID_HISTORY (WF15 — append-only for monthly reports)
geo_grid_history (
  id SERIAL PRIMARY KEY,
  client_id VARCHAR REFERENCES clients(client_id),
  keyword TEXT NOT NULL,
  top3_pct INTEGER,
  top10_pct INTEGER,
  avg_rank VARCHAR(10),
  top3_count INTEGER,
  not_ranking_count INTEGER,
  trend VARCHAR(20),
  scan_date DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
)

-- ENTITY_AUDITS (WF20 output)
entity_audits (
  id SERIAL PRIMARY KEY,
  client_id VARCHAR REFERENCES clients(client_id),
  platform VARCHAR NOT NULL,
  profile_found BOOLEAN DEFAULT false,
  nap_consistent BOOLEAN,
  profile_url VARCHAR,
  issues JSONB,
  audit_date TIMESTAMP DEFAULT NOW()
)

-- LINK_OPPORTUNITIES (WF21 output)
link_opportunities (
  id SERIAL PRIMARY KEY,
  client_id VARCHAR REFERENCES clients(client_id),
  source_name VARCHAR NOT NULL,
  source_url VARCHAR,
  opportunity_type VARCHAR,
  outreach_email_draft TEXT,
  status VARCHAR DEFAULT 'identified',
  created_at TIMESTAMP DEFAULT NOW()
)
```

---

## ALL 25 WORKFLOWS — COMPLETE SPECS

---

### WF01 — Client Onboarding Survey Webhook
**Trigger:** HTTP webhook POST (path: `/ghl-client-onboarding`)
**Schedule:** On-demand webhook from GHL survey completion

**Actual Flow (15 nodes, battle-tested):**
1. Receive GHL webhook payload
2. **Flatten Webhook Data** — normalize GHL field names (GHL sends capitalized names like "Business Name", "Complete Business Address"). Extract `niche_key` from `customData.niche_key` or `Niche Key` field, default to `mechanical`
3. **Load Niche Config** — `SELECT * FROM niche_configs WHERE niche_key = $1`
4. **Check Quick Audit Data** — `SELECT * FROM prospect_audits WHERE LOWER(business_name) = LOWER($1) AND LOWER(city) = LOWER($2) LIMIT 1`
5. If audit exists: merge audit data (competitor_data, market_level) into payload
6. **Merge All Data** — combine webhook fields + niche config into single object
7. **Agent 1 — SEO Strategist** (Claude claude-sonnet-4-6, temp 0.3, max 2000 tokens)
8. **Agent 3 — GBP Products Generator** (Claude claude-sonnet-4-6, temp 0.4, max 4000 tokens)
9. **Execute Query** — build client record with GHL field name fallbacks, generate `client_id = 'client-' + Date.now()`
10. **Save Client to DB** — INSERT INTO clients (25 columns) RETURNING client_id
11. **Save Client Photos** — extract photos from GHL form (`Business Photos` field), handle arrays + comma-separated strings
12. **Insert Client Photos** — `INSERT INTO client_photos (client_id, photo_url, photo_source) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING`
13. **Email VA** — setup instructions to henry@ with CC to chris@ and tom@
14. **Respond to Webhook** — return success

**⚠️ NOT implemented (from old spec):**
- Website Health Check sub-call (WF01B) — not wired in
- Q&A pair generation — Agent 1 generates Q&A *topics*, not full written pairs
- Client confirmation email — only VA/AM email is sent

**GHL webhook field mapping (dual-format handling):**
```typescript
// Your Execute Query node handles both GHL and standard formats:
const businessName = data['Business Name'] || data.business_name || '';
const address = data['Complete Business Address'] || data.business_address || '';
const phone = data['Business Phone'] || data.business_phone || '';
const website = data['Website (if any)'] || data['Website URL'] || data.business_website || '';
const yearsInBusiness = data['Years in Business'] || data.years_in_business || 0;
const primaryServices = data['Primary Services'] || data.primary_services || '';
const serviceArea = data['Target Service Area'] || data.service_area || '';
const usp = data['What Makes You Different?'] || data.unique_selling_points || '';
const reviewUrl = data['Google Review Link | URL'] || data.google_review_url || '';
const contactId = data.contact_id || data['contact_id'] || null;
```

**Agent 1 — SEO Strategist prompt:**
```
You are an expert local SEO strategist specializing in {niche_name} businesses.

CLIENT DATA:
- Business: {business_name}
- Location: {business_address}, Service area: {service_area}
- Services: {primary_services}
- Years in business: {years_in_business}
- USP: {unique_selling_points}

NICHE CONTEXT:
- GBP Primary Category: {gbp_primary_category}
- Secondary Categories: {gbp_secondary_categories}
- Common search terms: {industry_terms}

AUDIT DATA (if available): {competitor_data}
Market Level: {market_level}

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
}
```

**Agent 3 — GBP Products prompt:**
```
Create 8-12 GBP Product listings for {business_name}, a {niche_name} in {service_area}.

Services offered: {primary_services}
Years in business: {years_in_business}
USP: {unique_selling_points}
Niche GBP Products templates: {gbp_products from niche_config}

For EACH Product:
- Max 1000 characters description
- Structure: what the service is → common problems it solves → how this business delivers it → full CTA with business name, address, phone
- Factual and specific — NOT sales copy
- Include relevant stats, timelines, or data points
- Naturally include service + city keywords

Output as JSON array: [{"title": "", "description": "", "category": ""}]
```

**Save Client to DB — actual INSERT columns:**
```sql
INSERT INTO clients (
  client_id, name, business_name, address, phone, website,
  years_in_business, services, service_area, unique_selling_points,
  google_review_url, niche_key, status, onboarding_status,
  tier, service_tier, gbp_primary_category, gbp_secondary_categories,
  gbp_category_analysis, guarantee_keyword, market_qualification,
  wp_url, wp_username, wp_app_password, ghl_contact_id
) VALUES ($1, $2, ..., $25)
RETURNING client_id
```

---

### WF02 — GMB Content Engine (Mon/Wed/Fri)
**Trigger:** Cron — Monday, Wednesday, Friday at 8:00 AM CT
**Schedule:** `0 8 * * 1,3,5` (cron expression)
**Also:** Manual trigger for testing

**Actual Flow (21 nodes, battle-tested):**
1. **Get Active Clients + Niche Config** — `SELECT c.*, nc.* FROM clients c JOIN niche_configs nc ON c.niche_key = nc.niche_key WHERE c.status = 'active'`
2. **Set Post Type + Season** — determines post type by day of week and current season:
   ```typescript
   const postTypes = { 1: 'educational_faq', 3: 'service_spotlight', 5: 'behind_the_scenes' };
   const seasons = { 0:'winter',1:'winter',2:'spring',3:'spring',4:'spring',5:'summer',6:'summer',7:'summer',8:'fall',9:'fall',10:'fall',11:'winter' };
   ```
3. **Agent 2 — Content Generator** (Claude claude-sonnet-4-6, temp 0.6, max 1500 tokens)
4. **Kie.ai — Create Task** → Wait 10s → Poll → check `data.state` contains "success"
5. **Prepare Bannerbear Data** — select image source:
   ```typescript
   // Current: single fallback from clients.photo_url
   image_url = client.photo_url || JSON.parse(kieai.data.resultJson).resultUrls[0]
   // TODO: upgrade to random selection from client_photos table
   ```
6. **Bannerbear — Overlay Text** → Wait 10s → Poll → max 20 attempts
7. **Post to GBP via Late.dev** — publish with image
8. **Prepare DB Log** → **Log Post to DB** — INSERT INTO published_content

**⚠️ Current limitation:** Uses `$(...).first().json` — processes only first active client per run. For multi-client, Trigger.dev version must loop with `Promise.all()` or batch.

**⚠️ Photo selection gap:** WF01 saves photos to `client_photos` table, but WF02 only reads `clients.photo_url` (single URL fallback). For Trigger.dev, implement random selection:
```typescript
const { rows: [photo] } = await query(
  `SELECT photo_url FROM client_photos WHERE client_id = $1 AND active = true ORDER BY RANDOM() LIMIT 1`,
  [client.client_id]
);
const clientPhoto = photo?.photo_url || null;
// If no client photo, generate via Kie.ai
```

**Kie.ai API (actual endpoints):**
```
// Step 1: Create image generation task
POST https://api.kie.ai/api/v1/jobs/createTask
Headers: Authorization: Bearer {KIE_AI_API_KEY}
Body: {
  "model": "gpt-image/1.5-text-to-image",
  "input": {
    "prompt": "{image_prompt from Claude}",
    "aspect_ratio": "3:2",
    "quality": "medium"
  }
}
Response: { "data": { "taskId": "xxx" } }

// Step 2: Poll until complete (every 10s)
GET https://api.kie.ai/api/v1/jobs/recordInfo?taskId={taskId}
Headers: Authorization: Bearer {KIE_AI_API_KEY}
Success when: data.state contains "success"
Image URL: JSON.parse(data.resultJson).resultUrls[0]
```

**Late.dev API (actual endpoint — NOTE: domain is getlate.dev):**
```
POST https://getlate.dev/api/v1/posts
Headers: Authorization: Bearer {LATE_DEV_API_KEY}
Body: {
  "content": "{post_text}",
  "platforms": [{ "platform": "googlebusiness", "accountId": "{client.late_account_id}" }],
  "mediaItems": [{ "type": "image", "url": "{bannerbear_image_url}" }],
  "publishNow": true
}
Response: { "post": { "platforms": [{ "platformPostId": "xxx" }] } }
```

**Bannerbear API (actual template modifications):**
```
POST https://api.bannerbear.com/v2/images
Headers: Authorization: Bearer {BANNERBEAR_API_KEY}
Body: {
  "template": "YJBpekZX8BPrZ2XPnO",
  "modifications": [
    { "name": "background_image", "image_url": "{photo_or_kie_image_url}" },
    { "name": "Headline", "text": "{graphic_overlay from Claude}" },
    { "name": "business_name", "text": "{client.business_name}" }
  ]
}
Poll: GET /v2/images/{uid} every 10s until status === "completed"
Max 20 poll attempts, then throw timeout error.
Result: response.image_url
```

**Agent 2 — Content Generator prompt (actual):**
```
Write a Google Business Profile post for {business_name}, a {niche_name} in {service_area}.

POST TYPE: {post_type}
CURRENT MONTH: {current_month}
SEASON: {season}

SEASONAL CONTEXT:
{seasonal_calendar[season] || 'Use general seasonal context'}

SERVICES: {services}
USP: {unique_selling_points}
PHONE: {phone}

CONTENT RULES:
- 150-300 words
- First sentence MUST state the service + city name
- Include phone number as primary CTA
- NO sales fluff, NO "We're the best!", NO generic marketing
- Write factual, specific, helpful content that answers real questions
- Include specific data points, numbers, or timelines
- For Monday FAQ: start with question, answer directly
- For Wednesday service: list what's included, when needed, timeline
- For Friday behind-scenes: human story with specific details

UTM LINK: {website}?utm_source=google&utm_medium=gbp&utm_campaign={post_type}&utm_content={post_date}

GRAPHIC TEXT:
- TEXT OVERLAY: 5-8 words, ALL CAPS
- SUBTITLE: 3-5 words

Content must be useful to both humans AND AI systems (ChatGPT, Gemini).
Include 3-5 relevant hashtags.

CRITICAL: Return ONLY raw JSON. No markdown, no code fences.
{
  "post_text": "full post content",
  "graphic_overlay": "5-8 WORD HEADLINE",
  "graphic_subtitle": "3-5 words",
  "image_prompt": "descriptive prompt for Kie.ai image generation",
  "utm_url": "full UTM-tagged URL"
}
```

**Log Post to DB:**
```sql
INSERT INTO published_content (client_id, content_text, image_url, post_type, gbp_post_id, publish_date)
VALUES ($1, $2, $3, $4, $5, NOW())
```

---

### WF03 — Review Monitor + Auto-Respond
**Trigger:** Cron — Every 2 hours
**Schedule:** `0 */2 * * *`

**Flow:**
1. Query active clients
2. For each client:
   a. Call BrightLocal API to fetch new reviews since last check
   b. For 4-5 star reviews: call Claude to generate response → post via BrightLocal
   c. For 1-3 star reviews: call Claude to draft response → email AM for approval
   d. Insert all reviews into `reviews` table
   e. Update `clients.last_review_check`

**BrightLocal fetch reviews:**
```
GET https://tools.brightlocal.com/seo-tools/api/v4/client/reviews
Params: api-key={key}, sig={sig}, expires={ts}, client-id={brightlocal_client_id}
```

**BrightLocal post response:**
```
POST https://tools.brightlocal.com/seo-tools/api/v4/client/reviews/{review_id}/respond
```

**Claude review response prompt:**
```
Write a professional response to this {rating}-star Google review for {business_name}.
Review: "{review_text}"
Reviewer: {reviewer_name}
Business niche: {niche_name}
Tone: {review_context.positive_tone or review_context.negative_tone}

Rules:
- Max 200 characters for positive reviews
- Max 350 characters for negative reviews  
- Never be defensive
- For negative: apologize, offer to resolve offline, include phone number
- For positive: thank them, mention a specific service if mentioned

Return JSON: {"response_text": "..."}
```

---

### WF04 — Review Request System (NPS Routing)
**Trigger:** HTTP webhook (POST from GHL universal review form)
**Schedule:** On-demand webhook

**GHL form URL pattern:** `https://mapsautopilot.com/review/{client_id}`

**Flow:**
1. Receive webhook: `{client_id, customer_name, customer_phone}`
2. Look up client from DB
3. Log request to `review_requests` table
4. Wait 2 hours (Trigger.dev `wait.for({hours: 2})`)
5. Send NPS text via GHL: "Hi {customer_name}, how was your experience at {business_name}? Reply 1-5"
6. Wait for NPS reply webhook (up to 24 hours)
7. If 4-5: determine platform by rotation → send review link text
8. If 1-3: capture feedback privately → notify AM
9. Update `review_requests` with outcome

**Platform rotation logic:**
```typescript
// Get platform distribution from niche_config.review_platforms
// Count recent requests per platform
// Route to lowest-count platform that hasn't exceeded its percentage
// Default: Google 70%, Yelp 15%, BBB 10%, niche 5%
```

**GHL send SMS:**
```
POST https://rest.gohighlevel.com/v1/conversations/messages
Headers: Authorization: Bearer {GHL_API_KEY}
Body: {
  "type": "SMS",
  "contactId": "{ghl_contact_id}",
  "message": "{text}"
}
```

---

### WF05 — Monthly Performance Reports
**Trigger:** Cron — 1st of every month at 7:00 AM CT
**Schedule:** `0 7 1 * *`

**Flow:**
1. Query all active clients
2. For each client:
   a. Pull review data from DB (30-day window)
   b. Pull published content count from DB
   c. Pull call tracking data (GHL)
   d. Call Claude to generate narrative summary
   e. Build Money Sheet (calls → estimated jobs → revenue → ROI)
   f. Email report to Account Manager
3. Send operator digest with all client summaries

**Money Sheet formula:**
```typescript
const estimatedJobs = Math.floor(monthlyCallCount * 0.3); // 30% close rate
const avgJobValue = nicheConfig.avg_job_value || 350;
const estimatedRevenue = estimatedJobs * avgJobValue;
const roi = ((estimatedRevenue - client.monthly_price) / client.monthly_price * 100).toFixed(0);
```

**Claude report prompt:**
```
Write a concise monthly performance summary for {business_name}.
Data:
- New reviews this month: {review_count} (avg rating: {avg_rating})
- GBP posts published: {post_count}
- Estimated tracked calls: {call_count}
- Month number: {months_active}

Write 3-4 sentences. Be specific. Highlight wins. Note any concerns.
End with one recommended action for next month.
Return JSON: {"summary": "..."}
```

---

### WF06 — Photo Upload Handler
**Trigger:** HTTP webhook (POST when client submits photos via GHL form)

**Flow:**
1. Receive webhook: `{client_id, photo_urls[], captions[]}`
2. Look up client
3. Insert photos into `client_photos` table
4. Email AM: "New photos from {business_name} — download, keyword-rename, upload to GBP"
5. Send webhook response

---

### WF07 — Citation Builder
**Trigger:** Cron — Every Monday at 9:00 AM CT
**Schedule:** `0 9 * * 1`

**Flow:**
1. Query active clients
2. For each client:
   a. Call BrightLocal citation health check API
   b. Check for NAP inconsistencies (name, address, phone)
   c. If inconsistencies found: email AM with list of fixes needed
   d. Log status to DB

**BrightLocal citation check:**
```
GET https://tools.brightlocal.com/seo-tools/api/v4/citations
Params: api-key={key}, sig={sig}, expires={ts}, client-id={id}
```

---

### WF08 — Client Health Check (Daily)
**Trigger:** Cron — Every day at 6:00 AM CT
**Schedule:** `0 6 * * *`

**Flow:**
1. Query all active clients
2. For each client, check:
   - No new reviews in 30+ days → WARNING
   - No GBP post published in 7+ days → WARNING
   - Monthly report not sent this month → WARNING
   - Guarantee deadline within 14 days → ALERT
   - Guarantee deadline passed → CRITICAL
   - Payment failed 2+ times → ALERT
3. For each issue found: insert into `system_alerts`
4. Email operator daily digest of all alerts
5. For CRITICAL alerts: immediate email

---

### WF09 — Onboarding Completion Handler
**Trigger:** HTTP webhook (POST when AM submits completion form)

**Flow:**
1. Receive webhook with all onboarding task completions
2. Update `onboarding_tasks` table
3. Update `clients.status` to 'active'
4. Update `clients` with GBP location ID, BrightLocal campaign ID, call tracking number
5. Activate all automated workflows for this client
6. Email operator: "Client {name} is live — QA check needed"
7. Schedule Review Request Kit send (via GHL) for 24 hours later

---

### WF10 — Payment Failure Handler
**Trigger:** HTTP webhook (POST from Stripe on payment failure)

**Flow:**
1. Receive Stripe webhook: `{customer_id, failure_reason}`
2. Look up client by `stripe_customer_id`
3. Increment `failed_payment_count`
4. If count === 1: email client gentle reminder
5. If count === 2: email AM to call client
6. If count >= 3: set `clients.status = 'paused'`, set `clients.payment_status = 'past_due'`
7. Email operator with client details

---

### WF11 — Sales Quick Audit Tool
**Trigger:** HTTP webhook (POST from sales rep's GHL form)

**Flow:**
1. Receive: `{business_name, city, niche, sales_rep_email}`
2. Call Google Places API to find business
3. Pull competitor data (top 5 in same niche, same city)
4. Check territory conflict in DB
5. Determine market tier (A/B/C) based on competitor count
6. Call Claude to format one-page audit report
7. Cache in `prospect_audits` table
8. Email formatted report to sales rep

**Google Places API:**
```
GET https://maps.googleapis.com/maps/api/place/textsearch/json
Params: query={business_name}+{city}, type=establishment, key={GOOGLE_API_KEY}
```

**Market tier logic:**
```typescript
const competitorCount = competitors.length;
const tier = competitorCount < 20 ? 'A' : competitorCount < 50 ? 'B' : 'C';
const guaranteeEligible = tier === 'A' || tier === 'B';
```

---

### WF01B — Website Health Check (Sub-task of WF01)
**Trigger:** Called automatically by WF01 during client onboarding
**Also runs:** Weekly cron for active clients — every Sunday at 5:00 AM
**Trigger.dev:** Export as a separate task, called via `wf01bWebsiteHealthCheck.trigger()`

**Checks:**
1. Site loads (HTTP GET, timeout 10s)
2. SSL certificate (https://)
3. Mobile friendly (Google PageSpeed API)
4. Load speed (PageSpeed performance score)
5. LocalBusiness schema (scan HTML for JSON-LD)
6. GBP URL match

**PageSpeed API:**
```
GET https://www.googleapis.com/pagespeedonline/v5/runPagespeed
Params: url={website}, strategy=mobile, category=performance
```

**Grade logic:**
```typescript
if (!siteLoads) grade = 'F';
else if (criticalIssues >= 2) grade = 'D';
else if (criticalIssues === 1) grade = 'C';
else if (warningIssues >= 2) grade = 'B';
else grade = 'A';
```

**Output passed back to WF01:**
```typescript
{ health_grade, issues[], critical_count, warning_count, am_summary }
```

---

### WF12 — Pre-Call Scoring
**Trigger:** Cron — Daily at 7:00 AM CT (runs before AM morning check-in)
**Schedule:** `0 7 * * *`
**Also triggered by:** Webhook when AM opens a client record in GHL

**Purpose:** Score each active client 1-100 before the AM's daily work. Surfaces who needs attention today. Replaces manual gut-check with data.

**Flow:**
1. Query all active clients
2. For each client, score across 5 dimensions:
   - **Review velocity** (0-20): reviews in last 30 days vs previous 30 days
   - **Content health** (0-20): posts published on schedule vs missed
   - **Engagement signals** (0-20): call tracking trend (up/flat/down)
   - **Onboarding completeness** (0-20): all setup tasks done vs pending
   - **Guarantee risk** (0-20): days to deadline, current rank vs target
3. Compute total score (0-100)
4. Tag each client: `healthy` (80+), `watch` (60-79), `at_risk` (40-59), `critical` (<40)
5. Update `clients.health_score` and `clients.health_tag` in DB
6. Email AM prioritized daily list: critical clients first, then at-risk

**Scoring logic:**
```typescript
const reviewScore = Math.min(20, (recentReviews / Math.max(prevReviews, 1)) * 20);
const contentScore = (postsThisMonth / expectedPosts) * 20;
const callScore = callTrend === 'up' ? 20 : callTrend === 'flat' ? 10 : 0;
const onboardingScore = onboardingComplete ? 20 : (tasksComplete / totalTasks) * 20;
const guaranteeScore = !guaranteeActive ? 20 : daysToDeadline > 30 ? 20 : (daysToDeadline / 30) * 20;
const totalScore = reviewScore + contentScore + callScore + onboardingScore + guaranteeScore;
```

**DB columns needed:**
```sql
ALTER TABLE clients ADD COLUMN IF NOT EXISTS health_score INTEGER DEFAULT 100;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS health_tag VARCHAR DEFAULT 'healthy';
ALTER TABLE clients ADD COLUMN IF NOT EXISTS health_scored_at TIMESTAMP;
```

---

### WF13 — Citation & Link Builder
**Trigger:** Cron — Every 2 weeks, Wednesday at 10:00 AM CT
**Schedule:** `0 10 * * 3` (bi-weekly)

**Flow:**
1. Query premium clients
2. For each client:
   a. Check BrightLocal for missing directory submissions
   b. Submit to data aggregators: Data Axle, Neustar, Foursquare, Infogroup
   c. Check for local link opportunities (chamber of commerce, local blogs)
   d. Email AM with link-building opportunities list

---

### WF14 — Competitor Monitoring
**Trigger:** Cron — Every Sunday at 7:00 AM CT
**Schedule:** `0 7 * * 0`

**Flow:**
1. Query premium clients
2. For each client:
   a. Call Google Places to get competitor GBP data
   b. Check competitor review counts, ratings, post frequency
   c. Compare to client's metrics
   d. If competitor gained 10+ reviews in 30 days: alert AM
   e. Save to `competitor_analysis` table
   f. Email AM weekly competitive summary

---

### WF15 — Geo-Grid Ranking Tracker
**Trigger:** Cron — Every Monday at 8:00 AM CT
**Schedule:** `0 8 * * 1`

**Flow:**
1. Query premium clients with Local Falcon configured
2. For each client:
   a. Call Local Falcon API to run geo-grid rank check
   b. Save results to `ranking_snapshots` table
   c. Compare to previous week
   d. If ranking dropped 3+ positions: alert AM immediately
   e. Include in monthly report data

**Local Falcon API:**
```
POST https://api.localfalcon.com/v1/scan
Headers: X-API-KEY: {LOCAL_FALCON_API_KEY}
Body: {
  "keyword": "{guarantee_keyword}",
  "lat": "{client.latitude}",
  "lng": "{client.longitude}",
  "grid_size": "7x7",
  "zoom": 13
}
```

---

### WF16 — Review Velocity Tracker
**Trigger:** Cron — Every Friday at 4:00 PM CT
**Schedule:** `0 16 * * 5`

**Flow:**
1. Query all active clients
2. For each client:
   a. Count reviews in last 7 days vs previous 7 days
   b. If velocity dropped > 50%: flag for AM
   c. If 0 reviews in 14 days: send reminder to AM to coach client on asking for reviews
   d. Update `clients.last_review_velocity`

---

### WF17 — Content Gap Analysis
**Trigger:** Cron — 1st of every month at 8:00 AM CT (premium clients only)
**Schedule:** `0 8 1 * *`

**Flow:**
1. Query premium clients
2. For each client:
   a. Call Perplexity API to find trending local search queries in niche
   b. Compare to existing published content topics
   c. Identify gaps (topics not covered)
   d. Call Claude to prioritize gaps by search intent
   e. Email AM with next month's recommended content topics

**Perplexity API:**
```
POST https://api.perplexity.ai/chat/completions
Headers: Authorization: Bearer {PERPLEXITY_API_KEY}
Body: {
  "model": "llama-3.1-sonar-small-128k-online",
  "messages": [{"role": "user", "content": "What are the top questions people search for about {niche} services in {city} right now?"}]
}
```

---

### WF18 — GBP Completeness Audit
**Trigger:** Cron — Every 2 weeks, Tuesday at 9:00 AM CT

**Flow:**
1. Query all active clients
2. For each client:
   a. Call Google My Business API to get current GBP data
   b. Score completeness: photos (20%), hours (15%), description (15%), products (20%), Q&A (15%), posts (15%)
   c. Update `clients.gbp_completeness_score`
   d. If score dropped or < 80: email AM with what's missing
   e. If score improved: note it in monthly report

---

### WF19 — Schema Markup Generator
**Trigger:** Sub-task called by WF01 during onboarding

**Flow:**
1. Receive client data
2. Call Claude to generate LocalBusiness JSON-LD schema
3. Email to AM: "Add this schema to client's website"

**Claude schema prompt:**
```
Generate LocalBusiness JSON-LD schema for:
Business: {business_name}
Type: {schema_type from niche_config}
Address: {full_address}
Phone: {phone}
Website: {website}
Hours: {business_hours}
Services: {primary_services}
Geo: {latitude}, {longitude}

Return valid JSON-LD only. No explanation.
```

---

### WF20 — Entity Authority Builder
**Trigger:** Cron — Weekly, Thursday at 10:00 AM CT
**Schedule:** `0 10 * * 4`

**Flow:**
1. Query premium clients
2. For each client:
   a. Check presence on entity authority platforms (LinkedIn, BBB, Yelp, Facebook, Nextdoor)
   b. Verify all profiles have consistent NAP
   c. Check for duplicate/spam listings
   d. Email AM with entity health report + action items

---

### WF21 — Local Link Builder
**Trigger:** Cron — Monthly, 15th at 9:00 AM CT

**Flow:**
1. Query premium clients
2. For each client:
   a. Search for local link opportunities (chamber, associations, sponsorships)
   b. Call Claude to draft outreach email templates
   c. Email AM with 3-5 link opportunities + ready-to-send outreach emails

---

### WF22 — AI Search Visibility Audit
**Trigger:** Cron — Monthly, 5th at 8:00 AM CT

**Flow:**
1. Query all active clients
2. For each client:
   a. Query Perplexity, Brave Search with "{service} in {city}" prompts
   b. Check if client appears in AI-generated answers
   c. Check if client's website is cited
   d. Score AI visibility: 0-100
   e. Email AM with AI visibility report
   f. If score < 50: include specific content recommendations

---

### WF23 — Full SEO Keyword Research
**Trigger:** Sub-task called during Full SEO onboarding

**Flow:**
1. Receive: `{client_id, target_city, niche_key}`
2. Call Perplexity to research local search landscape
3. Call Claude to generate:
   - 50 target keywords with intent classification
   - 12 location pages needed (city + surrounding suburbs)
   - Content calendar for 6 months
4. Save to `seo_strategies` table
5. Email AM with full keyword research document

---

### WF24 — Automated Content Writer (Full SEO)
**Trigger:** Cron — Every Tuesday and Thursday at 7:00 AM CT (Full SEO clients only)
**Schedule:** `0 7 * * 2,4`

**Flow:**
1. Query Full SEO clients
2. For each client:
   a. Get next location page from `content_queue` table
   b. Call Perplexity for real local data (landmarks, neighborhoods, stats)
   c. Call Claude to write 1,500-2,000 word localized SEO page
   d. Post directly to WordPress via REST API
   e. Ping Google Search Console to index new URL
   f. Log to `published_content`

**WordPress API:**
```
POST https://{client_website}/wp-json/wp/v2/pages
Headers: Authorization: Bearer {client_wp_token}
Body: {
  "title": "{page_title}",
  "content": "{html_content}",
  "status": "publish",
  "slug": "{keyword-city}"
}
```

**Claude content prompt:**
```
Write a 1,500-2,000 word location page for a {niche_name} business.
Target keyword: "{keyword} in {city}"
Business: {business_name}
Local data from research: {perplexity_data}

Requirements:
- H1: Include exact keyword
- Include 3-4 H2 sections
- FAQ section at the bottom (5 questions, LLM-optimized format)
- Include local landmarks/neighborhoods naturally
- Include business name, phone, address in schema-friendly format
- No fluff, no sales copy — factual, direct, helpful
- Format for AI search (ChatGPT, Gemini, Perplexity citations)

Return: {"title": "...", "html_content": "full HTML"}
```

---

### WF25 — Batch Review Request (Parent Orchestrator)
**Trigger:** Cron — Every day at 6:00 PM CT (business closing time)
**Schedule:** `0 18 * * *`
**Also triggered by:** HTTP webhook when business owner submits batch form

**Purpose:** Orchestrates the daily review request system. Has two entry points:
1. **Cron (6PM daily):** Triggers WF25a to remind owners who haven't submitted today
2. **Webhook:** Receives batch customer submissions from the owner form → triggers WF25b

**Flow:**
1. If cron trigger → call `wf25aDailyOwnerReminder.trigger()`
2. If webhook trigger → validate payload → call `wf25bBatchProcessor.trigger({ client_id, customers })`
3. At end of day (11:59 PM cron or separate schedule): compile daily digest → email AM

**Webhook payload:**
```json
{
  "client_id": "client-1772735253089",
  "customers": [
    { "name": "John Smith", "phone": "8175551234" },
    { "name": "Maria Garcia", "phone": "8175555678" }
  ]
}
```

**Daily digest email to AM:**
```
Subject: "📊 Daily Review Request Summary — {date}"
Body:
  King City Auto: 5 customers submitted, 3 NPS sent, 2 reviews posted
  {client_name}: {submitted} submitted, {sent} NPS sent, {reviews} reviews posted
  ...
  TOTAL: {total_submitted} submitted | {total_sent} NPS sent | {total_reviews} reviews posted
  
  ⚠️ Clients with ZERO submissions today: {list_of_inactive_clients}
```

---

### WF25a — Daily Owner Reminder (Sub-task of WF25)
**Trigger:** Called by WF25 cron at 6:00 PM CT daily
**Trigger.dev:** Export as separate task, called via `wf25aDailyOwnerReminder.trigger()`
**File:** `src/trigger/wf25a-daily-owner-reminder.ts`

**Purpose:** Text business owners who haven't submitted any customers today. This is the #1 driver of review volume — if the owner doesn't submit names, no reviews get requested.

**Flow:**
1. Query all active clients where review system is enabled:
   ```sql
   SELECT c.client_id, c.business_name, c.phone, c.name as owner_name,
          c.google_review_url, c.niche_key
   FROM clients c
   WHERE c.status = 'active'
   AND c.nps_routing_active = true
   ```
2. For each client, check if they submitted customers today:
   ```sql
   SELECT COUNT(*) as today_count
   FROM review_requests
   WHERE client_id = $1
   AND created_at > CURRENT_DATE
   ```
3. If `today_count === 0`: send reminder SMS via GHL
4. If `today_count > 0`: skip (they already submitted today)
5. Log reminder sent to `system_alerts` (type: 'review_reminder_sent')

**Owner reminder SMS:**
```
"Hi {owner_name}! Closing up? Submit today's customers for Google reviews here: 
{form_link}. Takes 2 min. Your clients will thank you! 🌟"
```

**Form link pattern:** `https://mapsautopilot.com/batch-review/{client_id}`

**Escalation logic (built into reminder text):**
- Days 1-7 of no submissions: Standard reminder (above)
- Days 8-14: Urgent reminder: "Hey {owner_name}, it's been over a week since you submitted customers. The review system works best with consistent submissions — even 2-3 per day adds up fast. {form_link}"
- Days 15+: Stop texting owner, alert AM instead: "⚠️ {business_name} hasn't submitted customers in {days} days. Schedule a coaching call."

```typescript
// Escalation check
const { rows: [lastSubmission] } = await query(
  `SELECT MAX(created_at) as last_submit FROM review_requests WHERE client_id = $1`,
  [client.client_id]
);
const daysSinceSubmit = lastSubmission?.last_submit 
  ? Math.floor((Date.now() - new Date(lastSubmission.last_submit).getTime()) / 86400000)
  : 999;

if (daysSinceSubmit >= 15) {
  // Alert AM, don't text owner
  await sendEmail(AM_EMAIL, `⚠️ Review Stall: ${client.business_name}`, 
    `No customer submissions in ${daysSinceSubmit} days. Schedule coaching call.`);
} else if (daysSinceSubmit >= 8) {
  // Urgent reminder
  await sendSMS(client.ghl_contact_id, urgentReminderText);
} else {
  // Standard reminder
  await sendSMS(client.ghl_contact_id, standardReminderText);
}
```

---

### WF25b — Batch Processor (Sub-task of WF25)
**Trigger:** Called by WF25 webhook handler when owner submits customer batch
**Trigger.dev:** Export as separate task, called via `wf25bBatchProcessor.trigger({ client_id, customers })`
**File:** `src/trigger/wf25b-batch-processor.ts`

**Purpose:** Takes a batch of customer names/phones from the owner form, logs them all to DB, then fans out individual NPS flows with a 2-hour delay per customer.

**Flow:**
1. Receive payload: `{ client_id, customers: [{ name, phone }] }`
2. Look up client from DB
3. Load niche config for review platform rotation rules
4. For each customer in the batch:
   a. Insert into `review_requests` table:
      ```sql
      INSERT INTO review_requests (client_id, customer_name, customer_phone, status, created_at)
      VALUES ($1, $2, $3, 'pending', NOW())
      RETURNING id
      ```
   b. Trigger WF25c with a 2-hour delay:
      ```typescript
      await wf25cNpsHandler.trigger({
        review_request_id: insertedId,
        client_id: client.client_id,
        customer_name: customer.name,
        customer_phone: customer.phone,
        business_name: client.business_name,
        service_area: client.service_area || client.city,
        review_platform_urls: client.review_platform_urls,
        google_review_url: client.google_review_url,
        niche_key: client.niche_key,
        ghl_contact_id: null // Will be created in WF25c
      }, { delay: { hours: 2 } });
      ```
5. Send immediate confirmation to owner via SMS:
   ```
   "Got it! {customer_count} customers submitted. They'll each get a review 
   request in about 2 hours. Thanks for keeping up the momentum! 💪"
   ```
6. Log batch submission to DB:
   ```sql
   INSERT INTO system_alerts (alert_type, severity, source_workflow, affected_client_id, message)
   VALUES ('batch_review_submitted', 'info', 'wf25b', $1, '{count} customers submitted')
   ```

**Deduplication check (prevent double-texting):**
```typescript
// Before inserting, check if this customer was already submitted today
const { rows: existing } = await query(
  `SELECT id FROM review_requests 
   WHERE client_id = $1 AND customer_phone = $2 
   AND created_at > CURRENT_DATE`,
  [client_id, customer.phone]
);
if (existing.length > 0) {
  // Skip — already submitted today
  continue;
}
```

---

### WF25c — NPS Reply Handler (Sub-task of WF25b)
**Trigger:** Called by WF25b with 2-hour delay per customer
**Also triggered by:** Webhook when GHL receives NPS reply from customer
**Trigger.dev:** Export as separate task, called via `wf25cNpsHandler.trigger()`
**File:** `src/trigger/wf25c-nps-handler.ts`

**Purpose:** Sends the NPS text to one customer, waits for their reply, then routes to the appropriate review platform or captures negative feedback privately.

**Flow:**
1. Receive payload with customer + client details
2. Create or look up GHL contact for the customer:
   ```typescript
   // Create contact in GHL
   const contact = await ghlClient.post('/contacts', {
     firstName: payload.customer_name,
     phone: payload.customer_phone,
     tags: ['review_pending', `customer_of_${payload.client_id}`],
     customField: {
       review_google_link: payload.google_review_url,
       review_business_name: payload.business_name
     }
   });
   ```
3. Send NPS text via GHL:
   ```
   "Hi {customer_name}! Thanks for visiting {business_name}. 
   How was your experience? Reply with a number 1-5 
   (5 = amazing, 1 = needs work)"
   ```
4. Update DB status:
   ```sql
   UPDATE review_requests SET nps_sent_at = NOW(), status = 'nps_sent' 
   WHERE id = $1
   ```
5. Wait for NPS reply webhook (GHL inbound message trigger):
   - Use Trigger.dev `wait.for({ id: "nps-reply-{review_request_id}", timeout: "24h" })`
   - GHL automation forwards inbound SMS to webhook: `/webhook/nps-reply`
6. Process NPS reply:

**If rating is 4 or 5 (positive):**
```typescript
// Platform rotation — weighted random
const rand = Math.floor(Math.random() * 100) + 1;
const platforms = client.review_platform_urls || {};
let platform: string, link: string;

if (rand <= 70 && platforms.google) {
  platform = 'google'; link = platforms.google;
} else if (rand <= 85 && platforms.yelp) {
  platform = 'yelp'; link = platforms.yelp;
} else if (rand <= 95 && platforms.bbb) {
  platform = 'bbb'; link = platforms.bbb;
} else {
  platform = 'google'; link = client.google_review_url;
}

// Send review link
await sendSMS(contact.id, 
  `Thank you! We'd really appreciate a quick review — it helps other people in ${payload.service_area} find ${payload.business_name}. ${link}`
);

// Update DB
await query(
  `UPDATE review_requests SET nps_rating = $1, nps_replied_at = NOW(), 
   review_platform_sent = $2, review_link_sent = $3, routed_to = 'public_review',
   status = 'review_sent' WHERE id = $4`,
  [rating, platform, link, payload.review_request_id]
);
```

**If rating is 1, 2, or 3 (negative):**
```typescript
// Capture privately — don't send to public review platform
await sendSMS(contact.id, 
  "We're sorry to hear that. What could we have done better? Your feedback stays private and helps us improve."
);

// Notify AM immediately
await sendEmail(AM_EMAIL, 
  `⚠️ Negative NPS — ${payload.business_name} (${rating}⭐)`,
  `Negative feedback from ${payload.customer_name} for ${payload.business_name}.
   Rating: ${rating}/5
   Phone: ${payload.customer_phone}
   Follow up with the client.`
);

// Update DB
await query(
  `UPDATE review_requests SET nps_rating = $1, nps_replied_at = NOW(), 
   routed_to = 'private_feedback', status = 'negative_captured' WHERE id = $2`,
  [rating, payload.review_request_id]
);
```

**If no reply after 24 hours:**
```typescript
// Send one follow-up
await sendSMS(contact.id,
  `Hi ${payload.customer_name}, just checking in — how was your visit to ${payload.business_name}? Reply 1-5`
);

// Wait another 24 hours
// If still no reply → mark as no_response
await query(
  `UPDATE review_requests SET status = 'no_response' WHERE id = $1`,
  [payload.review_request_id]
);
```

**NPS reply webhook payload (from GHL):**
```json
{
  "contactId": "ghl-contact-id",
  "message": "5",
  "review_request_id": 123
}
```

---

### WF25 Sub-workflow DB Table Addition

```sql
-- Track batch submissions separately for daily digest
CREATE TABLE IF NOT EXISTS batch_submissions (
  id SERIAL PRIMARY KEY,
  client_id VARCHAR REFERENCES clients(client_id),
  customer_count INTEGER NOT NULL,
  submitted_at TIMESTAMP DEFAULT NOW(),
  reminder_type VARCHAR, -- 'standard', 'urgent', 'am_alert', 'none'
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_batch_submissions_client ON batch_submissions(client_id);
CREATE INDEX idx_batch_submissions_date ON batch_submissions(submitted_at);
```

---

### WF25 File Structure Summary

| File | Task ID | Trigger |
|------|---------|---------|
| `wf25-batch-review-request.ts` | `wf25-batch-review-request` | Cron daily 6PM + webhook |
| `wf25a-daily-owner-reminder.ts` | `wf25a-daily-owner-reminder` | Called by WF25 cron |
| `wf25b-batch-processor.ts` | `wf25b-batch-processor` | Called by WF25 webhook |
| `wf25c-nps-handler.ts` | `wf25c-nps-handler` | Called by WF25b (2hr delay) + NPS reply webhook |

---

## SHARED HELPER MODULES

### src/lib/db.ts
```typescript
import { Pool } from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const pool = new Pool({
  host: process.env.DB_HOST || '147.182.235.147',
  port: 5432,
  database: 'maps_autopilot',
  user: 'n8n_user',
  password: process.env.DB_PASSWORD,
  ssl: false
});

export const query = (text: string, params?: any[]) => pool.query(text, params);
export const getClient = () => pool.connect();
```

### src/lib/anthropic.ts
```typescript
import Anthropic from '@anthropic-ai/sdk';
const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function callClaude(prompt: string, systemPrompt?: string): Promise<string> {
  const response = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 4096,
    system: systemPrompt || 'You are a local SEO expert. Always return valid JSON.',
    messages: [{ role: 'user', content: prompt }]
  });
  return response.content[0].type === 'text' ? response.content[0].text : '';
}
```

### src/lib/email.ts
```typescript
import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT),
  auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
});

export async function sendEmail(to: string, subject: string, html: string) {
  return transporter.sendMail({
    from: process.env.SMTP_USER,
    to, subject, html
  });
}
```

### src/lib/ghl.ts
```typescript
import axios from 'axios';

const GHL_BASE = 'https://rest.gohighlevel.com/v1';
const ghlClient = axios.create({
  baseURL: GHL_BASE,
  headers: { Authorization: `Bearer ${process.env.GHL_API_KEY}` }
});

export async function sendSMS(contactId: string, message: string) {
  return ghlClient.post('/conversations/messages', {
    type: 'SMS',
    contactId,
    message
  });
}

export async function getContact(contactId: string) {
  const { data } = await ghlClient.get(`/contacts/${contactId}`);
  return data.contact;
}

export async function addTag(contactId: string, tag: string) {
  return ghlClient.post(`/contacts/${contactId}/tags`, { tags: [tag] });
}

export async function removeTag(contactId: string, tag: string) {
  return ghlClient.delete(`/contacts/${contactId}/tags`, { data: { tags: [tag] } });
}

export async function createTask(contactId: string, title: string, dueDate: string) {
  return ghlClient.post('/contacts/tasks', {
    contactId,
    title,
    dueDate,
    status: 'incomplete'
  });
}
```

### src/lib/latedev.ts
```typescript
import axios from 'axios';

const lateClient = axios.create({
  baseURL: 'https://getlate.dev/api/v1',    // NOTE: domain is getlate.dev, NOT api.late.dev
  headers: { Authorization: `Bearer ${process.env.LATE_DEV_API_KEY}` }
});

export async function publishGBPPost(
  accountId: string, 
  content: string, 
  imageUrl?: string
): Promise<{ postId: string }> {
  const body: any = {
    content,
    platforms: [{ platform: 'googlebusiness', accountId }],
    publishNow: true
  };
  if (imageUrl) {
    body.mediaItems = [{ type: 'image', url: imageUrl }];
  }
  const { data } = await lateClient.post('/posts', body);
  return { postId: data.post?.platforms?.[0]?.platformPostId || '' };
}
```

### src/lib/images.ts
```typescript
import axios from 'axios';

// === Kie.ai — GPT-Image-1.5 (actual API endpoints) ===
const kieClient = axios.create({
  baseURL: 'https://api.kie.ai/api/v1',
  headers: { Authorization: `Bearer ${process.env.KIE_AI_API_KEY}` }
});

export async function generateImage(prompt: string): Promise<string> {
  // Step 1: Create task
  const { data: createResp } = await kieClient.post('/jobs/createTask', {
    model: 'gpt-image/1.5-text-to-image',
    input: { prompt, aspect_ratio: '3:2', quality: 'medium' }
  });
  const taskId = createResp.data.taskId;

  // Step 2: Poll until complete (max 30 attempts, 10s each = 5 min timeout)
  for (let i = 0; i < 30; i++) {
    await new Promise(r => setTimeout(r, 10000));
    const { data: pollResp } = await kieClient.get(`/jobs/recordInfo?taskId=${taskId}`);
    if (pollResp.data.state?.includes('success')) {
      return JSON.parse(pollResp.data.resultJson).resultUrls[0];
    }
    if (pollResp.data.state?.includes('fail')) {
      throw new Error(`Kie.ai task failed: ${pollResp.data.state}`);
    }
  }
  throw new Error('Kie.ai image generation timed out after 5 minutes');
}

// === Bannerbear — text overlay on images ===
const bbClient = axios.create({
  baseURL: 'https://api.bannerbear.com/v2',
  headers: { Authorization: `Bearer ${process.env.BANNERBEAR_API_KEY}` }
});

export async function overlayText(
  backgroundImageUrl: string,
  headline: string,
  businessName: string
): Promise<string> {
  const { data } = await bbClient.post('/images', {
    template: process.env.BANNERBEAR_TEMPLATE_ID,  // YJBpekZX8BPrZ2XPnO
    modifications: [
      { name: 'background_image', image_url: backgroundImageUrl },
      { name: 'Headline', text: headline },
      { name: 'business_name', text: businessName }
    ]
  });

  // Poll until complete (max 20 attempts, 10s each)
  for (let i = 0; i < 20; i++) {
    await new Promise(r => setTimeout(r, 10000));
    const { data: poll } = await bbClient.get(`/images/${data.uid}`);
    if (poll.status === 'completed' && poll.image_url) {
      return poll.image_url;
    }
  }
  throw new Error('Bannerbear image timed out after 20 attempts');
}
```

### src/lib/perplexity.ts
```typescript
import axios from 'axios';

export async function queryPerplexity(prompt: string): Promise<string> {
  const { data } = await axios.post('https://api.perplexity.ai/chat/completions', {
    model: 'sonar',
    messages: [{ role: 'user', content: prompt }]
  }, {
    headers: { Authorization: `Bearer ${process.env.PERPLEXITY_API_KEY}` }
  });
  return data.choices[0].message.content;
}
```

### src/lib/brightlocal.ts
```typescript
import crypto from 'crypto';
import axios from 'axios';

const API_KEY = process.env.BRIGHTLOCAL_API_KEY!;
const API_SECRET = process.env.BRIGHTLOCAL_API_SECRET!;

function generateAuth(): { sig: string; expires: number } {
  const expires = Math.floor(Date.now() / 1000) + 1800;
  const sig = crypto.createHmac('sha1', API_SECRET).update(API_KEY + expires).digest('hex');
  return { sig, expires };
}

const blClient = axios.create({ baseURL: 'https://tools.brightlocal.com/seo-tools/api/v4' });

export async function fetchReviews(locationId: string, startDate?: string) {
  const { sig, expires } = generateAuth();
  const { data } = await blClient.get('/reviews', {
    params: { 'api-key': API_KEY, sig, expires, 'location-id': locationId, 'start-date': startDate }
  });
  return data;
}

export async function checkCitations(locationId: string) {
  const { sig, expires } = generateAuth();
  const { data } = await blClient.get('/citations', {
    params: { 'api-key': API_KEY, sig, expires, 'location-id': locationId }
  });
  return data;
}
```

---

## TRIGGER.DEV CONFIG FILE

### trigger.config.ts
```typescript
import { defineConfig } from "@trigger.dev/sdk/v3";

export default defineConfig({
  project: "proj_hbfzjpevxqjdpqoxwxik",
  runtime: "node",
  logLevel: "log",
  retries: {
    enabledInDev: true,
    default: {
      maxAttempts: 3,
      minTimeoutInMs: 1000,
      maxTimeoutInMs: 10000,
      factor: 2,
    },
  },
  dirs: ["./src/trigger"],
});
```

---

## COMPLETE .env FILE TEMPLATE

```bash
# === DATABASE ===
DB_HOST=147.182.235.147
DB_PORT=5432
DB_NAME=maps_autopilot
DB_USER=n8n_user
DB_PASSWORD=             # Get from /opt/maps-autopilot/.env on VPS

# === AI / LLM ===
ANTHROPIC_API_KEY=       # Claude API (model: claude-sonnet-4-6)
PERPLEXITY_API_KEY=      # Perplexity (WF17, WF22, WF23, WF24)

# === GOOGLE ===
GOOGLE_CLIENT_ID=        # Google OAuth
GOOGLE_CLIENT_SECRET=    # Google OAuth
GOOGLE_REFRESH_TOKEN=    # Google OAuth (pre-authorized)
GOOGLE_API_KEY=          # Google Places API (WF11) + PageSpeed (WF01B)

# === GBP POSTING ===
LATE_DEV_API_KEY=sk_d6a0e5c782fe840a966e2e53c5a3fabd228d305d3cdf3fc2c60e6b2f304eadd4
LATE_DEV_PROFILE_ID=69a79df642acee650b6da78d

# === CRM ===
GHL_API_KEY=             # GoHighLevel
GHL_LOCATION_ID=         # GoHighLevel Location

# === REVIEWS & CITATIONS ===
BRIGHTLOCAL_API_KEY=     # BrightLocal
BRIGHTLOCAL_API_SECRET=  # BrightLocal (for sig generation)

# === IMAGE GENERATION ===
KIE_AI_API_KEY=3643c098f1eed0653528201263e662bc
BANNERBEAR_API_KEY=      # Bannerbear
BANNERBEAR_TEMPLATE_ID=YJBpekZX8BPrZ2XPnO

# === GEO-GRID TRACKING (Premium) ===
LOCAL_FALCON_API_KEY=    # Local Falcon (WF15)

# === AI SEARCH VISIBILITY (Premium/Full SEO) ===
BRAVE_SEARCH_API_KEY=    # Brave Search API (WF22)

# === EMAIL ===
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=               # notification email
SMTP_PASS=               # Gmail app password

# === TRIGGER.DEV ===
TRIGGER_SECRET_KEY=      # From Trigger.dev dashboard
```

---

## TRIGGER.DEV TASK PATTERN

Every task follows this pattern:

```typescript
import { task, schedules, wait } from "@trigger.dev/sdk/v3";
import { query } from "../lib/db";
import { callClaude } from "../lib/anthropic";
import { sendEmail } from "../lib/email";

// WEBHOOK TASK
export const wf01ClientOnboarding = task({
  id: "wf01-client-onboarding",
  retry: { maxAttempts: 3, minTimeoutInMs: 5000 },
  run: async (payload: { business_name: string; niche_key: string; /* etc */ }) => {
    // 1. Load niche config
    const { rows: [niche] } = await query(
      'SELECT * FROM niche_configs WHERE niche_key = $1', 
      [payload.niche_key]
    );
    
    // 2. Call Claude
    const strategy = JSON.parse(await callClaude(`...prompt...`));
    
    // 3. Insert to DB
    await query(
      'INSERT INTO clients (client_id, business_name, ...) VALUES ($1, $2, ...)',
      [clientId, payload.business_name, ...]
    );
    
    // 4. Send email
    await sendEmail('am@mapsautopilot.com', 'New Client Ready', `<html>...</html>`);
    
    return { success: true, client_id: clientId };
  }
});

// CRON TASK
export const wf02ContentEngine = schedules.task({
  id: "wf02-content-engine",
  cron: "0 8 * * 1,3,5",
  retry: { maxAttempts: 2 },
  run: async (payload) => {
    const { rows: clients } = await query(
      "SELECT c.*, n.* FROM clients c JOIN niche_configs n ON c.niche_key = n.niche_key WHERE c.status = 'active'"
    );
    
    // Process all clients
    await Promise.all(clients.map(async (client) => {
      try {
        // ... generate and publish content
      } catch (error) {
        await query(
          'INSERT INTO system_alerts (alert_type, severity, source_workflow, affected_client_id, message) VALUES ($1, $2, $3, $4, $5)',
          ['content_publish_failed', 'warning', 'wf02', client.client_id, error.message]
        );
      }
    }));
  }
});
```

---

## WEBHOOK ENDPOINT REGISTRATION

After deploying to Trigger.dev, register these webhooks in GHL:

| Workflow | Trigger.dev endpoint | GHL event |
|----------|---------------------|-----------|
| WF01 | `/trigger/wf01-client-onboarding` | Survey completed |
| WF04 | `/trigger/wf04-review-request-nps` | Review form submitted |
| WF06 | `/trigger/wf06-photo-upload-handler` | Photo form submitted |
| WF09 | `/trigger/wf09-onboarding-completion` | AM completion form |
| WF10 | `/trigger/wf10-payment-failure-handler` | Stripe payment failed |
| WF11 | `/trigger/wf11-sales-quick-audit` | Sales audit form |
| WF25 | `/trigger/wf25-batch-review-request` | Owner batch form |

---

## TEST CLIENT DATA

Use this for testing:
```
client_id:      client-1772735253089
business_name:  King City Auto
late_account_id: 69a89ef7dc8cab9432b88ab1
email:          tom@haildentpro.com (test account)
niche_key:      mechanical
city:           King City, TX
```

---

## NICHE_CONFIGS SEED DATA (required — WF01 and WF02 fail without this)

```sql
INSERT INTO niche_configs (
  niche_key, niche_name, gbp_primary_category, gbp_secondary_categories,
  industry_terms, content_topics, seasonal_calendar, post_templates,
  qa_library, directories, review_context, review_platforms,
  call_scoring_keywords, schema_type, photo_context,
  survey_services_list, survey_business_types, gbp_products, suggested_price
) VALUES (
  'mechanical',
  'Auto Repair / Mechanical',
  'Auto Repair Shop',
  ARRAY['Car Repair and Maintenance', 'Oil Change Service', 'Brake Shop', 'Transmission Shop'],
  '{"technician_title":"ASE Certified Technician","certification_name":"ASE Certification","search_terms":["auto repair","mechanic","car repair","brake repair","oil change","transmission repair","check engine light","ac repair"]}'::jsonb,
  '{"topics":["Brake maintenance tips","Oil change frequency","Check engine light causes","Tire rotation schedule","AC repair signs","Transmission warning signs","Pre-purchase inspections","Seasonal car care","Battery health","Fluid checks"]}'::jsonb,
  '{"spring":"AC prep and coolant flush","summer":"AC repair and road trip prep","fall":"Winterization and brake check","winter":"Battery and heating system"}'::jsonb,
  '{"educational":"Did you know? {fact about car maintenance}. At {business_name} in {city}, we...","service":"Your {service} specialists in {city}. {business_name} offers...","story":"Behind the scenes at {business_name}: {story about a recent job}"}'::jsonb,
  '{"pairs":[{"q":"How often should I change my oil?","a":"Most modern vehicles need an oil change every 5,000-7,500 miles."},{"q":"How do I know if my brakes need replacing?","a":"Common signs include squealing noises, vibration when braking, and longer stopping distances."},{"q":"What does a check engine light mean?","a":"It can indicate anything from a loose gas cap to a serious engine issue. Get a diagnostic scan."},{"q":"How often should I rotate my tires?","a":"Every 5,000-7,500 miles, or with every oil change."},{"q":"When should I replace my battery?","a":"Most car batteries last 3-5 years. Test annually after year 3."}]}'::jsonb,
  '{"primary":["Google Business Profile","Yelp","BBB"],"secondary":["YellowPages","Mechanic Advisor","RepairPal","CarTalk","Angi"]}'::jsonb,
  '{"positive_tone":"warm, grateful, mention specific service if possible","negative_tone":"empathetic, professional, offer offline resolution with phone number"}'::jsonb,
  '[{"name":"Google","priority":1,"percentage":70},{"name":"Yelp","priority":2,"percentage":15},{"name":"BBB","priority":3,"percentage":10},{"name":"Facebook","priority":4,"percentage":5}]'::jsonb,
  '{"positive":["appointment","booked","schedule","quote","estimate","bring it in"],"negative":["just checking","how much","price only"]}'::jsonb,
  'AutoRepair',
  'Shop interior, technician working, customer handoff, equipment close-ups',
  '["Brake Repair","Oil Change","Engine Repair","Transmission","AC Repair","Diagnostics","Electrical","Suspension","Exhaust","General Maintenance"]'::jsonb,
  '["Independent Shop","Franchise","Dealership","Mobile Mechanic","Specialty Shop"]'::jsonb,
  '[{"name":"Full Brake Service","description":"Complete brake inspection, pad replacement, rotor resurfacing, and fluid flush.","category":"Brake Services"},{"name":"Synthetic Oil Change","description":"Full synthetic oil and filter change with multi-point inspection.","category":"Maintenance"},{"name":"Check Engine Diagnostics","description":"Computer diagnostic scan with detailed report and repair estimate.","category":"Diagnostics"},{"name":"AC Repair & Recharge","description":"Full AC system inspection, leak detection, and refrigerant recharge.","category":"Climate Control"},{"name":"Transmission Service","description":"Transmission fluid flush, filter replacement, and performance check.","category":"Drivetrain"},{"name":"Pre-Purchase Inspection","description":"150-point inspection before you buy a used vehicle.","category":"Inspections"},{"name":"Tire Rotation & Balance","description":"4-tire rotation, balance, and tread depth check.","category":"Tires"},{"name":"Battery Testing & Replacement","description":"Load test and replacement with nationwide warranty.","category":"Electrical"}]'::jsonb,
  500
) ON CONFLICT (niche_key) DO NOTHING;
```

---

## DEPLOYMENT ORDER

Build and deploy in this order (dependencies first):

1. `src/lib/*.ts` — all shared helpers (db, anthropic, email, ghl, latedev, images, perplexity, brightlocal)
2. WF01B (Website Health Check — sub-task called by WF01, also cron Sun 5AM)
3. WF19 (Schema Generator — called by WF01)
4. WF01 (Client Onboarding — tests the full DB + Claude + email stack)
5. WF11 (Sales Quick Audit — fast feedback loop for sales team)
6. WF12 (Pre-Call Scoring — daily AM priority list)
7. WF02 (Content Engine — highest business value)
8. WF03 (Review Monitor)
8. WF04 (Review Request NPS)
9. WF05 (Monthly Reports)
10. WF06-WF10 (remaining Core workflows)
11. WF13-WF22 (Premium workflows)
12. WF23-WF25 (Full SEO workflows)

---

## ERROR HANDLING RULES

1. Always wrap API calls in try/catch
2. Log failures to `system_alerts` table, never let an error crash the whole batch
3. For failed client iterations: log and continue to next client
4. Retry failed Bannerbear image generation up to 3 times with 5s delay
5. If Late.dev publish fails: log error, do NOT retry (avoid duplicate posts)
6. If Claude API returns invalid JSON: retry once with "Return ONLY valid JSON" appended

---

## DONE CRITERIA

You are done when:
- All 29 tasks are deployed to Trigger.dev (25 main + WF01B + WF25a/b/c)
- WF01 passes a test run with King City test data
- WF02 passes a test run (generates a post for King City)
- WF08 passes a test run (health check runs without error)
- WF11 passes a test run (audit generates for a test business)
- WF25b passes a test run (batch processor accepts test customer list)
- WF25c passes a test run (NPS handler sends text and processes reply)
- No critical errors in Trigger.dev dashboard

Report back with: list of deployed tasks, any failed tasks, and any tasks needing manual credential setup.

---

## MIGRATION CONTEXT (n8n → Trigger.dev)

This project is migrating from n8n (self-hosted, Docker) to Trigger.dev (TypeScript, cloud-hosted). Rationale:
- Claude Code can read/write/fix TypeScript directly
- Git-protected (version control)
- Stack traces with line numbers (vs n8n's opaque errors)
- OpenClaw as orchestrator enables autonomous overnight builds

**VPS role going forward:** PostgreSQL database host ONLY. n8n will be decommissioned once Trigger.dev is live.

### What worked in n8n (confirmed via execution logs):
- WF01 — Client Onboarding (functional, but GHL webhook field mismatch in production)
- WF04 — NPS Review Request
- WF06 — Photo Upload Handler
- WF10 — Payment Failure Handler
- WF11 — Sales Quick Audit Tool
- WF12 — Pre-Call Scoring
- WF13 — Citation & Link Builder
- WF25a — Daily Review Request Trigger

### Known issues to fix during migration:
1. WF01 — GHL production webhook sends different field names than test payload
2. WF05 — No call data until GBP Performance API approved (2-3 week wait)
3. SMTP — Connection timeout; Gmail app password may be needed
4. BrightLocal — REST API v4/lm endpoints deprecated, use Management API v2 at developer.brightlocal.com
5. No campaign creation via BrightLocal API — manual setup required per client

### Image generation stack (replaces Canva):
- **Primary:** Client-submitted real photos from `client_photos` table (Google AI detection risk with generated images)
- **AI generation:** Kie.ai using GPT-Image-1 model (4 credits/image, better quality than alternatives)
- **Text overlay:** Bannerbear (template-based, add business name / headline / phone)
- **Fallback only:** Use Kie.ai-generated images when no client photos available

---

## KEY ARCHITECTURAL DECISIONS

1. **Niche-agnostic by design** — `niche_configs` DB table drives all industry-specific content. New niches = DB insert only, no code changes.
2. **No call tracking number swaps** — Can hurt local SEO citations. Use BrightLocal + GBP Insights data instead.
3. **Absorb website fixes during onboarding** — Reduces early churn. Not an upsell.
4. **WF25 = batch SMS at closing time** — Owner texts all customers at day-end via a form link. Eliminates POS integration dependency.
5. **Google AI image detection risk** — Use client-submitted real photos as primary; Kie.ai as fallback only.
6. **Late.dev** — $19/mo backup for GBP posting while GBP API approval pending (2-3 week wait).
7. **BrightLocal MCP server** — 34 read-only tools available (reviews, rankings, citations, grid). No campaign creation via API.
8. **WF25a/25b/25c sub-workflows** — Fully specified below. WF25a = daily owner reminder, WF25b = batch processor, WF25c = NPS reply handler with platform rotation.

---

## WEBHOOK ENDPOINTS (register in GHL after Trigger.dev deploy)

| Workflow | GHL Event | Webhook Path |
|----------|-----------|--------------|
| WF01 | Survey completed | /webhook/survey-submitted |
| WF04 | Review form submitted | /webhook/review-request |
| WF06 | Photo form submitted | /webhook/photo-upload |
| WF09 | AM completion form | /webhook/onboarding-complete |
| WF10 | Stripe payment failed | /webhook/stripe-payment-failed |
| WF11 | Sales audit form | /webhook/quick-audit |
| WF25 | Owner batch form | /webhook/batch-review-request |

---

## PENDING DB MIGRATIONS (run on VPS before testing)

```sql
-- Connect: docker exec -it maps-autopilot-db psql -U n8n_user -d maps_autopilot

-- Photo URL (simple version - may already exist)
ALTER TABLE clients ADD COLUMN IF NOT EXISTS photo_url TEXT;

-- Client health scoring
ALTER TABLE clients ADD COLUMN IF NOT EXISTS health_score INTEGER DEFAULT 100;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS health_tag VARCHAR DEFAULT 'healthy';
ALTER TABLE clients ADD COLUMN IF NOT EXISTS health_scored_at TIMESTAMP;

-- Website health
ALTER TABLE clients ADD COLUMN IF NOT EXISTS website_health JSONB;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS website_health_grade VARCHAR(1);
ALTER TABLE clients ADD COLUMN IF NOT EXISTS website_health_checked_at TIMESTAMP;

-- GBP completeness
ALTER TABLE clients ADD COLUMN IF NOT EXISTS gbp_completeness_score INTEGER DEFAULT 0;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS gbp_completeness_audit JSONB;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS gbp_last_audit TIMESTAMP;

-- Entity authority
ALTER TABLE clients ADD COLUMN IF NOT EXISTS entity_profiles JSONB DEFAULT '{}';

-- Review platform distribution
ALTER TABLE clients ADD COLUMN IF NOT EXISTS review_platform_distribution JSONB DEFAULT '{}';
ALTER TABLE clients ADD COLUMN IF NOT EXISTS nps_routing_active BOOLEAN DEFAULT false;

-- client_photos table (for multi-photo support)
CREATE TABLE IF NOT EXISTS client_photos (
  id SERIAL PRIMARY KEY,
  client_id TEXT REFERENCES clients(client_id),
  photo_url TEXT NOT NULL,
  photo_source TEXT DEFAULT 'upload',
  uploaded_at TIMESTAMP DEFAULT NOW(),
  active BOOLEAN DEFAULT TRUE
);

-- Geo-grid snapshots (Premium WF15)
CREATE TABLE IF NOT EXISTS geo_grid_snapshots (
  id SERIAL PRIMARY KEY,
  client_id VARCHAR REFERENCES clients(client_id),
  keyword VARCHAR NOT NULL,
  grid_size VARCHAR DEFAULT '7x7',
  grid_data JSONB,
  avg_rank DECIMAL,
  top3_percentage DECIMAL,
  scan_date TIMESTAMP DEFAULT NOW()
);

-- Content queue (Full SEO WF24)
CREATE TABLE IF NOT EXISTS content_queue (
  id SERIAL PRIMARY KEY,
  client_id VARCHAR REFERENCES clients(client_id),
  page_title VARCHAR NOT NULL,
  target_keyword VARCHAR NOT NULL,
  target_city VARCHAR NOT NULL,
  slug VARCHAR,
  status VARCHAR DEFAULT 'pending',
  wordpress_post_id INTEGER,
  published_url VARCHAR,
  published_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

-- SEO strategies (Full SEO WF23)
CREATE TABLE IF NOT EXISTS seo_strategies (
  id SERIAL PRIMARY KEY,
  client_id VARCHAR REFERENCES clients(client_id),
  target_keywords JSONB,
  location_pages JSONB,
  content_calendar JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- AI search audits (Premium WF22)
CREATE TABLE IF NOT EXISTS ai_search_audits (
  id SERIAL PRIMARY KEY,
  client_id VARCHAR REFERENCES clients(client_id),
  perplexity_visible BOOLEAN DEFAULT false,
  brave_visible BOOLEAN DEFAULT false,
  chatgpt_visible BOOLEAN DEFAULT false,
  visibility_score INTEGER DEFAULT 0,
  cited_urls JSONB,
  recommendations JSONB,
  audit_date TIMESTAMP DEFAULT NOW()
);

-- Content gap reports (Premium WF17)
CREATE TABLE IF NOT EXISTS content_gap_reports (
  id SERIAL PRIMARY KEY,
  client_id VARCHAR REFERENCES clients(client_id),
  trending_queries JSONB,
  gaps_identified JSONB,
  recommended_topics JSONB,
  report_date TIMESTAMP DEFAULT NOW()
);

-- Grant permissions
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO n8n_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO n8n_user;
```

<!-- SESSION_START -->
## Current Session
<!-- Auto-managed by session_init hook. Overwritten each session. -->
- Resume: `claude --resume b9f4d301-04a7-4045-8c3c-e5d069157c73`
- Team: `pact-b9f4d301`
- Started: 2026-03-17 03:35:37 UTC
<!-- SESSION_END -->
