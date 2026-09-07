import { useEffect, useRef } from "react";
import { AppState } from "react-native";

import { useQueryClient } from "@tanstack/react-query";

import { supabase } from "@/lib/supabase";
import { trackError } from "@/lib/analytics";

/**
 * Okuma süresini ölçer ve sunucuya yazar.
 *
 * ÇÖZÜLEN HATA (2026-09-07): profil ekranı "bu hafta kaç gün / kaç dakika
 * okudun" istatistiklerini `user_reading_stats` tablosundan okuyordu ama o
 * tabloya hiçbir kod yazmıyordu — okuyan taraf yazılmış, yazan taraf hiç
 * yazılmamıştı. İstatistikler bu yüzden sonsuza kadar sıfırdı.
 *
 * Ölçüm kuralları:
 * - Reader açıkken geçen süre sayılıyor; uygulama arka plana alınınca
 *   sayaç duruyor, öne dönünce yeniden başlıyor. Aksi hâlde telefonu
 *   cebine koyan kullanıcı saatlerce "okumuş" görünürdü.
 * - Süre reader kapanırken, kitap değişirken ya da uygulama arka plana
 *   geçerken yazılıyor.
 * - 1 saniyenin altı yazılmıyor (gürültü), 2 saatin üstü sunucuda
 *   kırpılıyor (migration 026).
 *
 * Zamanlayıcı durumu bilerek `ref`'te: her saniye state'e yazmak reader'ı
 * yeniden render ettirir ve okuma deneyimini bozardı. Ref'e yalnızca
 * effect ve olay geri çağrıları içinden dokunuluyor, render sırasında
 * değil.
 */
export function useReadingSession(bookId: string | null): void {
  const queryClient = useQueryClient();

  /** Sayacın en son başladığı an; duraklatılmışsa null. */
  const startedAtRef = useRef<number | null>(null);
  /** Henüz yazılmamış birikmiş süre (ms). */
  const accumulatedRef = useRef(0);

  useEffect(() => {
    // Effect kapsamında yakalanan bookId ile çalışıyoruz; kitap değişirse
    // temizleme fonksiyonu ESKİ kitabın süresini yazıyor, sonra effect
    // yenisi için baştan başlıyor.
    const activeBookId = bookId;

    const resume = () => {
      if (startedAtRef.current === null) {
        startedAtRef.current = Date.now();
      }
    };

    const flush = async () => {
      if (startedAtRef.current !== null) {
        accumulatedRef.current += Date.now() - startedAtRef.current;
        startedAtRef.current = null;
      }

      const seconds = Math.round(accumulatedRef.current / 1000);
      accumulatedRef.current = 0;
      if (seconds < 1) return;

      try {
        const { error } = await supabase.rpc("record_reading_session", {
          p_book_id: activeBookId,
          p_seconds: seconds,
          p_words_read: 0,
        });
        if (error) throw error;

        // Profil istatistikleri değişti.
        void queryClient.invalidateQueries({ queryKey: ["profile"] });
      } catch (error) {
        // Okuma süresinin kaybolması kullanıcıyı durdurmamalı, ama sessizce
        // de yutulmamalı.
        trackError("readingSession.flush", error, { seconds });
      }
    };

    resume();

    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") {
        resume();
      } else {
        void flush();
      }
    });

    return () => {
      subscription.remove();
      void flush();
    };
  }, [bookId, queryClient]);
}
