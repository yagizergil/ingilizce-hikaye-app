import { useCallback, useEffect, useState } from "react";

import type { SrsDueData, SrsReviewCard } from "@/features/srs/types";

/**
 * Bir tekrar oturumunun kart listesini ve konumunu tutar.
 *
 * ÇÖZÜLEN KRİTİK HATA (2026-09-19): `ReviewScreen` konumu `data.cards`
 * dizisine giden bir SAYI (index) olarak tutuyordu. `useReviewCardMutation`
 * her değerlendirmeden sonra `srsQueryKeys.all`'ı geçersiz kılıyor,
 * `useDueCardsQuery` ekranda mount olduğu için yeniden çekiliyor ve az önce
 * değerlendirilen kart diziden DÜŞÜYOR (vadesi geleceğe kaydı). Dizi
 * kısalırken index ilerlediği için her değerlendirme bir kartı atlıyordu:
 * vadesi gelen 20 kartın yaklaşık 10'u gösteriliyor, geri kalanı eski
 * vadesiyle duruyor ve kuyruk hiç bitmiş görünmüyordu. Üstteki sayaç da
 * "1/20 → 2/19 → 3/18" diye geriliyordu.
 *
 * ÇÖZÜM: oturum bir ANLIK GÖRÜNTÜ (snapshot) üzerinde çalışıyor. Kart
 * listesi ilk başarılı yüklemede bir kez kopyalanıyor ve oturum boyunca bir
 * daha `data.cards` okunmuyor. Böylece mutation'ın invalidation'ı -- ki
 * başka ekranlar (kelime defteri rozeti, profil) ona güveniyor ve bu yüzden
 * KALDIRILMADI -- devam eden oturumu artık değiştiremiyor.
 *
 * `reviewedCount` de aynı sebeple snapshot'a göre hesaplanıyor: kullanıcıya
 * "20 kart tekrar ettin" derken gerçekten gösterilen kart sayısını söylüyor.
 */
export interface ReviewSession {
  /** İlk yükleme tamamlandı ve snapshot alındı mı. */
  ready: boolean;
  /** Oturumun sabit kart listesi. */
  cards: SrsReviewCard[];
  /** Gösterilen kart; oturum bittiyse undefined. */
  card: SrsReviewCard | undefined;
  /** Kaçıncı kart gösteriliyor (1 tabanlı). */
  position: number;
  /** Oturumdaki toplam kart sayısı — oturum boyunca değişmez. */
  total: number;
  /** Gerçekten değerlendirilen kart sayısı. */
  reviewedCount: number;
  finished: boolean;
  /** Bir sonraki karta geçer. */
  advance: () => void;
}

export function useReviewSession(data: SrsDueData | undefined): ReviewSession {
  const [snapshot, setSnapshot] = useState<SrsReviewCard[] | null>(null);
  const [index, setIndex] = useState(0);

  useEffect(() => {
    // Yalnızca İLK veri için: snapshot bir kez alınır, sonraki refetch'ler
    // (mutation'ın invalidation'ı) bilerek yok sayılır.
    if (snapshot !== null || !data) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSnapshot(data.cards);
  }, [data, snapshot]);

  const advance = useCallback(() => {
    setIndex((current) => current + 1);
  }, []);

  const cards = snapshot ?? [];
  const total = cards.length;
  // Kullanıcı snapshot'ın sonuna gelince oturum biter; index'i toplamla
  // sınırlamak "21. kart" gibi imkânsız bir konumu baştan engelliyor.
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
