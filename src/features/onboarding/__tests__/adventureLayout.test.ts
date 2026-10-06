import { ADVENTURE_ASPECT } from "@/features/onboarding/adventureAssets";
import {
  ADVENTURE_WORDS,
  KEEP_CLEAR,
  WORD_HEIGHT,
  estimateWordWidth,
  placeWord,
} from "@/features/onboarding/adventureLayout";

/** Telefon genişlikleri ve ekran yükseklikleri. */
const PHONES: readonly (readonly [number, number])[] = [
  [360, 740],
  [375, 667],
  [375, 812],
  [390, 844],
  [393, 852],
  [430, 932],
];

describe("adventure words layout", () => {
  it.each(PHONES)("%ix%i: words stay clear of the woman and the parrot and on screen", (w, h) => {
    const imageHeight = w * ADVENTURE_ASPECT;
    const boxHeight = Math.min(imageHeight, h * 0.6);
    for (const word of ADVENTURE_WORDS) {
      const width = estimateWordWidth(word.text);
      const center = placeWord(word, w, boxHeight, ADVENTURE_ASPECT);
      const rect = {
        left: center.x - width / 2,
        right: center.x + width / 2,
        top: center.y - WORD_HEIGHT / 2,
        bottom: center.y + WORD_HEIGHT / 2,
      };
      expect({ word: word.text, onScreenX: rect.left >= 6 && rect.right <= w - 6 }).toEqual({
        word: word.text,
        onScreenX: true,
      });
      // kutunun içinde (kısa ekranda üstten kırpılan kısım dışında kalmasın)
      expect({ word: word.text, insideBox: rect.top >= 4 && rect.bottom <= boxHeight - 4 }).toEqual(
        {
          word: word.text,
          insideBox: true,
        },
      );
      for (const zone of KEEP_CLEAR) {
        const zl = zone.x0 * w;
        const zr = zone.x1 * w;
        const zt = boxHeight - imageHeight + zone.y0 * imageHeight;
        const zb = boxHeight - imageHeight + zone.y1 * imageHeight;
        const hits =
          rect.left < zr + 4 && rect.right > zl - 4 && rect.top < zb + 4 && rect.bottom > zt - 4;
        expect({ word: word.text, zone: zone.name, hits }).toEqual({
          word: word.text,
          zone: zone.name,
          hits: false,
        });
      }
    }
  });

  it("keeps the words from overlapping each other", () => {
    const w = 360;
    const imageHeight = w * ADVENTURE_ASPECT;
    const rects = ADVENTURE_WORDS.map((word) => {
      const width = estimateWordWidth(word.text);
      const c = placeWord(word, w, imageHeight, ADVENTURE_ASPECT);
      return { name: word.text, l: c.x - width / 2, r: c.x + width / 2, t: c.y - 16, b: c.y + 16 };
    });
    rects.forEach((a, i) => {
      rects.slice(0, i).forEach((b) => {
        const hit = a.l < b.r + 6 && a.r > b.l - 6 && a.t < b.b + 6 && a.b > b.t - 6;
        expect({ pair: `${a.name}/${b.name}`, hit }).toEqual({
          pair: `${a.name}/${b.name}`,
          hit: false,
        });
      });
    });
  });
});
