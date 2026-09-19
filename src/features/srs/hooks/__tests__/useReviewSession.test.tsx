import { act, create } from "react-test-renderer";

import { useReviewSession } from "@/features/srs/hooks/useReviewSession";

import type { ReactElement } from "react";
import type { SrsDueData, SrsReviewCard } from "@/features/srs/types";
import type { ReviewSession } from "@/features/srs/hooks/useReviewSession";

/**
 * ÇÖZÜLEN KRİTİK HATA (2026-09-19): tekrar oturumu vadesi gelen kartların
 * YARISINI atlıyordu.
 *
 * `ReviewScreen` konumu `data.cards` dizisine giden bir SAYI olarak
 * tutuyordu. Her değerlendirmeden sonra `useReviewCardMutation` sorguyu
 * geçersiz kılıyor, `useDueCardsQuery` yeniden çekiyor ve az önce
 * değerlendirilen kart diziden DÜŞÜYOR (vadesi geleceğe kaydı -- "tekrar"
 * bile +10 dakika veriyor). Dizi her cevapta bir kısalırken index bir
 * ilerlediği için aradaki kart hiç gösterilmiyordu.
 *
 * Aşağıdaki ilk test o senaryoyu birebir kuruyor: her `advance()` sonrası
 * sorgu verisi, gösterilen kart çıkarılmış hâliyle yeniden veriliyor.
 * Snapshot olmasaydı 20 kartın ~10'u atlanırdı.
 */

function makeCard(id: string): SrsReviewCard {
  return {
    id,
    lemma: id,
    surface: id,
    gloss: `${id}-gloss`,
    contextText: null,
    bookTitle: null,
    repetitions: 0,
    intervalDays: 0,
    ease: 2.5,
    lapses: 0,
  };
}

function makeDue(cards: SrsReviewCard[]): SrsDueData {
  return { cards, dueCount: cards.length };
}

/** Hook'u gerçek bir render ağacında çalıştırır ve son dönen değeri verir. */
function renderSession(initial: SrsDueData | undefined) {
  let latest!: ReviewSession;

  function Probe({ data }: { data: SrsDueData | undefined }): ReactElement | null {
    latest = useReviewSession(data);
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
    rerender(data: SrsDueData | undefined) {
      act(() => {
        tree.update((<Probe data={data} />) as ReactElement);
      });
    },
  };
}

describe("useReviewSession", () => {
  it("değerlendirilen kart sorgudan düşse bile HİÇBİR kartı atlamaz", () => {
    const all = ["c0", "c1", "c2", "c3", "c4"].map(makeCard);
    const harness = renderSession(makeDue(all));

    const seen: string[] = [];
    let remaining = all;

    for (let step = 0; step < all.length; step++) {
      const shown = harness.current.card;
      expect(shown).toBeDefined();
      seen.push((shown as SrsReviewCard).id);

      // Gerçek davranış: puanlanan kart artık "vadesi gelmiş" değil, bir
      // sonraki refetch'te listeden düşüyor.
      remaining = remaining.filter((c) => c.id !== (shown as SrsReviewCard).id);
      act(() => harness.current.advance());
      harness.rerender(makeDue(remaining));
    }

    expect(seen).toEqual(["c0", "c1", "c2", "c3", "c4"]);
    expect(harness.current.finished).toBe(true);
  });

  it("toplam sayı oturum boyunca sabit kalır -- sayaç geri saymaz", () => {
    const all = ["a", "b", "c"].map(makeCard);
    const harness = renderSession(makeDue(all));

    const totals: number[] = [];
    let remaining = all;
    for (let step = 0; step < all.length; step++) {
      totals.push(harness.current.total);
      remaining = remaining.slice(1);
      act(() => harness.current.advance());
      harness.rerender(makeDue(remaining));
    }

    // Hatalıyken "3, 2, 1" oluyordu.
    expect(totals).toEqual([3, 3, 3]);
  });

  it("bitişte kullanıcıya söylenen sayı GERÇEKTEN gösterilen kart sayısıdır", () => {
    const all = ["a", "b", "c", "d"].map(makeCard);
    const harness = renderSession(makeDue(all));

    act(() => harness.current.advance());
    act(() => harness.current.advance());
    expect(harness.current.reviewedCount).toBe(2);
    expect(harness.current.finished).toBe(false);

    act(() => harness.current.advance());
    act(() => harness.current.advance());
    expect(harness.current.reviewedCount).toBe(4);
    expect(harness.current.finished).toBe(true);
  });

  it("veri gelmeden hazır değildir ve bitmiş sayılmaz", () => {
    const harness = renderSession(undefined);
    expect(harness.current.ready).toBe(false);
    expect(harness.current.finished).toBe(false);

    harness.rerender(makeDue([makeCard("x")]));
    expect(harness.current.ready).toBe(true);
    expect(harness.current.card?.id).toBe("x");
  });

  it("vadesi gelen kart yoksa oturum boş biter", () => {
    const harness = renderSession(makeDue([]));
    expect(harness.current.ready).toBe(true);
    expect(harness.current.finished).toBe(true);
    expect(harness.current.reviewedCount).toBe(0);
  });
});
