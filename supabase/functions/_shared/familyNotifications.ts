import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';

export type FamilyNotificationType =
  'approval' | 'reschedule' | 'denial' | 'booking_confirmation' | 'reminder';

export type FamilyNotificationResult = 'queued' | 'no_email' | 'already_queued';

// Queues an email to the family. The SQL function owns the rules: a lead with
// no email queues nothing, and a receipt or reminder still waiting to send is
// not duplicated.
export async function queueFamilyNotification(
  supabase: SupabaseClient,
  leadId: string,
  type: FamilyNotificationType,
): Promise<FamilyNotificationResult> {
  const { data, error } = await supabase.rpc('queue_family_notification', {
    p_lead_id: leadId,
    p_type: type,
  });
  if (error) throw error;
  return data as FamilyNotificationResult;
}

export function noEmailResponse(cors: Record<string, string>): Response {
  return new Response(
    JSON.stringify({
      code: 'no_email',
      error: 'This family has no email on file.',
    }),
    { status: 422, headers: { ...cors, 'Content-Type': 'application/json' } },
  );
}
