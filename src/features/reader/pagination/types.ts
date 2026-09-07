export interface MeasuredLine {
  text: string;
  /** Character offset into the paragraph's original text where this line starts (inclusive). */
  charStart: number;
  /** Character offset where this line ends (exclusive). */
  charEnd: number;
  height: number;
}

export interface MeasuredParagraph {
  paragraphId: string;
  paragraphIndex: number;
  lines: MeasuredLine[];
}

export interface PageParagraphSegment {
  paragraphId: string;
  paragraphIndex: number;
  /** Character range of this paragraph's content included on this page. */
  charStart: number;
  charEnd: number;
}

export interface Page {
  segments: PageParagraphSegment[];
}
