# Cloudflare Worker Routes Status - March 9, 2026

## Status: ✅ ALL ROUTES ACTIVE

**Worker URL:** https://ghl-webhook-proxy.lucky-tooth-ffbc.workers.dev

---

## Available Routes

| Route | Task ID | Status |
|-------|---------|--------|
| `/wf01` | `wf01-client-onboarding` | ✅ Active |
| `/wf04` | `wf04-review-request-nps` | ✅ Active |
| `/wf06` | `wf06-photo-upload-handler` | ✅ Active |
| `/wf09` | `wf09-onboarding-completion` | ✅ Active |
| `/wf10` | `wf10-payment-failure-handler` | ✅ Active |
| `/wf11` | `wf11-sales-quick-audit` | ✅ Active |
| `/wf12` | `wf12-pre-call-pipeline` | ✅ Active |
| `/wf25` | `wf25-batch-review-webhook` | ✅ Active |

---

## Health Check Endpoint

**URL:** https://ghl-webhook-proxy.lucky-tooth-ffbc.workers.dev/health

**Response:**
```json
{
  "status": "ok",
  "routes": [
    "/wf01",
    "/wf04",
    "/wf06",
    "/wf09",
    "/wf10",
    "/wf11",
    "/wf25",
    "/wf12"
  ]
}
```

---

## WF11 (Sales Quick Audit) Details

**Route:** `/wf11`  
**Task ID:** `wf11-sales-quick-audit`  
**Full URL:** https://ghl-webhook-proxy.lucky-tooth-ffbc.workers.dev/wf11

**Purpose:**
- Quick audit for sales prospects
- Google Places data fetch
- Market analysis
- Automated deck generation

**Test Result:**
```bash
curl -X POST https://ghl-webhook-proxy.lucky-tooth-ffbc.workers.dev/wf11 \
  -H "Content-Type: application/json" \
  -d '{"business_name":"Test","city":"Austin","state":"TX"}'
```

**Response:**
```json
{
  "id": "run_cmmjfx3ti5a7s0un72t5ad9j1",
  "isCached": false
}
```

✅ **Working correctly** - Trigger.dev run initiated

---

## How to Use

### From GHL Automation
1. Add webhook action to workflow
2. Set URL: `https://ghl-webhook-proxy.lucky-tooth-ffbc.workers.dev/wf11`
3. Method: POST
4. Content-Type: application/json
5. Payload: Your form data

### Payload Format
```json
{
  "business_name": "Shop Name",
  "city": "City",
  "state": "TX",
  "niche_key": "mechanical",
  "website_url": "https://example.com",
  "years_in_business": "3-5 years",
  "has_gbp": "Yes",
  "self_reported_reviews": "10-30",
  "prospect_email": "prospect@example.com",
  "prospect_phone": "5551234567",
  "contact_id": "GHL_CONTACT_ID"
}
```

---

## Testing All Routes

```bash
# Health check
curl https://ghl-webhook-proxy.lucky-tooth-ffbc.workers.dev/health

# Test specific route
curl -X POST https://ghl-webhook-proxy.lucky-tooth-ffbc.workers.dev/wf11 \
  -H "Content-Type: application/json" \
  -d '{"test":"data"}'
```

---

## Deployment Info

**Source:** `~/maps-autopilot/ghl-webhook-proxy/src/index.js`  
**Last deployed:** Version 85bd1795-2c5b-46c0-82dc-a6bf9dc5a8de  
**Trigger.dev token:** tr_dev_dszi3Lhg3vYQwOpgTd4j (dev server)

---

## Adding New Routes

To add a new route:

1. **Edit** `ghl-webhook-proxy/src/index.js`:
   ```javascript
   const TASK_MAP = {
     // ... existing routes
     '/wf##': 'wf##-task-id',
   };
   ```

2. **Deploy:**
   ```bash
   cd ~/maps-autopilot/ghl-webhook-proxy
   wrangler deploy
   ```

3. **Test:**
   ```bash
   curl -X POST https://ghl-webhook-proxy.lucky-tooth-ffbc.workers.dev/wf## \
     -H "Content-Type: application/json" \
     -d '{"test":"data"}'
   ```

---

## Documentation

**Related Files:**
- `ghl-webhook-proxy/src/index.js` - Worker source code
- `ghl-webhook-proxy/wrangler.toml` - Cloudflare config
- `GHL-WEBHOOK-UPDATES.md` - Migration guide for GHL

**GitHub:**
- Repository: https://github.com/support702/maps-autopilot
- Path: `ghl-webhook-proxy/`

---

**Last verified:** March 9, 2026 02:05 AM CST  
**Status:** All 8 routes active and working
