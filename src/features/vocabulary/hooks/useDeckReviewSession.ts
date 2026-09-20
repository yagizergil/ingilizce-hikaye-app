import { useCallback, useEffect, useState } from "react";

import type { CustomDeckCard } from "@/features/vocabulary/types";

/**
 * Deste tekrar oturumunun kart listesini ve konumunu tutar.
 *
 * `src/features/srs/hooks/useReviewSession.ts`in AYNI snapshot deseninin
 * kasıtlı bir kopyası, genelleştirilmiş/paylaşılan bir sürüm DEĞİL. O hook
 * daha önce gerçek, kritik bir üretim hatasına (tekrar oturumunun vadesi
 * gelen kartların yarısını atlaması, 2026-09-19) sebep olmuştu ve şimdi
 * hem canlıdaki SRS akışının hem de kendi regresyon testinin bir parçası.
 * Onu deste kartları için genelleştirmek (tip parametresi eklemek) o
 * kritik yolu YENİDEN riske atmak demekti -- küçük bir kod tekrarı, o
 * riskten çok daha ucuz.
 */
export interface DeckReviewSession {
  ready: boolean;
  cards: CustomDeckCard[];
  card: CustomDeckCard | undefined;
  position: number;
  total: number;
  reviewedCount: number;
  finished: boolean;
  advance: () => void;
}

export function useDeckReviewSession(data: CustomDeckCard[] | undefined): DeckReviewSession {
  const [snapshot, setSnapshot] = useState<CustomDeckCard[] | null>(null);
  const [index, setIndex] = useState(0);

  useEffect(() => {
    // Yalnızca İLK veri için: snapshot bir kez alınır, sonraki refetch'ler
    // (mutation'ın invalidation'ı) bilerek yok sayılır.
    if (snapshot !== null || !data) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSnapshot(data);
  }, [data, snapshot]);

  const advance = useCallback(() => {
    setIndex((current) => current + 1);
  }, []);

  const cards = snapshot ?? [];
  const total = cards.length;
  const reviewedCount = Math.min(index, total);

  return {
    ready: snapshot !== null,
    cards,
    card: cards[index],
    position: Math.min(index + 1, Math.max(total, 1)),
    total,
    reviewedCount,
    finished: snapshot !== null && index >= total,
    advance,
  };
}
