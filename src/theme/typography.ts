/**
 * DEPRECATED PATH — kept only so `@/theme/typography` (used by
 * `app/_layout.tsx` and any external imports) keeps resolving. The actual
 * token values now live in `src/theme/tokens/typography.ts`, rebuilt from
 * the approved mockups in `mockups/*.html` (Fraunces `type`, Literata
 * `readingType`/`getReadingTypeScale`, IBM Plex Mono `monoType`). Do not
 * add values here — edit `tokens/typography.ts` instead.
 *
 * BREAKING CHANGE for the next engineer: this design system dropped the
 * "system sans for UI" approach entirely — there is no more `fontFamily.ui`
 * / `type.body` / `type.title` / `type.heading` / `fontSizes` export.
 * IBM Plex Mono now carries all small UI text (see `monoType` in
 * `tokens/typography.ts`), and Fraunces carries all headings/titles (see
 * `type`). `readingFontAssets` (the useFonts() map consumed by
 * `app/_layout.tsx`) is also gone — that file needs updating to load
 * Fraunces + Literata + IBM Plex Mono via the three
 * `@expo-google-fonts/*` packages declared in package.json (see that
 * file's comment), not just Literata. This file intentionally does NOT
 * re-provide the old shape so the type error surfaces at the one call site
 * that needs it, rather than silently keeping stale fonts loaded.
 */
export * from "@/theme/tokens/typography";
