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
  EnrollmentLeadChild,
  EnrollmentLeadNotification,
  EnrollmentLeadProgramBooking,
  StudentFeedback,
  FeedbackTest,
  Review,
  AppointmentSlot,
  AdminNotificationSetting,
  UserNotification,
  UserNotificationPreferences,
  AdminNotificationPreferences,
} from '../types';
import {
  ANNOUNCEMENT_COLUMNS,
  ANNOUNCEMENT_COMMENT_COLUMNS,
  BLOG_COMMENT_COLUMNS,
  BLOG_POST_COLUMNS,
  CONVERSATION_COLUMNS,
  CONVERSATION_MEMBER_COLUMNS,
  ENROLLMENT_LEAD_COLUMNS,
  FAMILY_COLUMNS,
  FEEDBACK_TEST_COLUMNS,
  GUARDIAN_COLUMNS,
  MESSAGE_ATTACHMENT_COLUMNS,
  MESSAGE_COLUMNS,
  PROFILE_COLUMNS,
  REVIEW_COLUMNS,
  STUDENT_COLUMNS,
  STUDENT_FEEDBACK_COLUMNS,
} from './selects';

// ============================================
// PROFILES
// ============================================

export async function getProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select(PROFILE_COLUMNS)
    .eq('user_id', userId)
    .single();

  if (error) throw error;
  return data;
}

export async function getAllProfiles(): Promise<Profile[]> {
  const { data, error } = await supabase
    .from('profiles')
    .select(PROFILE_COLUMNS)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function getAdminProfiles(): Promise<Profile[]> {
  const { data, error } = await supabase
    .from('profiles')
    .select(PROFILE_COLUMNS)
    .eq('role', 'admin')
    .order('created_at', { ascending: true });

  if (error) throw error;
  return data || [];
}

// ============================================
// FAMILIES
// ============================================

export async function getFamilyByOwner(ownerUserId: string): Promise<Family | null> {
  const { data, error } = await supabase
    .from('families')
    .select(FAMILY_COLUMNS)
    .eq('owner_user_id', ownerUserId)
    .single();

  if (error && error.code !== 'PGRST116') throw error; // PGRST116 = no rows returned
  return data || null;
}

export async function getAllFamilies(): Promise<Family[]> {
  const { data, error } = await supabase
    .from('families')
    .select(FAMILY_COLUMNS)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

export type FamilyWithRelations = Family & {
  guardians: Guardian[];
  students: Student[];
};

export async function getFamilyWithRelations(familyId: string): Promise<FamilyWithRelations> {
  const { data, error } = await supabase
    .from('families')
    .select(`
      ${FAMILY_COLUMNS},
      guardians (${GUARDIAN_COLUMNS}),
      students (${STUDENT_COLUMNS})
    `)
    .eq('family_id', familyId)
    .single();

  if (error) throw error;
  return data as FamilyWithRelations;
}

/**
 * Fetches all families with their guardians and students in a single query.
 * Use this instead of getAllFamilies() + N×getFamilyWithRelations().
 */
export async function getAllFamiliesWithRelations(): Promise<FamilyWithRelations[]> {
  const { data, error } = await supabase
    .from('families')
    .select(`
      ${FAMILY_COLUMNS},
      guardians (${GUARDIAN_COLUMNS}),
      students (${STUDENT_COLUMNS})
    `)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data || []) as FamilyWithRelations[];
}

// ============================================
// GUARDIANS
// ============================================

export async function getGuardiansByFamily(familyId: string): Promise<Guardian[]> {
  const { data, error } = await supabase
    .from('guardians')
    .select(GUARDIAN_COLUMNS)
    .eq('family_id', familyId)
    .order('is_primary_contact', { ascending: false })
    .order('created_at', { ascending: true });

  if (error) throw error;
  return data || [];
}

// ============================================
// STUDENTS
// ============================================

export async function getStudentsByFamily(familyId: string): Promise<Student[]> {
  const { data, error } = await supabase
    .from('students')
    .select(STUDENT_COLUMNS)
    .eq('family_id', familyId)
    .order('created_at', { ascending: true });

  if (error) throw error;
  return data || [];
}

export async function getAllStudents(): Promise<Student[]> {
  const { data, error } = await supabase
    .from('students')
    .select(STUDENT_COLUMNS)
    .order('first_name', { ascending: true });

  if (error) throw error;
  return data ?? [];
}

// ============================================
// AUTHOR HYDRATION HELPER
// ============================================

/**
 * Given rows with `author_user_id`, fetches display names in a single query
 * and returns rows with a `profiles: { display_name: string | null }` field attached.
 * Falls back gracefully if the profile fetch fails.
 */
async function hydrateAuthorNames<T extends { author_user_id: string }>(
  rows: T[]
): Promise<(T & { profiles: { display_name: string | null; avatar_url: string | null } })[]> {
  const authorIds = Array.from(
    new Set(rows.map(r => r.author_user_id).filter((id): id is string => Boolean(id)))
  );
  if (authorIds.length === 0) {
    return rows.map(r => ({ ...r, profiles: { display_name: null, avatar_url: null } }));
  }
  const { data: profiles } = await supabase
    .from('profiles')
    .select('user_id, display_name, avatar_url')
    .in('user_id', authorIds);

  const profileById = new Map(
    (profiles ?? []).map(p => [p.user_id as string, p as { display_name: string | null; avatar_url: string | null }])
  );
  return rows.map(r => ({
    ...r,
    profiles: {
      display_name: profileById.get(r.author_user_id)?.display_name ?? null,
      avatar_url: profileById.get(r.author_user_id)?.avatar_url ?? null,
    },
  }));
}

// ============================================
// ANNOUNCEMENTS
// ============================================

export async function getAnnouncements(): Promise<(Announcement & { profiles: { display_name: string | null } })[]> {
  const { data, error } = await supabase
    .from('announcements')
    .select(ANNOUNCEMENT_COLUMNS)
    .order('is_pinned', { ascending: false })
    .order('created_at', { ascending: false });

  if (error) throw error;
  if (!data || data.length === 0) return [];
  return hydrateAuthorNames(data as Announcement[]);
}

export async function getAnnouncement(announcementId: string): Promise<Announcement> {
  const { data, error } = await supabase
    .from('announcements')
    .select(ANNOUNCEMENT_COLUMNS)
    .eq('announcement_id', announcementId)
    .single();

  if (error) throw error;
  return data;
}

export type AnnouncementCommentWithAuthor = AnnouncementComment & {
  profiles: { display_name: string | null; avatar_url: string | null } | null;
};

export async function getAnnouncementComments(announcementId: string): Promise<AnnouncementCommentWithAuthor[]> {
  const { data, error } = await supabase
    .from('announcement_comments')
    .select(`
      ${ANNOUNCEMENT_COMMENT_COLUMNS},
      profiles!announcement_comments_author_user_id_fkey (
        display_name,
        avatar_url
      )
    `)
    .eq('announcement_id', announcementId)
    .order('created_at', { ascending: true });

  if (error) throw error;
  return (data || []) as AnnouncementCommentWithAuthor[];
}

// ============================================
// BLOG POSTS
// ============================================

export async function getBlogPosts(): Promise<(BlogPost & { profiles: { display_name: string | null } })[]> {
  const { data, error } = await supabase
    .from('blog_posts')
    .select(BLOG_POST_COLUMNS)
    .order('created_at', { ascending: false });

  if (error) throw error;
  if (!data || data.length === 0) return [];
  return hydrateAuthorNames(data as BlogPost[]);
}

export async function getBlogPost(postId: string): Promise<BlogPost> {
  const { data, error } = await supabase
    .from('blog_posts')
    .select(BLOG_POST_COLUMNS)
    .eq('post_id', postId)
    .single();

  if (error) throw error;
  return data;
}

export type BlogCommentWithAuthor = BlogComment & {
  profiles: { display_name: string | null; avatar_url: string | null } | null;
};

export async function getBlogComments(postId: string): Promise<BlogCommentWithAuthor[]> {
  const { data, error } = await supabase
    .from('blog_comments')
    .select(`
      ${BLOG_COMMENT_COLUMNS},
      profiles!blog_comments_author_user_id_fkey (
        display_name,
        avatar_url
      )
    `)
    .eq('post_id', postId)
    .order('created_at', { ascending: true });

  if (error) throw error;
  return (data || []) as BlogCommentWithAuthor[];
}

/**
 * Fetch comments for multiple posts in a single query.
 * Returns a map of post_id → comment array.
 */
export async function getBlogCommentsForPosts(
  postIds: string[]
): Promise<Record<string, BlogCommentWithAuthor[]>> {
  if (postIds.length === 0) return {};

  const { data, error } = await supabase
    .from('blog_comments')
    .select(`
      ${BLOG_COMMENT_COLUMNS},
      profiles!blog_comments_author_user_id_fkey (
        display_name,
        avatar_url
      )
    `)
    .in('post_id', postIds)
    .order('created_at', { ascending: true });

  if (error) throw error;

  const result: Record<string, BlogCommentWithAuthor[]> = {};
  for (const row of (data ?? []) as BlogCommentWithAuthor[]) {
    const postId = (row as BlogCommentWithAuthor & { post_id: string }).post_id;
    if (!result[postId]) result[postId] = [];
    result[postId].push(row);
  }
  return result;
}

// ============================================
// CONVERSATIONS & MESSAGES
// ============================================

export async function getGlobalConversation(): Promise<Conversation | null> {
  const { data, error } = await supabase
    .from('conversations')
    .select(CONVERSATION_COLUMNS)
    .eq('type', 'global')
    .maybeSingle();

  if (error) throw error;
  return data || null;
}

export async function getUserConversations(userId: string): Promise<Conversation[]> {
  const { data, error } = await supabase
    .from('conversations')
    .select(`
      ${CONVERSATION_COLUMNS},
      conversation_members!inner (${CONVERSATION_MEMBER_COLUMNS})
    `)
    .eq('conversation_members.user_id', userId)
    .order('updated_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

export type ConversationMemberWithProfile = ConversationMember & {
  profiles: { display_name: string | null; role: string | null } | null;
};

export async function getConversationMembers(conversationId: string): Promise<ConversationMemberWithProfile[]> {
  const { data, error } = await supabase
    .from('conversation_members')
    .select(`
      ${CONVERSATION_MEMBER_COLUMNS},
      profiles!conversation_members_user_id_fkey (
        display_name,
        role
      )
    `)
    .eq('conversation_id', conversationId);

  if (error) throw error;
  return (data || []) as ConversationMemberWithProfile[];
}

export type MessageWithMeta = Message & {
  profiles: { display_name: string | null; role: string | null; avatar_url: string | null } | null;
  message_attachments: MessageAttachment[];
};

export async function getMessages(conversationId: string): Promise<MessageWithMeta[]> {
  const { data, error } = await supabase
    .from('messages')
    .select(`
      ${MESSAGE_COLUMNS},
      profiles!messages_author_user_id_fkey (
        display_name,
        role,
        avatar_url
      ),
      message_attachments (${MESSAGE_ATTACHMENT_COLUMNS})
    `)
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true });

  if (error) throw error;
  return (data || []) as MessageWithMeta[];
}

export async function getDirectMessageConversation(userId1: string, userId2: string): Promise<Conversation | null> {
  const userConversations = await getUserConversations(userId1);
  const directMessageConversationIds = userConversations
    .filter((conversation) => conversation.type === 'dm')
    .map((conversation) => conversation.conversation_id);

  if (directMessageConversationIds.length === 0) return null;

  const { data, error } = await supabase
    .from('conversation_members')
    .select('conversation_id')
    .in('conversation_id', directMessageConversationIds)
    .eq('user_id', userId2);

  if (error) throw error;

  const matchedIds = new Set((data || []).map((row) => row.conversation_id));
  return userConversations.find((c) => matchedIds.has(c.conversation_id)) || null;
}

export async function getConversationUnreadCount(conversationId: string, userId: string): Promise<number> {
  const { data: member, error: memberError } = await supabase
    .from('conversation_members')
    .select('last_read_at')
    .eq('conversation_id', conversationId)
    .eq('user_id', userId)
    .maybeSingle();

  if (memberError) throw memberError;
  if (!member) return 0;

  let query = supabase
    .from('messages')
    .select('message_id', { count: 'exact', head: true })
    .eq('conversation_id', conversationId)
    .neq('author_user_id', userId);

  if (member.last_read_at) {
    query = query.gt('created_at', member.last_read_at);
  }

  const { count, error } = await query;
  if (error) throw error;
  return count || 0;
}

/**
 * Returns the total unread message count across all conversations for the
 * current user. Delegates to the get_total_unread_count DB function which
 * performs this in a single query instead of the previous waterfall.
 */
export async function getUnreadMessageCount(): Promise<number> {
  const { data, error } = await supabase.rpc('get_total_unread_count');
  if (error) throw error;
  return (data as number) || 0;
}

export async function getCommunicationCounts(): Promise<{
  announcements: number;
  blogPosts: number;
  unreadMessages: number;
}> {
  const [announcementResult, blogResult, unreadMessages] = await Promise.all([
    supabase.from('announcements').select('announcement_id', { count: 'exact', head: true }),
    supabase.from('blog_posts').select('post_id', { count: 'exact', head: true }),
    getUnreadMessageCount(),
  ]);

  if (announcementResult.error) throw announcementResult.error;
  if (blogResult.error) throw blogResult.error;

  return {
    announcements: announcementResult.count || 0,
    blogPosts: blogResult.count || 0,
    unreadMessages,
  };
}

// ============================================
// ENROLLMENT LEADS
// ============================================

const ENROLLMENT_LEAD_SELECT = `
  ${ENROLLMENT_LEAD_COLUMNS},
  children:enrollment_lead_children(child_id, lead_id, name, age, program_type, created_at),
  programBookings:enrollment_lead_program_bookings(booking_id, lead_id, program_type, booking_token, appointment_slot_id, appointment_date, appointment_time, status, created_at),
  notifications:enrollment_lead_notifications(notification_id, type, status, recipient_email, created_at)
`;

function mapEnrollmentLeadRow(row: Record<string, unknown>): EnrollmentLead {
  const notifications = (row.notifications ?? []) as EnrollmentLeadNotification[];
  const byRecency = [...notifications].sort((a, b) => b.created_at.localeCompare(a.created_at));
  const reminder = byRecency.find(n => n.type === 'reminder') ?? null;
  const confirmation = byRecency.find(n => n.type === 'booking_confirmation') ?? null;
  return {
    ...row,
    children: (row.children ?? []) as EnrollmentLeadChild[],
    programBookings: (row.programBookings ?? []) as EnrollmentLeadProgramBooking[],
    reminderNotification: reminder,
    confirmationNotification: confirmation,
    notificationHistory: byRecency,
  } as EnrollmentLead;
}

const ACTIVE_LEAD_STATUSES = ['new', 'approved', 'appointment_scheduled', 'appointment_confirmed'];
const TERMINAL_LEAD_STATUSES = ['enrolled', 'closed', 'denied'];

export async function getActiveEnrollmentLeads(): Promise<EnrollmentLead[]> {
  const { data, error } = await supabase
    .from('enrollment_leads')
    .select(ENROLLMENT_LEAD_SELECT)
    .in('status', ACTIVE_LEAD_STATUSES)
    .is('deleted_at', null)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []).map(mapEnrollmentLeadRow);
}

export type TerminalLeadFilter = 'enrolled' | 'closed' | 'denied' | 'archived' | 'all_terminal';

export async function getTerminalEnrollmentLeads(opts: {
  filter: TerminalLeadFilter;
  search?: string;
  page: number;
  pageSize?: number;
}): Promise<{ leads: EnrollmentLead[]; hasMore: boolean }> {
  const pageSize = opts.pageSize ?? 50;
  let query = supabase.from('enrollment_leads').select(ENROLLMENT_LEAD_SELECT);

  if (opts.filter === 'archived') {
    query = query.not('deleted_at', 'is', null);
  } else {
    query = query.is('deleted_at', null);
    query = opts.filter === 'all_terminal'
      ? query.in('status', TERMINAL_LEAD_STATUSES)
      : query.eq('status', opts.filter);
  }

  const term = opts.search?.trim();
  if (term) {
    // escape LIKE wildcards, then make the pattern safe inside a double-quoted
    // PostgREST filter value (commas, parens, dots in the term stay literal)
    const likeSafe = term.replace(/[\\%_]/g, (c) => `\\${c}`);
    const quoted = likeSafe.replace(/"/g, '\\"');
    const { data: childMatches, error: childError } = await supabase
      .from('enrollment_lead_children')
      .select('lead_id')
      .ilike('name', `%${likeSafe}%`);
    if (childError) throw childError;
    const childLeadIds = [...new Set((childMatches ?? []).map((c) => c.lead_id))];
    const orParts = [
      `parent_name.ilike."%${quoted}%"`,
      `parent_email.ilike."%${quoted}%"`,
      `student_name.ilike."%${quoted}%"`,
    ];
    if (childLeadIds.length > 0) orParts.push(`lead_id.in.(${childLeadIds.join(',')})`);
    query = query.or(orParts.join(','));
  }

  const from = opts.page * pageSize;
  const { data, error } = await query
    .order('created_at', { ascending: false })
    .range(from, from + pageSize); // one extra row to detect hasMore
  if (error) throw error;
  const rows = data ?? [];
  return {
    leads: rows.slice(0, pageSize).map(mapEnrollmentLeadRow),
    hasMore: rows.length > pageSize,
  };
}

export async function getTerminalLeadCounts(): Promise<{
  enrolled: number;
  closed: number;
  denied: number;
  archived: number;
}> {
  const countFor = (status: string) =>
    supabase
      .from('enrollment_leads')
      .select('lead_id', { count: 'exact', head: true })
      .eq('status', status)
      .is('deleted_at', null);

  const [enrolled, closed, denied, archived] = await Promise.all([
    countFor('enrolled'),
    countFor('closed'),
    countFor('denied'),
    supabase
      .from('enrollment_leads')
      .select('lead_id', { count: 'exact', head: true })
      .not('deleted_at', 'is', null),
  ]);
  for (const r of [enrolled, closed, denied, archived]) {
    if (r.error) throw r.error;
  }
  return {
    enrolled: enrolled.count ?? 0,
    closed: closed.count ?? 0,
    denied: denied.count ?? 0,
    archived: archived.count ?? 0,
  };
}

export async function getEnrollmentLeadById(leadId: string): Promise<EnrollmentLead> {
  const { data, error } = await supabase
    .from('enrollment_leads')
    .select(ENROLLMENT_LEAD_SELECT)
    .eq('lead_id', leadId)
    .single();

  if (error) throw error;
  return mapEnrollmentLeadRow(data);
}

export async function findLeadsByEmail(email: string): Promise<Array<{ lead_id: string; parent_name: string; status: EnrollmentLead['status']; created_at: string }>> {
  // Escape ILIKE wildcards so emails containing `_` or `%` match literally.
  const pattern = email.trim().replace(/[\\%_]/g, (c) => `\\${c}`);
  const { data, error } = await supabase
    .from('enrollment_leads')
    .select('lead_id, parent_name, status, created_at')
    .ilike('parent_email', pattern)
    .is('deleted_at', null)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

// ============================================
// FEEDBACK TESTS
// ============================================

export async function getAllFeedbackTests(): Promise<FeedbackTest[]> {
  const { data, error } = await supabase
    .from('feedback_tests')
    .select(FEEDBACK_TEST_COLUMNS)
    .order('test_date', { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function getFeedbackTestsByFamily(familyId: string): Promise<FeedbackTest[]> {
  const { data: students, error: studentsError } = await supabase
    .from('students')
    .select('student_id')
    .eq('family_id', familyId);

  if (studentsError) throw studentsError;
  if (!students || students.length === 0) return [];

  const studentIds = students.map((s) => s.student_id);

  // Single join: student_feedback → feedback_tests, deduped client-side
  const { data, error } = await supabase
    .from('student_feedback')
    .select(`test_id, feedback_tests(${FEEDBACK_TEST_COLUMNS})`)
    .in('student_id', studentIds);

  if (error) throw error;

  const testMap = new Map<string, FeedbackTest>();
  for (const row of (data || []) as { test_id: string; feedback_tests: FeedbackTest | null }[]) {
    if (row.feedback_tests) testMap.set(row.feedback_tests.test_id, row.feedback_tests);
  }

  return Array.from(testMap.values()).sort((a, b) => b.test_date.localeCompare(a.test_date));
}

// ============================================
// STUDENT FEEDBACK
// ============================================

export type FeedbackWithRelations = StudentFeedback & {
  profiles: { display_name: string | null } | null;
};

async function attachAuthorNames(rows: StudentFeedback[]): Promise<FeedbackWithRelations[]> {
  if (rows.length === 0) return [];
  const authorIds = Array.from(new Set(rows.map((r) => r.author_user_id)));
  const { data: profiles } = await supabase
    .from('profiles')
    .select('user_id, display_name')
    .in('user_id', authorIds);
  const nameMap = new Map((profiles || []).map((p) => [p.user_id as string, p.display_name as string | null]));
  return rows.map((r) => ({
    ...r,
    profiles: { display_name: nameMap.get(r.author_user_id) ?? null },
  }));
}

export async function getStudentFeedbackByFamily(familyId: string): Promise<FeedbackWithRelations[]> {
  const { data: students, error: studentsError } = await supabase
    .from('students')
    .select('student_id')
    .eq('family_id', familyId);

  if (studentsError) throw studentsError;
  if (!students || students.length === 0) return [];

  const studentIds = students.map((s) => s.student_id);

  const { data, error } = await supabase
    .from('student_feedback')
    .select(STUDENT_FEEDBACK_COLUMNS)
    .in('student_id', studentIds)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return attachAuthorNames(data || []);
}

export async function getAllStudentFeedback(): Promise<FeedbackWithRelations[]> {
  const { data, error } = await supabase
    .from('student_feedback')
    .select(STUDENT_FEEDBACK_COLUMNS)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return attachAuthorNames(data || []);
}

// ============================================
// REVIEWS
// ============================================

export async function getReviews(): Promise<Review[]> {
  const { data, error } = await supabase
    .from('reviews')
    .select(REVIEW_COLUMNS)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function getReviewByFamily(familyId: string): Promise<Review | null> {
  const { data, error } = await supabase
    .from('reviews')
    .select(REVIEW_COLUMNS)
    .eq('family_id', familyId)
    .maybeSingle();

  if (error) throw error;
  return data || null;
}

export async function getUserReview(userId: string): Promise<Review | null> {
  const { data, error } = await supabase
    .from('reviews')
    .select(`
      ${REVIEW_COLUMNS},
      families!reviews_family_id_fkey (
        family_id,
        primary_email
      )
    `)
    .eq('author_user_id', userId)
    .maybeSingle();

  if (error) throw error;
  return data || null;
}

// ============================================
// APPOINTMENT SLOTS
// ============================================

export async function getAppointmentSlots(
  programType?: 'little_dragons' | 'youth'
): Promise<AppointmentSlot[]> {
  let query = supabase
    .from('appointment_slots')
    .select('*')
    .eq('is_active', true)
    .order('day_of_week');

  if (programType) {
    query = query.in('program_type', [programType, 'all']);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}

export async function getUpcomingBookableDates(slotId: string, weeksAhead = 20): Promise<string[]> {
  const { data, error } = await supabase.rpc('get_upcoming_bookable_dates', {
    p_slot_id: slotId,
    p_weeks_ahead: weeksAhead,
  })
  if (error) throw error
  return (data ?? []).map((row: { available_date: string }) => row.available_date)
}

export async function getLeadByToken(token: string) {
  const { data, error } = await supabase.rpc('get_lead_by_token', { p_token: token })
  if (error) throw error
  return data?.[0] ?? null
}

export async function getProgramBookingByToken(token: string): Promise<{
  booking_id: string;
  program_type: 'little_dragons' | 'youth';
  status: string;
  appointment_date: string | null;
  appointment_time: string | null;
  parent_name: string;
  child_names: string[];
} | null> {
  const { data, error } = await supabase.rpc('get_program_booking_by_token', { p_token: token });
  if (error) throw error;
  return data?.[0] ?? null;
}

// ============================================
// ADMIN NOTIFICATION SETTINGS
// ============================================

export async function getAdminNotificationSettings(): Promise<AdminNotificationSetting[]> {
  const { data, error } = await supabase.rpc('get_admin_notification_settings')
  if (error) throw error
  return data ?? []
}

export async function getAdminEmails(): Promise<{ user_id: string; email: string; display_name: string }[]> {
  const { data, error } = await supabase.rpc('get_admin_emails')
  if (error) throw error
  return data ?? []
}

// ============================================
// NOTIFICATION SYSTEM
// ============================================

export async function getSectionUnreadCounts(userId: string): Promise<{
  announcements: number;
  blog: number;
}> {
  const { data: lastSeen } = await supabase
    .from('user_section_last_seen')
    .select('section, last_seen_at')
    .eq('user_id', userId);

  const announcementsSince =
    lastSeen?.find((r) => r.section === 'announcements')?.last_seen_at ??
    '1970-01-01T00:00:00Z';
  const blogSince =
    lastSeen?.find((r) => r.section === 'blog')?.last_seen_at ??
    '1970-01-01T00:00:00Z';

  const [announcementsResult, blogResult] = await Promise.all([
    supabase
      .from('announcements')
      .select('*', { count: 'exact', head: true })
      .gt('created_at', announcementsSince),
    supabase
      .from('blog_posts')
      .select('*', { count: 'exact', head: true })
      .gt('created_at', blogSince),
  ]);

  return {
    announcements: announcementsResult.count ?? 0,
    blog: blogResult.count ?? 0,
  };
}

export async function getNewFeedbackCount(userId: string, familyId: string): Promise<number> {
  const { data: lastSeen } = await supabase
    .from('user_section_last_seen')
    .select('last_seen_at')
    .eq('user_id', userId)
    .eq('section', 'feedback')
    .maybeSingle();

  const since = lastSeen?.last_seen_at ?? '1970-01-01T00:00:00Z';

  const { data: students } = await supabase
    .from('students')
    .select('student_id')
    .eq('family_id', familyId);

  if (!students || students.length === 0) return 0;

  const studentIds = students.map((s: { student_id: string }) => s.student_id);

  const { count } = await supabase
    .from('student_feedback')
    .select('*', { count: 'exact', head: true })
    .in('student_id', studentIds)
    .gt('created_at', since);

  return count ?? 0;
}

export async function getUnreadNotificationCount(): Promise<number> {
  const { count } = await supabase
    .from('user_notifications')
    .select('*', { count: 'exact', head: true })
    .eq('is_read', false);
  return count ?? 0;
}

export async function getNotificationHistory(
  page: number,
  pageSize = 20
): Promise<{ notifications: UserNotification[]; hasMore: boolean }> {
  const from = page * pageSize;
  const { data, error } = await supabase
    .from('user_notifications')
    .select('*')
    .order('created_at', { ascending: false })
    .range(from, from + pageSize);
  if (error) throw error;
  const rows = (data ?? []) as UserNotification[];
  return { notifications: rows.slice(0, pageSize), hasMore: rows.length > pageSize };
}

export async function getNotificationSummary(userId: string): Promise<{
  unreadMessages: number;
  announcements: { count: number; latestTitle: string | null };
  blog: { count: number; latestTitle: string | null };
  commentNotifications: UserNotification[];
}> {
  const { data: lastSeen } = await supabase
    .from('user_section_last_seen')
    .select('section, last_seen_at')
    .eq('user_id', userId);

  const announcementsSince =
    lastSeen?.find((r) => r.section === 'announcements')?.last_seen_at ??
    '1970-01-01T00:00:00Z';
  const blogSince =
    lastSeen?.find((r) => r.section === 'blog')?.last_seen_at ??
    '1970-01-01T00:00:00Z';

  const [messagesCount, annCount, annLatest, blogCount, blogLatest, commentNotifsData] =
    await Promise.all([
      getUnreadMessageCount(),
      supabase
        .from('announcements')
        .select('announcement_id', { count: 'exact', head: true })
        .gt('created_at', announcementsSince)
        .neq('author_user_id', userId),
      supabase
        .from('announcements')
        .select('title')
        .gt('created_at', announcementsSince)
        .neq('author_user_id', userId)
        .order('created_at', { ascending: false })
        .limit(1),
      supabase
        .from('blog_posts')
        .select('post_id', { count: 'exact', head: true })
        .gt('created_at', blogSince)
        .neq('author_user_id', userId),
      supabase
        .from('blog_posts')
        .select('title')
        .gt('created_at', blogSince)
        .neq('author_user_id', userId)
        .order('created_at', { ascending: false })
        .limit(1),
      supabase
        .from('user_notifications')
        .select('*')
        .eq('is_read', false)
        .in('type', ['comment_reply', 'post_comment'])
        .order('created_at', { ascending: false })
        .limit(5),
    ]);

  if (annCount.error) throw annCount.error;
  if (annLatest.error) throw annLatest.error;
  if (blogCount.error) throw blogCount.error;
  if (blogLatest.error) throw blogLatest.error;
  if (commentNotifsData.error) throw commentNotifsData.error;

  return {
    unreadMessages: messagesCount,
    announcements: {
      count: annCount.count ?? 0,
      latestTitle: annLatest.data?.[0]?.title ?? null,
    },
    blog: {
      count: blogCount.count ?? 0,
      latestTitle: blogLatest.data?.[0]?.title ?? null,
    },
    commentNotifications: (commentNotifsData.data ?? []) as UserNotification[],
  };
}

export async function getUserNotificationPreferences(): Promise<UserNotificationPreferences | null> {
  const { data } = await supabase
    .from('user_notification_preferences')
    .select('*')
    .maybeSingle();
  return data as UserNotificationPreferences | null;
}

export async function getAdminNotificationPreferences(): Promise<AdminNotificationPreferences | null> {
  const { data } = await supabase
    .from('admin_notification_preferences')
    .select('*')
    .maybeSingle();
  return data as AdminNotificationPreferences | null;
}
