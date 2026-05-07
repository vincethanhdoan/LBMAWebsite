# Student Profile Card Redesign

## Context

The student cards inside the family portal's Profile tab currently use a compact horizontal layout: a small avatar on the left, student info beside it, and an Edit button on the right. The photo feels like an afterthought — same size as the guardian avatars, hard to tell it's the student's own photo, and the Upload/Remove buttons sit awkwardly beside it.

The goal is to give the student photo genuine presence: large, full-height, anchoring the left side of the card, with photo controls directly below it and all student info to the right.

## Selected Layout: Large Circle + Stacked Buttons (Option B)

```
┌──────────────────────────────────────────────────────┐
│  ┌──────────┐  │  Vince Doan           [Active] [Edit]│
│  │          │  │  Age 21 · Born 10/21/2004            │
│  │    VD    │  │  ┌────────────┐                      │
│  │  circle  │  │  │ Black Belt │                      │
│  │          │  │  └────────────┘                      │
│  └──────────┘  │                                      │
│  [Upload Photo]│  ┌────────────────────────────────┐  │
│  [Remove Photo]│  │ Notes                          │  │
│                │  │ this is an important note      │  │
│                │  └────────────────────────────────┘  │
└──────────────────────────────────────────────────────┘
```

Left column width: ~108px. Photo size: `h-20 w-20` (80px circle). The left column is bordered-right to visually separate the photo zone from the info zone.

## Design Tokens (matches globals.css exactly)

- Background: `#FAF9F6`
- Card: `#ffffff`, border `rgba(27,18,18,0.08)`
- Primary: `#A01F23`
- Secondary tint: `#F5E6E8`
- Muted: `#E8E6E3`, muted-fg: `#6B6866`
- Fonts: Lexend (headings/name), Source Sans 3 (body/meta)
- Radius: `0.625rem`

## Component Changes

### 1. `PhotoUploader.tsx` — add `layout` prop

Add `layout?: 'horizontal' | 'vertical'` prop (default `'horizontal'`).

When `layout === 'vertical'`:
- Render `flex-col items-center gap-2` instead of `flex items-center gap-4`
- Avatar on top
- Upload and Remove buttons stacked below, each full-width within the column

When `layout === 'horizontal'` (unchanged):
- Existing behavior — avatar left, buttons right in a column

No other existing callers change.

### 2. `ProfileTab.tsx` — student card layout

Replace the student card's inner flex structure with a two-column grid:

```tsx
// Before
<div className="flex items-start gap-4">
  <PhotoUploader size="md" ... />
  <div>...</div>  {/* info */}
</div>

// After
<div className="grid grid-cols-[108px_1fr] min-h-[148px]">
  <div className="flex flex-col items-center justify-center gap-2 px-3 py-4 border-r border-border">
    <PhotoUploader size="lg" layout="vertical" ... />
  </div>
  <div className="p-4 flex flex-col">
    ...info...
  </div>
</div>
```

The outer wrapper `p-4 border rounded-lg` stays as-is. The grid replaces only the inner content structure.

### 3. Belt badge — `align-self: flex-start`

The belt badge (`<Badge className="bg-[#303030] ...">`) is inside a flex-column parent. Add `className="... self-start"` so it only wraps its text rather than stretching to full row width.

```tsx
// Before
<Badge className="bg-[#303030] text-background border-primary">
  {student.beltLevel}
</Badge>

// After
<Badge className="bg-[#303030] text-background border-primary self-start">
  {student.beltLevel}
</Badge>
```

### 4. Info pane structure (right column)

```tsx
<div className="p-4 flex flex-col">
  {/* Top row: name + status badge left, Edit button right */}
  <div className="flex items-start justify-between gap-2 mb-1">
    <div className="flex items-center flex-wrap gap-2">
      <h3 className="font-semibold text-lg leading-tight">{firstName} {lastName}</h3>
      <Badge variant={active ? 'default' : 'secondary'}>{status}</Badge>
    </div>
    <Button variant="outline" size="sm">
      <Edit2 className="w-4 h-4 mr-2" /> Edit
    </Button>
  </div>

  {/* Metadata row */}
  <p className="text-sm text-muted-foreground mb-2">
    Age {age} · Born {dob}
  </p>

  {/* Belt badge — self-start keeps it content-width only */}
  <Badge className="bg-[#303030] text-background border-primary self-start">
    {beltLevel}
  </Badge>

  {/* Notes — only when present */}
  {notes && (
    <div className="mt-3 p-3 bg-secondary rounded-md">
      <Label className="text-xs text-muted-foreground">Notes</Label>
      <p className="text-sm mt-1">{notes}</p>
    </div>
  )}
</div>
```

## What Does Not Change

- `PhotoUploader` upload/crop/remove logic is untouched
- Guardian photo uploaders (use `layout="horizontal"` default — no change needed)
- Family profile photo card (separate card, not a student card)
- All dialogs, RPCs, state management, and toast behavior
- Belt badge color (`bg-[#303030]`) — only layout fix (`self-start`)

## Files Touched

| File | Change |
|---|---|
| `src/components/dashboard/PhotoUploader.tsx` | Add `layout` prop, vertical variant rendering |
| `src/components/dashboard/ProfileTab.tsx` | Student card grid layout, belt badge `self-start` |

No new files. No migrations. No API changes.
