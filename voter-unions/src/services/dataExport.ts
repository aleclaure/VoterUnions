import { supabase } from './supabase';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';

export interface UserDataExport {
  exported_at: string;
  user_id: string;
  profile: any;
  posts: any[];
  comments: any[];
  debates: any[];
  arguments: any[];
  unions_created: any[];
  union_memberships: any[];
  votes: {
    post_votes: any[];
    comment_votes: any[];
    argument_votes: any[];
    policy_votes: any[];
    amendment_votes: any[];
    negotiation_votes: any[];
    boycott_votes: any[];
    worker_votes: any[];
  };
  pledges: {
    power_pledges: any[];
  };
  proposals: {
    policies: any[];
    amendments: any[];
    negotiation_demands: any[];
    boycott_proposals: any[];
    boycott_comments: any[];
    worker_proposals: any[];
    worker_comments: any[];
  };
  power_tracker: {
    politicians_created: any[];
    bills_created: any[];
    donors_created: any[];
  };
  corporate_power: {
    corporate_influence: any[];
    consumer_impact: any[];
    worker_impact: any[];
    corporate_accountability: any[];
  };
  labor_power: {
    corporate_exploitation: any[];
    organizing_resistance: any[];
    worker_rights_legislation: any[];
    solidarity_victories: any[];
  };
  bookmarks: {
    corporate_power_bookmarks: any[];
    labor_power_bookmarks: any[];
  };
  support_actions: {
    organizing_support: any[];
    victory_celebrations: any[];
  };
  reports_submitted: any[];
  channels_created: any[];
}

/**
 * Export all user data as JSON (GDPR Article 20 - Right to Data Portability)
 */
export const exportUserData = async (userId: string): Promise<UserDataExport> => {
  try {
    // Fetch all user data in parallel for efficiency
    const [
      profileRes,
      postsRes,
      commentsRes,
      debatesRes,
      argumentsRes,
      unionsCreatedRes,
      unionMembershipsRes,
      postVotesRes,
      commentVotesRes,
      argumentVotesRes,
      policyVotesRes,
      amendmentVotesRes,
      negotiationVotesRes,
      boycottVotesRes,
      workerVotesRes,
      powerPledgesRes,
      policiesRes,
      amendmentsRes,
      negotiationDemandsRes,
      boycottProposalsRes,
      boycottCommentsRes,
      workerProposalsRes,
      workerCommentsRes,
      politiciansRes,
      billsRes,
      donorsRes,
      corporateInfluenceRes,
      consumerImpactRes,
      workerImpactRes,
      corporateAccountabilityRes,
      corporateExploitationRes,
      organizingResistanceRes,
      workerRightsLegislationRes,
      solidarityVictoriesRes,
      corporateBookmarksRes,
      laborBookmarksRes,
      organizingSupportRes,
      victoryCelebrationsRes,
      reportsRes,
      channelsRes,
    ] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', userId).single(),
      supabase.from('posts').select('*').eq('user_id', userId),
      supabase.from('comments').select('*').eq('user_id', userId),
      supabase.from('debates').select('*').eq('created_by', userId),
      supabase.from('arguments').select('*').eq('user_id', userId),
      supabase.from('unions').select('*').eq('created_by', userId),
      supabase.from('union_members').select('*').eq('user_id', userId),
      supabase.from('post_votes').select('*').eq('user_id', userId),
      supabase.from('comment_votes').select('*').eq('user_id', userId),
      supabase.from('argument_votes').select('*').eq('user_id', userId),
      supabase.from('policy_votes').select('*').eq('user_id', userId),
      supabase.from('amendment_votes').select('*').eq('user_id', userId),
      supabase.from('negotiation_votes').select('*').eq('user_id', userId),
      supabase.from('boycott_votes').select('*').eq('user_id', userId),
      supabase.from('worker_votes').select('*').eq('user_id', userId),
      supabase.from('power_pledges').select('*').eq('user_id', userId),
      supabase.from('policies').select('*').eq('created_by', userId),
      supabase.from('amendments').select('*').eq('created_by', userId),
      supabase.from('negotiation_demands').select('*').eq('created_by', userId),
      supabase.from('boycott_proposals').select('*').eq('created_by', userId),
      supabase.from('boycott_comments').select('*').eq('user_id', userId),
      supabase.from('worker_proposals').select('*').eq('created_by', userId),
      supabase.from('worker_comments').select('*').eq('user_id', userId),
      supabase.from('politicians').select('*').eq('created_by', userId),
      supabase.from('bills').select('*').eq('created_by', userId),
      supabase.from('donors').select('*').eq('created_by', userId),
      supabase.from('corporate_influence').select('*').eq('created_by', userId),
      supabase.from('consumer_impact').select('*').eq('created_by', userId),
      supabase.from('worker_impact').select('*').eq('created_by', userId),
      supabase.from('corporate_accountability').select('*').eq('created_by', userId),
      supabase.from('corporate_exploitation').select('*').eq('created_by', userId),
      supabase.from('organizing_resistance').select('*').eq('created_by', userId),
      supabase.from('worker_rights_legislation').select('*').eq('created_by', userId),
      supabase.from('solidarity_victories').select('*').eq('created_by', userId),
      supabase.from('corporate_power_bookmarks').select('*').eq('user_id', userId),
      supabase.from('labor_power_bookmarks').select('*').eq('user_id', userId),
      supabase.from('organizing_support').select('*').eq('user_id', userId),
      supabase.from('victory_celebrations').select('*').eq('user_id', userId),
      supabase.from('reports').select('*').eq('reporter_id', userId),
      supabase.from('channels').select('*').eq('created_by', userId),
    ]);

    // Explicitly handle query errors to ensure GDPR completeness
    const errors = [
      profileRes,
      postsRes,
      commentsRes,
      debatesRes,
      argumentsRes,
      unionsCreatedRes,
      unionMembershipsRes,
      postVotesRes,
      commentVotesRes,
      argumentVotesRes,
      policyVotesRes,
      amendmentVotesRes,
      negotiationVotesRes,
      boycottVotesRes,
      workerVotesRes,
      powerPledgesRes,
      policiesRes,
      amendmentsRes,
      negotiationDemandsRes,
      boycottProposalsRes,
      boycottCommentsRes,
      workerProposalsRes,
      workerCommentsRes,
      politiciansRes,
      billsRes,
      donorsRes,
      corporateInfluenceRes,
      consumerImpactRes,
      workerImpactRes,
      corporateAccountabilityRes,
      corporateExploitationRes,
      organizingResistanceRes,
      workerRightsLegislationRes,
      solidarityVictoriesRes,
      corporateBookmarksRes,
      laborBookmarksRes,
      organizingSupportRes,
      victoryCelebrationsRes,
      reportsRes,
      channelsRes,
    ].filter((res) => res.error);

    if (errors.length > 0) {
      console.error('Errors during data export:', errors);
      throw new Error(
        `Failed to export some data: ${errors.map((e) => e.error?.message).join(', ')}`
      );
    }

    const exportData: UserDataExport = {
      exported_at: new Date().toISOString(),
      user_id: userId,
      profile: profileRes.data || null,
      posts: postsRes.data || [],
      comments: commentsRes.data || [],
      debates: debatesRes.data || [],
      arguments: argumentsRes.data || [],
      unions_created: unionsCreatedRes.data || [],
      union_memberships: unionMembershipsRes.data || [],
      votes: {
        post_votes: postVotesRes.data || [],
        comment_votes: commentVotesRes.data || [],
        argument_votes: argumentVotesRes.data || [],
        policy_votes: policyVotesRes.data || [],
        amendment_votes: amendmentVotesRes.data || [],
        negotiation_votes: negotiationVotesRes.data || [],
        boycott_votes: boycottVotesRes.data || [],
        worker_votes: workerVotesRes.data || [],
      },
      pledges: {
        power_pledges: powerPledgesRes.data || [],
      },
      proposals: {
        policies: policiesRes.data || [],
        amendments: amendmentsRes.data || [],
        negotiation_demands: negotiationDemandsRes.data || [],
        boycott_proposals: boycottProposalsRes.data || [],
        boycott_comments: boycottCommentsRes.data || [],
        worker_proposals: workerProposalsRes.data || [],
        worker_comments: workerCommentsRes.data || [],
      },
      power_tracker: {
        politicians_created: politiciansRes.data || [],
        bills_created: billsRes.data || [],
        donors_created: donorsRes.data || [],
      },
      corporate_power: {
        corporate_influence: corporateInfluenceRes.data || [],
        consumer_impact: consumerImpactRes.data || [],
        worker_impact: workerImpactRes.data || [],
        corporate_accountability: corporateAccountabilityRes.data || [],
      },
      labor_power: {
        corporate_exploitation: corporateExploitationRes.data || [],
        organizing_resistance: organizingResistanceRes.data || [],
        worker_rights_legislation: workerRightsLegislationRes.data || [],
        solidarity_victories: solidarityVictoriesRes.data || [],
      },
      bookmarks: {
        corporate_power_bookmarks: corporateBookmarksRes.data || [],
        labor_power_bookmarks: laborBookmarksRes.data || [],
      },
      support_actions: {
        organizing_support: organizingSupportRes.data || [],
        victory_celebrations: victoryCelebrationsRes.data || [],
      },
      reports_submitted: reportsRes.data || [],
      channels_created: channelsRes.data || [],
    };

    return exportData;
  } catch (error: any) {
    console.error('Error exporting user data:', error);
    throw new Error('Failed to export user data: ' + error.message);
  }
};

/**
 * Download exported data as JSON file
 * Returns file URI if sharing is unavailable (fallback scenario)
 */
export const downloadUserData = async (userId: string): Promise<{ shared: boolean; fileUri?: string; data?: UserDataExport }> => {
  try {
    const data = await exportUserData(userId);
    
    // Try file-based export if FileSystem is available
    if (FileSystem.documentDirectory) {
      try {
        const jsonString = JSON.stringify(data, null, 2);
        const fileName = `voter-unions-data-export-${userId}-${Date.now()}.json`;
        const fileUri = `${FileSystem.documentDirectory}${fileName}`;

        await FileSystem.writeAsStringAsync(fileUri, jsonString);

        // Check if sharing is available
        if (await Sharing.isAvailableAsync()) {
          await Sharing.shareAsync(fileUri, {
            mimeType: 'application/json',
            dialogTitle: 'Export Your Data',
            UTI: 'public.json',
          });
          return { shared: true };
        } else {
          // File saved but sharing unavailable - return data for manual copy
          console.log('Sharing not available. File saved to:', fileUri);
          return {
            shared: false,
            fileUri,
            data,
          };
        }
      } catch (fsError: any) {
        console.warn('File system error, falling back to in-app display:', fsError);
        // Fall through to fallback below
      }
    }

    // Fallback: Return data directly when FileSystem or file writing is unavailable
    console.log('FileSystem unavailable, returning data for in-app display');
    return {
      shared: false,
      data,
    };
  } catch (error: any) {
    console.error('Error downloading user data:', error);
    throw error;
  }
};
