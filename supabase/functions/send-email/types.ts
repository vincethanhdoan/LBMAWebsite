// supabase/functions/send-email/types.ts

export interface WebhookPayload {
  type: 'INSERT' | 'UPDATE' | 'DELETE'
  table: string
  schema: string
  record: Record<string, unknown>
  old_record: Record<string, unknown> | null
}

export interface EnrollmentLeadNotificationRecord {
  notification_id: string
  lead_id: string
  recipient_email: string
  channel: string
  type: 'new_lead' | 'approval' | 'denial' | 'booking_confirmation' | 'reminder'
  status: string
  created_at: string
}

export interface MessageRecord {
  message_id: string
  conversation_id: string
  author_user_id: string
  content: string
  created_at: string
  updated_at: string
}

export interface EnrollmentLead {
  lead_id: string
  parent_name: string
  parent_email: string
  phone: string | null
  student_name: string | null
  student_age: number | null
  message: string | null
  source_page: string
  status: string
  booking_token: string | null
  appointment_date: string | null
  appointment_time: string | null
  denial_message: string | null
  created_at: string
}
