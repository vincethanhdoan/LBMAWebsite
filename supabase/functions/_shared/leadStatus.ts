// Shared lead-status recalculation used by every booking edge function.

import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';

// The rule lives in SQL (recalculate_lead_status) so that booking, confirming,
// cancelling, and editing a lead all apply the same one.
export async function recalculateLeadStatus(
  supabase: SupabaseClient,
  leadId: string,
): Promise<void> {
  const { error } = await supabase.rpc('recalculate_lead_status', {
    p_lead_id: leadId,
  });
  if (error) throw error;
}
