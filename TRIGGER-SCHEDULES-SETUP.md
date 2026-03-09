# Trigger.dev Cron Schedule Setup

## Dashboard URL
https://cloud.trigger.dev/projects/v3/proj_hbfzjpevxqjdpqoxwxik/schedules

## Schedules to Configure

### 1. WF02: Content Engine
- **Task ID:** `wf02-content-engine`
- **Schedule:** Mon/Wed/Fri at 9AM CST
- **Cron Expression:** `0 15 * * 1,3,5` (9AM CST = 3PM UTC in standard time, 2PM UTC in daylight time)
- **Timezone:** America/Chicago
- **Purpose:** Generate and publish GMB content posts

### 2. WF03: Review Monitor  
- **Task ID:** `wf03-review-monitor`
- **Schedule:** Every 2 hours
- **Cron Expression:** `0 */2 * * *`
- **Timezone:** America/Chicago
- **Purpose:** Monitor new reviews and trigger response workflows

### 3. WF08: Client Health Check
- **Task ID:** `wf08-client-health-check`
- **Schedule:** Daily at 6AM CST
- **Cron Expression:** `0 12 * * *` (6AM CST = 12PM UTC in standard time, 11AM UTC in daylight time)
- **Timezone:** America/Chicago
- **Purpose:** Check GMB health metrics (posts, photos, Q&A, reviews)

### 4. WF16: Review Velocity Tracker
- **Task ID:** `wf16-review-velocity-tracker`
- **Schedule:** Weekly Friday at 8AM CST
- **Cron Expression:** `0 14 * * 5` (8AM CST Friday = 2PM UTC Friday in standard time)
- **Timezone:** America/Chicago
- **Purpose:** Track weekly review acquisition velocity and send reports

## Setup Steps

1. **Navigate to Schedules:**
   - Go to https://cloud.trigger.dev/projects/v3/proj_hbfzjpevxqjdpqoxwxik/schedules
   - Click "Create Schedule"

2. **For Each Schedule:**
   - Name: Use descriptive name (e.g., "Content Engine - Mon/Wed/Fri 9AM")
   - Task: Select the task ID from dropdown
   - Cron Expression: Enter the expression from above
   - Timezone: Select "America/Chicago"
   - Environment: Select "prod"
   - Enabled: Check to activate

3. **Verify:**
   - Check "Next Run" column shows expected time
   - Monitor first execution to confirm it works
   - Check executions tab for results

## Cron Expression Reference

Format: `minute hour day month day-of-week`

- `0 15 * * 1,3,5` = 3PM UTC on Mon/Wed/Fri (9AM CST)
- `0 */2 * * *` = Every 2 hours
- `0 12 * * *` = 12PM UTC daily (6AM CST)
- `0 14 * * 5` = 2PM UTC Friday (8AM CST)

## Important Notes

- **Timezone:** All cron expressions are in UTC by default. Use timezone selector to set America/Chicago.
- **Daylight Saving:** Trigger.dev handles DST automatically when timezone is set.
- **Payload:** Scheduled tasks receive empty payload `{}` - workflows should not rely on payload data.
- **Error Handling:** Set up alerting for failed scheduled runs.

## Old Health Check Cron (WF12)

**Action Required:** Remove any old health check logic from WF12 (Pre-Call Scoring).  
WF12 should ONLY handle pre-call lead scoring, not health checks.  
Health checks moved to WF08.

Check WF12 code and remove any GMB health monitoring logic if present.

## Testing Schedules

**Manual Trigger:**
1. Go to task detail page
2. Click "Trigger" button  
3. Use empty payload: `{}`
4. Verify execution completes successfully

**Or via API:**
```bash
curl -X POST https://api.trigger.dev/api/v1/tasks/wf02-content-engine/trigger \
  -H "Authorization: Bearer tr_pat_cnqjtb9s2bxjh1hshwyvu2mrdmpnq6tzy9u5nkia" \
  -H "Content-Type: application/json" \
  -d '{"payload": {}}'
```

## Monitoring

- **Executions Tab:** https://cloud.trigger.dev/projects/v3/proj_hbfzjpevxqjdpqoxwxik/runs
- **Filter by Schedule:** Use schedule ID to see only scheduled runs
- **Set up Slack/Email alerts** for failed scheduled runs

## Estimated Run Times

- WF02 (Content Engine): ~10-30 clients × 2-3 min/client = 20-90 minutes
- WF03 (Review Monitor): ~5-10 minutes (checks all clients for new reviews)
- WF08 (Health Check): ~10-20 minutes (health metrics for all clients)
- WF16 (Review Velocity): ~5-10 minutes (aggregate stats)

Ensure dev server or production workers can handle these execution times without timeout.
