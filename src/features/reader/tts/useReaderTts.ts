import { useCallback, useEffect, useRef } from "react";
import { AppState } from "react-native";

import * as Speech from "expo-speech";

import { trackError, trackEvent } from "@/lib/analytics";

import { getVoiceIdentifier } from "@/features/reader/tts/englishVoice";
import { findWordStart, wordKey } from "@/features/reader/tts/ttsPlan";
import { useTtsStore } from "@/features/reader/tts/useTtsStore";

import type { RefObject } from "react";
import type { PaginatedReaderHandle } from "@/features/reader/components/PaginatedReaderView";
import type { SpeechSegment } from "@/features/reader/tts/ttsPlan";

/**
 * Sınır olayının şekli.
 *
 * NEDEN BURADA TANIMLI: `expo-speech` bu tipi `Speech.types` içinde
 * tanımlıyor ama paketin giriş noktasından DIŞARI VERMİYOR
 * (`build/Speech.d.ts` yalnızca SpeechOptions/Voice/VoiceQuality
 * re-export ediyor). Paketin iç yoluna import atmak sürüm yükseltmesinde
 * sessizce kırılır; şekil iki alandan ibaret.
 */
interface SpeechBoundaryEvent {
  charIndex: number;
  charLength: number;
}

/** Bir konuşma biriminin nasıl bittiği. */
type SpeechOutcome = "done" | "stopped" | "error";

interface UseReaderTtsOptions {
  readerRef: RefObject<PaginatedReaderHandle | null>;
  /** Bölüm değişince oynatma sıfırlansın diye. */
  chapterId: string | undefined;
  bookId: string | undefined;
  /** Kullanıcının seçtiği konuşma hızı (1.0 = platform varsayılanı). */
  rate: number;
  /** Kullanıcının seçtiği ses; yoksa cihazdaki en iyi ses kullanılır. */
  voiceId: string | null;
}

export interface ReaderTtsController {
  toggle: () => void;
  /**
   * Susturur ama KONUMU KORUR — tekrar başlatıldığında kalınan kelimeden
   * devam eder. Kelimeye dokunma gibi "bir saniye bak, sonra devam et"
   * durumları için.
   */
  pause: () => void;
  /** Susturur ve konumu SIFIRLAR. Bölüm değişimi ve ekrandan çıkış için. */
  stop: () => void;
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

/**
 * Bölüm seslendirmesi ve kelime kelime vurgu.
 *
 * NASIL ÇALIŞIYOR
 * ---------------
 * Sayfadaki her paragraf parçası ayrı bir konuşma birimi. Bir birim bitince
 * sıradaki konuşuluyor; sayfanın son birimi bitince sayfa ilerletilip
 * yenisinden devam ediliyor. Böylece ses her zaman ekranda DURAN metni
 * okuyor — paragrafın tamamı konuşulsaydı ses görünmeyen metne devam eder,
 * vurgu sayfa dışına taşardı.
 *
 * Vurgu, seslendiricinin `onBoundary` olayından geliyor: platform okumak
 * üzere olduğu kelimenin karakter konumunu bildiriyor (iOS
 * `willSpeakRangeOfSpeechString`, Android `onRangeStart`). O konum
 * `ttsPlan.findWordStart` ile ekrandaki token'a çevriliyor.
 *
 * NEDEN DÖNGÜ, ÖZYİNELEME DEĞİL
 * -----------------------------
 * Her birim bir söz (promise) olarak bekleniyor ve akış düz bir döngü.
 * Özyinelemeli bir `useCallback` hem SDK 57'nin react-hooks kuralına
 * takılıyor hem de "hangi çağrı hangi oturuma ait" sorusunu okumayı
 * zorlaştırıyordu.
 *
 * NEDEN DURAKLATMA `Speech.pause()` DEĞİL
 * ---------------------------------------
 * `Speech.pause()`/`resume()` platformlar arasında tutarsız (Android'de
 * motor bağımlı, bazılarında hiç desteklenmiyor). Bunun yerine duraklatma =
 * `stop()` + son okunan kelimeyi hatırlamak; devam etme = o kelimeden
 * itibaren metnin kalanını konuşmak. Her platformda aynı çalışıyor ve konum
 * kaybı olmuyor. Bedeli, o kelimenin baştan okunması — duyulmuyor.
 *
 * NEDEN OTURUM SAYACI (`sessionRef`)
 * ----------------------------------
 * `Speech.stop()` çağrıldıktan sonra bekleyen geri çağrılar hâlâ
 * tetiklenebiliyor. Sayaç olmadan durdurulmuş bir okuma sayfayı
 * ilerletmeye devam ederdi — kullanıcı durdurduğu hâlde kitabın kendi
 * kendine akması. Her başlatma sayacı artırıyor; eski oturumun geri
 * çağrıları sessizce düşüyor.
 */
export function useReaderTts({
  readerRef,
  chapterId,
  bookId,
  rate,
  voiceId,
}: UseReaderTtsOptions): ReaderTtsController {
  const status = useTtsStore((state) => state.status);
  const setStatus = useTtsStore((state) => state.setStatus);
  const setSpokenKey = useTtsStore((state) => state.setSpokenKey);
  const resetStore = useTtsStore((state) => state.reset);

  const sessionRef = useRef(0);
  /**
   * Duraklatıldığında nereden devam edileceği.
   *
   * Parça İNDEKSİ değil KİMLİĞİ saklanıyor (paragraf + parça başlangıcı):
   * kullanıcı duraklatıp sayfa çevirebiliyor ve o zaman "3. parça" başka
   * bir metne denk gelirdi. Kimlik saklandığında devam etmeden önce
   * eşleşme aranıyor; bulunamazsa görünen sayfanın başından başlanıyor.
   */
  const resumeRef = useRef<{
    paragraphId: string;
    segmentCharStart: number;
    charOffset: number;
  } | null>(null);
  const rateRef = useRef(rate);
  const voiceIdRef = useRef(voiceId);

  useEffect(() => {
    rateRef.current = rate;
    voiceIdRef.current = voiceId;
  }, [rate, voiceId]);

  const hardStop = useCallback(() => {
    sessionRef.current += 1;
    resumeRef.current = null;
    void Speech.stop();
    resetStore();
  }, [resetStore]);

  /** Tek bir parçayı konuşur ve nasıl bittiğini döndürür. */
  const speakSegment = useCallback(
    async (session: number, segment: SpeechSegment, charOffset: number): Promise<SpeechOutcome> => {
      const voice = await getVoiceIdentifier(voiceIdRef.current);
      if (session !== sessionRef.current) return "stopped";

      return new Promise<SpeechOutcome>((resolve) => {
        Speech.speak(segment.text.slice(charOffset), {
          language: "en-US",
          rate: rateRef.current,
          ...(voice ? { voice } : {}),
          onBoundary: (event: SpeechBoundaryEvent) => {
            if (session !== sessionRef.current) return;
            // `charIndex` kesilmiş metne göre geliyor; parça koordinatına
            // geri taşınıyor.
            const start = findWordStart(segment.words, event.charIndex + charOffset);
            // null ise vurgu OLDUĞU YERDE kalıyor — yanlış kelimeyi yakıp
            // söndürmektense bir olayı atlamak daha az rahatsız edici.
            if (start === null) return;
            resumeRef.current = {
              paragraphId: segment.paragraphId,
              segmentCharStart: segment.segmentCharStart,
              charOffset: start,
            };
            setSpokenKey(wordKey(segment.paragraphId, segment.segmentCharStart, start));
          },
          onDone: () => resolve("done"),
          onStopped: () => resolve("stopped"),
          onError: (error) => {
            trackError("tts.speak", error);
            resolve("error");
          },
        });
      });
    },
    [setSpokenKey],
  );

  const run = useCallback(
    async (session: number, startSegmentIndex: number, startCharOffset: number) => {
      let segments = readerRef.current?.getCurrentPageSpeech() ?? [];
      let segmentIndex = startSegmentIndex;
      let charOffset = startCharOffset;

      for (;;) {
        if (session !== sessionRef.current) return;

        const segment = segments[segmentIndex];

        if (!segment) {
          const advanced = readerRef.current?.advancePage() ?? false;
          if (!advanced) {
            // Bölümün son sayfasıydı. Susuyoruz ama bölüm sonu ekranını
            // AÇMIYORUZ — okuma yüzeyi kendi kendine ekran değiştirmez.
            trackEvent("tts_chapter_end", { bookId: bookId ?? "unknown" });
            hardStop();
            return;
          }

          // Sayfa geçişinin render'ı otursun; aksi hâlde yeni sayfanın
          // parçaları henüz hesaplanmamış olabiliyor.
          await delay(350);
          if (session !== sessionRef.current) return;

          segments = readerRef.current?.getCurrentPageSpeech() ?? [];
          segmentIndex = 0;
          charOffset = 0;
          continue;
        }

        const outcome = await speakSegment(session, segment, charOffset);
        if (session !== sessionRef.current) return;
        if (outcome !== "done") {
          if (outcome === "error") hardStop();
          return;
        }

        segmentIndex += 1;
        charOffset = 0;
      }
    },
    [bookId, hardStop, readerRef, speakSegment],
  );

  const start = useCallback(() => {
    const segments = readerRef.current?.getCurrentPageSpeech() ?? [];
    if (segments.length === 0) return;

    sessionRef.current += 1;
    const session = sessionRef.current;
    setStatus("speaking");

    // Kaydedilen konum hâlâ GÖRÜNEN sayfada mı — değilse baştan başla.
    const resume = resumeRef.current;
    const resumeIndex = resume
      ? segments.findIndex(
          (candidate) =>
            candidate.paragraphId === resume.paragraphId &&
            candidate.segmentCharStart === resume.segmentCharStart,
        )
      : -1;
    const canResume = resumeIndex >= 0 && resume !== null;

    trackEvent("tts_started", { bookId: bookId ?? "unknown", resumed: canResume });

    void run(session, canResume ? resumeIndex : 0, canResume && resume ? resume.charOffset : 0);
  }, [bookId, readerRef, run, setStatus]);

  const pause = useCallback(() => {
    // Oturumu geçersiz kıl ama `resumeRef`'i KORU — devam etme konumu bu.
    sessionRef.current += 1;
    void Speech.stop();
    setStatus("paused");
    trackEvent("tts_paused");
  }, [setStatus]);

  const toggle = useCallback(() => {
    if (status === "speaking") {
      pause();
      return;
    }
    start();
  }, [pause, start, status]);

  // Uygulama arka plana alınınca sustur. Arka planda ses çalmak
  // `UIBackgroundModes: audio` gerektiriyor; bu sürümde bilerek yok, o
  // yüzden sesin arka planda devam ETMEMESİ doğru davranış.
  useEffect(() => {
    const subscription = AppState.addEventListener("change", (next) => {
      if (next === "active") return;
      sessionRef.current += 1;
      void Speech.stop();
      setStatus("paused");
    });
    return () => subscription.remove();
  }, [setStatus]);

  // Bölüm değişince kaydedilen konum anlamını yitiriyor.
  useEffect(() => {
    hardStop();
  }, [chapterId, hardStop]);

  // Ekrandan çıkarken sustur — arkada konuşmaya devam eden bir reader
  // kullanıcının kapatamayacağı bir ses olurdu.
  useEffect(() => {
    return () => {
      sessionRef.current += 1;
      void Speech.stop();
      resetStore();
    };
  }, [resetStore]);

  return { toggle, pause, stop: hardStop };
}
