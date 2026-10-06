import { SPLASH_CLIP } from "@/features/splash/splashClips";
import {
  SPLASH_GREETINGS,
  SPLASH_TIMING,
  WORDMARK_LETTER_COLORS,
} from "@/features/splash/splashTimeline";
import { UI_LANGUAGE_CODES } from "@/lib/languages";

describe("splash timeline", () => {
  it("runs in the order the reference video shows", () => {
    expect(SPLASH_TIMING.wordmarkStart).toBeLessThan(SPLASH_TIMING.parrotStart);
    expect(SPLASH_TIMING.parrotStart).toBeLessThan(SPLASH_TIMING.bubblesStart);
  });

  it("has one wordmark color per letter of the app name", () => {
    expect(WORDMARK_LETTER_COLORS).toHaveLength("Lingo".length);
  });
});

describe("splash clip", () => {
  it("times the sparkles inside the clip, before it ends", () => {
    const { sparkle, durationMs } = SPLASH_CLIP;
    expect(sparkle).toBeDefined();
    if (!sparkle) return;
    expect(sparkle.at).toBeGreaterThan(0);
    expect(sparkle.at).toBeLessThan(durationMs);
    expect(sparkle.eye.x).toBeGreaterThan(0);
    expect(sparkle.eye.x).toBeLessThan(1);
    expect(sparkle.angles.length).toBeGreaterThan(0);
  });
});

describe("splash greetings", () => {
  it("greets in every UI language exactly once", () => {
    const langs = SPLASH_GREETINGS.map((greeting) => greeting.lang).sort();
    expect(langs).toEqual([...UI_LANGUAGE_CODES].sort());
  });

  it("scatters the six top bubbles: both sides, different insets, never a centered row", () => {
    const top = SPLASH_GREETINGS.filter((g) => g.row.startsWith("top"));
    expect(top).toHaveLength(6);
    expect(top.filter((g) => g.side === "left")).toHaveLength(3);
    expect(top.filter((g) => g.side === "right")).toHaveLength(3);
    // her satırda iki balonun iç boşluğu aynı olmamalı (satır satır dizilmiş görünmesin)
    for (const row of ["top1", "top2", "top3"]) {
      const insets = top.filter((g) => g.row === row).map((g) => g.inset);
      expect(new Set(insets).size).toBe(2);
    }
  });

  it("keeps two short bubbles on each side of the parrot", () => {
    const side = SPLASH_GREETINGS.filter((g) => g.row.startsWith("side"));
    expect(side.filter((g) => g.side === "left")).toHaveLength(2);
    expect(side.filter((g) => g.side === "right")).toHaveLength(2);
  });
});
