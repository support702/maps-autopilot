# GHL Webhook URL Updates

## Overview
Replace n8n webhook URLs with Cloudflare Worker proxy URLs in all GHL automations.

## Webhook Mappings

### WF01: Client Onboarding Survey
**Old URL:** http://YOUR_VPS_IP:5678/webhook/client-onboarding  
**New URL:** https://ghl-webhook-proxy.lucky-tooth-ffbc.workers.dev/wf01

**Where to update:**
1. Log into GoHighLevel (location: S1UmwzO7WWf9xmTzVe4A)
2. Navigate to: Settings → Workflows → Find "Client Onboarding Survey" workflow
3. Find webhook action/trigger
4. Replace URL with new Cloudflare Worker URL
5. Test webhook with sample payload

### WF12: Calendar Booking (Pre-Call Scoring)
**Old URL:** http://YOUR_VPS_IP:5678/webhook/ghl-booking-form  
**New URL:** https://ghl-webhook-proxy.lucky-tooth-ffbc.workers.dev/wf12

**Where to update:**
1. GoHighLevel → Settings → Workflows
2. Find "Calendar Booking" or "Pre-Call" workflow  
3. Update webhook URL
4. Test with sample booking

## Verification Steps

After updating each webhook:

1. **Test webhook manually:**
   ```bash
   curl -X POST https://ghl-webhook-proxy.lucky-tooth-ffbc.workers.dev/wf01 \
     -H "Content-Type: application/json" \
     -d '{"test": "data"}'
   ```

2. **Check Trigger.dev dashboard:**
   - Go to: https://cloud.trigger.dev/projects/v3/proj_hbfzjpevxqjdpqoxwxik/runs
   - Verify run appears with correct payload

3. **Test with real GHL action:**
   - Submit form/book calendar in GHL
   - Verify workflow executes
   - Check database for created records

## Rollback Plan

If webhooks don't work:
1. Revert to old n8n URLs temporarily
2. Check Cloudflare Worker logs
3. Verify Trigger.dev dev server is running (or production workers)
4. Check environment variables in Trigger.dev dashboard

## Additional Webhooks (if applicable)

**WF04:** Review Response Request  
**WF06:** Post-Job Follow-up  
**WF09:** Review Alert  
**WF10:** Negative Review Alert  
**WF11:** Quick Audit  
**WF25:** Batch Review Submission  

For each, follow same pattern:
- Old: `http://VPS_IP:5678/webhook/[workflow-name]`
- New: `https://ghl-webhook-proxy.lucky-tooth-ffbc.workers.dev/[wf##]`

## Important Notes

- **Keep n8n running** during transition for safety
- **Update one webhook at a time** and test before moving to next
- **Document any custom payload transformations** needed
- **Monitor error rates** in first 24 hours after switchover
