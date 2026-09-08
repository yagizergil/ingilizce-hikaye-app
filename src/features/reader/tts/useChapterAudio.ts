import { useCallback, useEffect, useRef } from "react";

import { useAudioPlayer } from "expo-audio";
import { useQuery } from "@tanstack/react-query";

import { supabase } from "@/lib/supabase";
import { trackError } from "@/lib/analytics";
import { useTtsStore } from "@/features/reader/tts/useTtsStore";
import {
  findWordIndexAtTime,
  mapTimingsToPage,
  type ChapterAudioTimings,
  type TimedWord,
} from "@/features/reader/tts/chapterAudioTimings";

import type { RefObject } from "react";
import type { PaginatedReaderHandle } from "@/features/reader/components/PaginatedReaderView";
import type { ReaderChapter } from "@/features/reader/types";
import type { ReaderTtsController } from "@/features/reader/tts/useReaderTts";

/**
 * Bulut sürücüsünün denetleyicisi + gerçekten kullanılabilir olup olmadığı.
 *
 * NEDEN `available` DIŞARI ÇIKIYOR: erişim kararı ASENKRON (imzalı bağlantı
 * sunucudan geliyor) ama hangi sürücünün aktif olduğuna ReaderScreen her
 * render'da senkron karar vermek zorunda. Bu bayrak olmadan, erişimi
 * olmayan kullanıcıda bulut sürücüsü seçilir ve sesli okuma düğmesi hiçbir
 * şey yapmazdı — oysa doğru davranış cihaz sesine düşmek.
 */
export interface ChapterAudioController extends ReaderTtsController {
  available: boolean;
}

interface SignedAudio {
  audioUrl: string;
  timingsUrl: string;
}

interface UseChapterAudioOptions {
  readerRef: RefObject<PaginatedReaderHandle | null>;
  /** Bölüm henüz yüklenmediyse null. */
  chapter: ReaderChapter | null | undefined;
  /** Kullanıcının seçtiği okuma hızı; cihaz TTS'iyle aynı ölçek. */
  rate: number;
  /**
   * Bu hook AKTİF sürücü mü.
   *
   * NEDEN GEREKLİ: React hook'ları koşullu çağrılamıyor, bu yüzden bulut
   * ve cihaz sürücülerinin İKİSİ de her render'da çalışıyor; hangisinin
   * kullanılacağına çağıran karar veriyor. Pasif olan, ortak vurgu
   * deposuna (`useTtsStore`) DOKUNMAMALI — yoksa cihaz sesi çalarken bu
   * hook'un bölüm değişimi sıfırlaması vurguyu siler.
   */
  enabled: boolean;
}

/**
 * Vurgunun ne sıklıkla güncellendiği (ms).
 *
 * 60 ms, saniyede ~16 güncelleme demek. Konuşmada kelimeler ortalama
 * 400 ms arayla geldiği için bu fazlasıyla yeterli; daha sık yoklamak
 * pil harcar, daha seyrek yoklamak vurguyu tökezletir.
 */
const TICK_MS = 60;

/**
 * Önceden üretilmiş bölüm seslendirmesini çalar ve kelime kelime vurguyu
 * sürer.
 *
 * NEDEN CİHAZ TTS'İNDEN AYRI BİR HOOK: ikisi aynı arayüzü (`toggle`,
 * `pause`, `stop`) ve aynı vurgu deposunu (`useTtsStore`) paylaşıyor ama
 * mekanizmaları taban tabana farklı. Cihaz TTS'i metni parça parça
 * konuşturup platformun `onBoundary` olayını dinliyor; burada ise hazır
 * bir ses dosyası çalıyor ve vurgu, sunucudan gelen zaman damgalarından
 * SÜRÜLÜYOR. İkisini tek hook'a sıkıştırmak her satırda "hangi moddayız"
 * sorusunu sordururdu.
 *
 * KATMAN İLİŞKİSİ: bu üst katman. `audioUrl` yoksa (klasiklerin tamamı,
 * ADR-011) reader cihaz TTS'ine düşüyor — yani sesli okuma HER KİTAPTA
 * çalışıyor, bulut sesi yalnızca özgün hikâyelerde devreye giriyor.
 */
export function useChapterAudio({
  readerRef,
  chapter,
  rate,
  enabled,
}: UseChapterAudioOptions): ChapterAudioController {
  const status = useTtsStore((state) => state.status);
  const setStatus = useTtsStore((state) => state.setStatus);
  const setSpokenKey = useTtsStore((state) => state.setSpokenKey);

  /**
   * İmzalı bağlantılar.
   *
   * NEDEN SATIRDAKİ ADRES DOĞRUDAN KULLANILMIYOR: `book-audio` deposu
   * migration 031 ile herkese açık olmaktan çıktı. Adresler hâlâ
   * `book_sections` satırında duruyor ama artık tek başlarına açılmıyor;
   * erişimi sunucu (`chapter-audio`) veriyor ve kararı orada
   * `can_play_book_audio()` alıyor.
   *
   * 403 (kilitli) bir HATA DEĞİL: sorgu null döner, `available` false olur
   * ve reader cihaz sesine düşer — yani erişimi olmayan kullanıcı için
   * hiçbir şey bozulmaz, sadece ses cihazın sesi olur.
   */
  const signedQuery = useQuery<SignedAudio | null>({
    queryKey: ["reader", "signedAudio", chapter?.id ?? null],
    enabled: enabled && Boolean(chapter?.id),
    staleTime: 60 * 60 * 1000, // Bağlantı 2 saat geçerli; bir saat sonra tazele.
    retry: false,
    queryFn: async () => {
      if (!chapter?.id) return null;
      const { data, error } = await supabase.functions.invoke<SignedAudio>("chapter-audio", {
        body: { sectionId: chapter.id },
      });
      if (error) {
        // Kilit ve "ses yok" beklenen durumlar; gürültü yapmadan null.
        return null;
      }
      return data ?? null;
    },
  });

  const signed = signedQuery.data ?? null;
  const available = enabled && signed !== null;

  const player = useAudioPlayer(signed?.audioUrl ?? undefined);

  // Zamanlama dosyası bölüm boyunca değişmiyor; `staleTime: Infinity`
  // aynı bölüme dönüldüğünde yeniden indirilmesini önlüyor.
  const timingsQuery = useQuery<ChapterAudioTimings | null>({
    queryKey: ["reader", "audioTimings", chapter?.id ?? null],
    enabled: Boolean(signed),
    staleTime: Infinity,
    queryFn: async () => {
      if (!signed) return null;
      const response = await fetch(signed.timingsUrl);
      if (!response.ok) throw new Error(`audio_timings_${response.status}`);
      return (await response.json()) as ChapterAudioTimings;
    },
  });

  /** Görünen sayfaya ait kelimeler; sayfa değişince yeniden hesaplanıyor. */
  const pageWordsRef = useRef<TimedWord[]>([]);
  const lastKeyRef = useRef<string | null>(null);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const paragraphIndexById = useRef<Map<string, number>>(new Map());
  useEffect(() => {
    paragraphIndexById.current = new Map(
      (chapter?.paragraphs ?? []).map((p) => [p.id, p.paragraphIndex]),
    );
  }, [chapter?.paragraphs]);

  const recomputePageWords = useCallback(() => {
    const segments = readerRef.current?.getCurrentPageSpeech() ?? [];
    const timings = timingsQuery.data?.words ?? [];
    pageWordsRef.current = mapTimingsToPage(timings, segments, paragraphIndexById.current);
  }, [readerRef, timingsQuery.data]);

  const clearTick = useCallback(() => {
    if (tickRef.current !== null) {
      clearInterval(tickRef.current);
      tickRef.current = null;
    }
  }, []);

  const hardStop = useCallback(() => {
    clearTick();
    try {
      player.pause();
      void player.seekTo(0);
    } catch (error) {
      trackError("chapterAudio.stop", error);
    }
    lastKeyRef.current = null;
    setSpokenKey(null);
    setStatus("idle");
  }, [clearTick, player, setSpokenKey, setStatus]);

  const pause = useCallback(() => {
    clearTick();
    try {
      player.pause();
    } catch (error) {
      trackError("chapterAudio.pause", error);
    }
    // Vurgu duruyor ama SİLİNMİYOR: kullanıcı nerede kaldığını görsün.
    setStatus("idle");
  }, [clearTick, player, setStatus]);

  const tick = useCallback(() => {
    const time = player.currentTime;
    const words = pageWordsRef.current;

    const index = findWordIndexAtTime(words, time);
    if (index >= 0) {
      const key = words[index]!.key;
      if (key !== lastKeyRef.current) {
        lastKeyRef.current = key;
        setSpokenKey(key);
      }
    }

    // Sayfanın son kelimesi geçildiyse sıradaki sayfaya geç. Ses bölümün
    // tamamını kesintisiz çalıyor; ekranın ona yetişmesi gerekiyor.
    const last = words[words.length - 1];
    if (last && time > last.time + 0.35) {
      const advanced = readerRef.current?.advancePage() ?? false;
      if (advanced) {
        recomputePageWords();
      }
    }

    // Ses bitti.
    if (!player.playing && player.currentTime > 0 && player.duration > 0) {
      if (player.currentTime >= player.duration - 0.25) {
        hardStop();
      }
    }
  }, [hardStop, player, readerRef, recomputePageWords, setSpokenKey]);

  const toggle = useCallback(() => {
    if (status === "speaking") {
      pause();
      return;
    }

    if (!available) return;

    recomputePageWords();

    // Sayfa değiştiyse ses de oraya atlamalı — kullanıcı okurken sayfa
    // çevirmiş olabilir ve sesin baştan başlaması kafa karıştırıcı olurdu.
    const first = pageWordsRef.current[0];
    if (first && Math.abs(player.currentTime - first.time) > 1.5) {
      void player.seekTo(first.time);
    }

    try {
      player.setPlaybackRate(rate);
      player.play();
    } catch (error) {
      trackError("chapterAudio.play", error);
      setStatus("idle");
      return;
    }

    setStatus("speaking");
    clearTick();
    tickRef.current = setInterval(tick, TICK_MS);
  }, [available, clearTick, pause, player, rate, recomputePageWords, setStatus, status, tick]);

  // Bölüm değişince ya da ekrandan çıkınca sesi kesinlikle durdur.
  useEffect(() => {
    return () => {
      clearTick();
      try {
        player.pause();
      } catch {
        // Oynatıcı zaten yok edilmişse sorun değil; burada yapacak bir şey
        // kalmadığı için sessizce geçiliyor (boş catch değil, gerekçeli).
      }
    };
  }, [clearTick, player]);

  useEffect(() => {
    // Pasifken ortak vurgu deposuna dokunma — aktif olan cihaz sürücüsü.
    if (!enabled) return;
    hardStop();
    // Yalnızca bölüm kimliği değişince sıfırla.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chapter?.id, enabled]);

  return { toggle, pause, stop: hardStop, available };
}
