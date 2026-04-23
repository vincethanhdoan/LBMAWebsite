export type UserRole = 'admin' | 'family';

export type BeltLevel =
  | 'White Belt'
  | 'Yellow Belt'
  | 'Orange Belt'
  | 'Purple Belt'
  | 'Blue Belt'
  | 'Green Belt'
  | 'Brown Belt'
  | 'Red Belt'
  | 'Black Belt';

export type Relationship = 'mother' | 'father' | 'guardian' | 'grandparent' | 'other';

export type Rating = 1 | 2 | 3 | 4 | 5;

export type User = {
  id: string;
  email: string;
  role: UserRole;
  displayName: string;
} | null;

export type Profile = {
  user_id: string;
  role: UserRole;
  display_name: string;
  is_active: boolean;
  deactivated_at: string | null;
  created_at: string;
  updated_at: string;
};

export type Family = {
  family_id: string;
  owner_user_id: string;
  primary_email: string;
  account_status?: 'active' | 'inactive' | 'archived';
  deactivated_at?: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  created_at: string;
  updated_at: string;
};

export type Guardian = {
  guardian_id: string;
  family_id: string;
  first_name: string;
  last_name: string;
  email: string | null;
  phone_number: string | null;
  relationship: Relationship | null;
  is_primary_contact: boolean;
  created_at: string;
  updated_at: string;
};

export type Student = {
  student_id: string;
  family_id: string;
  first_name: string;
  last_name: string;
  date_of_birth: string | null;
  belt_level: BeltLevel | null;
  status: 'active' | 'inactive';
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type Announcement = {
  announcement_id: string;
  author_user_id: string;
  title: string;
  body: string;
  is_pinned: boolean;
  image_url: string | null;
  created_at: string;
  updated_at: string;
};

export type AnnouncementComment = {
  comment_id: string;
  announcement_id: string;
  author_user_id: string;
  body: string;
  created_at: string;
  updated_at: string;
};

export type BlogPost = {
  post_id: string;
  author_user_id: string;
  title: string;
  body: string;
  created_at: string;
  updated_at: string;
};

export type BlogComment = {
  comment_id: string;
  post_id: string;
  author_user_id: string;
  body: string;
  created_at: string;
  updated_at: string;
};

export type Conversation = {
  conversation_id: string;
  type: 'global' | 'dm';
  created_by: string;
  created_at: string;
  updated_at: string;
};

export type ConversationMember = {
  conversation_id: string;
  user_id: string;
  last_read_at?: string | null;
  created_at: string;
};

export type Message = {
  message_id: string;
  conversation_id: string;
  author_user_id: string;
  body: string;
  created_at: string;
  updated_at: string;
};

export type MessageAttachment = {
  attachment_id: string;
  message_id: string;
  storage_path: string;
  file_name: string;
  mime_type: string | null;
  size_bytes: number | null;
  created_at: string;
};

export type EnrollmentLead = {
  lead_id: string;
  parent_name: string;
  parent_email: string;
  phone: string | null;
  student_name: string | null;
  student_age: number | null;
  message: string;
  source_page: string;
  notification_status: 'queued' | 'sent' | 'failed';
  notified_at: string | null;
  status: 'new' | 'approved' | 'appointment_scheduled' | 'appointment_confirmed' | 'denied' | 'enrolled' | 'closed';
  approved_at: string | null;
  approval_email_sent_at: string | null;
  booking_token: string | null;
  appointment_date: string | null;   // "YYYY-MM-DD"
  appointment_time: string | null;   // "HH:MM:SS"
  denied_at: string | null;
  denial_message: string | null;
  admin_notes: string | null;
  deleted_at: string | null;
  created_at: string;
  children: EnrollmentLeadChild[];
  programBookings: EnrollmentLeadProgramBooking[];
};

export type EnrollmentLeadChild = {
  child_id: string;
  lead_id: string;
  name: string;
  age: number;
  program_type: 'little_dragons' | 'youth';
  created_at: string;
};

export type EnrollmentLeadProgramBooking = {
  booking_id: string;
  lead_id: string;
  program_type: 'little_dragons' | 'youth';
  booking_token: string | null;
  appointment_slot_id: string | null;
  appointment_date: string | null;
  appointment_time: string | null;
  status: 'pending' | 'link_sent' | 'scheduled' | 'confirmed';
  created_at: string;
};

export type AppointmentSlot = {
  slot_id: string;
  day_of_week: number;       // 0=Sun, 1=Mon … 6=Sat
  week_of_month: number | null; // null=every, 1–4=nth, -1=last
  start_time: string;        // "HH:MM:SS"
  end_time: string;          // "HH:MM:SS"
  label: string;
  is_active: boolean;
  program_type: 'little_dragons' | 'youth' | 'all';
  created_at: string;
};

export type AppointmentSlotOverride = {
  override_id: string;
  slot_id: string;
  override_date: string; // "YYYY-MM-DD"
  reason: string | null;
  created_at: string;
};

export type AdminNotificationSetting = {
  setting_id: string;
  email: string;
  notify_new_leads: boolean;
  is_active: boolean;
  created_at: string;
};

export type FeedbackTest = {
  test_id: string;
  title: string;
  test_date: string;        // "YYYY-MM-DD"
  test_time: string | null; // "HH:MM:SS"
  description: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type StudentFeedback = {
  feedback_id: string;
  student_id: string;
  author_user_id: string;
  test_id: string;
  body: string;
  created_at: string;
  updated_at: string;
};

export type Review = {
  review_id: string;
  family_id: string;
  author_user_id: string;
  display_name: string | null;
  rating: Rating;
  review: string;
  created_at: string;
  updated_at: string;
};

export type UserSectionLastSeen = {
  user_id: string;
  section: 'announcements' | 'blog';
  last_seen_at: string;
};

export type UserNotification = {
  notification_id: string;
  recipient_user_id: string;
  type: 'comment_reply' | 'post_comment';
  reference_id: string;
  reference_type: 'announcement_comment' | 'blog_comment';
  actor_display_name: string | null;
  is_read: boolean;
  created_at: string;
};

export type UserNotificationPreferences = {
  user_id: string;
  notify_messages: boolean;
  notify_announcements: boolean;
  notify_blog_posts: boolean;
  notify_comment_replies: boolean;
  notify_post_comments: boolean;
  updated_at: string;
};

export type AdminNotificationPreferences = {
  user_id: string;
  notify_messages: boolean;
  notify_blog_posts: boolean;
  notify_comment_replies: boolean;
  notify_post_comments: boolean;
  updated_at: string;
};
