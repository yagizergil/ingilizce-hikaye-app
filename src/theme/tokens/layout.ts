/**
 * Design token: layout.
 *
 * SOURCE OF TRUTH: `mockups/*.html`. Structural constants that aren't
 * color, type, or spacing scale steps — screen margins, the hairline
 * divider system (no cards/boxes anywhere in the mockups), cover
 * proportions, and the asymmetric cover-column/content-column grid seen in
 * home.html, library.html and book-detail.html.
 */

/**
 * Every mockup's screen-level horizontal padding (`header`, `.list`,
 * `.row`, `.rows`, `nav`, `.filters`, `.chapters`) is exactly 20px. Kept as
 * its own named export (not just `spacing.lg`) because it's referenced by
 * name in the product principle "asymmetric grid" section, not as a
 * generic spacing step.
 */
export const screenHorizontalMargin = 20;

/**
 * IMPORTANT FOR IMPLEMENTATION: do not use a numeric literal (e.g.
 * `borderBottomWidth: 1`) for any hairline divider. React Native's
 * `StyleSheet.hairlineWidth` renders the thinnest line the device's pixel
 * density can draw (often < 1 logical px on @3x screens), which is the
 * correct translation of the mockups' `border: 1px solid var(--hairline)`
 * CSS (a *hairline*, not a 1px-at-any-density rule). This constant exists
 * only to document that requirement — components should import
 * `StyleSheet.hairlineWidth` directly from `react-native`, not from here.
 */
export const hairlineWidthNote =
  "Use React Native's StyleSheet.hairlineWidth for all divider/border widths — do not hardcode a numeric px value." as const;

/**
 * Book cover aspect ratio (width / height). Every cover image across every
 * mockup is exactly 2:3 (width 52->height 78, 64->96, 104->156 — all
 * precisely *1.5). Never square, never cropped, per product principle.
 */
export const coverAspectRatio = 2 / 3;

/**
 * Fixed-width cover column used by the asymmetric grid
 * (`grid-template-columns: <cover> 1fr` in home.html, library.html,
 * book-detail.html). Content columns are always flexible (`1fr`) — no
 * fixed width token exists for them by design.
 */
export const coverColumnWidth = {
  /** home.html `.row img` (Kitaplar list rows) — 52px wide, 78px tall. */
  sm: 52,
  /** home.html `.continue img` / library.html `.book img` — 64px wide,
   * 96px tall. */
  md: 64,
  /** book-detail.html `.hero img` — 104px wide, 156px tall. */
  lg: 104,
  /** TOKEN ADDITION (post-launch, no mockup reference): the "Yeni
   * Kitaplar" home shelf's cards were using `md` (64px) inside a 132px
   * card, leaving ~68px of dead space beside every cover — the exact
   * cause of the "yeni kitaplar tasarımı çok küçük kalıyor" feedback.
   * `shelf` is sized to fill its card edge-to-edge instead (see
   * BookShelf.tsx's `CARD_WIDTH`, which now equals this value). */
  shelf: 112,
} as const;

/** Derived heights (coverColumnWidth * 1.5, i.e. / coverAspectRatio) —
 * listed explicitly so implementers don't need to compute them, and so a
 * future mockup change that breaks the 2:3 ratio would be caught by
 * comparing against these. */
export const coverColumnHeight = {
  sm: 78,
  md: 96,
  lg: 156,
  shelf: 168,
} as const;

/**
 * Badge/pill border — library.html `.book .lvl`, book-detail.html
 * `.hero .lvl` (`border: 1px solid var(--ink)`), vocabulary.html
 * `.word .tag` (`border: 1px solid var(--hairline)`). Also uses
 * StyleSheet.hairlineWidth, not a numeric literal — see
 * `hairlineWidthNote`. Padding values documented here since they're a
 * layout constant, not a spacing-scale step (2px/6px is finer than the
 * 4pt spacing scale allows and is specific to this one component shape).
 */
export const badgePadding = {
  vertical: 2,
  horizontal: 6,
} as const;

/**
 * TOKEN GAP — genuinely missing, added here (not invented arbitrarily; both
 * source values below are the exact same raw number in their mockups).
 * The thin 2px accent line used in two places: home.html `.continue .bar`
 * / `.bar i` (track + fill height:2px) and library.html/vocabulary.html
 * `.filters .f.active` (border-bottom:2px solid var(--accent)). Kept as one
 * named layout constant, not part of `spacing` (spacing's scale starts at
 * 4pt and this is a hairline-adjacent line-weight, not a spacing gap) and
 * not `StyleSheet.hairlineWidth` (the mockups specify an exact 2px, not a
 * "thinnest possible" hairline).
 */
export const accentLineThickness = 2;

/**
 * TOKEN ADDITION (post-launch, no mockup reference): the tab bar was
 * changed to show an icon above the mono label (product owner request —
 * "hem text hem icon olmasını istiyorum", text-only mockup wasn't final).
 * 20px keeps the icon visually subordinate to the mono label beneath it.
 *
 * Icons swap outline→filled (Ionicons `*-outline` vs. solid name) only on
 * the active tab, as a second "which tab am I on" signal alongside the
 * underline (the underline alone wasn't clear enough per product owner
 * feedback). This is a functional per-item state change on 4 icons, not
 * the "dolu ikon seti" the art-direction phase banned — that prohibition
 * was about using a filled/duotone icon set as blanket decoration
 * throughout the app, not about a single outline→filled toggle for the
 * one already-active nav item.
 */
export const tabBarIconSize = 20;

/**
 * TOKEN ADDITION: the tab bar's own content height, independent of the
 * bottom safe-area inset (added separately in `app/(tabs)/_layout.tsx`
 * via `useSafeAreaInsets()` — a custom `tabBarStyle` disables React
 * Navigation's automatic safe-area padding, which was the bug that made
 * the bar sit flush against the home-indicator edge). Sized for icon
 * (`tabBarIconSize`) + label + underline + top/bottom breathing room.
 */
export const tabBarContentHeight = 58;
