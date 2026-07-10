export const PROFILE_COLUMNS = 'user_id, role, display_name, is_active, is_owner, deactivated_at, created_at, updated_at, avatar_url';

export const FAMILY_COLUMNS =
  'family_id, owner_user_id, primary_email, account_status, deactivated_at, address, city, state, zip, created_at, updated_at';

export const GUARDIAN_COLUMNS =
  'guardian_id, family_id, first_name, last_name, email, phone_number, relationship, is_primary_contact, created_at, updated_at';

export const STUDENT_COLUMNS =
  'student_id, family_id, first_name, last_name, date_of_birth, belt_level, status, notes, photo_url, created_at, updated_at';

export const CONVERSATION_COLUMNS = 'conversation_id, type, created_by, hidden, created_at, updated_at';

export const CONVERSATION_MEMBER_COLUMNS = 'conversation_id, user_id, last_read_at, created_at';

export const MESSAGE_COLUMNS = 'message_id, conversation_id, author_user_id, body, created_at, updated_at';

export const MESSAGE_ATTACHMENT_COLUMNS =
  'attachment_id, message_id, storage_path, file_name, mime_type, size_bytes, created_at';

export const ANNOUNCEMENT_COLUMNS =
  'announcement_id, author_user_id, title, body, is_pinned, image_url, created_at, updated_at';

export const ANNOUNCEMENT_COMMENT_COLUMNS =
  'comment_id, announcement_id, author_user_id, body, created_at, updated_at';

export const BLOG_POST_COLUMNS = 'post_id, author_user_id, title, body, created_at, updated_at';

export const BLOG_COMMENT_COLUMNS = 'comment_id, post_id, author_user_id, body, created_at, updated_at';

export const ENROLLMENT_LEAD_COLUMNS =
  'lead_id, parent_name, parent_email, phone, student_name, student_age, message, source_page, notification_status, notified_at, status, approved_at, approval_email_sent_at, booking_token, appointment_date, appointment_time, denied_at, denial_message, admin_notes, created_at, deleted_at';

export const REVIEW_COLUMNS =
  'review_id, family_id, author_user_id, display_name, rating, review, created_at, updated_at';

export const FEEDBACK_TEST_COLUMNS =
  'test_id, title, test_date, test_time, description, created_by, created_at, updated_at';

export const STUDENT_FEEDBACK_COLUMNS =
  'feedback_id, student_id, author_user_id, test_id, body, created_at, updated_at';
