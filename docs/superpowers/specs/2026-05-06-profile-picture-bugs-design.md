# Profile Picture Bug Fixes — Design Spec

**Date:** 2026-05-06  
**Status:** Approved

---

## Overview

Three bugs in the profile picture feature introduced since the original spec was implemented. All fixes are surgical — one or two lines each — with no structural changes.

---

## Bug 1 — Cropped photo not applied visually after save

### Root cause

`uploadProfileImage` in `src/lib/supabase/storage.ts` always uploads to the same fixed path (`profiles/{user_id}/avatar` or `students/{student_id}/photo`) with `upsert: true`. The returned public URL is therefore identical on every upload. The browser caches the old image at that URL and never refetches it, so the cropped photo appears not to have saved even though the file was correctly replaced in storage.

### Fix

Append `?t={Date.now()}` to the public URL before returning it from `uploadProfileImage`. The timestamp is stored in the DB column (`avatar_url` / `photo_url`). After `onRefreshUser()` runs, React receives the new URL and re-renders with the fresh image. The CDN/browser treats the timestamp-suffixed URL as a new resource and fetches the updated file.

**Storage impact:** none. The file is still overwritten in place (`upsert: true`). There is always exactly one file per user/student in storage. The `?t=` suffix is only appended to the URL string in the database and is ignored by Supabase Storage when serving the file. Old CDN cache entries with stale timestamps expire naturally.

### Change

`src/lib/supabase/storage.ts` — `uploadProfileImage`: change the return statement from `return getProfilePublicUrl(path)` to `return getProfilePublicUrl(path) + '?t=' + Date.now()`.

---

## Bug 2 — Remove photo shows blank avatar instead of initials fallback

### Root cause

Radix UI Avatar tracks image loading state internally. Once an `AvatarImage` loads successfully, its status is set to `'loaded'`. `AvatarFallback` only renders when status ≠ `'loaded'`. When the photo is removed, `currentUrl` becomes `null` and `AvatarImage` unmounts, but the Radix context retains `status='loaded'` from the previous image. `AvatarFallback` therefore never renders and the avatar appears blank. On page reload the context starts fresh at `'idle'`, so initials render correctly.

### Fix

Add `key={currentUrl ?? 'no-image'}` to the `Avatar` element in `PhotoUploader`. When `currentUrl` transitions from a URL to `null`, React sees a key change, unmounts the old Avatar entirely, and mounts a fresh one. The fresh Radix Avatar starts at `status='idle'`, so `AvatarFallback` renders immediately.

### Change

`src/components/dashboard/PhotoUploader.tsx` — `Avatar`: add `key={currentUrl ?? 'no-image'}` prop.

---

## Bug 3 — Profile photo card shows wrong initials and background color

### Root cause

Two mismatches between the profile photo `PhotoUploader` and every other avatar in the app:

1. **Initials:** `ProfileTab` passes `fallback={user.displayName?.[0] ?? '?'}` — only the first character of the display name (e.g. "K" from "KJN Guerra"). The rest of the app calls `getInitials(user.displayName)` from `src/lib/format.ts`, which takes the first letter of each word (e.g. "KG").
2. **Background color:** `AvatarFallback` in `PhotoUploader` uses the shadcn default `bg-muted` (gray). The sidebar and other avatars use `bg-sidebar-primary text-sidebar-primary-foreground` (brand red).

Student photo uploaders already pass `${firstName[0]}${lastName[0]}` (two characters) and are unaffected.

### Fix

1. In `ProfileTab.tsx`, import `getInitials` from `src/lib/format.ts` and change the profile photo `PhotoUploader`'s `fallback` prop to `getInitials(user.displayName ?? '?')`.
2. In `PhotoUploader.tsx`, add `bg-sidebar-primary text-sidebar-primary-foreground font-semibold` to the `AvatarFallback` className.

### Changes

- `src/components/dashboard/ProfileTab.tsx` — profile photo `PhotoUploader` `fallback` prop
- `src/components/dashboard/PhotoUploader.tsx` — `AvatarFallback` className

---

## Files touched

| File | Change |
|---|---|
| `src/lib/supabase/storage.ts` | Append `?t={Date.now()}` to URL returned by `uploadProfileImage` |
| `src/components/dashboard/PhotoUploader.tsx` | Add `key` to `Avatar`; update `AvatarFallback` className |
| `src/components/dashboard/ProfileTab.tsx` | Use `getInitials()` for profile photo `fallback` prop |

---

## Out of scope

- Fixing initials or color on student photo uploaders (already correct)
- Any changes to the messages tab, admin views, or sidebar avatars
- Storage cleanup or migration of existing URLs without cache-bust suffix
