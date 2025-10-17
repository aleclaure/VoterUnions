# Auth User Deletion Edge Function

This Edge Function completes the GDPR Article 17 (Right to Erasure) compliance by deleting `auth.users` records for users who have requested account deletion.

## Purpose

Client applications cannot directly delete `auth.users` records because this requires service-role permissions. This Edge Function:

1. Runs on a schedule (daily)
2. Queries `user_deletion_requests` table for pending deletions
3. Uses service-role key to delete `auth.users` records
4. Marks deletion requests as completed
5. Provides 30-day SLA for complete account erasure

## Prerequisites

1. **SQL Migration**: Run `voter-unions/supabase/deletion-tracking.sql` to create the tracking table
2. **Service Role Key**: ✅ Automatically available! Supabase injects `SUPABASE_SERVICE_ROLE_KEY` and `SUPABASE_URL` into all Edge Functions at runtime - no manual configuration needed

## Deployment

### 1. Install Supabase CLI (if not already installed)

```bash
npm install -g supabase
```

### 2. Login to Supabase

```bash
supabase login
```

### 3. Link to Your Project

```bash
cd voter-unions
supabase link --project-ref YOUR_PROJECT_REF
```

### 4. Deploy the Edge Function

```bash
supabase functions deploy cleanup-deleted-users
```

### 5. Set Up Cron Schedule

**See the complete deployment guide**: `voter-unions/supabase/EDGE_FUNCTION_DEPLOYMENT.md`

The guide provides two options:

**Option A: External Cron Service (Recommended)**
- Use Cron-job.org or similar
- Simple setup, no database configuration
- 5-minute setup

**Option B: pg_cron (Advanced)**
- Database-based scheduling
- Requires storing service-role key in database settings
- More complex but fully self-hosted

👉 **For detailed step-by-step instructions, see**: [`EDGE_FUNCTION_DEPLOYMENT.md`](../../EDGE_FUNCTION_DEPLOYMENT.md)

## How It Works

### User Flow

1. User clicks "Delete My Account" in ProfileScreen
2. App calls `hard_delete_user_account()` function
3. Function:
   - Deletes all user data from application tables
   - Anonymizes audit logs
   - **Logs deletion request** to `user_deletion_requests` table
   - Returns success with message: "auth.users will be deleted within 30 days"

### Edge Function Flow (Runs Daily)

1. Edge Function queries `user_deletion_requests` for pending deletions
2. For each pending request (older than 1 hour):
   - Calls `supabase.auth.admin.deleteUser(user_id)` with service-role
   - Marks request as completed
   - Logs completion timestamp
3. Handles errors with retry logic (max 5 retries)
4. Returns summary of processed deletions

## Monitoring

### Check Deletion Status (as user)

```typescript
const { data } = await supabase.rpc('get_deletion_request_status');
console.log(data);
// {
//   has_deletion_request: true,
//   requested_at: "2025-10-17T10:30:00Z",
//   completed: false,
//   days_since_request: 2
// }
```

### Check Pending Deletions (admin)

```sql
SELECT 
  user_id,
  email,
  username,
  requested_at,
  completed_at,
  retry_count,
  error_message
FROM user_deletion_requests
WHERE completed_at IS NULL
ORDER BY requested_at DESC;
```

### View Edge Function Logs

In Supabase Dashboard:
1. Go to **Edge Functions** → **cleanup-deleted-users**
2. Click **Logs** tab
3. View execution history and any errors

## Testing

### Manual Invocation

You can manually trigger the function for testing:

```bash
curl -X POST \
  'https://YOUR_PROJECT_REF.supabase.co/functions/v1/cleanup-deleted-users' \
  -H 'Authorization: Bearer YOUR_SERVICE_ROLE_KEY' \
  -H 'Content-Type: application/json'
```

### Test Deletion Flow

1. Create a test user
2. Request account deletion via app
3. Check `user_deletion_requests` table:
   ```sql
   SELECT * FROM user_deletion_requests ORDER BY created_at DESC LIMIT 1;
   ```
4. Manually invoke Edge Function (see above)
5. Verify `completed_at` is set and `auth.users` record is gone

## Error Handling

The function handles:

- **User not found**: Marks as completed (already deleted)
- **Service errors**: Increments retry count, logs error message
- **Max retries (5)**: Stops retrying, requires manual intervention
- **Batch processing**: Processes 100 requests per run (prevents timeout)

## Security

- ✅ Requires service-role key (only backend can execute)
- ✅ Processes deletions 1 hour after request (prevents race conditions)
- ✅ Logs all actions with timestamps
- ✅ RLS policies prevent unauthorized access to deletion requests
- ✅ Audit trail maintained even after deletion

## Compliance

✅ **GDPR Article 17**: Right to Erasure
- Application data deleted immediately
- Auth data deleted within 30 days (configurable via cron schedule)
- Audit logs anonymized (user_id nullified, username scrubbed)
- Deletion status queryable by user

## Maintenance

### Adjust SLA (e.g., to 7 days)

Change cron schedule to run more frequently:

```sql
-- Run every 6 hours instead of daily
SELECT cron.schedule(
  'cleanup-deleted-users-frequent',
  '0 */6 * * *',  -- Every 6 hours
  $$ ... $$
);
```

### Archive Old Deletion Requests

Keep the table clean by archiving completed requests older than 1 year:

```sql
-- Archive to separate table (optional)
INSERT INTO user_deletion_requests_archive
SELECT * FROM user_deletion_requests
WHERE completed_at < NOW() - INTERVAL '1 year';

-- Delete archived records
DELETE FROM user_deletion_requests
WHERE completed_at < NOW() - INTERVAL '1 year';
```

## Support

If deletions fail after 5 retries, check:

1. Edge Function logs for specific errors
2. Service role key is valid
3. User ID exists in auth.users
4. No foreign key constraints blocking deletion

For persistent issues, manually delete via Supabase Dashboard:
1. Go to **Authentication** → **Users**
2. Find user by email
3. Click **Delete User**
4. Update `user_deletion_requests` to mark as completed
