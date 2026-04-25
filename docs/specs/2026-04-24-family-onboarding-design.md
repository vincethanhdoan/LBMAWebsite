# Family Onboarding — Design Spec

**Date:** 2026-04-24
**Status:** Approved

## Overview

Replace the current single-screen `FirstLoginOnboarding` with a 3-step wizard that collects all information the school needs from a new family: primary guardian details, children, and optionally a home address.

Target user: parents arriving via magic-link invite, often on a phone, not necessarily tech-savvy. The flow must be clear, warm, and low-friction.

---

## Component Architecture

`FirstLoginOnboarding.tsx` becomes a **wizard shell** that holds all shared state and fires the database writes at the end. Three focused sub-components are extracted into a new `src/components/onboarding/` folder.

```
src/components/onboarding/
├── FamilyOnboarding.tsx        ← wizard shell (renamed from FirstLoginOnboarding)
├── GuardianStep.tsx            ← step 1
├── ChildrenStep.tsx            ← step 2
└── AddressStep.tsx             ← step 3
```

`App.tsx` continues to import by path — only the import target changes.

### State shape (held in wizard shell)

```ts
type GuardianForm = {
  firstName: string
  lastName: string
  phone: string
  relationship: Relationship | ''
}

type ChildForm = {
  id: string          // local uuid for React key
  firstName: string
  lastName: string
  dob: string         // "YYYY-MM-DD"
}

type AddressForm = {
  street: string
  city: string
  state: string       // default "CA"
  zip: string
}

type WizardState = {
  step: 1 | 2 | 3
  guardian: GuardianForm
  children: ChildForm[]
  address: AddressForm
}
```

### Props contract (each sub-step)

Each step receives its own slice of state plus `onNext` and `onBack` callbacks. Steps are stateless display components — all state lives in the shell.

```ts
// GuardianStep
interface GuardianStepProps {
  email: string
  values: GuardianForm
  onChange: (updates: Partial<GuardianForm>) => void
  onNext: () => void
}

// ChildrenStep
interface ChildrenStepProps {
  values: ChildForm[]
  onChange: (children: ChildForm[]) => void
  onNext: () => void
  onBack: () => void
}

// AddressStep
interface AddressStepProps {
  values: AddressForm
  onChange: (updates: Partial<AddressForm>) => void
  onFinish: () => void          // submits with address
  onSkip: () => void            // submits without address
  onBack: () => void
  submitting: boolean
  error: string | null
}
```

---

## Steps

### Step 1 — About You

**Fields:**
| Field | Required | Notes |
|---|---|---|
| Email | — | Pre-filled, disabled |
| First name | Yes | |
| Last name | Yes | |
| Phone | Yes | |
| Relationship | No | Dropdown: Mother, Father, Guardian, Grandparent, Other — stored as lowercase (`mother`, `father`, `guardian`, `grandparent`, `other`) to match the `Relationship` type |

**Validation:** First name, last name, and phone must all be non-empty (trimmed) before advancing.

**CTA:** "Next: Your Children →"

---

### Step 2 — Your Children

At least one child must be added before advancing.

**Per-child fields:**
| Field | Required | Notes |
|---|---|---|
| First name | Yes | |
| Last name | Yes | |
| Date of birth | Yes | Used to determine program eligibility (Little Dragons vs Youth) |

**Interactions:**
- "Add another child" button appends a new blank child card
- Each child card (beyond the first) shows a "Remove" button
- A child row is valid when first name and last name are non-empty (trimmed) and DOB is a parseable date (not in the future)

**CTA:** "Next: Home Address →" / "← Back"

---

### Step 3 — Home Address (optional)

**Fields:**
| Field | Required | Notes |
|---|---|---|
| Street address | No | |
| City | No | |
| State | No | Defaults to "CA" |
| ZIP code | No | |

**CTAs:**
- "Finish Setup" — submits with whatever address data was entered
- "Skip for now" — submits with all address fields null
- "← Back"

Loading state and error message appear on this screen (it owns the submit).

---

### Done Screen

Displayed after the submit promise resolves. Shows a summary:
- Guardian name
- Children names (comma-separated)
- Address (or "Not added yet" if skipped)

CTA: "Go to Dashboard →" calls `onComplete()`.

---

## Data Writes

All writes fire in sequence at the end of step 3 (either "Finish Setup" or "Skip"). Nothing is written during wizard navigation.

```
1. updateProfile(userId, { display_name: `${firstName} ${lastName}` })
2. createFamily({ owner_user_id, primary_email, address, city, state, zip })
   → null for address fields if skipped
3. createGuardian({ family_id, firstName, lastName, email, phone, relationship, is_primary_contact: true })
4. for each child:
   createStudent({ family_id, first_name, last_name, date_of_birth, status: 'active' })
```

On any error: surface message on step 3 (or the done screen), allow retry. The wizard stays on step 3 while submitting.

---

## Design

Follows the LBMAA brand system:
- **Background:** `#FAF9F6` warm cream
- **Primary action:** `#A01F23` deep red, used only for CTAs and progress bar
- **Child cards:** `#F5E6E8` rose tint — visually groups child data without nested cards
- **Typography:** Lexend for step titles and labels, Source Sans 3 for inputs and body
- **Progress bar:** Thin 3px red bar at top of the screen area, fills left-to-right (33% → 66% → 90% → 100%)
- **App header:** Dark `#1B1212` bar with school name — present on all steps for brand anchoring

**Layout:** Single-column, mobile-first. Max content width ~420px centered. All tap targets 44px minimum height.

**Animations:** Step transitions use a simple opacity + translate fade (150ms ease-out). Respects `prefers-reduced-motion`.

---

## What Is Out of Scope

- Second guardian — added later from profile settings
- Belt level — not collected at onboarding (new families won't have one)
- Pre-populating from enrollment lead — not linked at this time
- Multi-guardian support during the wizard
