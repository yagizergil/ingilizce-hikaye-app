import { act, create } from "react-test-renderer";

import { useDeckReviewSession } from "@/features/vocabulary/hooks/useDeckReviewSession";

import type { ReactElement } from "react";
import type { CustomDeckCard } from "@/features/vocabulary/types";
import type { DeckReviewSession } from "@/features/vocabulary/hooks/useDeckReviewSession";

/**
 * Bu test dosyası `src/features/srs/hooks/__tests__/useReviewSession.test.tsx`
 * ile BİLEREK neredeyse birebir aynı -- iki hook da aynı snapshot deseninin
 * kopyaları (bkz. `useDeckReviewSession.ts`in doc comment'i), o yüzden aynı
 * regresyon sınıfına (değerlendirilen kart sorgudan düşünce kart atlanması)
 * karşı ayrı ayrı korunmaları gerekiyor.
 */

function makeCard(id: string): CustomDeckCard {
  return {
    id,
    deckId: "deck-1",
    surface: id,
    meaning: `${id}-meaning`,
    exampleSentence: null,
    dueAt: new Date(0).toISOString(),
    intervalDays: 0,
    ease: 2.5,
    repetitions: 0,
    lapses: 0,
    createdAt: new Date(0).toISOString(),
  };
}

function renderSession(initial: CustomDeckCard[] | undefined) {
  let latest!: DeckReviewSession;

  function Probe({ data }: { data: CustomDeckCard[] | undefined }): ReactElement | null {
    latest = useDeckReviewSession(data);
    return null;
  }

  let tree!: ReturnType<typeof create>;
  act(() => {
    tree = create((<Probe data={initial} />) as ReactElement);
  });

  return {
    get current() {
      return latest;
    },
    rerender(data: CustomDeckCard[] | undefined) {
      act(() => {
        tree.update((<Probe data={data} />) as ReactElement);
      });
    },
  };
}

describe("useDeckReviewSession", () => {
  it("değerlendirilen kart sorgudan düşse bile HİÇBİR kartı atlamaz", () => {
    const all = ["c0", "c1", "c2", "c3", "c4"].map(makeCard);
    const harness = renderSession(all);

    const seen: string[] = [];
    let remaining = all;

    for (let step = 0; step < all.length; step++) {
      const shown = harness.current.card;
      expect(shown).toBeDefined();
      seen.push((shown as CustomDeckCard).id);

      remaining = remaining.filter((c) => c.id !== (shown as CustomDeckCard).id);
      act(() => harness.current.advance());
      harness.rerender(remaining);
    }

    expect(seen).toEqual(["c0", "c1", "c2", "c3", "c4"]);
    expect(harness.current.finished).toBe(true);
  });

  it("toplam sayı oturum boyunca sabit kalır -- sayaç geri saymaz", () => {
    const all = ["a", "b", "c"].map(makeCard);
    const harness = renderSession(all);

    const totals: number[] = [];
    let remaining = all;
    for (let step = 0; step < all.length; step++) {
      totals.push(harness.current.total);
      remaining = remaining.slice(1);
      act(() => harness.current.advance());
      harness.rerender(remaining);
    }

    expect(totals).toEqual([3, 3, 3]);
  });

  it("veri gelmeden hazır değildir ve bitmiş sayılmaz", () => {
    const harness = renderSession(undefined);
    expect(harness.current.ready).toBe(false);
    expect(harness.current.finished).toBe(false);

    harness.rerender([makeCard("x")]);
    expect(harness.current.ready).toBe(true);
    expect(harness.current.card?.id).toBe("x");
  });

  it("vadesi gelen kart yoksa oturum boş biter", () => {
    const harness = renderSession([]);
    expect(harness.current.ready).toBe(true);
    expect(harness.current.finished).toBe(true);
    expect(harness.current.reviewedCount).toBe(0);
  });
});
