# Meta Ad Library API - Quick Setup Guide

**Goal:** Get an access token for Meta Ad Library API to enable WF28 Creative Intelligence Scanner.

---

## Option 1: Use Existing Meta App (If You Have One)

If you already have a Meta/Facebook app with Ad Library permissions:

1. Go to https://developers.facebook.com/apps/
2. Select your app
3. Go to **Tools → Access Token Tool**
4. Copy your **User Access Token** or **Page Access Token**
5. Paste into `~/maps-autopilot/.env`:
   ```bash
   META_AD_LIBRARY_ACCESS_TOKEN=your_token_here
   ```

---

## Option 2: Create New Meta App (Fresh Start)

### Step 1: Create Meta App

1. Go to https://developers.facebook.com/apps/create/
2. Select **Business** as app type
3. Fill in:
   - **App Name:** "Maps Autopilot Creative Intel"
   - **App Contact Email:** support@autobodyaccelerator.com
4. Click **Create App**

### Step 2: Add Ad Library Access

1. In your new app dashboard, go to **Add Product**
2. Find **Marketing API** and click **Set Up**
3. Go to **Settings → Basic**
4. Scroll down to **Business Use Cases**
5. Enable: **Access to Meta Ads Manager**

### Step 3: Generate Access Token

1. Go to **Tools → Access Token Tool** (left sidebar)
2. Under **User Access Tokens**, click **Generate Token**
3. Grant these permissions:
   - `ads_read`
   - `ads_management` (optional but recommended)
4. Copy the generated token

### Step 4: Add to .env

```bash
cd ~/maps-autopilot
nano .env
```

Find this line:
```bash
META_AD_LIBRARY_ACCESS_TOKEN=  # TODO: Generate from developers.facebook.com
```

Replace with:
```bash
META_AD_LIBRARY_ACCESS_TOKEN=your_actual_token_here
```

Save and exit (Ctrl+X, Y, Enter)

### Step 5: Redeploy

```bash
npx trigger.dev@latest deploy
```

---

## Option 3: Use Personal Access Token (Quick Test)

For testing purposes only (not production):

1. Go to https://developers.facebook.com/tools/accesstoken/
2. Click **Get Token → Get User Access Token**
3. Select these permissions:
   - `ads_read`
4. Copy the token (valid for 1-2 hours)
5. Paste into .env
6. Test the workflow

**⚠️ Personal tokens expire quickly. Use App tokens for production.**

---

## Verify Token Works

Test the token with this curl command:

```bash
curl "https://graph.facebook.com/v19.0/ads_archive?access_token=YOUR_TOKEN&ad_reached_countries=US&search_page_ids=116482854782233&fields=id,page_name&limit=5"
```

**Expected response:** JSON with ads from Alex Hormozi's page.

**If you get an error:** Token is invalid or missing permissions.

---

## Common Errors

**Error: "Invalid OAuth access token"**
- Token expired or malformed
- Generate a new token

**Error: "Insufficient permissions"**
- Add `ads_read` permission to your token
- Regenerate with correct permissions

**Error: "Application does not have capability to use this API"**
- Your app needs "Ad Management" use case approved
- Go to App Review → Request Advanced Access

---

## Token Lifespan

- **User Access Tokens:** 1-2 hours (short-lived)
- **Page Access Tokens:** 60 days (long-lived)
- **App Access Tokens:** Never expire (best for automation)

**For WF28, use App Access Token or Long-Lived Page Token.**

To exchange short-lived for long-lived:

```bash
curl -i -X GET "https://graph.facebook.com/v19.0/oauth/access_token?grant_type=fb_exchange_token&client_id=YOUR_APP_ID&client_secret=YOUR_APP_SECRET&fb_exchange_token=SHORT_LIVED_TOKEN"
```

---

## Security Best Practices

- **Never commit tokens to Git** (already in .gitignore)
- Rotate tokens every 60-90 days
- Use app tokens instead of personal tokens
- Monitor API usage in Meta Developer Dashboard

---

## Once Token is Set

1. **Redeploy:**
   ```bash
   cd ~/maps-autopilot && npx trigger.dev@latest deploy
   ```

2. **Test Scan Single Account:**
   ```bash
   curl -X POST https://api.trigger.dev/api/v1/tasks/wf28-creative-intel-scan-account/trigger \
     -H "Authorization: Bearer tr_dev_dszi3Lhg3vYQwOpgTd4j" \
     -H "Content-Type: application/json" \
     -d '{"payload": {"page_id": "116482854782233", "page_name": "Alex Hormozi", "tier": 1, "scan_date": "2026-03-15"}}'
   ```

3. **Check Logs:**
   - Go to https://cloud.trigger.dev/projects/v3/proj_hbfzjpevxqjdpqoxwxik/
   - Find the run
   - Verify ads were fetched successfully

4. **Trigger Full Weekly Scan:**
   ```bash
   curl -X POST https://api.trigger.dev/api/v1/tasks/wf28-creative-intel-weekly-scan/trigger \
     -H "Authorization: Bearer tr_dev_dszi3Lhg3vYQwOpgTd4j" \
     -H "Content-Type: application/json" \
     -d '{"payload": {}}'
   ```

---

## Support

**Meta Developer Docs:**
- Ad Library API: https://developers.facebook.com/docs/marketing-api/ad-library-api
- Access Tokens: https://developers.facebook.com/docs/facebook-login/guides/access-tokens/

**Meta Developer Support:**
- https://developers.facebook.com/support/

**If stuck:**
- Check Meta API status: https://developers.facebook.com/status/
- Verify app is in "Live" mode (not "Development")
- Ensure Business Verification is complete (for advanced access)
