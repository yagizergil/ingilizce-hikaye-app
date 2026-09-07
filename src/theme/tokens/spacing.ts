/**
 * Design token: spacing.
 *
 * SOURCE OF TRUTH: every padding/margin/gap value found across
 * `mockups/*.html`. Each raw value is rounded to the nearest 4pt step
 * (RN best practice for pixel-perfect layout on varying device densities);
 * the comment on each token lists the exact raw mockup values it was
 * rounded from, and which mockup/selector they came from, so a screen
 * implementer can tell if a given usage drifted from spec.
 *
 * Rounding rule: Math.round(raw / 4) * 4.
 */

export const spacing = {
  /** Raw sources: 4 (vocabulary.html `.word` grid gap first value,
   * book-detail.html `.chapters .ch` gap partial). Exact, no rounding. */
  xxs: 4,

  /** Raw sources: 6 (home.html `header` bottom padding, library.html
   * `.title` inline margin-top), 8 (vocabulary.html `.summary` margin-top,
   * home.html `.continue .prog` gap), 9 (book-detail.html `.filters .f`
   * padding-bottom before active-state overlap), 10 (home.html
   * `.row` padding-bottom via `.continue` grid gap counterpart,
   * vocabulary.html `.filters` active padding-bottom -1). Rounds to 8. */
  xs: 8,

  /** Raw sources: 12 (book-detail.html `.section-head` bottom padding,
   * vocabulary/library `.section-head`/`.filters` bottom padding), 13
   * (book-detail.html `.ch` vertical padding), 14 (home.html `.row` grid
   * gap, profile.html `.row` vertical padding, book-detail.html `.hero`
   * gap partial, reader.html `.chrome` top padding). Rounds to 12–16;
   * split at the midpoint: 12–13 round down to `sm`. */
  sm: 12,

  /** Raw sources: 14 (rounds up here per Math.round(14/4)*4=16), 15
   * (book-detail.html `.cta button` padding), 16 (home.html `.continue`
   * gap, library.html `.book` gap, reader.html `.sheet-hint` horizontal
   * padding). Exact match at 16. */
  md: 16,

  /** Raw sources: 17–19 (none exact in mockups, included for scale
   * completeness), 18 (book-detail.html `.hero` gap, vocabulary.html
   * `.filters` padding, home.html `.section-head` top-padding partial,
   * reader.html `.chrome` bottom padding, tab-bar.html `.case-label`
   * bottom padding). Rounds to 20 (18/4=4.5 -> 5*4=20) — see also `lg`. */
  ml: 20,

  /** Raw sources: 20 (screen horizontal margin — every mockup's `header`,
   * `.list`, `.row`, `.rows`, `nav`, `.filters` left/right padding is
   * exactly 20; also `library.html .filters` gap). This is THE screen
   * margin — see layout.ts `screenHorizontalMargin`, kept equal to this
   * token intentionally. */
  lg: 20,

  /** Raw sources: 22 (home.html `.continue` bottom padding, book-detail
   * `.cta` margin, tab-bar.html `.hidden-note` padding), 24 (home.html
   * `.row` grid gap partial, book-detail `.statline` bottom padding,
   * reader.html `.reading` horizontal padding, book-detail `.cta`
   * horizontal margin, vocabulary `.list`/library `.list` horizontal
   * padding is 20 not 24 — kept separate, see `lg`). Rounds to 24. */
  xl: 24,

  /** Raw sources: 26 (home.html `.section-head` top padding, library.html
   * `header`/nav bottom padding, book-detail `.hero` bottom padding
   * partial, vocabulary/profile `header` top padding, nav bottom
   * padding). Rounds to 28 (26/4=6.5 -> 7*4=28). */
  xxl: 28,

  /** Raw sources: 28 (home.html `header` top padding). Exact. */
  xxxl: 28,

  /** Raw sources: 32 (no exact mockup value; kept for scale continuity
   * between 28 and the 34-40 "screen bottom" range below). */
  xxxxl: 32,

  /**
   * Bölümler arası ritim. 2026-09-07 tasarım revizyonu ile eklendi:
   * bölümler 28px ile birbirine yapışıyordu ve ekran tek bir yığın gibi
   * okunuyordu. Bkz. docs/plans/2026-09-07-tasarim-yonu.md.
   */
  sectionGap: 40,
  /** Raw sources: 34 (library.html `.list` bottom padding). Rounds to 36
   * (34/4=8.5 -> 9*4=36). */
  section: 36,

  /** Raw sources: 40 (book-detail.html `.chapters` bottom padding,
   * vocabulary.html `.list` bottom padding, profile.html `.footer-note`
   * bottom padding). Exact — the standard screen-bottom safe padding. */
  screenBottom: 40,

  /** Raw sources: 60 (reader.html `.reading` bottom padding — the reading
   * surface gets extra bottom breathing room since it has no tab bar).
   * Exact. */
  readingBottom: 60,
} as const;

export const radius = {
  sm: 6,
  md: 12,
  lg: 20,
  full: 999,
} as const;

/** Motion tokens for Reanimated-driven transitions. Not sourced from the
 * static mockups (they show no motion); kept from the prior token
 * attempt since the product should still feel calm/subtle, not
 * springy/gamified, and no mockup contradicts these values. */
export const motion = {
  duration: {
    fast: 120,
    base: 220,
    slow: 360,
  },
  easing: {
    standard: [0.4, 0.0, 0.2, 1] as const,
    decelerate: [0.0, 0.0, 0.2, 1] as const,
    accelerate: [0.4, 0.0, 1, 1] as const,
  },
  /**
   * Dokunulabilir yüzeylerin basılı hâli.
   *
   * 2026-09-07 tasarım revizyonu: uygulamada hiçbir basma geri bildirimi
   * yoktu — dokunmanın işe yarayıp yaramadığı belli olmuyordu. Tek yerde
   * tanımlı ki her kart, satır ve düğme aynı hissi versin.
   */
  pressed: {
    opacity: 0.72,
    scale: 0.985,
  },
} as const;
