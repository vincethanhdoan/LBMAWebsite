// supabase/functions/send-email/types.ts

export interface WebhookPayload {
  type: 'INSERT' | 'UPDATE' | 'DELETE';
  table: string;
  schema: string;
  record: Record<string, unknown>;
  old_record: Record<string, unknown> | null;
}

export interface EnrollmentLeadNotificationRecord {
  notification_id: string;
  lead_id: string;
  recipient_email: string;
  channel: string;
  type:
    | 'new_lead'
    | 'submission'
    | 'approval'
    | 'denial'
    | 'booking_confirmation'
    | 'reminder';
  status: string;
  created_at: string;
}

export interface MessageRecord {
  message_id: string;
  conversation_id: string;
  author_user_id: string;
  content: string;
  created_at: string;
  updated_at: string;
}

export interface EnrollmentLead {
  lead_id: string;
  parent_name: string;
  parent_email: string;
  phone: string | null;
  student_name: string | null;
  student_age: number | null;
  message: string | null;
  source_page: string;
  status: string;
  booking_token: string | null;
  appointment_date: string | null;
  appointment_time: string | null;
  denial_message: string | null;
  created_at: string;
  children?: ChildRecord[];
}

export interface ChildRecord {
  name: string;
  age: number;
  program_type: string;
}

export interface PortalEmailQueueRecord {
  queue_id: string;
  recipient_email: string;
  type: 'announcement' | 'blog_post' | 'comment_reply' | 'post_comment';
  payload: {
    // announcement
    title?: string;
    body?: string;
    // blog_post
    author_name?: string;
    post_id?: string;
    // comment_reply
    replier_name?: string;
    original_snippet?: string;
    // post_comment
    commenter_name?: string;
    post_title?: string;
    // shared
    tab?: string;
    announcement_id?: string;
  };
  status: string;
  created_at: string;
}

export interface AppointmentInfo {
  programLabel: string;
  childNames: string; // e.g. "Emma & Lily"; empty string if no children records
  date: string; // formatted, e.g. "Monday, April 28, 2026"
  appointmentDate: string; // raw 'YYYY-MM-DD', for day-count math
  time: string; // formatted, e.g. "4:00 PM"
  rebookingUrl: string; // ${appUrl}/book/${booking_token}
  bookingToken: string | null;
}
