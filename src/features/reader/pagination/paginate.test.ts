import { paginate } from "./paginate";

import type { MeasuredLine, MeasuredParagraph, Page } from "./types";

/** Test-only helper: index into an array, failing fast (not `undefined`) if out of range. */
function at<T>(arr: readonly T[], index: number): T {
  const value = arr[index];
  if (value === undefined) {
    throw new Error(`test fixture error: index ${index} out of range`);
  }
  return value;
}

const LINE_HEIGHT = 20;
const PAGE_HEIGHT = 100; // fits 5 lines of LINE_HEIGHT exactly

/** Builds a paragraph whose text is split into `lineCount` lines of equal height. */
function makeParagraph(
  paragraphId: string,
  paragraphIndex: number,
  lineCount: number,
  height: number = LINE_HEIGHT,
  charsPerLine = 10,
): MeasuredParagraph {
  const lines: MeasuredLine[] = [];
  for (let i = 0; i < lineCount; i++) {
    const charStart = i * charsPerLine;
    const charEnd = charStart + charsPerLine;
    lines.push({
      text: `line-${i}`.padEnd(charsPerLine, "x"),
      charStart,
      charEnd,
      height,
    });
  }
  return { paragraphId, paragraphIndex, lines };
}

function totalCharRangeOf(paragraph: MeasuredParagraph): { start: number; end: number } {
  return {
    start: at(paragraph.lines, 0).charStart,
    end: at(paragraph.lines, paragraph.lines.length - 1).charEnd,
  };
}

describe("paginate", () => {
  it("1) fits a short chapter with a few paragraphs entirely on one page", () => {
    const p1 = makeParagraph("p1", 0, 2);
    const p2 = makeParagraph("p2", 1, 2);
    const pages = paginate([p1, p2], PAGE_HEIGHT);

    expect(pages).toHaveLength(1);
    const segments = at(pages, 0).segments;
    expect(segments).toHaveLength(2);

    const r1 = totalCharRangeOf(p1);
    const r2 = totalCharRangeOf(p2);
    expect(at(segments, 0)).toMatchObject({
      paragraphId: "p1",
      charStart: r1.start,
      charEnd: r1.end,
    });
    expect(at(segments, 1)).toMatchObject({
      paragraphId: "p2",
      charStart: r2.start,
      charEnd: r2.end,
    });
  });

  it("2) splits a very long paragraph across multiple pages with contiguous, non-overlapping ranges, and only avoids orphan/widow at the true paragraph boundaries", () => {
    // 23 lines of a single paragraph, page fits 5 lines -> spans 5 pages.
    const longParagraph = makeParagraph("long", 0, 23);
    const pages = paginate([longParagraph], PAGE_HEIGHT);

    expect(pages.length).toBeGreaterThanOrEqual(2);

    // Every page (except possibly widow/orphan-adjusted boundary pages)
    // should contain exactly one segment for this single paragraph.
    const allSegments = pages.map((p) => p.segments);
    for (const segs of allSegments) {
      expect(segs).toHaveLength(1);
      expect(at(segs, 0).paragraphId).toBe("long");
    }

    // Ranges concatenate back to the full paragraph with no gaps/overlaps.
    let expectedNextStart = at(longParagraph.lines, 0).charStart;
    for (const segs of allSegments) {
      const seg = at(segs, 0);
      expect(seg.charStart).toBe(expectedNextStart);
      expectedNextStart = seg.charEnd;
    }
    expect(expectedNextStart).toBe(at(longParagraph.lines, longParagraph.lines.length - 1).charEnd);

    // Distinguish "boundary" vs "internal" breaks: internal page breaks
    // within this oversized paragraph are NOT orphan/widow-adjusted, so with
    // a page capacity of exactly 5 lines and no other content to force an
    // adjustment, every internal page (all but possibly the last) should
    // carry exactly 5 lines (the naive greedy count), not 4 (which would
    // indicate an orphan/widow shift was incorrectly applied mid-paragraph).
    for (let idx = 0; idx < pages.length - 1; idx++) {
      const seg = at(at(pages, idx).segments, 0);
      const lineCount = (seg.charEnd - seg.charStart) / 10;
      expect(lineCount).toBe(5);
    }
  });

  it("3) handles a single-paragraph chapter (only one paragraph total) without crashing, splitting correctly across pages", () => {
    const solo = makeParagraph("solo", 0, 12);
    const pages = paginate([solo], PAGE_HEIGHT);

    expect(pages.length).toBeGreaterThan(1);
    const totalLinesPlaced = pages.reduce((sum, page) => {
      const seg = at(page.segments, 0);
      return sum + (seg.charEnd - seg.charStart) / 10;
    }, 0);
    expect(totalLinesPlaced).toBe(12);
    for (const page of pages) {
      expect(page.segments.length).toBeGreaterThan(0);
    }
  });

  it("4) skips an empty paragraph interleaved between real paragraphs without producing a broken/empty page", () => {
    const p1 = makeParagraph("p1", 0, 2);
    const empty: MeasuredParagraph = { paragraphId: "empty", paragraphIndex: 1, lines: [] };
    const p2 = makeParagraph("p2", 2, 2);

    const pages = paginate([p1, empty, p2], PAGE_HEIGHT);

    expect(pages).toHaveLength(1);
    const ids = at(pages, 0).segments.map((s) => s.paragraphId);
    expect(ids).toEqual(["p1", "p2"]);
    for (const page of pages) {
      expect(page.segments.length).toBeGreaterThan(0);
    }
  });

  it("5) gives a pathologically long unbreakable line its own page instead of crashing or looping", () => {
    const hugeLine: MeasuredLine = {
      text: "supercalifragilisticexpialidocious".repeat(20),
      charStart: 0,
      charEnd: 700,
      height: PAGE_HEIGHT * 3, // taller than a full page on its own
    };
    const paragraphWithHugeLine: MeasuredParagraph = {
      paragraphId: "huge",
      paragraphIndex: 0,
      lines: [hugeLine],
    };
    const before = makeParagraph("before", -1, 1);

    const pages = paginate([before, paragraphWithHugeLine], PAGE_HEIGHT);

    // Should terminate (no infinite loop) and never crash.
    expect(pages.length).toBeGreaterThanOrEqual(2);
    const hugePage = pages.find((p) => p.segments.some((s) => s.paragraphId === "huge"));
    expect(hugePage).toBeDefined();
    const hugeSegments = (hugePage as Page).segments;
    expect(hugeSegments).toHaveLength(1);
    expect(at(hugeSegments, 0)).toMatchObject({ paragraphId: "huge", charStart: 0, charEnd: 700 });
  });

  it("6) shifts the break point to avoid a naive single-line orphan/widow", () => {
    // Page fits exactly 5 lines of height 20. First paragraph uses 4 lines
    // (80 of 100), leaving exactly 20 of headroom -- exactly one more line's
    // worth. The second paragraph has 2 lines: a naive greedy algorithm
    // would place line 0 of paragraph 2 alone in the remaining 20 of space
    // (an orphan: paragraph 2's first line stranded alone at the bottom),
    // then push its second line to the next page alone too.
    const p1 = makeParagraph("p1", 0, 4);
    const p2 = makeParagraph("p2", 1, 2);

    const pages = paginate([p1, p2], PAGE_HEIGHT);

    // Naive greedy result would be: page 1 = p1(4 lines) + p2 line[0..1)
    // (5 lines total, exactly filling the page), page 2 = p2 line[1..2).
    // Our orphan avoidance must instead defer all of p2 to page 2, since
    // p1 (page 1's only other content) is non-empty, satisfying the "only
    // defer when the page already has content" rule.
    expect(pages).toHaveLength(2);

    const page1Ids = at(pages, 0).segments.map((s) => s.paragraphId);
    const page2Ids = at(pages, 1).segments.map((s) => s.paragraphId);

    // The naive break (page 1 containing part of p2) must NOT occur.
    expect(page1Ids).not.toContain("p2");
    expect(page1Ids).toEqual(["p1"]);

    // Instead, the entire p2 paragraph shifts to page 2 as one whole segment.
    expect(page2Ids).toEqual(["p2"]);
    const p2Range = totalCharRangeOf(p2);
    expect(at(at(pages, 1).segments, 0)).toMatchObject({
      charStart: p2Range.start,
      charEnd: p2Range.end,
    });
  });

  it("returns an empty page list when all input paragraphs are empty (documented all-empty edge case)", () => {
    const pages = paginate(
      [
        { paragraphId: "a", paragraphIndex: 0, lines: [] },
        { paragraphId: "b", paragraphIndex: 1, lines: [] },
      ],
      PAGE_HEIGHT,
    );
    expect(pages).toEqual([]);
  });

  it("returns an empty page list for a fully empty paragraphs array", () => {
    expect(paginate([], PAGE_HEIGHT)).toEqual([]);
  });
  /**
   * SAYFANIN BUTCESI = SATIRLAR + PARAGRAF ARALARI (2026-09-19).
   *
   * `ReaderPage`, sayfada BASLAYAN (ve sayfanin en ustunde olmayan) her
   * paragrafin ustune `paragraphGap` kadar bosluk koyuyor. `paginate` bunu
   * saymazsa render edilen sayfa hesaplanandan uzun oluyor ve sabit
   * yukseklikli, `overflow:"hidden"` kap altinda alttaki satirlar
   * KIRPILIYOR -- okuyucu o satirlari hic gormeden bir sonraki sayfaya
   * geciyor. Asagidaki testler bu butcelemeyi kilitliyor.
   */
  describe("paragraph gap budgeting", () => {
    const GAP = 20; // tam olarak bir LINE_HEIGHT -- hesabi gozle dogrulanabilir kiliyor

    it("7) counts the gap above a paragraph that starts below earlier content", () => {
      // Bosluksuz: 3 + 2 = 5 satir = tam olarak PAGE_HEIGHT, tek sayfa.
      // Boslukla: 60 + 20 bosluk = 80, p2'nin ikinci satiri icin yer yok.
      const p1 = makeParagraph("p1", 0, 3);
      const p2 = makeParagraph("p2", 1, 2);

      expect(paginate([p1, p2], PAGE_HEIGHT)).toHaveLength(1);

      const pages = paginate([p1, p2], PAGE_HEIGHT, GAP);
      expect(pages).toHaveLength(2);
      expect(at(pages, 0).segments.map((s) => s.paragraphId)).toEqual(["p1"]);
      expect(at(pages, 1).segments.map((s) => s.paragraphId)).toEqual(["p2"]);
    });

    it("8) does NOT count a gap above the first paragraph on a page", () => {
      // Tek paragraf, tam 5 satir: sayfanin en ustunde oldugu icin renderer
      // da bosluk koymuyor, dolayisiyla butce de koymamali.
      const only = makeParagraph("only", 0, 5);
      const pages = paginate([only], PAGE_HEIGHT, GAP);
      expect(pages).toHaveLength(1);
      expect(at(at(pages, 0).segments, 0)).toMatchObject({ charStart: 0, charEnd: 50 });
    });

    it("9) does NOT count a gap for a continuation segment of a split paragraph", () => {
      // 8 satirlik tek paragraf: sayfa basina 5 satir. Ikinci sayfa bir
      // DEVAM segmentiyle basliyor (charStart !== 0) -- renderer oraya bosluk
      // koymuyor, yani ikinci sayfaya yine tam 5 satir sigmali.
      const long = makeParagraph("long", 0, 8);
      const pages = paginate([long], PAGE_HEIGHT, GAP);

      expect(pages).toHaveLength(2);
      expect(at(at(pages, 0).segments, 0)).toMatchObject({ charStart: 0, charEnd: 50 });
      expect(at(at(pages, 1).segments, 0)).toMatchObject({ charStart: 50, charEnd: 80 });
    });

    it("10) never lets a page exceed the height budget, gaps included", () => {
      // Karisik bir bolum: her sayfanin GERCEK render yuksekligi
      // (satirlar + sayfada baslayan paragraflarin bosluklari) sayfa
      // yuksekligini asmamali. Kirpilmanin dogrudan testi bu.
      const paragraphs = [
        makeParagraph("a", 0, 3),
        makeParagraph("b", 1, 1),
        makeParagraph("c", 2, 4),
        makeParagraph("d", 3, 2),
        makeParagraph("e", 4, 7),
        makeParagraph("f", 5, 1),
      ];
      const byId = new Map(paragraphs.map((p) => [p.paragraphId, p]));
      const pages = paginate(paragraphs, PAGE_HEIGHT, GAP);

      for (const page of pages) {
        let height = 0;
        page.segments.forEach((segment, index) => {
          if (index > 0 && segment.charStart === 0) height += GAP;
          const source = byId.get(segment.paragraphId);
          if (!source) throw new Error("test fixture error: unknown paragraphId");
          for (const line of source.lines) {
            if (line.charStart >= segment.charStart && line.charEnd <= segment.charEnd) {
              height += line.height;
            }
          }
        });
        expect(height).toBeLessThanOrEqual(PAGE_HEIGHT);
      }
    });

    it("11) loses no text: the concatenated segments reproduce every paragraph exactly once", () => {
      const paragraphs = [
        makeParagraph("a", 0, 3),
        makeParagraph("b", 1, 6),
        makeParagraph("c", 2, 1),
        makeParagraph("d", 3, 4),
      ];
      const pages = paginate(paragraphs, PAGE_HEIGHT, GAP);

      const covered = new Map<string, number[]>();
      for (const page of pages) {
        for (const segment of page.segments) {
          const ranges = covered.get(segment.paragraphId) ?? [];
          ranges.push(segment.charStart, segment.charEnd);
          covered.set(segment.paragraphId, ranges);
        }
      }

      for (const paragraph of paragraphs) {
        const ranges = covered.get(paragraph.paragraphId);
        expect(ranges).toBeDefined();
        const flat = ranges as number[];
        const expected = totalCharRangeOf(paragraph);
        // Bitisik ve bosluksuz: ilk baslangic paragrafin basi, son bitis
        // paragrafin sonu, ve her ara sinirda bitis == bir sonraki baslangic.
        expect(flat[0]).toBe(expected.start);
        expect(flat[flat.length - 1]).toBe(expected.end);
        for (let i = 1; i < flat.length - 1; i += 2) {
          expect(flat[i]).toBe(flat[i + 1]);
        }
      }
    });
  });
});
