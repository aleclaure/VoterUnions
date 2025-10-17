# Edge Function Deployment Guide

This guide covers deploying the `cleanup-deleted-users` Edge Function to complete GDPR Article 17 compliance.

## Quick Start

### 1. Run SQL Migration

First, apply the deletion tracking migration to your Supabase database:

```bash
# Copy the SQL migration content from:
cat voter-unions/supabase/deletion-tracking.sql

# Then paste and run it in your Supabase Dashboard:
# Dashboard → SQL Editor → New Query → Paste → Run
```

### 2. Install Supabase CLI

```bash
npm install -g supabase
```

### 3. Login and Link Project

```bash
# Login to Supabase
supabase login

# Navigate to project
cd voter-unions

# Link to your project (find PROJECT_REF in dashboard URL)
supabase link --project-ref YOUR_PROJECT_REF
```

### 4. Deploy Edge Function

```bash
# Deploy the cleanup function
supabase functions deploy cleanup-deleted-users
```

### 5. Configure Cron Schedule

#### Option A: Using pg_cron (Recommended)

In Supabase Dashboard → SQL Editor, run:

```sql
-- Enable pg_cron extension
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Schedule daily cleanup at 2 AM UTC
SELECT cron.schedule(
  'cleanup-deleted-users-daily',
  '0 2 * * *',
  $$
  SELECT
    net.http_post(
      url := 'https://YOUR_PROJECT_REF.supabase.co/functions/v1/cleanup-deleted-users',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key')
      ),
      body := '{}'::jsonb
    ) as request_id;
  $$
);
```

**Replace `YOUR_PROJECT_REF`** with your actual project reference.

#### Option B: Using External Cron Service

If pg_cron is unavailable, use a service like **Cron-job.org** or **EasyCron**:

1. Create account at https://cron-job.org
2. Add new cron job:
   - **URL**: `https://YOUR_PROJECT_REF.supabase.co/functions/v1/cleanup-deleted-users`
   - **Schedule**: Daily at 2 AM
   - **HTTP Method**: POST
   - **Custom Headers**:
     ```
     Authorization: Bearer YOUR_SERVICE_ROLE_KEY
     Content-Type: application/json
     ```

Find your `SERVICE_ROLE_KEY` in Supabase Dashboard → Settings → API

## Testing

### Test the Edge Function

```bash
# Get your service role key from Supabase Dashboard → Settings → API
# Then run:

curl -X POST \
  'https://YOUR_PROJECT_REF.supabase.co/functions/v1/cleanup-deleted-users' \
  -H 'Authorization: Bearer YOUR_SERVICE_ROLE_KEY' \
  -H 'Content-Type: application/json'

# Expected response:
# {"message":"No pending deletions","processed":0}
# or
# {"message":"Deletion process completed","results":{...}}
```

### Test Full Deletion Flow

1. **Create test user and delete account**:
   - Sign up in app with test email
   - Navigate to Profile → Delete Account
   - Confirm deletion

2. **Check deletion request was logged**:
   ```sql
   SELECT * FROM user_deletion_requests 
   ORDER BY created_at DESC 
   LIMIT 1;
   ```
   You should see a pending request.

3. **Manually trigger Edge Function** (using curl command above)

4. **Verify deletion completed**:
   ```sql
   -- Check request is marked complete
   SELECT * FROM user_deletion_requests 
   WHERE completed_at IS NOT NULL
   ORDER BY completed_at DESC 
   LIMIT 1;

   -- Verify auth.users record is gone
   SELECT * FROM auth.users WHERE email = 'test@example.com';
   -- Should return 0 rows
   ```

## Monitoring

### View Edge Function Logs

In Supabase Dashboard:
1. Navigate to **Edge Functions**
2. Click **cleanup-deleted-users**
3. View **Logs** tab for execution history

### Check Pending Deletions

```sql
-- See all pending deletions
SELECT 
  email,
  username,
  requested_at,
  EXTRACT(DAY FROM NOW() - requested_at) as days_pending,
  retry_count,
  error_message
FROM user_deletion_requests
WHERE completed_at IS NULL
ORDER BY requested_at;
```

### Check Deletion Stats

```sql
-- Summary stats
SELECT 
  COUNT(*) FILTER (WHERE completed_at IS NULL) as pending,
  COUNT(*) FILTER (WHERE completed_at IS NOT NULL) as completed,
  COUNT(*) FILTER (WHERE error_message IS NOT NULL) as errors,
  AVG(EXTRACT(EPOCH FROM (completed_at - requested_at)) / 3600)::int as avg_hours_to_complete
FROM user_deletion_requests;
```

## Troubleshooting

### Function not executing on schedule

1. **Check cron job status**:
   ```sql
   SELECT * FROM cron.job WHERE jobname = 'cleanup-deleted-users-daily';
   ```

2. **Check cron job run history**:
   ```sql
   SELECT * FROM cron.job_run_details 
   WHERE jobid = (SELECT jobid FROM cron.job WHERE jobname = 'cleanup-deleted-users-daily')
   ORDER BY start_time DESC 
   LIMIT 10;
   ```

### Deletions failing with errors

1. **Check error messages**:
   ```sql
   SELECT user_id, email, error_message, retry_count
   FROM user_deletion_requests
   WHERE error_message IS NOT NULL;
   ```

2. **Common errors**:
   - "User not found" → User already deleted, will auto-resolve
   - "Invalid JWT" → Service role key expired/incorrect
   - "Permission denied" → Check service role has auth.admin access

### Manual cleanup for stuck deletions

If a deletion fails 5+ times:

```sql
-- 1. Manually delete from dashboard
-- Go to Authentication → Users → Find by email → Delete

-- 2. Mark request as completed
UPDATE user_deletion_requests
SET 
  completed_at = NOW(),
  auth_user_deleted_at = NOW(),
  error_message = 'Manually deleted via dashboard'
WHERE user_id = 'STUCK_USER_ID';
```

## Production Checklist

- [ ] SQL migration applied (deletion-tracking.sql)
- [ ] Edge Function deployed
- [ ] Cron schedule configured (daily at 2 AM UTC)
- [ ] Test deletion completed successfully
- [ ] Monitoring dashboard bookmarked
- [ ] Team trained on viewing deletion logs
- [ ] Privacy Policy updated with 30-day SLA language
- [ ] Support docs updated with deletion timeline

## Adjusting the SLA

Current SLA: 30 days (function runs daily, processes requests >1 hour old)

To change to 7 days:

```sql
-- Option 1: Run every 6 hours
SELECT cron.schedule(
  'cleanup-deleted-users-frequent',
  '0 */6 * * *',  -- Every 6 hours
  $$ ... $$
);

-- Option 2: Run daily but with no 1-hour delay
-- Edit index.ts line 35:
-- const oneHourAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();  // 5 min delay
```

## Cost Considerations

- **Edge Function**: Free tier includes 500K invocations/month
- **Daily execution**: ~30 invocations/month = well within free tier
- **Database queries**: Minimal impact on database usage
- **Estimated cost**: $0/month for most apps

## Support

For issues or questions:
1. Check Edge Function logs in Supabase Dashboard
2. Review `user_deletion_requests` table for error messages
3. Verify cron job is running via `cron.job_run_details`
4. Consult: `voter-unions/supabase/functions/cleanup-deleted-users/README.md`
