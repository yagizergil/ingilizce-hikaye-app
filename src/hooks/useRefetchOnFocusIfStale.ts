import { useCallback, useEffect, useRef } from "react";

import { useFocusEffect } from "expo-router";

/** Bir sorgudan ihtiyaç duyulan asgari şekil. */
export interface RefetchableQuery {
  /** TanStack Query'nin verinin en son ne zaman tazelendiği damgası. */
  dataUpdatedAt: number;
  refetch: () => unknown;
}

/** Varsayılan tazelik penceresi. */
const DEFAULT_MAX_AGE_MS = 60_000;

/**
 * Sekme odağa geldiğinde sorguyu YALNIZCA verisi bayatladıysa tazeler.
 *
 * DENETİM BULGUSU (2026-09-19, performans): dört ekran (ana sayfa,
 * kütüphane, kelime defteri, kitap detayı) odakta KOŞULSUZ `refetch()`
 * çağırıyordu. `refetch()` tasarımı gereği `staleTime`'ı YOK SAYAR, yani
 * her sekme dokunuşu tam bir ağ turu demekti: üç kez sekme değiştirmek üç
 * kez bütün katalogu indirmek (`useHomeExtrasQuery` rafları katalogdan
 * türetiyor). Diğer her yerde özenle seçilmiş `staleTime` değerleri bu dört
 * çağrıyla etkisiz kalıyordu.
 *
 * Niyet MEŞRUDU ve korunuyor: Expo Router sekmeleri mount hâlinde tutuyor,
 * dolayısıyla yeni yayınlanan bir kitap tazeleme olmadan hiç görünmezdi.
 * Değişen tek şey, tazelemenin bir KOŞULA bağlanması.
 *
 * NEDEN REF: `useFocusEffect` verdiği geri çağırmanın kimliği değişince
 * ekran ODAKTAYKEN de yeniden çalışıyor. `dataUpdatedAt` her tazelemede
 * değiştiği için onu doğrudan bağımlılığa koymak kendi kendini besleyen bir
 * döngü kurardı: tazele -> damga değişti -> effect yeniden çalıştı ->
 * tazele. Değerler ref üzerinden okunuyor, geri çağırma sabit kalıyor.
 */
export function useRefetchOnFocusIfStale(
  queries: RefetchableQuery[],
  maxAgeMs: number = DEFAULT_MAX_AGE_MS,
): void {
  const queriesRef = useRef(queries);
  const maxAgeRef = useRef(maxAgeMs);

  // Ref'ler render sırasında DEĞİL, effect içinde güncelleniyor; eşzamanlı
  // render modunda render sırasında ref yazmak tutarsız sonuç verebiliyor.
  // Bu effect `useFocusEffect`ten ÖNCE tanımlı olduğu için aynı commit'te
  // ondan önce çalışıyor, yani odak geri çağırması hep güncel değeri görüyor.
  useEffect(() => {
    queriesRef.current = queries;
    maxAgeRef.current = maxAgeMs;
  });

  useFocusEffect(
    useCallback(() => {
      const now = Date.now();
      for (const query of queriesRef.current) {
        // `dataUpdatedAt === 0` henüz hiç veri gelmedi demek; o durumda
        // sorgunun kendi yükleme akışı zaten çalışıyor, araya girmiyoruz.
        if (query.dataUpdatedAt === 0) continue;
        if (now - query.dataUpdatedAt < maxAgeRef.current) continue;
        query.refetch();
      }
    }, []),
  );
}
