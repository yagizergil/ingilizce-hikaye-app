/**
 * Design token: typography.
 *
 * SOURCE OF TRUTH: `mockups/*.html`. Every entry below is a distinct
 * {fontFamily, fontSize, lineHeight, letterSpacing, fontWeight} combination
 * that actually appears in a mockup's CSS — nothing here is invented. Each
 * token documents its source mockup + selector in a comment.
 *
 * Three font families, no separate UI sans:
 *  - Fraunces  (`.display` in mockups) — headings, book/chapter titles.
 *  - Literata  (`.reading` in mockups, and reader.html's bare
 *    `font-family:'Literata'` usages) — story body text + reading-surface
 *    chrome (chapter subtitle, word-lookup sheet, vocabulary gloss).
 *  - IBM Plex Mono (`.mono` in mockups) — every label, meta, stat number,
 *    nav item, filter, badge. Carries ALL small UI text; there is no
 *    separate UI sans-serif in this design system.
 *
 * FONT WEIGHTS ACTUALLY LOADED BY THE MOCKUPS (Google Fonts @import URLs):
 *  - Fraunces:      normal 500, normal 600, italic 500
 *    (book-detail.html and reader.html do NOT use italic Fraunces anywhere
 *    in their body — reader.html doesn't load Fraunces at all, it has no
 *    Fraunces class/usage. The italic 500 weight is loaded by home.html,
 *    vocabulary.html and book-detail.html's <link> but not visibly used by
 *    any current mockup markup; keep it bundled since it's part of the
 *    declared font spec and low-cost to include for future italic display
 *    use, e.g. an emphasized book title.)
 *  - Literata:       normal 400, italic 400 (reader.html), plus home.html /
 *    vocabulary.html also request 500 normal — but no mockup markup
 *    visibly uses Literata 500; bundle 400 normal + 400 italic only, since
 *    that's what's actually rendered (reader body, reader h2 italic,
 *    reader sheet-hint word italic, vocabulary .gloss italic).
 *  - IBM Plex Mono:  normal 400, normal 500 (library.html book .stat .n and
 *    book-detail.html .statline .n are the only 500-weight mono usages;
 *    everything else is 400).
 *
 * PACKAGES (declare in package.json, do not `npm install` here — see
 * package.json comment / next-engineer note):
 *   @expo-google-fonts/fraunces
 *   @expo-google-fonts/literata
 *   @expo-google-fonts/ibm-plex-mono
 */

export const fontFamily = {
  frauncesMedium: "Fraunces_500Medium",
  frauncesMediumItalic: "Fraunces_500Medium_Italic",
  frauncesSemiBold: "Fraunces_600SemiBold",
  literataRegular: "Literata_400Regular",
  literataRegularItalic: "Literata_400Regular_Italic",
  plexMonoRegular: "IBMPlexMono_400Regular",
  plexMonoMedium: "IBMPlexMono_500Medium",
} as const;

export interface TypeStyle {
  /** `undefined` means "use the platform system font" (RN's default when
   * fontFamily is omitted) -- used by the reading scale's "sans" choice. */
  fontFamily: string | undefined;
  fontSize: number;
  /** Concrete px line-height (RN wants a number, not a unitless ratio). */
  lineHeight: number;
  fontWeight: "400" | "500" | "600";
  letterSpacing: number;
  fontStyle?: "normal" | "italic";
  textTransform?: "uppercase";
}

/**
 * Fraunces ("display") scale. Named after where each size is used across
 * the mockups, largest to smallest.
 *
 * REVISED (post-launch, no longer 1:1 with the mockups): explicit
 * product-owner feedback was that headings read too small/quiet on real
 * screens ("başlık fontları biraz daha büyük olsun"). Every step below is
 * bumped 2px from its original mockup-sourced value, keeping each token's
 * original line-height RATIO (not just adding a flat px) so leading stays
 * proportionate at the new size. This is a deliberate, permanent scale
 * change — if a future mockup revision re-specifies these sizes, reconcile
 * against product-owner intent, not just the mockup file.
 */
export const type = {
  /** TOKEN ADDITION (post-launch, no mockup reference): the app's
   * one-word wordmark shown centered in the home screen's top bar (see
   * app/(tabs)/index.tsx) — matching a reference app's centered app-name
   * navbar. Fraunces semibold, sized between `screenTitle` and `display`
   * so it reads as a logotype rather than a page heading. */
  wordmark: {
    fontFamily: fontFamily.frauncesSemiBold,
    fontSize: 24,
    lineHeight: 28,
    fontWeight: "600",
    letterSpacing: 0,
  },
  /** home.html `h1.display` — mockup-sourced 32px, bumped to 34px/600,
   * ls -.01em scaled to size. */
  display: {
    fontFamily: fontFamily.frauncesSemiBold,
    fontSize: 34,
    lineHeight: 39,
    fontWeight: "600",
    letterSpacing: -0.34,
  },
  /** library.html / vocabulary.html / profile.html `h1.display` —
   * mockup-sourced 28px, bumped to 30px/600. */
  screenTitle: {
    fontFamily: fontFamily.frauncesSemiBold,
    // 2026-09-07 tasarım revizyonu: 30 -> 40. Eski ölçekte ekran başlığı,
    // bölüm başlığı ve kitap adı birbirine çok yakındı (30/20/21) ve
    // hiyerarşi düz kalıyordu. Fraunces büyük puntoda karakterini
    // gösteriyor. Bkz. docs/plans/2026-09-07-tasarim-yonu.md.
    fontSize: 40,
    lineHeight: 44,
    fontWeight: "600",
    letterSpacing: -0.8,
  },
  /** book-detail.html `.hero .title.display` — mockup-sourced 26px,
   * bumped to 28px/600, lh 1.08, ls -.01em scaled to size. */
  heroTitle: {
    fontFamily: fontFamily.frauncesSemiBold,
    fontSize: 34,
    lineHeight: 37,
    fontWeight: "600",
    letterSpacing: -0.6,
  },
  /** home.html `.continue .title.display` — mockup-sourced 20px, bumped
   * to 22px/600, lh 1.15. */
  continueTitle: {
    fontFamily: fontFamily.frauncesSemiBold,
    fontSize: 22,
    lineHeight: 25,
    fontWeight: "600",
    letterSpacing: 0,
  },
  /** vocabulary.html `.word .lemma.display` — mockup-sourced 20px, bumped
   * to 22px/600, same 1.15 ratio family. */
  wordLemma: {
    fontFamily: fontFamily.frauncesSemiBold,
    fontSize: 22,
    lineHeight: 25,
    fontWeight: "600",
    letterSpacing: 0,
  },
  /** home.html `.section-head .t.display` / book-detail.html
   * `.section-head .t.display` — mockup-sourced 18px, bumped to 20px/600. */
  sectionHeading: {
    fontFamily: fontFamily.frauncesSemiBold,
    fontSize: 24,
    lineHeight: 28,
    fontWeight: "600",
    letterSpacing: -0.3,
  },
  /** library.html `.book .title.display` — mockup-sourced 19px, bumped
   * to 21px/600, lh 1.2. */
  bookTitleLg: {
    fontFamily: fontFamily.frauncesSemiBold,
    fontSize: 21,
    lineHeight: 25,
    fontWeight: "600",
    letterSpacing: 0,
  },
  /** home.html `.row .title.display` — mockup-sourced 16px, bumped to
   * 17px/600, lh 1.25 — used by BookShelf cards and CategoryShelf, and by
   * BookCover's fallback title (the redesigned flat-color cover). */
  bookTitleMd: {
    fontFamily: fontFamily.frauncesSemiBold,
    fontSize: 17,
    lineHeight: 21,
    fontWeight: "600",
    letterSpacing: 0,
  },
  /** book-detail.html `.ch .title.display` — mockup-sourced 15px, bumped
   * to 16px/500 (Fraunces medium, not semibold — this is the one display
   * token that uses weight 500). */
  chapterRowTitle: {
    fontFamily: fontFamily.frauncesMedium,
    fontSize: 16,
    lineHeight: 20,
    fontWeight: "500",
    letterSpacing: 0,
  },
} as const;

/**
 * Literata ("reading") scale — story body text and the reading surface's
 * own chrome. `readingBody` is user-adjustable (font size / line height
 * sliders per profile.html "Okuma Fontu Boyutu"), so it's exposed as a
 * function, not a static token — see `getReadingTypeScale` below.
 */
export const readingType = {
  /** reader.html `.reading h2` — Literata italic, 13px/400, no explicit
   * line-height. */
  chapterSubtitle: {
    fontFamily: fontFamily.literataRegularItalic,
    fontSize: 13,
    lineHeight: 17,
    fontWeight: "400",
    letterSpacing: 0,
    fontStyle: "italic",
  },
  /** reader.html `.sheet-hint .word` — Literata italic, 15px, no explicit
   * line-height (uses bare font-family, not the .reading class). */
  wordPreview: {
    fontFamily: fontFamily.literataRegularItalic,
    fontSize: 15,
    lineHeight: 20,
    fontWeight: "400",
    letterSpacing: 0,
    fontStyle: "italic",
  },
  /** vocabulary.html `.word .gloss.reading` — Literata italic, 14px, no
   * explicit line-height. */
  gloss: {
    fontFamily: fontFamily.literataRegularItalic,
    fontSize: 14,
    lineHeight: 19,
    fontWeight: "400",
    letterSpacing: 0,
    fontStyle: "italic",
  },
} as const satisfies Record<string, TypeStyle>;

/**
 * IBM Plex Mono ("mono") scale — every label, meta string, stat number,
 * nav item and badge in the product. Named per the smallest common set of
 * distinct {size, weight, letter-spacing, transform} combos found; several
 * mockups reuse the exact same combo under different class names (e.g.
 * "caption" below covers home `.eyebrow`, library `.filters .f`,
 * vocabulary `.filters .f` — all 11px/400/ls .05-.06em/uppercase; kept as
 * one token since the mockups themselves treat them identically).
 */
export const monoType = {
  /** home.html `.eyebrow.mono` (11px, ls .06em, uppercase) and
   * library.html/vocabulary.html `.filters .f.mono` (11px, ls .05em,
   * uppercase) — same visual role (an eyebrow/filter label), letter
   * spacing rounded to the shared .06em since both round to the same
   * on-screen value at this size. */
  eyebrow: {
    fontFamily: fontFamily.plexMonoMedium,
    fontSize: 11,
    lineHeight: 14,
    fontWeight: "500",
    // 2026-09-07: .06em -> .14em. Eyebrow'lar mono ile yazılıyor ama dar
    // aralıkta sıradan küçük metin gibi görünüyorlardı; geniş aralık onları
    // gerçek bir tipografik işaret hâline getiriyor.
    letterSpacing: 1.54, // .14em @ 11px
    textTransform: "uppercase",
  },
  /** home.html `.continue .label.mono` — 10px, ls .06em, uppercase. Also
   * matches nav item styles (home/library/vocabulary/profile `nav .item.mono`,
   * 10px ls .06em) and tab-bar.html's identical nav rule. */
  label: {
    fontFamily: fontFamily.plexMonoMedium,
    fontSize: 10,
    lineHeight: 13,
    fontWeight: "500",
    letterSpacing: 1.2, // .12em @ 10px — bkz. eyebrow notu
    textTransform: "uppercase",
  },
  /** home.html `.row .meta.mono` — 10px, ls .03em, NOT uppercase (this is
   * running metadata like "104.335 kelime", not a label). */
  meta: {
    fontFamily: fontFamily.plexMonoRegular,
    fontSize: 10,
    lineHeight: 13,
    fontWeight: "400",
    letterSpacing: 0.3, // .03em @ 10px
  },
  /** book-detail.html `.ch .dur.mono` / reader.html `.chrome .pct.mono` —
   * 10px, no letter-spacing, not uppercase. Distinct from `meta` (which has
   * ls .03em) — kept separate to match mockups exactly rather than merge. */
  metaTight: {
    fontFamily: fontFamily.plexMonoRegular,
    fontSize: 10,
    lineHeight: 13,
    fontWeight: "400",
    letterSpacing: 0,
  },
  /** reader.html `.chrome .loc.mono` — 10px, ls .05em, uppercase. */
  locationLabel: {
    fontFamily: fontFamily.plexMonoRegular,
    fontSize: 10,
    lineHeight: 13,
    fontWeight: "400",
    letterSpacing: 0.5, // .05em @ 10px
    textTransform: "uppercase",
  },
  /** library.html `.book .lvl.mono` / book-detail.html `.hero .lvl.mono` —
   * 10px, ls .05em, uppercase (rendered inside a 1px `border.strong` box —
   * that's a layout/component concern, not part of the type token). */
  badge: {
    fontFamily: fontFamily.plexMonoRegular,
    fontSize: 10,
    lineHeight: 13,
    fontWeight: "400",
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  /** home.html `.continue .pct.mono` — 11px, no letter-spacing, colored
   * with `accent` (color, not part of this token). */
  percent: {
    fontFamily: fontFamily.plexMonoRegular,
    fontSize: 11,
    lineHeight: 14,
    fontWeight: "400",
    letterSpacing: 0,
  },
  /** home.html `.section-head .more.mono` — 10px, ls .05em, not uppercase
   * in CSS but the mockup content itself is authored pre-uppercased
   * ("TÜMÜ →") — token does not force textTransform so translated i18n
   * strings aren't silently uppercased by the token; apply uppercase at
   * the content/i18n level to match the mockup's visual intent. */
  moreLink: {
    fontFamily: fontFamily.plexMonoRegular,
    fontSize: 10,
    lineHeight: 13,
    fontWeight: "400",
    letterSpacing: 0.5,
  },
  /** library.html `.book .author.mono` — 11px, ls .02em. */
  author: {
    fontFamily: fontFamily.plexMonoRegular,
    fontSize: 11,
    lineHeight: 15,
    fontWeight: "400",
    letterSpacing: 0.22,
  },
  /** book-detail.html `.hero .author.mono` — 12px, no letter-spacing. */
  authorLg: {
    fontFamily: fontFamily.plexMonoRegular,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "400",
    letterSpacing: 0,
  },
  /** library.html `.book .stat .n.mono` — 13px/500 (medium weight). */
  statValue: {
    fontFamily: fontFamily.plexMonoMedium,
    fontSize: 13,
    lineHeight: 17,
    fontWeight: "500",
    letterSpacing: 0,
  },
  /** book-detail.html `.statline .n.mono` — 17px/500. */
  statValueLg: {
    fontFamily: fontFamily.plexMonoMedium,
    fontSize: 17,
    lineHeight: 21,
    fontWeight: "500",
    letterSpacing: 0,
  },
  /** profile.html `.stat-cell .n.mono` — 26px/500. */
  statValueXl: {
    fontFamily: fontFamily.plexMonoMedium,
    fontSize: 26,
    lineHeight: 31,
    fontWeight: "500",
    letterSpacing: 0,
  },
  /** library.html `.book .stat .l.mono` / book-detail.html
   * `.statline .l.mono` / profile.html `.stat-cell .l.mono` — 9px/400,
   * ls .06em, uppercase. The single smallest text in the system. */
  statLabel: {
    fontFamily: fontFamily.plexMonoRegular,
    fontSize: 9,
    lineHeight: 12,
    fontWeight: "400",
    letterSpacing: 0.54, // .06em @ 9px
    textTransform: "uppercase",
  },
  /** vocabulary.html `.word .due.mono` — 9px/400, ls .05em, uppercase,
   * colored with `accent` (the only accent-colored text in the system —
   * color applied by the component, not this token). */
  dueLabel: {
    fontFamily: fontFamily.plexMonoRegular,
    fontSize: 9,
    lineHeight: 12,
    fontWeight: "400",
    letterSpacing: 0.45, // .05em @ 9px
    textTransform: "uppercase",
  },
  /** vocabulary.html `.word .src.mono` — 9px/400, no letter-spacing, not
   * uppercase. */
  sourceLabel: {
    fontFamily: fontFamily.plexMonoRegular,
    fontSize: 9,
    lineHeight: 12,
    fontWeight: "400",
    letterSpacing: 0,
  },
  /** vocabulary.html `.word .tag.mono` — 9px/400, ls .04em, uppercase
   * (rendered inside a 1px `border.hairline` pill — border is a component
   * concern). */
  tag: {
    fontFamily: fontFamily.plexMonoRegular,
    fontSize: 9,
    lineHeight: 12,
    fontWeight: "400",
    letterSpacing: 0.36, // .04em @ 9px
    textTransform: "uppercase",
  },
  /** reader.html `.sheet-hint .pos.mono` — 9px/400, ls .06em, uppercase.
   * Same metrics as `statLabel`; kept as its own named token since it
   * labels a grammatical part-of-speech, a different semantic role, even
   * though the numbers are identical. */
  posLabel: {
    fontFamily: fontFamily.plexMonoRegular,
    fontSize: 9,
    lineHeight: 12,
    fontWeight: "400",
    letterSpacing: 0.54,
    textTransform: "uppercase",
  },
  /** reader.html `.sheet-hint .gloss.mono` — 12px/400, no letter-spacing. */
  wordGlossMono: {
    fontFamily: fontFamily.plexMonoRegular,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "400",
    letterSpacing: 0,
  },
  /** book-detail.html `.cta button` — 12px, ls .08em, uppercase. No
   * explicit font-weight in mockup CSS (unset -> browser default normal
   * for a <button>), so weight 400. */
  buttonLabel: {
    fontFamily: fontFamily.plexMonoRegular,
    fontSize: 12,
    lineHeight: 15,
    fontWeight: "400",
    letterSpacing: 0.96, // .08em @ 12px
    textTransform: "uppercase",
  },
  /** book-detail.html `.ch .idx.mono` — 11px/400, no letter-spacing. */
  chapterIndex: {
    fontFamily: fontFamily.plexMonoRegular,
    fontSize: 11,
    lineHeight: 14,
    fontWeight: "400",
    letterSpacing: 0,
  },
  /** profile.html `.row .k.mono` / `.row .v.mono` — 13px/400, no
   * letter-spacing. */
  rowText: {
    fontFamily: fontFamily.plexMonoRegular,
    fontSize: 13,
    lineHeight: 17,
    fontWeight: "400",
    letterSpacing: 0,
  },
  /** profile.html `.footer-note.mono` — 10px/400, lh 1.6 (=16px), no
   * letter-spacing. */
  footerNote: {
    fontFamily: fontFamily.plexMonoRegular,
    fontSize: 10,
    lineHeight: 16,
    fontWeight: "400",
    letterSpacing: 0,
  },
  /** vocabulary.html `.summary.mono` — 11px/400, ls .02em. */
  summary: {
    fontFamily: fontFamily.plexMonoRegular,
    fontSize: 11,
    lineHeight: 15,
    fontWeight: "400",
    letterSpacing: 0.22,
  },
} as const satisfies Record<string, TypeStyle>;

/** User-adjustable reader preferences (profile.html "Okuma Fontu Boyutu"
 * row, shown as a percentage). Range is not specified by any mockup —
 * kept from the previous token attempt's values since it's a behavioral
 * range, not a visual constant, and the mockups only show the 100%
 * default state. Flag for product to confirm min/max/step. */
export const readerFontScale = {
  min: 0.85,
  max: 1.6,
  step: 0.1,
  default: 1,
} as const;

export const readerLineHeightScale = {
  min: 1.2,
  max: 2,
  step: 0.1,
  default: 1.7, // reader.html `.reading` — line-height:1.7 is the mockup default, not 1.5
} as const;

/** reader.html `.reading` — font-size:18px, line-height:1.7 (=30.6px),
 * color var(--ink) [reader's own #241F19 -> `theme.text.reading`],
 * font-family Literata. This is the base the font-size slider scales. */
const READING_BASE_FONT_SIZE = 18;

/**
 * Reading-surface type scale, driven by the user's font-size/line-height
 * preferences (settings sliders use readerFontScale/readerLineHeightScale
 * as their min/max/step). `scale` is a multiplier on the base reading font
 * size (18px, from reader.html `.reading`); `lineHeightScale` is a direct
 * line-height-to-font-size ratio (mockup default 1.7). This function is the
 * single place that turns those two stored multipliers into concrete pixel
 * values.
 */
export function getReadingTypeScale(
  scale: number = readerFontScale.default,
  lineHeightScale: number = readerLineHeightScale.default,
  fontFamilyChoice: "serif" | "sans" = "serif",
): { paragraph: TypeStyle } {
  const fontSize = Math.round(READING_BASE_FONT_SIZE * scale);
  const lineHeight = Math.round(fontSize * lineHeightScale);

  // "serif" keeps the mockup-sourced Literata reading font. "sans" falls
  // back to RN's platform system font (fontFamily: undefined) rather than
  // bundling a new font family -- "basitlik önce gelir" (CLAUDE.md): no new
  // dependency until the current one is proven insufficient.
  const resolvedFontFamily =
    fontFamilyChoice === "serif" ? fontFamily.literataRegular : undefined;

  return {
    paragraph: {
      fontFamily: resolvedFontFamily,
      fontSize,
      lineHeight,
      fontWeight: "400",
      letterSpacing: 0,
    },
  };
}
