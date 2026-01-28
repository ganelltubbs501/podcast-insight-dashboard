# Scheduled Posts Publishing - Auto-Publisher Implementation

## Problem
Scheduled LinkedIn posts were not being published when their scheduled time arrived.

## Root Cause
The backend had a publishing endpoint (`POST /api/jobs/publish-scheduled`) that required a Google Cloud Scheduler cron job to trigger it. However, this cron job was not configured in the production environment.

## Solution
Implemented an **automatic background publisher** that runs in the server process itself, eliminating the need for external cron job configuration.

### How It Works

1. **Auto-Publisher Service** (`publishScheduledPosts()`)
   - Runs as a background task in the Node.js server
   - Checks Supabase every 5 minutes for scheduled LinkedIn posts that are due
   - When a post's scheduled time arrives, it:
     - Retrieves the user's LinkedIn OAuth token
     - Posts the content to LinkedIn via the LinkedIn API
     - Updates the post status to "Published" with the LinkedIn post ID
     - Handles failures by setting status to "Failed" with error details

2. **Initialization**
   - Starts automatically when the server starts up (`startAutoPublisher()`)
   - Runs first check immediately on startup
   - Then checks every 5 minutes thereafter
   - Safely handles concurrent calls with an `isPublishingInProgress` flag

3. **Error Handling**
   - If LinkedIn token is expired → Post marked as "Failed", user must reconnect
   - If LinkedIn connection not found → Post marked as "Failed"
   - If LinkedIn API returns error → Post marked as "Failed" with error message
   - All errors are logged for debugging

### Implementation Details

**File Modified:** `server/src/index.ts`

**Key Functions Added:**
- `publishScheduledPosts()` - Publishes due LinkedIn posts
- `startAutoPublisher()` - Initializes periodic publishing

**Graceful Shutdown:**
- Clears the publishing interval when server receives SIGTERM signal
- Ensures clean process termination

## Testing the Fix

### Manual Testing
1. Create a scheduled LinkedIn post
2. Set the scheduled time to 1-2 minutes in the future
3. Watch the server logs - you should see:
   ```
   📤 Auto-publishing X scheduled LinkedIn posts...
   ✅ Auto-published post [ID] to LinkedIn
   ✅ Auto-publishing completed: X published, 0 failed
   ```
4. Check the Content Calendar - post status should change from "Scheduled" → "Published"

### Checking the Logs
Look for these log messages:
- **On startup:** `🚀 Starting auto-publisher for scheduled posts...`
- **When publishing:** `📤 Auto-publishing X scheduled LinkedIn posts...`
- **Success:** `✅ Auto-published post [ID] to LinkedIn`
- **Failure:** `❌ Failed to auto-publish post [ID]: [reason]`

## Deployment

### For Development
No configuration needed! The auto-publisher works out of the box.

### For Production (Google Cloud Run)
The auto-publisher will run in Cloud Run instances. If you prefer using Google Cloud Scheduler instead:

1. Set the `PUBLISHER_CRON_SECRET` environment variable in Cloud Run
2. Create a Google Cloud Scheduler job:
   ```
   Schedule: 0 */5 * * * * (every 5 minutes)
   URL: https://your-api-domain/api/jobs/publish-scheduled
   Headers: x-cron-secret: [your-secret]
   ```

Both methods (auto-publisher + Cloud Scheduler) can coexist safely.

## Performance Considerations

- **Query Efficiency:** Uses indexed queries on `platform`, `status`, `scheduled_date`
- **Limit:** Processes max 25 posts per check to avoid overloading
- **Interval:** 5 minutes between checks balances responsiveness vs. server load
- **Concurrency:** Prevents multiple publishing attempts with `isPublishingInProgress` flag

## Future Improvements

1. **Support other platforms:** Currently only handles LinkedIn. Can be extended for Twitter, Medium, etc.
2. **Adjustable interval:** Make the 5-minute interval configurable via environment variable
3. **Retry logic:** Implement exponential backoff for failed posts
4. **Batch operations:** Use LinkedIn's batch API for better performance with multiple posts
5. **Metrics tracking:** Log publishing metrics for monitoring and alerting

## Troubleshooting

### Posts not publishing
1. Check server logs for `🚀 Starting auto-publisher...` message
2. Verify Supabase connection is working (`SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` set)
3. Check that posts have "Scheduled" status and scheduled time has passed
4. Verify LinkedIn connection exists and token is not expired

### Token expiration errors
- User must reconnect their LinkedIn account in Settings
- Expired tokens trigger `LinkedIn token expired - user must reconnect` error
- Scheduled posts will be marked as "Failed" until user reconnects

### High server CPU usage
- Check if publishing interval should be increased
- Monitor number of scheduled posts in database
- Consider implementing rate limiting for large batches
