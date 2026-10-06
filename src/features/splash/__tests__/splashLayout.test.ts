import {
  CHIP_MARGIN,
  PARROT_FILL,
  WORDMARK_HEIGHT,
  estimateChipWidth,
  layoutChips,
  splashGeometry,
} from "@/features/splash/splashLayout";
import { SPLASH_CLIP } from "@/features/splash/splashClips";

interface Rect {
  left: number;
  top: number;
  width: number;
  height: number;
}

function overlaps(a: Rect, b: Rect, gap: number): boolean {
  return !(
    a.left + a.width + gap <= b.left ||
    b.left + b.width + gap <= a.left ||
    a.top + a.height + gap <= b.top ||
    b.top + b.height + gap <= a.top
  );
}

/** Gerçek telefonlar: [genişlik, yükseklik, üst güvenli alan]. */
const PHONES: readonly (readonly [number, number, number])[] = [
  [375, 667, 20], // iPhone SE
  [360, 740, 47],
  [375, 812, 47],
  [390, 844, 47],
  [393, 852, 59],
  [414, 896, 47],
  [430, 932, 59],
];

/** Üst köşelerdeki kapat/tekrar düğmelerinin altı: güvenli alan + 8 + 40. */
const controlsBottom = (inset: number) => inset + 8 + 40;

describe("splash layout", () => {
  it.each(PHONES)("%ix%i: no chip overlaps another, the parrot or the wordmark", (w, h, inset) => {
    {
      const g = splashGeometry(w, h, inset, SPLASH_CLIP.aspect);
      const parrot: Rect = {
        left: g.parrotLeft + (g.parrotWidth * (1 - PARROT_FILL)) / 2,
        top: g.parrotTop,
        width: g.parrotWidth * PARROT_FILL,
        height: g.parrotHeight,
      };
      const wordmark: Rect = {
        left: (w - g.wordmarkWidth) / 2,
        top: g.wordmarkTop,
        width: g.wordmarkWidth,
        height: WORDMARK_HEIGHT,
      };
      const chips = layoutChips(g);

      chips.forEach((chip, index) => {
        const name = chip.greeting.text;
        expect({ name, hitsParrot: overlaps(chip, parrot, 6) }).toEqual({
          name,
          hitsParrot: false,
        });
        expect({ name, hitsWordmark: overlaps(chip, wordmark, 6) }).toEqual({
          name,
          hitsWordmark: false,
        });
        chips.slice(0, index).forEach((other) => {
          const pair = `${name} / ${other.greeting.text}`;
          expect({ pair, hit: overlaps(chip, other, 8) }).toEqual({ pair, hit: false });
        });
      });
    }
  });

  it.each(PHONES)(
    "%ix%i: every chip stays on screen and clear of the top controls",
    (w, h, inset) => {
      const g = splashGeometry(w, h, inset);
      for (const chip of layoutChips(g)) {
        const name = chip.greeting.text;
        expect({ name, ok: chip.left >= CHIP_MARGIN - 0.5 }).toEqual({ name, ok: true });
        expect({ name, ok: chip.left + chip.width <= w - CHIP_MARGIN + 0.5 }).toEqual({
          name,
          ok: true,
        });
        expect({ name, ok: chip.top >= controlsBottom(inset) }).toEqual({ name, ok: true });
      }
    },
  );

  it.each(PHONES)("%ix%i: the parrot and the wordmark fit on screen", (w, h, inset) => {
    {
      const g = splashGeometry(w, h, inset, SPLASH_CLIP.aspect);
      expect(g.parrotLeft).toBeGreaterThanOrEqual(0);
      expect(g.parrotLeft + g.parrotWidth).toBeLessThanOrEqual(w);
      expect(g.wordmarkTop + WORDMARK_HEIGHT).toBeLessThan(h * 0.8);
    }
  });

  it("widens the estimate for longer words and CJK glyphs", () => {
    expect(estimateChipWidth("Здравствуйте")).toBeGreaterThan(estimateChipWidth("Hello"));
    expect(estimateChipWidth("こんにちは")).toBeGreaterThan(estimateChipWidth("你好"));
  });
});
