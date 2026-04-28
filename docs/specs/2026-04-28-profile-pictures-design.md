# Profile Pictures Feature — Design Spec

**Date:** 2026-04-28  
**Status:** Approved

---

## Overview

Allow family accounts to upload a profile picture for their account and a photo for each student. Photos appear everywhere avatars are shown: the Profile tab, Messages (conversation list + thread), and Admin user/student views. Admins can view but not upload photos; only the owning family can manage their own.

---

## Storage & Database

### Supabase Storage

- **New bucket:** `profile-pictures` — public read, authenticated write
- **Account avatar path:** `profiles/{user_id}/avatar` (no file extension; overwritten in place on update)
- **Student photo path:** `students/{student_id}/photo`
- **RLS write policy:**
  - Families may insert/update/delete `profiles/{their_user_id}/avatar` only
  - Families may insert/update/delete `students/{student_id}/photo` only for students whose `family_id` matches their own family
  - Admins have no write access via the app (read is public, so no read policy needed)

### Database

- Add `avatar_url TEXT NULL` to `profiles` table
- Add `photo_url TEXT NULL` to `students` table
- On upload: write the Supabase public URL to the DB column
- On remove: delete the file from storage and set the DB column to `NULL`
- No signed URLs — bucket is public, URLs are stable

### Migration

Single migration file (`028_profile_pictures.sql`) that:
1. Adds `avatar_url` column to `profiles`
2. Adds `photo_url` column to `students`
3. Creates `profile-pictures` bucket (public)
4. Creates storage RLS policies for family-scoped writes

---

## Upload UI

### File constraints (client-side validation)

- Accepted types: `image/jpeg`, `image/png`, `image/webp`, `image/gif`
- Max size: 5 MB
- Show a clear error toast if either constraint is violated before uploading

### Account Profile Photo (Profile tab)

- A new **"Profile Photo"** card appears at the top of the Profile tab, above the Guardians card
- Displays current photo in an `Avatar` (large, ~80px); falls back to initials if no photo
- Two buttons:
  - **"Upload Photo"** — always visible; opens native file picker (`accept="image/*"`)
  - **"Remove Photo"** — only shown when a photo exists; triggers a confirm dialog before deleting
- Flow on upload: file picker → client validation → upload to `profiles/{user_id}/avatar` (upsert) → update `profiles.avatar_url` → refresh local state → toast "Profile photo updated"
- Flow on remove: confirm dialog → delete file from storage → set `profiles.avatar_url = NULL` → refresh local state → toast "Profile photo removed"

### Student Photos (Profile tab — Students card)

- Each student card's existing `Avatar` gets a camera icon overlay on hover (bottom-right corner), indicating it is clickable
- Clicking the avatar opens the upload flow (same validation, upload to `students/{student_id}/photo`, update `students.photo_url`)
- The **Edit Student** dialog also includes an "Upload Photo" / "Remove Photo" section for discoverability
- Remove follows the same confirm → delete → null pattern

### Shared upload helper

Extract a reusable `uploadProfileImage(bucket, path, file)` function in `src/lib/supabase/storage.ts` that handles the upsert and returns the public URL. This keeps the upload logic out of components.

---

## Where Photos Appear

### Profile tab (family self-view)

- Account photo card (described above)
- Each student card avatar shows the student's photo

### Messages tab

- **Conversation list:** family avatar shown next to the family name in the sidebar
- **Message thread:** each message bubble shows the sender's avatar (`AvatarImage` when URL present, `AvatarFallback` initials otherwise)
- Avatar URL sourced from the existing message/conversation data query — extend it to join `profiles.avatar_url`

### Admin — Users tab (`AdminUsersTab`)

- Each family row/card shows the family's account avatar (read-only)
- When an admin expands a family detail view and sees students, each student shows their photo
- No upload affordance for admins

---

## Data Flow

- `profiles.avatar_url` flows through `useAuth` (already reads the profiles row) and `useProfile` — extend both query shapes to include the new column
- `students.photo_url` flows through `useProfile`'s students query — extend the select to include the new column and add `photo_url` to the `Student` type in `src/lib/types.ts`
- No new Realtime subscriptions required — photos refresh on next profile load or manual refetch

---

## TypeScript Types

Additions to `src/lib/types.ts`:
```ts
// Profile gains:
avatar_url: string | null;

// Student gains:
photo_url: string | null;
```

UI-local `Student` type in `ProfileTab.tsx` gains:
```ts
photoUrl: string | null;
```

---

## Error Handling

- File too large or wrong type: client-side toast error, upload never starts
- Storage upload failure: toast error, DB column not updated (upload-then-write ordering)
- DB update failure after successful upload: toast error; the orphaned file is acceptable (small, will be overwritten next upload)
- Remove failure: toast error, UI state rolls back

---

## Out of Scope

- Image cropping or client-side resizing
- Guardian-level individual photos (one photo per family account)
- Admin ability to upload/replace photos on behalf of families
- Photo moderation
