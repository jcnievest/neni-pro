import { supabase } from '@/lib/supabase';
import { createCampaignAnalytics } from './campaign-analytics';

export const campaignAnalytics = createCampaignAnalytics(
  typeof window === 'undefined' ? null : window,
  (parameters) => supabase.rpc('claim_campaign_milestone', parameters),
);
