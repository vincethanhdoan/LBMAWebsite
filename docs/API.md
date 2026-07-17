> **Superseded (2026-07-16).** Parts of this document predate the July 2026 rework and no longer match the code. The public site is currently locked behind an under-construction page, and migrations were rebaselined on 2026-07-10; the old numbered migration files now live in `supabase/migrations_archive/`. See the root `README.md` and `CLAUDE.md` for the current architecture.

# API Documentation

This document describes the client-side API surface used by the app to interact with Supabase.

## 1) API Layers

- `src/lib/supabase/client.ts`
  - Supabase client initialization
  - Timeout-based RPC wrappers for login checks and public enrollment
- `src/lib/supabase/queries.ts`
  - Read/query operations
- `src/lib/supabase/mutations.ts`
  - Write/update/delete operations
- `src/lib/supabase/realtime.ts`
  - Realtime subscription helpers
- `src/lib/supabase/storage.ts`
  - Attachment upload/sign/delete helpers

## 2) Environment Variables

Required by `client.ts`:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

If missing, client initialization throws at startup.

## 3) RPC Contracts

### 3.1 `check_email_has_account`

- Purpose: invite-only login gate pre-check
- Client wrapper: `checkEmailHasAccountWithTimeout(email, timeoutMs)`
- Return: `{ data: boolean | null, error: { message: string } | null }`

### 3.2 `submit_enrollment_lead`

- Purpose: public lead capture + notification queue seed
- Client wrapper: `submitEnrollmentLeadWithTimeout(input, timeoutMs)`
- Input fields:
  - `parentName`, `parentEmail`, `phone?`, `studentName?`, `studentAge?`, `message?`, `sourcePage?`
- Return: `{ data: string | null, error: { message: string } | null }` (`data` is `lead_id`)

### 3.3 `create_or_get_dm_conversation`

- Purpose: idempotent DM creation/retrieval for allowed role pairs
- Client wrapper: `createOrGetDirectConversation(otherUserId)`
- Return: `conversation_id` (UUID string)

## 4) Query API (`queries.ts`)

Grouped by domain:

- **Profiles/Families**
  - `getProfile`, `getAllProfiles`
  - `getFamilyByOwner`, `getAllFamilies`, `getFamilyWithRelations`
  - `getGuardiansByFamily`, `getStudentsByFamily`
- **Communications**
  - `getAnnouncements`, `getAnnouncement`, `getAnnouncementComments`
  - `getBlogPosts`, `getBlogPost`, `getBlogComments`
- **Messaging**
  - `getGlobalConversation`, `getUserConversations`, `getConversationMembers`
  - `getMessages`, `getDirectMessageConversation`
  - `getConversationUnreadCount`, `getUnreadMessageCount`, `getCommunicationCounts`
- **Reviews**
  - `getReviews`, `getReviewByFamily`, `getUserReview`

Behavioral notes:

- Some methods include fallback query shapes for migration/schema compatibility.
- Unread counts use `conversation_members.last_read_at` when available.

## 5) Mutation API (`mutations.ts`)

Grouped by domain:

- **Profiles/Families**
  - `updateProfile`
  - `createFamily`, `updateFamily`, `setFamilyAccountStatus`, `deleteFamily`
  - `createGuardian`, `updateGuardian`, `deleteGuardian`
  - `createStudent`, `updateStudent`, `updateStudentsByFamily`, `deleteStudent`
- **Communications**
  - `createAnnouncement`, `updateAnnouncement`, `deleteAnnouncement`
  - `createAnnouncementComment`, `updateAnnouncementComment`, `deleteAnnouncementComment`
  - `createBlogPost`, `updateBlogPost`, `deleteBlogPost`
  - `createBlogComment`, `updateBlogComment`, `deleteBlogComment`
- **Messaging**
  - `createConversation`, `createOrGetDirectConversation`
  - `addConversationMember`, `removeConversationMember`
  - `markConversationAsRead`
  - `createMessage`, `updateMessage`, `deleteMessage`
  - `createMessageAttachment`
- **Reviews**
  - `createReview`, `updateReview`, `deleteReview`

## 6) Realtime API (`realtime.ts`)

Subscription helpers:

- `subscribeToAnnouncements`
- `subscribeToAnnouncementComments(announcementId)`
- `subscribeToBlogPosts`
- `subscribeToBlogComments(postId)`
- `subscribeToMessages(conversationId)`
- `subscribeToConversations`
- `subscribeToReviews`
- `unsubscribe(channel)`

Payload shape:

- `{ eventType: 'INSERT' | 'UPDATE' | 'DELETE', new?: any, old?: any }`

## 7) Storage API (`storage.ts`)

- `uploadFile(file, path)`
- `getFileUrl(path)` (delegates to signed URL helper)
- `getSignedUrl(path, expiresIn?)`
- `deleteFile(path)`
- `generateFilePath(userId, fileName)`
- `getFileExtension(fileName)`
- `isValidFileType(fileName)`
- `getFileSizeMB(fileSizeBytes)`
- `MAX_FILE_SIZE_MB = 10`

## 8) Error Handling Patterns

- Most data wrappers throw Supabase errors directly to callers.
- Timeout wrappers return structured `{ data, error }` instead of throwing for expected timeout/network conditions.
- UI components commonly catch and display errors via inline message or alert.
