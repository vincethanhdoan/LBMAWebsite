# Feedback Test Search

**Date:** 2026-04-16
**Status:** Approved

## Overview

Instructors need to quickly locate a specific feedback test in the test list. With 10–100 tests accumulating over time, a simple search bar covering all relevant fields is sufficient and consistent with existing UI patterns.

## Scope

Single feature change to `FeedbackTab.tsx`: add a text search input above the test list in the left panel. No new queries, no schema changes, no changes to the right detail panel.

## Data & Filtering Logic

`FeedbackTab` already loads all `FeedbackTest` records and all `StudentFeedback` records on mount. On load, derive a student-name index:

```ts
const studentNamesByTest = new Map<string, string[]>()
// for each feedback entry, push student display name into the entry's test bucket
```

On every keystroke, filter the test list client-side against a normalized lowercase query. A test is included if any of the following contains the query string:

1. `test.title`
2. `test.description` (if present)
3. Formatted date string — e.g. `"April 15, 2026"` — so "april", "2026", "apr 15" all match
4. Any student name in `studentNamesByTest.get(test.test_id) ?? []`

Empty query → all tests shown. No match → empty state shown.

## UI

Location: top of the left panel in `FeedbackTab`, above the test list.

- Full-width input with `Search` icon pinned left inside the field (`pl-9`), consistent with `AdminEnrollmentLeadsTab` and `AdminUsersTab`
- Placeholder: `"Search by name, date, or student…"`
- Instant filter on every keystroke — no submit button
- Empty state below input when zero tests match: `"No tests match your search."`
- Clearing the input restores the full sorted list

No changes to test detail panel, feedback entries, or any other part of the admin UI.

## Out of Scope

- Date range picker
- Server-side search
- Searching feedback body text
- Any changes outside `FeedbackTab.tsx`
