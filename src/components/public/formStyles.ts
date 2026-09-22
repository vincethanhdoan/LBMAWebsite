import { V3 } from './design';

/**
 * Shared presentation for the public signup form. The field appearance
 * itself lives in `public-website.css` as `.v3-field`, since it has to beat
 * the utility classes the shadcn Input and Textarea already carry.
 */

/**
 * One cream, bordered panel per numbered step. On phones the panel runs to
 * the edges of the white form card (`-mx-4` cancels the card's own `p-4`)
 * and is ruled top and bottom only, which leaves the month grid in step 3
 * the card's full 280px at a 360px viewport instead of 248px. From `sm` up
 * the card has room to inset it as a rounded, fully bordered box.
 */
export const STEP_PANEL_CLASS =
  '-mx-4 flex flex-col gap-3 border-y p-4 sm:mx-0 sm:rounded-xl sm:border sm:p-5';

export const STEP_PANEL_STYLE = {
  backgroundColor: V3.surface,
  borderColor: V3.border,
} as const;

export const STEP_EYEBROW_CLASS = 'v3-eyebrow';

export const STEP_EYEBROW_STYLE = {
  fontSize: '0.8125rem',
  letterSpacing: '1.2px',
} as const;

/**
 * Labels sit directly above their field, never inside it as a placeholder.
 * `block` overrides the shadcn Label's own `flex`, so a label that carries a
 * trailing "(optional)" tag wraps as one sentence instead of pushing the tag
 * out to the far edge.
 */
export const FIELD_LABEL_CLASS = 'block text-[15px] font-bold leading-snug';

/** Hints and inline errors: one step down from the label, never bolder. */
export const FIELD_HELP_CLASS = 'text-sm leading-[1.5]';

export const FIELD_ERROR_COLOR = '#b91c1c';
