/**
 * GDPR Article 17 Compliance: Auth User Deletion Edge Function
 * 
 * This Edge Function runs on a schedule (daily) to delete auth.users records
 * for users who have requested account deletion via hard_delete_user_account().
 * 
 * It requires service-role permissions because only the service role can delete
 * auth.users records. Client applications cannot do this directly.
 * 
 * Schedule: Runs daily via cron (configured in Supabase dashboard)
 * SLA: Deletes auth.users within 30 days of deletion request
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

interface DeletionRequest {
  id: string;
  user_id: string;
  email: string;
  username: string;
  requested_at: string;
  retry_count: number;
}

serve(async (req) => {
  try {
    // Create Supabase client with service role (has permission to delete auth.users)
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    console.log('Starting auth.users cleanup process...');

    // Get pending deletion requests (older than 1 hour to avoid race conditions)
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    
    const { data: requests, error: fetchError } = await supabase
      .from('user_deletion_requests')
      .select('*')
      .is('completed_at', null)
      .lt('requested_at', oneHourAgo)
      .lt('retry_count', 5) // Max 5 retries
      .order('requested_at', { ascending: true })
      .limit(100); // Process in batches

    if (fetchError) {
      console.error('Error fetching deletion requests:', fetchError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch deletion requests', details: fetchError }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (!requests || requests.length === 0) {
      console.log('No pending deletion requests found');
      return new Response(
        JSON.stringify({ message: 'No pending deletions', processed: 0 }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Found ${requests.length} pending deletion requests`);

    const results = {
      total: requests.length,
      successful: 0,
      failed: 0,
      errors: [] as Array<{ user_id: string; error: string }>,
    };

    // Process each deletion request
    for (const request of requests as DeletionRequest[]) {
      try {
        console.log(`Processing deletion for user ${request.user_id} (${request.email})`);

        // Delete the auth.users record
        const { error: deleteError } = await supabase.auth.admin.deleteUser(
          request.user_id
        );

        if (deleteError) {
          // Check if user already doesn't exist (consider this a success)
          if (deleteError.message?.includes('not found') || deleteError.message?.includes('User not found')) {
            console.log(`User ${request.user_id} already deleted, marking as complete`);
            
            await supabase
              .from('user_deletion_requests')
              .update({
                completed_at: new Date().toISOString(),
                auth_user_deleted_at: new Date().toISOString(),
                error_message: 'User already deleted (not found in auth.users)',
              })
              .eq('id', request.id);

            results.successful++;
            continue;
          }

          // Actual error - increment retry count
          throw deleteError;
        }

        // Success! Mark request as completed
        await supabase
          .from('user_deletion_requests')
          .update({
            completed_at: new Date().toISOString(),
            auth_user_deleted_at: new Date().toISOString(),
          })
          .eq('id', request.id);

        console.log(`Successfully deleted auth.users for ${request.user_id}`);
        results.successful++;

      } catch (error) {
        console.error(`Failed to delete user ${request.user_id}:`, error);
        
        // Increment retry count
        await supabase
          .from('user_deletion_requests')
          .update({
            retry_count: request.retry_count + 1,
            error_message: error instanceof Error ? error.message : String(error),
          })
          .eq('id', request.id);

        results.failed++;
        results.errors.push({
          user_id: request.user_id,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    console.log('Cleanup process completed:', results);

    return new Response(
      JSON.stringify({
        message: 'Deletion process completed',
        results,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Unexpected error in cleanup function:', error);
    return new Response(
      JSON.stringify({
        error: 'Internal server error',
        details: error instanceof Error ? error.message : String(error),
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
});
