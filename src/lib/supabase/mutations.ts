import { supabase } from './client';
import type {
  Profile,
  Family,
  Guardian,
  Student,
  Announcement,
  AnnouncementComment,
  BlogPost,
  BlogComment,
  Conversation,
  ConversationMember,
  Message,
  MessageAttachment,
  EnrollmentLead,
  StudentFeedback,
  FeedbackTest,
  Review,
  UserNotificationPreferences,
  AdminNotificationPreferences,
} from '../types';
import {
  CONVERSATION_COLUMNS,
  CONVERSATION_MEMBER_COLUMNS,
  FAMILY_COLUMNS,
  FEEDBACK_TEST_COLUMNS,
  GUARDIAN_COLUMNS,
  MESSAGE_ATTACHMENT_COLUMNS,
  MESSAGE_COLUMNS,
  PROFILE_COLUMNS,
  STUDENT_COLUMNS,
  STUDENT_FEEDBACK_COLUMNS,
} from './selects';

// ============================================
// PROFILES
// ============================================

type ProfileUpdates = Pick<Profile, 'display_name'>;

export async function updateProfile(userId: string, updates: ProfileUpdates): Promise<Profile> {
  const { data, error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('user_id', userId)
    .select(PROFILE_COLUMNS)
    .single();

  if (error) throw error;
  return data;
}

// ============================================
// FAMILIES
// ============================================

export async function createFamily(family: Omit<Family, 'family_id' | 'created_at' | 'updated_at'>): Promise<Family> {
  const { data, error } = await supabase
    .from('families')
    .insert(family)
    .select(FAMILY_COLUMNS)
    .single();

  if (error) throw error;
  return data;
}

export async function updateFamily(familyId: string, updates: Partial<Family>): Promise<Family> {
  const { data, error } = await supabase
    .from('families')
    .update(updates)
    .eq('family_id', familyId)
    .select(FAMILY_COLUMNS)
    .single();

  if (error) throw error;
  return data;
}

export async function setFamilyAccountStatus(
  familyId: string,
  accountStatus: 'active' | 'inactive' | 'archived'
): Promise<Family> {
  const updates: Partial<Family> = {
    account_status: accountStatus,
    deactivated_at: accountStatus === 'active' ? null : new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from('families')
    .update(updates)
    .eq('family_id', familyId)
    .select(FAMILY_COLUMNS)
    .single();

  if (error) throw error;
  return data;
}

export async function deleteFamily(familyId: string): Promise<void> {
  const { error } = await supabase
    .from('families')
    .delete()
    .eq('family_id', familyId);

  if (error) throw error;
}

// ============================================
// GUARDIANS
// ============================================

export async function createGuardian(guardian: Omit<Guardian, 'guardian_id' | 'created_at' | 'updated_at'>): Promise<Guardian> {
  const { data, error } = await supabase
    .from('guardians')
    .insert(guardian)
    .select(GUARDIAN_COLUMNS)
    .single();

  if (error) throw error;
  return data;
}

export async function updateGuardian(guardianId: string, updates: Partial<Guardian>): Promise<Guardian> {
  const { data, error } = await supabase
    .from('guardians')
    .update(updates)
    .eq('guardian_id', guardianId)
    .select(GUARDIAN_COLUMNS)
    .single();

  if (error) throw error;
  return data;
}

export async function deleteGuardian(guardianId: string): Promise<void> {
  const { error } = await supabase
    .from('guardians')
    .delete()
    .eq('guardian_id', guardianId);

  if (error) throw error;
}

// ============================================
// STUDENTS
// ============================================

export async function createStudent(student: Omit<Student, 'student_id' | 'created_at' | 'updated_at'>): Promise<Student> {
  const { data, error } = await supabase
    .from('students')
    .insert(student)
    .select(STUDENT_COLUMNS)
    .single();

  if (error) throw error;
  return data;
}

export async function updateStudent(studentId: string, updates: Partial<Student>): Promise<Student> {
  const { data, error } = await supabase
    .from('students')
    .update(updates)
    .eq('student_id', studentId)
    .select(STUDENT_COLUMNS)
    .single();

  if (error) throw error;
  return data;
}

export async function updateStudentsByFamily(
  familyId: string,
  updates: Partial<Student>
): Promise<Student[]> {
  const { data, error } = await supabase
    .from('students')
    .update(updates)
    .eq('family_id', familyId)
    .select(STUDENT_COLUMNS);

  if (error) throw error;
  return data || [];
}

export async function deleteStudent(studentId: string): Promise<void> {
  const { error } = await supabase
    .from('students')
    .delete()
    .eq('student_id', studentId);

  if (error) throw error;
}

// ============================================
// ANNOUNCEMENTS
// ============================================

export async function createAnnouncement(announcement: Omit<Announcement, 'announcement_id' | 'created_at' | 'updated_at'>): Promise<Announcement> {
  const { data, error } = await supabase
    .from('announcements')
    .insert(announcement)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateAnnouncement(announcementId: string, updates: Partial<Announcement>): Promise<Announcement> {
  const { data, error } = await supabase
    .from('announcements')
    .update(updates)
    .eq('announcement_id', announcementId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteAnnouncement(announcementId: string): Promise<void> {
  const { error } = await supabase
    .from('announcements')
    .delete()
    .eq('announcement_id', announcementId);

  if (error) throw error;
}

export async function createAnnouncementComment(
  announcementId: string,
  body: string,
  parentCommentId?: string
): Promise<void> {
  const { error } = await supabase
    .from('announcement_comments')
    .insert({
      announcement_id: announcementId,
      body,
      ...(parentCommentId ? { parent_comment_id: parentCommentId } : {}),
    });
  if (error) throw error;
}

export async function updateAnnouncementComment(commentId: string, updates: Partial<AnnouncementComment>): Promise<AnnouncementComment> {
  const { data, error } = await supabase
    .from('announcement_comments')
    .update(updates)
    .eq('comment_id', commentId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteAnnouncementComment(commentId: string): Promise<void> {
  const { error } = await supabase
    .from('announcement_comments')
    .delete()
    .eq('comment_id', commentId);

  if (error) throw error;
}

// ============================================
// BLOG POSTS
// ============================================

export async function createBlogPost(post: Omit<BlogPost, 'post_id' | 'created_at' | 'updated_at'>): Promise<BlogPost> {
  const { data, error } = await supabase
    .from('blog_posts')
    .insert(post)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateBlogPost(postId: string, updates: Partial<BlogPost>): Promise<BlogPost> {
  const { data, error } = await supabase
    .from('blog_posts')
    .update(updates)
    .eq('post_id', postId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteBlogPost(postId: string): Promise<void> {
  const { error } = await supabase
    .from('blog_posts')
    .delete()
    .eq('post_id', postId);

  if (error) throw error;
}

export async function createBlogComment(
  postId: string,
  body: string,
  parentCommentId?: string
): Promise<void> {
  const { error } = await supabase
    .from('blog_comments')
    .insert({
      post_id: postId,
      body,
      ...(parentCommentId ? { parent_comment_id: parentCommentId } : {}),
    });
  if (error) throw error;
}

export async function updateBlogComment(commentId: string, updates: Partial<BlogComment>): Promise<BlogComment> {
  const { data, error } = await supabase
    .from('blog_comments')
    .update(updates)
    .eq('comment_id', commentId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteBlogComment(commentId: string): Promise<void> {
  const { error } = await supabase
    .from('blog_comments')
    .delete()
    .eq('comment_id', commentId);

  if (error) throw error;
}

// ============================================
// CONVERSATIONS & MESSAGES
// ============================================

export async function createConversation(conversation: Omit<Conversation, 'conversation_id' | 'created_at' | 'updated_at'>): Promise<Conversation> {
  const { data, error } = await supabase
    .from('conversations')
    .insert(conversation)
    .select(CONVERSATION_COLUMNS)
    .single();

  if (error) throw error;
  return data;
}

export async function createOrGetDirectConversation(otherUserId: string): Promise<string> {
  const { data, error } = await supabase.rpc('create_or_get_dm_conversation', {
    other_user_id: otherUserId,
  });

  if (error) throw error;

  return data as string;
}

export async function addConversationMember(member: Omit<ConversationMember, 'created_at'>): Promise<ConversationMember> {
  const { data, error } = await supabase
    .from('conversation_members')
    .insert(member)
    .select(CONVERSATION_MEMBER_COLUMNS)
    .single();

  if (error) throw error;
  return data;
}

export async function markConversationAsRead(conversationId: string, userId: string): Promise<void> {
  const { error } = await supabase
    .from('conversation_members')
    .update({ last_read_at: new Date().toISOString() })
    .eq('conversation_id', conversationId)
    .eq('user_id', userId);

  if (error) {
    if (error.code === '42703' || error.message?.toLowerCase().includes('last_read_at')) {
      return;
    }
    throw error;
  }
}

export async function removeConversationMember(conversationId: string, userId: string): Promise<void> {
  const { error } = await supabase
    .from('conversation_members')
    .delete()
    .eq('conversation_id', conversationId)
    .eq('user_id', userId);

  if (error) throw error;
}

export async function createMessage(message: Omit<Message, 'message_id' | 'created_at' | 'updated_at'>): Promise<Message> {
  const { data, error } = await supabase
    .from('messages')
    .insert(message)
    .select(MESSAGE_COLUMNS)
    .single();

  if (error) throw error;
  // conversations.updated_at is kept current by the trg_message_insert_update_conversation trigger.
  return data;
}

export async function updateMessage(messageId: string, updates: Partial<Message>): Promise<Message> {
  const { data, error } = await supabase
    .from('messages')
    .update(updates)
    .eq('message_id', messageId)
    .select(MESSAGE_COLUMNS)
    .single();

  if (error) throw error;
  return data;
}

export async function deleteMessage(messageId: string): Promise<void> {
  const { error } = await supabase
    .from('messages')
    .delete()
    .eq('message_id', messageId);

  if (error) throw error;
}

export async function createMessageAttachment(attachment: Omit<MessageAttachment, 'attachment_id' | 'created_at'>): Promise<MessageAttachment> {
  const { data, error } = await supabase
    .from('message_attachments')
    .insert(attachment)
    .select(MESSAGE_ATTACHMENT_COLUMNS)
    .single();

  if (error) throw error;
  return data;
}

// ============================================
// ENROLLMENT LEADS
// ============================================

export async function updateLeadStatus(
  leadId: string,
  status: EnrollmentLead['status']
): Promise<void> {
  const { error } = await supabase
    .from('enrollment_leads')
    .update({ status })
    .eq('lead_id', leadId);

  if (error) throw error;
}

export async function updateLeadAdminNotes(leadId: string, notes: string): Promise<void> {
  const { error } = await supabase
    .from('enrollment_leads')
    .update({ admin_notes: notes })
    .eq('lead_id', leadId);
  if (error) throw error;
}

export async function dismissLeadSilently(leadId: string): Promise<void> {
  const { error } = await supabase
    .from('enrollment_leads')
    .update({ status: 'denied', denied_at: new Date().toISOString() })
    .eq('lead_id', leadId);
  if (error) throw error;
}

export async function deleteEnrollmentLead(leadId: string): Promise<void> {
  const { error } = await supabase
    .from('enrollment_leads')
    .update({ deleted_at: new Date().toISOString() })
    .eq('lead_id', leadId);
  if (error) throw error;
}

// ============================================
// FEEDBACK TESTS
// ============================================

export async function createFeedbackTest(
  test: Omit<FeedbackTest, 'test_id' | 'created_at' | 'updated_at'>
): Promise<FeedbackTest> {
  const { data, error } = await supabase
    .from('feedback_tests')
    .insert(test)
    .select(FEEDBACK_TEST_COLUMNS)
    .single();

  if (error) throw error;
  return data;
}

export async function updateFeedbackTest(
  testId: string,
  updates: Partial<Pick<FeedbackTest, 'title' | 'test_date' | 'test_time' | 'description'>>
): Promise<FeedbackTest> {
  const { data, error } = await supabase
    .from('feedback_tests')
    .update(updates)
    .eq('test_id', testId)
    .select(FEEDBACK_TEST_COLUMNS)
    .single();

  if (error) throw error;
  return data;
}

export async function deleteFeedbackTest(testId: string): Promise<void> {
  const { error } = await supabase
    .from('feedback_tests')
    .delete()
    .eq('test_id', testId);

  if (error) throw error;
}

// ============================================
// STUDENT FEEDBACK
// ============================================

export async function createStudentFeedback(
  feedback: Omit<StudentFeedback, 'feedback_id' | 'created_at' | 'updated_at'>
): Promise<StudentFeedback> {
  const { data, error } = await supabase
    .from('student_feedback')
    .insert(feedback)
    .select(STUDENT_FEEDBACK_COLUMNS)
    .single();

  if (error) throw error;
  return data;
}

export async function updateStudentFeedback(feedbackId: string, updates: Partial<StudentFeedback>): Promise<StudentFeedback> {
  const { data, error } = await supabase
    .from('student_feedback')
    .update(updates)
    .eq('feedback_id', feedbackId)
    .select(STUDENT_FEEDBACK_COLUMNS)
    .single();

  if (error) throw error;
  return data;
}

export async function deleteStudentFeedback(feedbackId: string): Promise<void> {
  const { error } = await supabase
    .from('student_feedback')
    .delete()
    .eq('feedback_id', feedbackId);

  if (error) throw error;
}

// ============================================
// REVIEWS
// ============================================

export async function createReview(review: Omit<Review, 'review_id' | 'created_at' | 'updated_at'>): Promise<Review> {
  const { data, error } = await supabase
    .from('reviews')
    .insert(review)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateReview(reviewId: string, updates: Partial<Review>): Promise<Review> {
  const { data, error } = await supabase
    .from('reviews')
    .update(updates)
    .eq('review_id', reviewId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteReview(reviewId: string): Promise<void> {
  const { error } = await supabase
    .from('reviews')
    .delete()
    .eq('review_id', reviewId);

  if (error) throw error;
}

export async function registerInvitedEmail(email: string): Promise<string> {
  const normalizedEmail = email.trim().toLowerCase();
  const { data, error } = await supabase.rpc('register_invited_email', {
    invited_email: normalizedEmail,
  });

  if (error) throw error;
  return data as string;
}

// ============================================
// NOTIFICATIONS
// ============================================

export async function markSectionSeen(section: 'announcements' | 'blog' | 'feedback'): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  const { error } = await supabase
    .from('user_section_last_seen')
    .upsert(
      { user_id: user.id, section, last_seen_at: new Date().toISOString() },
      { onConflict: 'user_id,section' }
    );
  if (error) throw error;
}

export async function markNotificationsRead(): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  const { error } = await supabase
    .from('user_notifications')
    .update({ is_read: true })
    .eq('recipient_user_id', user.id)
    .eq('is_read', false);
  if (error) throw error;
}

export async function upsertUserNotificationPreferences(
  prefs: Partial<Omit<UserNotificationPreferences, 'user_id' | 'updated_at'>>
): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  const { error } = await supabase
    .from('user_notification_preferences')
    .upsert(
      { user_id: user.id, ...prefs, updated_at: new Date().toISOString() },
      { onConflict: 'user_id' }
    );
  if (error) throw error;
}

export async function upsertAdminNotificationPreferences(
  prefs: Partial<Omit<AdminNotificationPreferences, 'user_id' | 'updated_at'>>
): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  const { error } = await supabase
    .from('admin_notification_preferences')
    .upsert(
      { user_id: user.id, ...prefs, updated_at: new Date().toISOString() },
      { onConflict: 'user_id' }
    );
  if (error) throw error;
}

// ============================================
// ENROLLMENT LEADS (public)
// ============================================

export async function createEnrollmentLead(fields: {
  parentName: string
  parentEmail: string
  phone?: string
  notes?: string
  children: Array<{ name: string; age: number }>
}): Promise<string> {
  const { data, error } = await supabase.rpc('create_enrollment_lead', {
    p_parent_name: fields.parentName,
    p_parent_email: fields.parentEmail,
    p_phone: fields.phone ?? null,
    p_notes: fields.notes ?? null,
    p_children: fields.children,
  })
  if (error) throw error
  return data as string
}
