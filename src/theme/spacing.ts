/**
 * DEPRECATED PATH — kept only so `@/theme/spacing` keeps resolving. The
 * actual token values now live in `src/theme/tokens/spacing.ts`, rebuilt
 * from real padding/margin/gap values in `mockups/*.html` and rounded to a
 * 4pt scale (see that file's comments for the exact raw->rounded mapping
 * per token). `motion` and `radius` are unchanged from the previous
 * attempt (no mockup shows motion, and no mockup uses rounded corners —
 * the design system is hairline dividers only, not cards/boxes — so
 * `radius` is effectively unused going forward; kept for now in case a
 * future component needs it, e.g. an avatar). Do not add values here —
 * edit `tokens/spacing.ts` instead.
 *
 * NOTE: the old scale's key names (`xs`/`sm`/`md`/`lg`/`xl`/`xxl`) do NOT
 * map 1:1 to the new scale's values — e.g. old `md` was 16 and new `md` is
 * also 16 (coincidentally unchanged), but old `lg` was 24 while new `lg`
 * is 20 (screen margin) and 24 is now `xl`. Any consuming code must be
 * re-checked against the new token, not assumed compatible by name.
 */
export * from "@/theme/tokens/spacing";
