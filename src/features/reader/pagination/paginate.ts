import type { MeasuredParagraph, Page, PageParagraphSegment } from "./types";

/**
 * Pure pagination function: takes pre-measured paragraphs (each already broken
 * into lines with known heights, produced by a later "measureChapter" phase)
 * and a target page height, and returns the list of pages a reader should
 * flip through.
 *
 * Terminology used throughout this file (defined precisely because the two
 * terms are easy to swap by accident):
 *
 * - "orphan": a paragraph's FIRST line stranded ALONE at the BOTTOM of a page,
 *   with the rest of that paragraph pushed onto the following page.
 * - "widow": a paragraph's LAST line stranded ALONE at the TOP of the
 *   following page, with the rest of that paragraph having stayed on the
 *   previous page.
 *
 * Orphan/widow avoidance only ever looks at a paragraph's true first line or
 * true last line. For a paragraph so tall it spans three or more pages on its
 * own, the breaks in the *middle* of that paragraph are never adjusted --
 * there is no "alone at the top/bottom" concern for an internal break, since
 * both sides of an internal break already contain multiple lines of running
 * text from the same paragraph. Only the paragraph's actual start (could it
 * strand a lone first line?) and actual end (could it strand a lone last
 * line?) are checked.
 *
 * `paragraphGap` is the vertical space the RENDERER puts above a paragraph
 * that STARTS on this page below some earlier content (`ReaderPage`'s
 * `marginTop`, sourced from `getReadingTypeScale().paragraphGap`).
 *
 * DENETİM BULGUSU (2026-09-19, kullanıcı videosu): bu parametre eskiden
 * YOKTU. Sayfalama yalnızca satır yüksekliklerini topluyordu, oysa
 * `ReaderPage` her paragraf sınırına gözle görülür bir boşluk koyuyordu.
 * Yani RENDER EDİLEN sayfa, sayfalamanın varsaydığından her paragraf
 * sınırı başına bir boşluk kadar DAHA UZUNDU. Sayfa kabı sabit yükseklikte
 * ve `overflow:"hidden"` olduğu için fazlalık taşıyor ve KIRPILIYORDU --
 * sayfanın en altındaki satır(lar) hiç görünmüyor, bir sonraki sayfa ise
 * sayfalamanın söylediği yerden başlıyordu. Okuyucu o satırları hiç
 * görmüyordu. Eski koddaki yorum bu tavizi "en kötü ihtimalle biraz boş
 * alan kırpılır" diye anlatıyordu; gerçekte kırpılan METİNDİ.
 *
 * Boşluk yalnızca sayfada ZATEN içerik varken sayılıyor: sayfanın en
 * üstündeki paragrafın üstüne renderer da boşluk koymuyor.
 */
export function paginate(
  paragraphs: MeasuredParagraph[],
  pageHeight: number,
  paragraphGap = 0,
): Page[] {
  const pages: Page[] = [];
  let currentSegments: PageParagraphSegment[] = [];
  let currentHeight = 0;

  const closePage = (): void => {
    pages.push({ segments: currentSegments });
    currentSegments = [];
    currentHeight = 0;
  };

  const appendSegment = (
    paragraph: MeasuredParagraph,
    fromLineIndex: number,
    toLineIndexExclusive: number,
    gapBefore: number,
  ): void => {
    const firstLine = paragraph.lines[fromLineIndex];
    const lastLine = paragraph.lines[toLineIndexExclusive - 1];
    if (!firstLine || !lastLine) {
      throw new Error("paginate: appendSegment called with an out-of-range line index");
    }
    const last = currentSegments[currentSegments.length - 1];

    if (
      last &&
      last.paragraphId === paragraph.paragraphId &&
      last.charEnd === firstLine.charStart
    ) {
      last.charEnd = lastLine.charEnd;
    } else {
      currentSegments.push({
        paragraphId: paragraph.paragraphId,
        paragraphIndex: paragraph.paragraphIndex,
        charStart: firstLine.charStart,
        charEnd: lastLine.charEnd,
      });
    }

    currentHeight += gapBefore;
    for (let k = fromLineIndex; k < toLineIndexExclusive; k++) {
      const line = paragraph.lines[k];
      if (!line) {
        throw new Error("paginate: appendSegment called with an out-of-range line index");
      }
      currentHeight += line.height;
    }
  };

  for (const paragraph of paragraphs) {
    const lines = paragraph.lines;
    const n = lines.length;
    if (n === 0) {
      // Empty paragraphs contribute nothing and are skipped gracefully.
      continue;
    }

    let i = 0;
    while (i < n) {
      // The renderer only puts a gap above a paragraph that STARTS here
      // AND has something above it on the same page. A continuation
      // segment (i > 0, paragraph split across a page break) and a
      // paragraph opening a fresh page both get no gap -- so neither does
      // the height budget.
      const gapBefore = i === 0 && currentSegments.length > 0 ? paragraphGap : 0;

      // Greedily determine how many lines starting at `i` fit on the
      // current page without exceeding pageHeight.
      let probeHeight = currentHeight + gapBefore;
      let j = i;
      while (j < n) {
        const line = lines[j];
        if (!line) {
          throw new Error("paginate: encountered an out-of-range line index while probing");
        }
        const nextHeight = probeHeight + line.height;
        if (nextHeight > pageHeight) break;
        probeHeight = nextHeight;
        j++;
      }

      if (j === i) {
        // Not even a single line fits from here.
        if (currentSegments.length === 0 && currentHeight === 0) {
          // The page is completely empty and still a single line doesn't
          // fit (a pathologically long unbreakable line/word whose height
          // alone exceeds pageHeight). This is a degraded-but-safe outcome:
          // give that one line its own page rather than looping forever or
          // crashing. Actual layout-level mitigation belongs to the future
          // measureChapter phase, not to this pure function.
          appendSegment(paragraph, i, i + 1, 0);
          closePage();
          i++;
          continue;
        }
        // Current page has content but no more of this paragraph fits:
        // close it and retry placement of the same line on a fresh page.
        closePage();
        continue;
      }

      // A natural (greedy) break falls at index `j` (first line index NOT
      // included, or n if the whole rest of the paragraph fit).
      let adjustedJ = j;

      if (j < n) {
        const isAtParagraphStart = i === 0;
        const isAtParagraphEnd = j === n - 1;
        const isPageEmpty = currentSegments.length === 0;

        if (isAtParagraphStart && j - i === 1 && n > 1 && currentSegments.length > 0) {
          // Orphan risk: only the paragraph's first line would be placed on
          // this page, stranding it alone at the bottom while the rest of
          // the paragraph moves to the next page. Defer the whole paragraph
          // to the next page instead. Only do this when the current page
          // already holds other content -- if the page is otherwise empty,
          // deferring would produce an empty page (and can't reduce the
          // orphan risk anyway, since there's no room for two lines here
          // regardless of what starts the page).
          adjustedJ = i;
        } else if (isAtParagraphEnd && j - i >= 1 && !(j - 1 === i && isPageEmpty)) {
          // Widow risk: only the paragraph's last line would be pushed to
          // the next page, alone at its top. Pull one more line back so the
          // last two lines of the paragraph move together. Skip this when
          // it would empty out the current page entirely while the page has
          // no other content yet (same unavoidable-isolation reasoning as
          // the orphan case above).
          adjustedJ = j - 1;
        }
      }

      if (adjustedJ === i) {
        // The orphan/widow adjustment (or the pathological case above)
        // reduced this placement to nothing usable right now: close the
        // page and retry on a fresh one.
        closePage();
        continue;
      }

      appendSegment(paragraph, i, adjustedJ, gapBefore);
      i = adjustedJ;
    }
  }

  if (currentSegments.length > 0) {
    closePage();
  }

  // All-input-empty edge case (zero paragraphs, or paragraphs that all have
  // zero lines): there is no content to show, so we return an empty page
  // list rather than synthesizing a single empty Page.
  return pages;
}
