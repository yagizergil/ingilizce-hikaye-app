import { useCallback, useEffect, useRef } from "react";

import { useAudioPlayer, useAudioPlayerStatus } from "expo-audio";
import { useQuery } from "@tanstack/react-query";
import { FunctionsHttpError } from "@supabase/supabase-js";

import { supabase } from "@/lib/supabase";
import { trackError, trackEvent } from "@/lib/analytics";
import { useTtsStore } from "@/features/reader/tts/useTtsStore";
import { isAwaitingAutoStart, shouldAutoStart } from "@/features/reader/tts/autoStartGate";
import { resumeSeekTarget } from "@/features/reader/tts/resumePosition";
import {
  findWordIndexAtTime,
  mapTimingsToPage,
  pageTurnTimeAfter,
  type ChapterAudioTimings,
  type TimedWord,
} from "@/features/reader/tts/chapterAudioTimings";

import type { RefObject } from "react";
import type { PaginatedReaderHandle } from "@/features/reader/components/PaginatedReaderView";
import type { ReaderChapter } from "@/features/reader/types";

/**
 * Bulut sürücüsünün denetleyicisi + gerçekten kullanılabilir olup olmadığı.
 *
 * NEDEN `available` DIŞARI ÇIKIYOR: erişim kararı ASENKRON (imzalı bağlantı
 * sunucudan geliyor) ama hangi sürücünün aktif olduğuna ReaderScreen her
 * render'da senkron karar vermek zorunda. Bu bayrak olmadan, erişimi
 * olmayan kullanıcıda bulut sürücüsü seçilir ve sesli okuma düğmesi hiçbir
 * şey yapmazdı — oysa doğru davranış cihaz sesine düşmek.
 */
/**
 * Seslendirme denetleyicisinin arayüzü.
 *
 * Eskiden bunu cihaz sürücüsü (`useReaderTts`) tanımlıyor, bulut sürücüsü
 * ondan türetiyordu. Cihaz üstü bölüm seslendirmesi kaldırılınca (bkz.
 * CLAUDE.md, ADR-011 iptali) geriye tek sürücü kaldı ve arayüz buraya
 * taşındı.
 */
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
  /**
   * Bir KELİME ileri (+1) ya da geri (-1) atlar.
   *
   * NEDEN SANİYE DEĞİL KELİME: alt çubuktaki iki ok, "15 saniye geri"
   * gibi bir ses oynatıcısı hareketi değil -- kullanıcı bir kelimeyi
   * kaçırdığında ya da tekrar duymak istediğinde basıyor. Zaman
   * işaretleri zaten kelime kelime elimizde (`chapterAudioTimings`), yani
   * doğru birim kelime. Sabit bir saniye adımı, hızlı konuşulan bir yerde
   * üç kelime atlar, yavaş bir yerde aynı kelimede kalırdı.
   */
  skipWord: (delta: number) => void;
}

export interface ChapterAudioController extends ReaderTtsController {
  available: boolean;
  /**
   * "Dinle" ile gelindi, henüz çalmaya başlamadı.
   *
   * NEDEN DIŞARI ÇIKIYOR: imzalı bağlantı + zaman işaretleri + ses
   * dosyasının yüklenmesi birkaç saniye sürebiliyor. Bu aralıkta ekranda
   * hiçbir işaret olmazsa kullanıcı için sonuç "düğmeye bastım, hiçbir şey
   * olmadı" oluyor — arıza ile bekleme ayırt edilemiyor.
   */
  isPreparing: boolean;
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
   * Kullanıcı "Dinle" ile geldi ve ekran hazır — sürücü hazır olur olmaz
   * BİR KEZ başlasın.
   *
   * NEDEN KARAR BURADA, ReaderScreen'de DEĞİL: "hazır" olmanın ne demek
   * olduğunu (imzalı bağlantı + zaman işaretleri + yüklenmiş oynatıcı)
   * yalnızca bu hook biliyor. Dışarıdan tetiklemek, o üç durumun hepsini
   * ekrana sızdırmak ve birini unutmak demekti — nitekim unutuldu.
   */
  autoStart?: boolean;
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
 * Hazır bir ses dosyası çalıyor ve vurguyu sunucudan gelen zaman
 * damgalarından sürüyor. Seslendirmenin TEK sürücüsü bu (ADR-012); cihaz
 * üstü sürücü 2026-09-08'de kaldırıldı.
 *
 * `enabled` false ise (klasiklerin tamamı — stüdyo kaydı yok) hook hiçbir
 * ağ isteği yapmıyor ve ortak vurgu deposuna dokunmuyor.
 */
export function useChapterAudio({
  readerRef,
  chapter,
  rate,
  enabled,
  autoStart = false,
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
    // Yalnızca GEÇİCİ hatalar buraya kadar geliyor (aşağıya bak); onlar da
    // gerçekten tekrar denemeye değer.
    retry: 2,
    queryFn: async () => {
      if (!chapter?.id) return null;
      const { data, error } = await supabase.functions.invoke<SignedAudio>("chapter-audio", {
        body: { sectionId: chapter.id },
      });
      if (error) {
        const status = error instanceof FunctionsHttpError ? error.context?.status : undefined;

        // 403 (kilitli) ve 404 (bu bölümde stüdyo sesi yok) bir KARAR,
        // arıza değil. Tekrar denemek aynı cevabı getirir; null dönüp
        // sessizce cihaz sesine düşüyoruz.
        if (status === 403 || status === 404) return null;

        // Geri kalan her şey GEÇİCİ: ağ kesintisi, 5xx, imzalama hatası.
        // Bunları da null'a çevirmek, ödeyen bir kullanıcıyı tek bir ağ
        // dalgalanması yüzünden o bölüm boyunca cihaz sesine düşürür ve
        // sebebi hiçbir yerde görünmezdi. Fırlatmak yeniden denemeyi
        // açıyor; denemeler de tükenirse sonuç yine cihaz sesi — yani en
        // kötü durum eskisiyle aynı, iyi durum daha iyi.
        trackError("chapterAudio.sign", error);
        throw error;
      }
      return data ?? null;
    },
  });

  const signed = signedQuery.data ?? null;
  const available = enabled && signed !== null;

  const player = useAudioPlayer(signed?.audioUrl ?? undefined);
  // Oynatıcının `isLoaded` alanı düz bir özellik: okumak render'ı
  // tetiklemiyor. Otomatik başlatma tam olarak o anı beklediği için
  // REAKTİF durum gerekiyor.
  const playerStatus = useAudioPlayerStatus(player);

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
  /** Sayfanın çevrileceği an; bölümün son sayfasındaysak null. */
  const pageTurnAtRef = useRef<number | null>(null);
  const lastKeyRef = useRef<string | null>(null);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);

  /**
   * Duraklatılmışken art arda basışlarda `player.currentTime` `seekTo`dan
   * hemen sonra güncellenmiyor (asenkron); ikinci basış eski zamandan
   * hesaplanıp aynı kelimeye düşüyordu. Son atlanan zaman burada tutuluyor
   * ve yalnızca ses ÇALMIYORKEN kullanılıyor.
   */
  const lastSkipTimeRef = useRef<number | null>(null);

  const paragraphIndexById = useRef<Map<string, number>>(new Map());
  useEffect(() => {
    paragraphIndexById.current = new Map(
      (chapter?.paragraphs ?? []).map((p) => [p.id, p.paragraphIndex]),
    );
  }, [chapter?.paragraphs]);

  const recomputePageWords = useCallback(() => {
    const segments = readerRef.current?.getCurrentPageSpeech() ?? [];
    const timings = timingsQuery.data?.words ?? [];
    const words = mapTimingsToPage(timings, segments, paragraphIndexById.current);
    pageWordsRef.current = words;

    const last = words[words.length - 1];
    pageTurnAtRef.current = last ? pageTurnTimeAfter(timings, last.time) : null;
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
    lastSkipTimeRef.current = null;
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

    // Ses bir sonraki sayfanın ilk kelimesine geldiyse sayfayı çevir. Ses
    // bölümün tamamını kesintisiz çalıyor; ekranın ona yetişmesi gerekiyor.
    // Eşik `pageTurnTimeAfter` ile hesaplanıyor — sabit bir gecikme değil,
    // o kelimenin gerçek başlangıç zamanı.
    const turnAt = pageTurnAtRef.current;
    if (turnAt !== null && time >= turnAt) {
      const advanced = readerRef.current?.advancePage() ?? false;
      if (advanced) {
        recomputePageWords();
      } else {
        // Son sayfadayız; bir daha denemeyelim.
        pageTurnAtRef.current = null;
      }
    }

    // Ses bitti.
    if (!player.playing && player.currentTime > 0 && player.duration > 0) {
      if (player.currentTime >= player.duration - 0.25) {
        hardStop();
      }
    }
  }, [hardStop, player, readerRef, recomputePageWords, setSpokenKey]);

  /**
   * Kelime kelime atlama.
   *
   * Konum BÖLÜMÜN TAMAMI üzerinden hesaplanıyor (sayfaya ait alt küme
   * değil): sayfanın ilk kelimesindeyken geri basan kullanıcı bir önceki
   * sayfanın son kelimesine gitmeli, sayfa sınırında takılıp kalmamalı.
   * Sayfa vurgusu bir sonraki tick'te kendiliğinden düzeliyor.
   *
   * Çalmıyorken de çalışıyor: duraklatıp okuduğu yeri geri almak isteyen
   * kullanıcı için ok tuşları, oynat düğmesine basmayı gerektirmemeli.
   */
  const idByParagraphIndex = useRef<Map<number, string>>(new Map());
  useEffect(() => {
    idByParagraphIndex.current = new Map(
      (chapter?.paragraphs ?? []).map((p) => [p.paragraphIndex, p.id]),
    );
  }, [chapter?.paragraphs]);

  const skipWord = useCallback(
    (delta: number) => {
      const timings = timingsQuery.data?.words ?? [];
      if (timings.length === 0) return;

      const baseTime =
        !player.playing && lastSkipTimeRef.current !== null
          ? lastSkipTimeRef.current
          : player.currentTime;

      const current = findWordIndexAtTime(
        timings.map((word) => ({ key: "", time: word.t })),
        baseTime,
      );

      // Hiç başlamamışsa (-1) ileri = ilk kelime, geri = başa dön.
      const next = Math.min(Math.max(current + delta, 0), timings.length - 1);
      const target = timings[next];
      if (target === undefined) return;

      try {
        void player.seekTo(target.t);
      } catch (error) {
        trackError("chapterAudio.skipWord", error);
        return;
      }
      lastSkipTimeRef.current = target.t;

      // Hedef kelime başka bir sayfadaysa önce oraya geç: bölümün tamamı
      // üzerinden atlıyoruz, yani sayfa sınırını geçebiliyoruz.
      const paragraphId = idByParagraphIndex.current.get(target.p);
      if (paragraphId) readerRef.current?.showPosition(paragraphId, target.s);

      recomputePageWords();

      // KULLANICI BULGUSU (2026-09-26): duraklatılmışken oklar sesi
      // kaydırıyor ama vurgu yerinde kalıyordu -- vurguyu yalnızca `tick`
      // güncelliyor ve duraklatınca tick duruyor. Vurgu burada, atlanan
      // kelimeye doğrudan taşınıyor.
      const words = pageWordsRef.current;
      const index = findWordIndexAtTime(words, target.t);
      const word = index >= 0 ? words[index] : undefined;
      if (word) {
        lastKeyRef.current = word.key;
        setSpokenKey(word.key);
      }
      trackEvent("reader_audio_word_skipped", { delta });
    },
    [player, readerRef, recomputePageWords, setSpokenKey, timingsQuery.data],
  );

  const toggle = useCallback(() => {
    if (status === "speaking") {
      pause();
      return;
    }

    if (!available) return;

    lastSkipTimeRef.current = null;
    recomputePageWords();

    // Ses ekranda duran sayfada değilse oraya taşınıyor; aynı sayfadaysa
    // OLDUĞU YERDE bırakılıyor. Kural ve neden mesafeye değil kapsamaya
    // baktığı `resumePosition.ts` içinde ve testli.
    const first = pageWordsRef.current[0];
    if (first) {
      const target = resumeSeekTarget({
        currentTime: player.currentTime,
        pageStartTime: first.time,
        pageEndTime: pageTurnAtRef.current,
      });
      if (target !== null) void player.seekTo(target);
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
    // Stüdyo kaydı olmayan kitapta ortak vurgu deposuna hiç dokunma.
    if (!enabled) return;
    hardStop();
    // Yalnızca bölüm kimliği değişince sıfırla.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chapter?.id, enabled]);

  /**
   * "Dinle" ile gelindiğinde seslendirmeyi bir kez kendiliğinden başlatır.
   *
   * BU EFEKT EN SONDA DURUYOR ve bu bilinçli: yukarıdaki efekt bölüm
   * değişiminde `hardStop()` çağırıyor. Efektler tanımlanma sırasına göre
   * çalıştığı için, ikisinin aynı commit'te tetiklendiği durumda önce
   * durdurma sonra başlatma oluyor. Ters sırada olsaydı otomatik başlatma
   * hemen ardından susturulurdu.
   *
   * Koşullar `autoStartGate.ts` içinde ve testli — hangi koşulun neden
   * gerekli olduğu orada yazılı.
   */
  const autoStartedRef = useRef(false);

  // Ref YOK: bu nesne render sırasında kuruluyor ve `isAwaitingAutoStart`
  // ona bakıyor. "Bir kez başlatıldı mı" bilgisi yalnızca efektin içinde,
  // ref'ten okunuyor.
  const readiness = {
    requested: autoStart,
    available,
    timingsReady: timingsQuery.isSuccess,
    playerLoaded: playerStatus.isLoaded,
  };

  useEffect(() => {
    if (!shouldAutoStart(readiness, autoStartedRef.current)) return;
    autoStartedRef.current = true;
    toggle();
    // `readiness` her render'da yeni bir nesne; bağımlılık olarak alanları
    // veriliyor.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoStart, available, timingsQuery.isSuccess, playerStatus.isLoaded, toggle]);

  // Bekleme göstergesi: istendi ama makine henüz hazır değil.
  const isPreparing = isAwaitingAutoStart(readiness);

  return { toggle, pause, stop: hardStop, skipWord, available, isPreparing };
}
