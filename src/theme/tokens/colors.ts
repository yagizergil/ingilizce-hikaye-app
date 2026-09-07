/**
 * Design token: color.
 *
 * SOURCE OF TRUTH: the approved mockups in `mockups/*.html`
 * (home.html, library.html, book-detail.html, reader.html, vocabulary.html,
 * profile.html, tab-bar.html). These are a specification, not inspiration —
 * every hex below is copied verbatim from a mockup's `:root{ --var: ... }`
 * block, not "improved" or re-derived.
 *
 * Palette shared by every mockup except reader.html:
 *   --bg:       #FAF8F4
 *   --ink:      #1E1C19
 *   --ink-soft: #8A8378
 *   --hairline: #E7E2D8
 *   --accent:   #A6572E
 *
 * DISCREPANCY FOUND: reader.html defines `--ink:#241F19` (all six other
 * mockups use #1E1C19). Resolution: treated as intentional, not a typo —
 * the reading surface is the one place in the product where ink needs to
 * feel slightly warmer/heavier for long-form legibility (the reader also
 * drops the `--accent` fill everywhere except the 2px progress line, and
 * drops the neutral-gray direction entirely in favor of Literata + a
 * softer ink). We keep #1E1C19 as `text.primary` (used by every chrome/UI
 * surface) and expose the reader's #241F19 as the dedicated
 * `text.reading` role, used only by the reading-surface body/heading
 * styles in typography.ts. This is the ONLY place the two inks diverge —
 * if a future mockup revision unifies them, delete `text.reading` and
 * alias it to `text.primary`.
 *
 * Components must only ever read semantic roles (e.g. `theme.text.primary`)
 * — never a raw hex — directly.
 */

/**
 * Raw values as they appear in the mockups' :root blocks. Exists only so
 * the three themes below can be built from named constants instead of
 * inline hex literals repeated three times.
 */
const mockupLight = {
  bg: "#FAF8F4",
  ink: "#1E1C19",
  inkReading: "#241F19", // reader.html only — see discrepancy note above
  inkSoft: "#8A8378",
  hairline: "#E7E2D8",
  accent: "#A6572E",
  surfaceRaised: "#FFFFFF", // reader.html .sheet-hint background
} as const;

const semantic = {
  danger: "#B3453A",
} as const;

export interface ThemeColors {
  bg: {
    /** --bg. Screen background in every mockup. */
    primary: string;
    /** Raised surface above --bg, e.g. reader.html .sheet-hint (#fff). */
    surface: string;
  };
  text: {
    /** --ink. Headings, titles, body chrome text, active nav item. */
    primary: string;
    /** --ink-soft. Meta text, inactive nav, secondary labels. */
    secondary: string;
    /** Same role as secondary, kept distinct for components that need a
     * third, even-quieter step (e.g. disabled/placeholder). Mockups never
     * needed a third ink step, so this mirrors secondary — do not invent a
     * new hex for it. */
    tertiary: string;
    /** Reader-surface ink — see discrepancy note above (#241F19 in light). */
    reading: string;
    /** Text drawn on top of `text.primary`-colored fills (book-detail.html
     * .cta button: bg var(--ink), color var(--bg)). */
    inverse: string;
    /** Text drawn on top of `accent`-colored fills. No mockup currently
     * fills a surface with pure accent, but every accent usage (progress
     * bar fill, active filter underline) sits on --bg, never needs an
     * "on accent" text color — kept for future CTA use, set to white. */
    onAccent: string;
  };
  border: {
    /** --hairline. The ONLY border/divider color used anywhere in the
     * mockups — no cards, no boxes, hairlines only (see book-detail.html
     * .chapters .ch, profile.html .stats-grid, etc). */
    hairline: string;
    /** --ink used as a 1px border for badges (library.html .lvl,
     * book-detail.html .hero .lvl) — this is `text.primary` reused as a
     * border color, not a new hex. */
    strong: string;
  };
  /**
   * --accent. Birincil eylem ve ilerleme rengi.
   *
   * REVIZE (2026-09-07): eskiden "yalnızca durum/ilerleme, ASLA dekoratif
   * değil" kuralı vardı. O kısıt tasarımın enerjisini alıyordu (bkz.
   * docs/plans/2026-09-07-tasarim-yonu.md). Kural kalkmadı, doğru yere
   * taşındı: **okuma yüzeyinde (reader) accent kullanılmaz.** Kütüphane,
   * ana sayfa, kelime defteri ve profilde serbesttir.
   */
  accent: string;
  /**
   * Yapısal ikinci renk — derin mürekkep-lacivert.
   *
   * Tek accent (terracotta) hem eylem hem yapı hem vurgu taşımaya
   * çalışıyordu ve tasarım tek renge sıkışıyordu. `deep` bloklar,
   * öne çıkan yüzeyler ve "ciddi" bilgi alanları için ikinci bir
   * yapısal ton veriyor. Bkz. docs/plans/2026-09-07-tasarim-yonu.md.
   */
  deep: string;
  /** `deep` üstündeki metin/ikon rengi. */
  onDeep: string;
  /** Yumuşak vurgu dolgusu — kart ve blok zeminleri için. */
  highlight: string;
  /** No mockup defines a muted/tinted accent surface — this is a
   * derived-not-specified value for future use (e.g. pressed states).
   * Derived as accent at low opacity so it never introduces a hue the
   * mockups didn't already commit to. */
  accentMuted: string;
  /** No mockup defines a second muted/tinted surface distinct from
   * `accentMuted`. Derived the same way (existing role color at low
   * opacity, here `text.secondary` instead of `accent`) for callers that
   * need two visually distinct-but-consistent muted fills — e.g. the
   * reader's word-highlight states, which have no mockup spec yet (see
   * `useReaderThemeColors`). Not a new hue: just `text.secondary` at the
   * same opacity step `accentMuted` uses on `accent`. */
  secondaryMuted: string;
  danger: string;
  dangerMuted: string;
  /** No mockup defines a modal/sheet backdrop scrim (Modal usage — e.g.
   * SourceLicenseSheet — predates the mockup set entirely). Derived as a
   * neutral black at 50% (55% in dark, for adequate contrast against an
   * already-dark bg) rather than tinting with `text.primary`, since a
   * scrim's job is to recede everything behind it regardless of theme hue
   * — using the theme's own ink would tint the dimmed content instead of
   * neutrally darkening it. */
  overlay: string;
}

const light: ThemeColors = {
  bg: {
    primary: mockupLight.bg,
    surface: mockupLight.surfaceRaised,
  },
  text: {
    primary: mockupLight.ink,
    secondary: mockupLight.inkSoft,
    tertiary: mockupLight.inkSoft,
    reading: mockupLight.inkReading,
    inverse: mockupLight.bg,
    onAccent: "#FFFFFF",
  },
  border: {
    hairline: mockupLight.hairline,
    strong: mockupLight.ink,
  },
  accent: mockupLight.accent,
  deep: "#1F3A5F",
  onDeep: "#FAF8F4",
  highlight: "#F1E4C9",
  accentMuted: "rgba(166, 87, 46, 0.16)",
  secondaryMuted: "rgba(138, 131, 120, 0.16)", // inkSoft (#8A8378) @ 16%
  danger: semantic.danger,
  dangerMuted: "rgba(179, 69, 58, 0.16)",
  overlay: "rgba(0, 0, 0, 0.5)",
};

/**
 * Sepia — not shown in any mockup. Derived by applying the exact same
 * logic the light theme already encodes (warm paper bg, near-black-but-warm
 * ink, one muted accent) shifted toward a warmer/darker paper as instructed.
 * Reasoning for each value:
 *  - bg.primary: light's #FAF8F4 pushed warmer/darker toward a classic
 *    e-reader "sepia" paper tone, keeping the same warm-neutral hue family
 *    (increase R/G saturation toward amber, no blue/gray drift).
 *  - bg.surface: a lighter tint of the same paper, mirroring how light
 *    theme's surface (#FFFFFF) sits lighter than its bg — here surface is
 *    a lightened step of the sepia paper rather than pure white, since
 *    pure white would break the "warm neutral" rule sepia exists to serve.
 *  - text.primary/reading: light's ink (#1E1C19 / #241F19) warmed a couple
 *    steps toward brown, same lightness relationship to its own bg.
 *  - text.secondary: same lightness offset from text.primary that
 *    inkSoft (#8A8378) has from ink (#1E1C19) in light, reapplied on the
 *    sepia ink.
 *  - accent: identical hue/hue-family as light's accent, unchanged — the
 *    product principle is ONE accent color across all three themes.
 *  - hairline: same warm-neutral offset from bg as light's hairline
 *    (#E7E2D8 is ~2 steps darker than #FAF8F4); reapplied on sepia's paper.
 */
const sepia: ThemeColors = {
  bg: {
    primary: "#F1E4C9",
    surface: "#F8EFDB",
  },
  text: {
    primary: "#2B2116",
    secondary: "#8A7355",
    tertiary: "#8A7355",
    reading: "#302517",
    inverse: "#F1E4C9",
    onAccent: "#FFFFFF",
  },
  border: {
    hairline: "#E0CFA5",
    strong: "#2B2116",
  },
  accent: mockupLight.accent,
  deep: "#1F3A5F",
  onDeep: "#FAF8F4",
  highlight: "#F1E4C9",
  accentMuted: "rgba(166, 87, 46, 0.18)",
  secondaryMuted: "rgba(138, 115, 85, 0.18)", // sepia text.secondary (#8A7355) @ 18%
  danger: semantic.danger,
  dangerMuted: "rgba(179, 69, 58, 0.18)",
  overlay: "rgba(0, 0, 0, 0.5)",
};

/**
 * Dark — not shown in any mockup. REVISED per explicit product-owner
 * feedback on the first pass ("#1C1712" read as "boğucu koyu", too close
 * to pure black): shifted the whole ramp toward a genuinely GRAY warm-dark
 * (desaturated, higher lightness floor) rather than a near-black ink. This
 * is a deliberate, larger step than a simple hex swap — bg.primary moved
 * up ~2 lightness stops and had most of its warm saturation removed, so
 * the base surface reads as "dark gray paper" rather than "black with a
 * brown tint". bg.surface/border.hairline were re-derived from that new
 * floor (not just nudged) so raised surfaces and dividers stay visible and
 * proportionate instead of collapsing into bg.primary.
 *  - bg.primary: #211F1C — desaturated warm charcoal, several steps
 *    lighter than the previous #1C1712.
 *  - bg.surface: #2B2925 — the raised-surface step above bg.primary,
 *    proportionally the same distance as light's surface (#FFFFFF) is
 *    above light's bg (#FAF8F4), just compressed since dark surfaces need
 *    a smaller absolute jump to read as "raised" without blowing out.
 *  - text.primary/reading: kept warm off-white (unchanged) — the fix was
 *    to the background's saturation/lightness, not the ink.
 *  - accent: unchanged hue family, same reasoning as before (light's
 *    accent is too dark to read on a dark bg, lightened not rehued).
 *  - hairline: #3A3733 — recomputed from the new bg.primary at the same
 *    relative lightness step the old hairline had from the old bg.
 */
const dark: ThemeColors = {
  bg: {
    primary: "#211F1C",
    surface: "#2B2925",
  },
  text: {
    primary: "#F3F1EA",
    secondary: "#9B968C",
    tertiary: "#9B968C",
    reading: "#F3F1EA",
    inverse: "#211F1C",
    onAccent: "#211F1C",
  },
  border: {
    hairline: "#3A3733",
    strong: "#F3F1EA",
  },
  accent: "#C77B4A",
  deep: "#8FB4DE",
  onDeep: "#141C26",
  highlight: "#3A3020",
  accentMuted: "rgba(199, 123, 74, 0.2)",
  secondaryMuted: "rgba(155, 150, 140, 0.2)", // dark text.secondary (#9B968C) @ 20%
  danger: "#D98A7E",
  dangerMuted: "rgba(217, 138, 126, 0.2)",
  overlay: "rgba(0, 0, 0, 0.6)",
};

export const colors = { light, sepia, dark } as const;

export type ThemeName = keyof typeof colors;

/**
 * DELIBERATE DEPARTURE from the "single accent, status/progress only"
 * product principle documented at the top of this file and in CLAUDE.md.
 * Product owner explicitly requested a full identity change to match a
 * reference app ("dicto") whose CEFR level badges and tab bar use a
 * multi-hue palette, confirmed via an explicit choice between "keep the
 * single-accent rule" and "match the reference colors exactly" — the
 * latter was chosen. `CLAUDE.md`'s art-direction section should be updated
 * to reflect this the next time it's touched; until then, treat this file
 * (not the original product principle) as the current source of truth for
 * color usage on level badges and the tab bar specifically. Every OTHER
 * use of `accent` (progress bars, saved-word underline, etc.) is
 * unaffected — this is scoped to level identity + navigation chrome only.
 *
 * One fixed hue per CEFR level, identical across all three themes (these
 * are semantic level badges, not theme-adaptive surface colors — same
 * reasoning `danger` uses for staying legible regardless of theme).
 */
export const levelAccent: Record<"A1" | "A2" | "B1" | "B2" | "C1" | "C2", string> = {
  A1: "#4EA9E0",
  A2: "#4CB782",
  B1: "#E0C23D",
  B2: "#E08A3D",
  C1: "#DB5A4E",
  C2: "#8B5FBF",
};

/** Text color drawn on top of any `levelAccent` fill (the badge squares).
 * Fixed white across every level hue, same "on colored fill" role
 * `text.onAccent` plays for `accent` — kept separate since `levelAccent`
 * is itself a departure from the single-accent system (see above). */
export const onLevelAccent = "#FFFFFF";

/** Small, fixed set of flat colors for `CategoryTagCard`'s fallback
 * "cover" (used only when the tag has no real book cover to show, e.g. a
 * genre/theme tag) -- deterministically assigned per tag (by key, not
 * random, see that component's `colorForKey`) so the same tag always gets
 * the same color across renders/sessions. Fixed across themes, same
 * reasoning as `levelAccent`.
 *
 * REVISED: this was a 2-stop gradient array; explicitly rejected on-device
 * ("yazarlar ve seriler kartlarının renkleri de gradient olmasın tek renk
 * olsun ya da o yazarın bir kitabının kitap kapağı kullanılsın") — author/
 * series tags now show a real book cover when one exists (see
 * useHomeExtrasQuery.ts's `coverUrl` on `CategoryTag`), and this flat
 * single-color set is the fallback for tags with no cover to show. */
export const categoryTagColors: readonly string[] = [
  "#4E7FD4",
  "#D46B4E",
  "#4EA98F",
  "#B3548C",
  "#5F8FD1",
  "#8B5FBF",
];
