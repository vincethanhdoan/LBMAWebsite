import { V3 } from './design';

/**
 * Shared presentation for the public signup form. The field appearance
 * itself lives in `public-website.css` as `.v3-field`, since it has to beat
 * the utility classes the shadcn Input and Textarea already carry.
 */

/**
 * The heading of a form section, in the site's heading style. Shared so the
 * children section and the visit section are the same size and weight.
 */
export const SECTION_HEADING_CLASS = 'v3-h font-black';

export const SECTION_HEADING_STYLE = {
  fontSize: 'clamp(1.35rem, 2.4vw, 1.75rem)',
  color: V3.text,
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
