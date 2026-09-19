import { useCallback, useEffect, useRef, useState } from "react";
import { StyleSheet, View } from "react-native";

import { BottomSheetModal } from "@gorhom/bottom-sheet";
import { useTranslation } from "react-i18next";

import { spacing } from "@/theme";
import { ErrorState, LoadingState } from "@/components/ui";
import { router } from "expo-router";

import { trackEvent, trackError } from "@/lib/analytics";
import { useChapterQuery } from "@/features/reader/api/useChapterQuery";
import { usePrefetchNextChapter } from "@/features/reader/api/usePrefetchNextChapter";
import { useReadingSession } from "@/features/reader/api/useReadingSession";
import {
  useInitialReadingProgress,
  useReadingProgressMutation,
} from "@/features/reader/api/useReadingProgressMutation";
import { useBookLemmaDictionary } from "@/features/reader/api/useBookLemmaDictionary";
import {
  useSavedLemmas,
  useSaveWordMutation,
  useUnsaveWordMutation,
  useMarkLemmaKnownMutation,
  useUnmarkKnownMutation,
  useLemmaState,
  flushPendingWordActionsQueue,
} from "@/features/reader/api/useSavedWordsQuery";
import { useReaderPosition } from "@/features/reader/hooks/useReaderPosition";
import { useSavedLemmasStore } from "@/features/reader/hooks/useSavedLemmasStore";
import { useReaderSettings } from "@/features/reader/hooks/useReaderSettings";
import { useReaderThemeColors } from "@/features/reader/hooks/useReaderThemeColors";
import { ReaderHeader } from "@/features/reader/components/ReaderHeader";
import { useChapterAudio } from "@/features/reader/tts/useChapterAudio";
import { useTtsStore } from "@/features/reader/tts/useTtsStore";
import { ReaderAudioBar } from "@/features/reader/components/ReaderAudioBar";
import { ReaderFooter } from "@/features/reader/components/ReaderFooter";
import { PaginatedReaderView } from "@/features/reader/components/PaginatedReaderView";
import { WordSheet } from "@/features/reader/components/WordSheet";
import { SentenceSheet } from "@/features/reader/components/SentenceSheet";
import { ReaderSettingsSheet } from "@/features/reader/components/ReaderSettingsSheet";
import { ChapterListSheet } from "@/features/reader/components/ChapterListSheet";
import { BookWordsSheet } from "@/features/reader/components/BookWordsSheet";
import { ChapterCompleteCard } from "@/features/reader/components/ChapterCompleteCard";
import {
  useConsumeWordLookupMutation,
  useWordLookupQuotaQuery,
} from "@/features/reader/api/useWordLookupQuota";

import type {
  PaginatedPageChangePayload,
  PaginatedPagesReadyPayload,
} from "@/features/reader/components/PaginatedReaderView";
import type { PaginatedReaderHandle } from "@/features/reader/components/PaginatedReaderView";
import type { ReaderWordTapPayload } from "@/features/reader/types";
import type { WordSheetWord } from "@/features/reader/components/WordSheet";
import type { SentenceSheetSentence } from "@/features/reader/components/SentenceSheet";

interface ReaderScreenProps {
  chapterId: string;
  onBack: () => void;
  onOpenChapter: (chapterId: string) => void;
  /** Kitabın son bölümü bitti — kutlama ekranına geçiş (reader'ın dışı). */
  onFinishBook: (bookId: string) => void;
  /**
   * Kitap detayındaki "Dinle" düğmesiyle gelindi — seslendirme kendiliğinden
   * başlasın. Yalnızca AÇILIŞTA bir kez; kullanıcı duraklattığında yeniden
   * başlatmıyor.
   */
  autoStartSpeech?: boolean;
}

/**
 * `pos` is free text on `lemmas`/`lemma_canonical` (no CHECK constraint —
 * see supabase/migrations/20260806071732_013_lemma_canonical_pos_view.sql's
 * `case pos ... else 8 end` catch-all bucket), so "other" is a value the
 * pipeline itself already treats as a legitimate bucket, not an invented one.
 */
const FALLBACK_POS = "other";

export function ReaderScreen({
  chapterId,
  onBack,
  onOpenChapter,
  onFinishBook,
  autoStartSpeech = false,
}: ReaderScreenProps) {
  const { t } = useTranslation();
  const readerColors = useReaderThemeColors();
  const settings = useReaderSettings();

  const { data: chapter, isLoading, isError, refetch } = useChapterQuery(chapterId);
  usePrefetchNextChapter(chapter?.nextChapterId ?? null);

  // Okuma süresini ölç ve sunucuya yaz — profil istatistiklerinin kaynağı.
  useReadingSession(chapter?.bookId ?? null);

  const bookId = chapter?.bookId ?? "";
  const {
    data: lemmaDictionary,
    isLoading: isLemmaDictionaryLoading,
    isError: isLemmaDictionaryError,
    refetch: refetchLemmaDictionary,
  } = useBookLemmaDictionary(bookId);
  /**
   * KALDIRILDI (2026-09-19 performans denetimi): burada
   * `useUserLemmaStatesForBook(lemmasForBook)` vardı ve ilk sayfanın
   * çizilmesi ONA BLOKLANIYORDU. O hook kitabın lemma listesini 200'lük
   * parçalara bölüp paralel istek atıyor; klasiklerde kitap 5.000+ lemma
   * taşıdığı için bölüm açılışı 25-28 EŞZAMANLI isteğin dönmesini
   * bekliyordu.
   *
   * Ve sonucu HİÇBİR YER RENDER ETMİYORDU: `unknownLemmas` yalnızca
   * aşağıdaki yükleme kapısında ve bir telemetri alanında geçiyordu.
   * Kaydedilmiş kelime durumu artık Zustand store'undan okunuyor
   * (`useSavedLemmasStore`, `ReaderWord` kendi seçicisiyle bakıyor), yani
   * bu sorgunun kurulduğu "bilinmeyen kelimeyi vurgula" özelliği artık
   * yok. Geriye yalnızca bekleme kaldı: kullanıcı en uzun klasiklerde
   * saniyelerce spinner görüyordu, hiçbir şey kazanmadan.
   */

  const { data: savedLemmasData } = useSavedLemmas();
  // Prop olarak AŞAĞI GEÇİLMİYOR artık -- global Zustand store'a yazılıyor,
  // `ReaderWord` kendi seçicisiyle okuyor (bkz. useSavedLemmasStore'un doc
  // comment'i, performans denetimi 2026-09-16). Bu, bir kelime kaydetmenin
  // ekrandaki sayfaların tamamını yeniden tokenize etmesini engelliyor.
  useEffect(() => {
    if (savedLemmasData) useSavedLemmasStore.getState().setSavedLemmas(savedLemmasData);
  }, [savedLemmasData]);
  const getLemmaState = useLemmaState();
  const saveWordMutation = useSaveWordMutation();
  const unsaveWordMutation = useUnsaveWordMutation();
  const markKnownMutation = useMarkLemmaKnownMutation();
  const unmarkKnownMutation = useUnmarkKnownMutation();

  // Mirrors useReaderPosition.ts's flushPendingProgress-on-mount pattern:
  // replays any save/unsave/know/unknow actions queued while offline.
  useEffect(() => {
    void flushPendingWordActionsQueue();
  }, []);

  const { restorePosition, handlePositionUpdate } = useReaderPosition(bookId, chapterId, chapter);
  // Only used to gate initial-position readiness; useReaderPosition already
  // derives restorePosition from this query, so we don't duplicate the
  // paragraph_index -> paragraphId lookup here.
  useInitialReadingProgress(bookId, chapterId);
  // Used only for the immediate, non-debounced completion save in
  // handleChapterEnd below -- useReaderPosition's own debounced (1500ms)
  // saveReadingProgress call is for in-progress paragraph scrolling, and
  // shouldn't gate "chapter marked done" on that delay.
  const { mutate: saveProgressImmediately } = useReadingProgressMutation();

  const [pageProgress, setPageProgress] = useState({ page: 0, totalPages: 1 });
  /**
   * İlk sayfalama tamamlandı mı. `pageProgress.totalPages` bunun yerine
   * kullanılamıyor: başlangıç değeri 1, yani "hazır" ile "henüz ölçülmedi"
   * ayırt edilemiyor. Yalnızca otomatik başlatmayı bekletmek için var.
   */
  const [pagesReady, setPagesReady] = useState(false);
  const [chapterEnded, setChapterEnded] = useState(false);

  /**
   * Sesli okuma. Sayfalama ve ölçülen kap boyutu `PaginatedReaderView`'ın
   * içinde yaşadığı için okuma-konuşma köprüsü bir ref üzerinden kuruluyor
   * (bkz. `PaginatedReaderHandle`).
   */
  const readerRef = useRef<PaginatedReaderHandle | null>(null);
  const isSpeaking = useTtsStore((state) => state.status === "speaking");

  /**
   * Seslendirmenin TEK sürücüsü var: önceden üretilmiş stüdyo kaydı ve
   * sunucudan gelen kelime zaman damgaları (`useChapterAudio`).
   *
   * Cihaz üstü sürücü (`useReaderTts`, eski ADR-011) 2026-09-08'de
   * kaldırıldı: seslendirme artık istisnasız premium bir özellik ve
   * yalnızca stüdyo kaydı olan kitaplarda var.
   *
   * İKİ AYRI BAYRAK, ikisi de gerekli:
   *  - `hasStudioAudio` — bu bölüm için kayıt ÜRETİLMİŞ mi (klasiklerde yok).
   *  - `audio.available` — bu kullanıcı onu ÇALABİLİR mi (premium; karar
   *    sunucuda, imzalı bağlantıyla geliyor).
   *
   * İkisi de doğru değilse seslendirme düğmesi hiç GÖRÜNMÜYOR. Kilit
   * ikonu, "yükselt" düğmesi ya da herhangi bir premium promosyonu da yok
   * (Ürün İlkesi #1): reader satış yapmaz, teklif kitap detayında.
   */
  const hasStudioAudio = Boolean(chapter?.audioUrl && chapter?.audioTimingsUrl);

  const tts = useChapterAudio({
    readerRef,
    chapter,
    rate: settings.speechRate,
    enabled: hasStudioAudio,
    // "Dinle" ile gelindi ve sayfalama bitti — sürücü kendi hazır olduğu
    // anda başlatsın. Ne zaman hazır olduğuna KARAR VERMEK sürücünün işi:
    // imzalı bağlantı, zaman işaretleri ve yüklenmiş oynatıcı yalnızca
    // orada biliniyor. Bu ekran o üçünü bilmeye çalıştığında birini
    // atladı ve düğme sessizce çalışmadı.
    autoStart: autoStartSpeech && pagesReady,
  });

  const canPlayAudio = tts.available;

  // Üst çubuktaki turuncu "kalan kelime çevirisi hakkı" rozeti için.
  //
  // GEÇİCİ/YER TUTUCU (2026-09-14, ürün sahibinin talimatıyla): gerçek
  // kural "premium olmayan kullanıcının günde 15 KELİME çevirme hakkı
  // var" -- bu, `useAiSentenceQuotaQuery`'nin ölçtüğü CÜMLE çevirisi
  // kotasından (migration 029, günde 10/200) AYRI bir sayaç ve henüz
  // sunucu tarafında yok ("bu sistemi sonra yazarız" -- ürün sahibi).
  // Şimdilik yalnızca ücretsiz/premium ayrımı gerçek (`isPremium`),
  // sayının kendisi (15) sabit -- kelime çevirisi kullanım sayacı
  // kurulunca burası gerçek "kalan" değerini okuyacak şekilde
  // değiştirilecek.
  /**
   * Günlük kelime çevirisi kotası -- ARTIK GERÇEK (migration 038).
   *
   * Buradaki sayı daha önce koda gömülü sabit bir 15'ti ve hiçbir şeyi
   * saymıyordu: rozet her kullanıcıda 15 yazıyor, hiçbir zaman azalmıyor,
   * dolayısıyla paywall da hiç tetiklenmiyordu. Sayaç artık sunucuda
   * (`my_word_lookup_quota` / `consume_word_lookup`) -- istemcide saymak,
   * uygulamayı kapatıp açmakla sıfırlanabilen bir "sınır" demekti.
   *
   * Premium'da `remaining` null geliyor ve rozet HİÇ gösterilmiyor: sınırı
   * olmayan birine sayaç göstermek, olmayan bir sınırı ima etmek olurdu.
   */
  const wordQuota = useWordLookupQuotaQuery();
  const consumeWordLookup = useConsumeWordLookupMutation();
  /**
   * `mutateAsync` TanStack Query v5'te KİMLİĞİ DEĞİŞMEYEN tek parça.
   *
   * DENETİM BULGUSU (2026-09-19, performans): `handleWordTap`in bağımlılık
   * dizisinde `consumeWordLookup` NESNESİ vardı. v5 her render'da yeni bir
   * nesne döndürüyor (`return { ...result, mutate, mutateAsync }`), yani
   * `handleWordTap` hiçbir zaman sabitlenmiyordu. Zincir oradan
   * kopuyordu: `renderItem` -> RN'in `CellRenderer`'ı (bir PureComponent,
   * prop olarak `renderItem` alıyor) -> mount edilmiş HER sayfanın yeniden
   * render'ı -> `ReaderPage`in tokenizasyon memo'sunun bozulması, yani
   * sayfa başına ~600 kelimenin yeniden tokenize + lemmatize edilmesi ve
   * ~600 React elemanının yeniden kurulması.
   *
   * Bu, ses çalarken SANİYEDE İKİ KEZ oluyordu (expo-audio 500 ms'de bir
   * durum yayıyor ve o da bu ekranı yeniden render ediyor) ve her sayfa
   * çevirmede bir kez daha. Dinlerken takılmanın ve sayfa geçişindeki
   * tıkanmanın kaynağı buydu.
   *
   * `useReaderThemeColors` aynı sınıf hatayı ("her render'da taze nesne")
   * bir kez zaten belgelemişti; buradan geri sızmış.
   */
  const consumeWordLookupAsync = consumeWordLookup.mutateAsync;
  const wordQuotaRemaining = wordQuota.data?.remaining ?? null;

  // Kelimeye dokunulduğunda DURDURMAK değil DURAKLATMAK gerekiyor:
  // `stop` konumu sıfırlıyor, yani kullanıcı sözlüğe bakıp geri döndüğünde
  // seslendirme sayfanın başından başlıyordu.
  const pauseSpeech = tts.pause;

  /**
   * Bölümü BİTİRMEDEN çıkanları ölçmek için son durumun anlık kopyası.
   *
   * NEDEN REF: olay, bileşen sökülürken (unmount) atılıyor. Temizleme
   * fonksiyonu kendi kapanışındaki değerleri görür; state'i doğrudan
   * okusaydı her zaman ilk render'ın değerlerini (sayfa 0) yazardı.
   */
  const abandonRef = useRef({ page: 0, totalPages: 1, ended: false });

  // Ref render sirasinda DEGIL, effect icinde guncelleniyor: render
  // sirasinda ref yazmak React'in eszamanli render modunda tutarsiz
  // sonuc verebilir.
  useEffect(() => {
    abandonRef.current = {
      page: pageProgress.page,
      totalPages: pageProgress.totalPages,
      ended: chapterEnded,
    };
  }, [pageProgress.page, pageProgress.totalPages, chapterEnded]);

  const [activeWord, setActiveWord] = useState<WordSheetWord | null>(null);
  const [activeSentence, setActiveSentence] = useState<SentenceSheetSentence | null>(null);

  /** Sözlük kapanınca seslendirme kaldığı yerden sürsün mü. */
  const resumeAfterSheetRef = useRef(false);
  const sentenceSheetRef = useRef<BottomSheetModal>(null);
  const settingsSheetRef = useRef<BottomSheetModal>(null);
  const chapterListSheetRef = useRef<BottomSheetModal>(null);
  const bookWordsSheetRef = useRef<BottomSheetModal>(null);
  // Tracks whether this chapter view has already reached the reader branch
  // below, so the isVocabDataLoading check can tell a genuine regression
  // (loaded -> loading again, e.g. a query refetch flipping
  // isLemmaDictionaryLoading/isUnknownLemmasLoading back to true) apart from
  // the normal first-load path. This WebView-era guard's underlying concern
  // (vocab-data-loading gate flipping the screen back to a loading state)
  // still applies unchanged with native pagination, so it's kept, just
  // renamed off "webview". Kept as ongoing instrumentation, not tied to any
  // specific past bug hypothesis.
  const hasReachedReaderRef = useRef(false);

  // First-paint / reflow-latency instrumentation. Unlike the old WebView
  // path (where `onReady` fired once per HTML rebuild, driven by a
  // postMessage from inside the WebView), `PaginatedReaderView.onPagesReady`
  // fires every time a fresh `pages` array is produced -- both the very
  // first pagination pass for a chapter AND every later repagination caused
  // by a settings change. `firstPaintReportedRef` distinguishes the two
  // cases: the first call for a given chapter is "first paint", every call
  // after that is a "reflow".
  // SDK 57 ile gelen react-hooks/purity kurali render sirasindaki
  // performance.now() cagrisini isaretliyor. Burada olcum baslangicini
  // bilerek ilk render aninda aliyoruz (first-paint latency'nin tanimi bu);
  // effect'e tasimak olculen degeri anlamsizlastirirdi.
  // eslint-disable-next-line react-hooks/purity
  const chapterOpenedAtRef = useRef(performance.now());
  const firstPaintReportedRef = useRef(false);
  const reflowPendingSinceRef = useRef<number | null>(null);
  const isFirstSettingsEffectRef = useRef(true);

  // Reset per-chapter chrome/page/completion/instrumentation state whenever
  // the chapter identity changes (e.g. user taps "next chapter").
  // Bolum kimligi degistiginde per-chapter state'in sifirlanmasi kasitli;
  // alternatifi (key ile remount) reader'in pagination cache'ini de atardi.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPageProgress({ page: 0, totalPages: 1 });
    setChapterEnded(false);
    hasReachedReaderRef.current = false;
    chapterOpenedAtRef.current = performance.now();
    firstPaintReportedRef.current = false;
    reflowPendingSinceRef.current = null;
  }, [chapterId]);

  // Reflow-latency instrumentation: settings fields that force a
  // repagination (font/line-height/family/margin/highlights) mark a
  // "reflow pending since X" timestamp, consumed by handlePagesReady below.
  // Skipped on the very first mount so we don't report a bogus reflow for
  // the initial page load.
  useEffect(() => {
    if (isFirstSettingsEffectRef.current) {
      isFirstSettingsEffectRef.current = false;
      return;
    }
    reflowPendingSinceRef.current = performance.now();
  }, [
    settings.fontScale,
    settings.lineHeightScale,
    settings.fontFamily,
    settings.marginScale,
    settings.highlightsEnabled,
  ]);

  const handleWordTap = useCallback(
    (payload: ReaderWordTapPayload) => {
      // `reader_word_tap_latency` used to measure the WebView postMessage
      // round-trip (`payload.tapMs`, a WebView `performance.now()` timestamp,
      // vs. the RN-side receipt time) -- a real, meaningful gap of several
      // milliseconds. With native pagination, `onWordTap` fires synchronously
      // in the same JS call stack as the tap handler (see ReaderPage.tsx):
      // there is no round-trip left to measure, and the two timestamps would
      // always collapse to ~0ms (worse, `payload.tapMs` here is `Date.now()`
      // wall-clock while the receipt side used `performance.now()`'s
      // monotonic clock -- mismatched clocks that were never truly
      // comparable). Rather than keep emitting a metric that measures nothing
      // real, this instrumentation is intentionally dropped for the native
      // path.
      // Sesli okumayı DURAKLAT (durdurma değil). İki sebep: (1) WordSheet'in
      // telaffuz düğmesi aynı `expo-speech` motorunu kullanıyor, iki konuşma
      // çakışırdı; (2) kullanıcı bir kelimeye baktığında metin akmaya devam
      // etmemeli.
      //
      // SÖZLÜK KAPANINCA KENDİLİĞİNDEN DEVAM EDİYOR (kullanıcı isteği,
      // 2026-09-10): "kelimeye bakmak" okumayı bitirmek değil, ona bir
      // saniye ara vermek. Devam ettirmeyi kullanıcıya bıraktığımızda
      // dinleme akışı her kelimede kesiliyordu.
      //
      // Durum ref'te tutuluyor ki YALNIZCA çalarken dokunulduğunda geri
      // dönsün: kullanıcı sesi zaten kendisi duraklattıysa, bir kelimeye
      // bakması onu tekrar başlatmamalı. `getState()` ile okunuyor —
      // seçiciyle okumak bu geri çağrıyı her vurgu değişiminde yeniden
      // kurardı.
      resumeAfterSheetRef.current = useTtsStore.getState().status === "speaking";
      pauseSpeech();

      const openSheet = () =>
        setActiveWord({
          surface: payload.surface,
          lemma: payload.lemma,
          sentenceText: payload.sentenceText,
          paragraphId: payload.paragraphId ?? "",
          sentenceCharOffset: payload.sentenceCharOffset,
          anchorY: payload.anchorY,
        });

      /**
       * KOTA ÖNCE TÜKETİLİYOR, SÖZLÜK SONRA AÇILIYOR.
       *
       * Sıra önemli: sözlüğü açıp sonra "hakkın bitti" demek, kullanıcıya
       * karşılığı gösterip geri almak olurdu. Karar sunucudan geliyor
       * (`consume_word_lookup`), istemci yalnızca uyguluyor -- istemcide
       * karar vermek, sınırı istemciyi değiştirebilen herkes için
       * kaldırmak demekti.
       *
       * AĞ HATASINDA AÇIK KALIYOR: çağrı başarısız olursa sözlük yine
       * açılıyor ve hak DÜŞMÜYOR. Bir bağlantı kesintisinin okumayı
       * durdurması, bir kullanıcının birkaç bedava çeviri almasından çok
       * daha kötü.
       */
      void consumeWordLookupAsync()
        .then((result) => {
          if (result.allowed) {
            openSheet();
            return;
          }
          trackEvent("paywall_opened", { source: "word_quota_exhausted" });
          router.push("/paywall?source=word_quota");
        })
        .catch((error) => {
          trackError("reader.wordQuota", error);
          openSheet();
        });
    },
    [pauseSpeech, consumeWordLookupAsync],
  );

  /**
   * Sayaç rozetine dokunmak paywall'ı açıyor.
   *
   * Rozet zaten "kalan hakkın" demek; ona dokunan kullanıcı sınırı merak
   * ediyor demektir. Sınırın ne olduğunu ve nasıl kalkacağını anlatan tek
   * ekran paywall.
   */
  const handleOpenPaywallFromQuota = useCallback(() => {
    trackEvent("paywall_opened", { source: "word_quota_badge" });
    router.push("/paywall?source=word_quota_badge");
  }, []);

  const handleSentenceLongPress = useCallback(
    (payload: { sentenceText: string; paragraphId: string }) => {
      setActiveSentence({ text: payload.sentenceText });
      sentenceSheetRef.current?.present();
    },
    [],
  );

  const handlePageChange = useCallback((payload: PaginatedPageChangePayload) => {
    setPageProgress({ page: payload.page, totalPages: payload.totalPages });
  }, []);

  /**
   * "Bölümü yarıda bıraktı" olayı (Ö12, bkz.
   * docs/plans/2026-09-07-buyume-onerileri.md).
   *
   * NEDEN EN ÖNEMLİ EKSİK OLAY BUYDU: katalogda A2'den (ortalama 8 dakika)
   * doğrudan B1'e (ortalama 197 dakika) atlanıyor ve "kullanıcı orada
   * bırakıyor" hipotezi ürün kararlarının merkezinde. Ama bugüne kadar bu
   * bir İNANÇTI — ölçülmüş değildi. Bu olay onu sayıya çeviriyor.
   *
   * Kitabın seviyesi olaya BİLEREK gömülmüyor: `book_id` var, seviye
   * analizde `books.cefr_level` ile birleştirilerek alınır. Aynı veriyi
   * iki yerde tutmak, biri değiştiğinde sessizce yanlış rapor üretir.
   *
   * İlk sayfadan çıkanlar sayılmıyor (`page > 0` koşulu): kitabı yanlışlıkla
   * açıp hemen kapatmak bir "bırakma" değil, gürültü.
   */
  useEffect(() => {
    return () => {
      const { page, totalPages, ended } = abandonRef.current;
      if (ended || page <= 0 || totalPages <= 0) return;

      trackEvent("book_abandoned", {
        bookId,
        chapterId,
        page,
        totalPages,
        percent: Math.round(((page + 1) / totalPages) * 100),
      });
    };
  }, [bookId, chapterId]);

  const handleChapterEnd = useCallback(() => {
    // Chapter-completion analytics: also logs the page it fired at, which
    // is useful to sanity-check that chapterEnd only fires when the user
    // actually pages past the last page (a low page number here would
    // indicate a spurious/early trigger).
    trackEvent("reader_chapter_end_triggered", {
      chapterId,
      page: pageProgress.page,
      totalPages: pageProgress.totalPages,
    });
    setChapterEnded(true);

    // Persist completion immediately rather than relying on
    // useReaderPosition's 1500ms-debounced save -- if the user backs out to
    // the book detail screen right after finishing, that debounce may not
    // have fired yet and the chapter would still show as unread there.
    // Finishing the LAST chapter marks the whole book finished_at; finishing
    // any earlier chapter advances the stored position to the start of the
    // next chapter, which is what useBookDetailQuery's
    // `order_index < currentOrderIndex` check reads as "done".
    if (!bookId) return;
    if (chapter?.nextChapterId) {
      saveProgressImmediately({
        bookId,
        chapterId: chapter.nextChapterId,
        paragraphIndex: 0,
        percent: 0,
      });
    } else {
      const lastParagraphIndex =
        chapter?.paragraphs[chapter.paragraphs.length - 1]?.paragraphIndex ?? 0;
      saveProgressImmediately({
        bookId,
        chapterId,
        paragraphIndex: lastParagraphIndex,
        percent: 100,
        finished: true,
      });
    }
  }, [
    bookId,
    chapter,
    chapterId,
    pageProgress.page,
    pageProgress.totalPages,
    saveProgressImmediately,
  ]);

  const handlePagesReady = useCallback(
    (payload: PaginatedPagesReadyPayload) => {
      setPageProgress((previous) => ({ page: previous.page, totalPages: payload.totalPages }));
      setPagesReady(true);

      if (!firstPaintReportedRef.current) {
        firstPaintReportedRef.current = true;
        trackEvent("reader_chapter_first_paint", {
          chapterId,
          firstPaintMs: Math.round(performance.now() - chapterOpenedAtRef.current),
          totalPages: payload.totalPages,
        });
        return;
      }

      const pendingSince = reflowPendingSinceRef.current;
      if (pendingSince !== null) {
        trackEvent("reader_settings_reflow_latency", {
          ms: Math.round(performance.now() - pendingSince),
        });
        reflowPendingSinceRef.current = null;
      }
    },
    [chapterId],
  );

  const buildWordActionInput = useCallback(() => {
    if (!activeWord || !bookId) return null;
    const pos = lemmaDictionary?.get(activeWord.lemma)?.pos ?? FALLBACK_POS;
    return {
      lemma: activeWord.lemma,
      pos,
      surface: activeWord.surface,
      paragraphId: activeWord.paragraphId,
      contextText: activeWord.sentenceText,
      bookId,
    };
  }, [activeWord, bookId, lemmaDictionary]);

  const handleSaveWord = useCallback(() => {
    const input = buildWordActionInput();
    if (!input) return;
    saveWordMutation.mutate(input);
  }, [buildWordActionInput, saveWordMutation]);

  const handleUnsaveWord = useCallback(() => {
    const input = buildWordActionInput();
    if (!input) return;
    unsaveWordMutation.mutate(input);
  }, [buildWordActionInput, unsaveWordMutation]);

  const handleMarkKnown = useCallback(() => {
    const input = buildWordActionInput();
    if (!input) return;
    markKnownMutation.mutate(input);
  }, [buildWordActionInput, markKnownMutation]);

  const handleUnmarkKnown = useCallback(() => {
    const input = buildWordActionInput();
    if (!input) return;
    unmarkKnownMutation.mutate(input);
  }, [buildWordActionInput, unmarkKnownMutation]);

  if (isLoading) {
    return (
      <View style={[styles.centered, { backgroundColor: readerColors.background }]}>
        <LoadingState />
      </View>
    );
  }

  if (isError || !chapter) {
    return (
      <View style={[styles.centered, { backgroundColor: readerColors.background }]}>
        <ErrorState message={t("reader.error.loadFailed")} onRetry={() => void refetch()} />
      </View>
    );
  }

  // Without this, a lemma-dictionary/unknown-lemma-set fetch failure left
  // `isLoading` false (TanStack Query only reports `isLoading` during the
  // very first fetch attempt) but `data` permanently undefined — the
  // isVocabDataLoading check below would then stay true forever with no
  // error ever shown, i.e. the reader silently hangs on the spinner.
  if (isLemmaDictionaryError) {
    return (
      <View style={[styles.centered, { backgroundColor: readerColors.background }]}>
        <ErrorState
          message={t("reader.error.loadFailed")}
          onRetry={() => void refetchLemmaDictionary()}
        />
      </View>
    );
  }

  // Block PaginatedReaderView until the book's lemma dictionary and the
  // user's per-lemma "unknown" set have both resolved. Rendering it earlier
  // would tokenize/underline words against an empty dictionary and empty
  // unknown-set, then require a full repagination once real data arrives —
  // worse for the user than a slightly longer initial spinner.
  const isVocabDataLoading = isLemmaDictionaryLoading || !lemmaDictionary;

  // Regression guard: if the reader branch below was already reached once
  // for this chapter and we later fall BACK into this loading branch (e.g.
  // a query refetch flips isLemmaDictionaryLoading/isUnknownLemmasLoading
  // true again), LoadingState would replace the whole screen mid-read —
  // worth an event so a future occurrence is diagnosable instead of
  // reported only as "the reader went blank".
  if (isVocabDataLoading) {
    // Bilincli enstrumantasyon: reader'a ulasildiktan sonra loading'e geri
    // dusuldugunu yakalamak icin render sirasinda okunmasi gerekiyor.
    // eslint-disable-next-line react-hooks/refs
    if (hasReachedReaderRef.current) {
      trackEvent("reader_regressed_to_loading", {
        chapterId,
        isLemmaDictionaryLoading,
        hasLemmaDictionary: !!lemmaDictionary,
      });
    }
    return (
      <View style={[styles.centered, { backgroundColor: readerColors.background }]}>
        <LoadingState />
      </View>
    );
  }
  // Ustteki guard ile ayni amac.
  // eslint-disable-next-line react-hooks/refs
  hasReachedReaderRef.current = true;

  const progress =
    pageProgress.totalPages > 0 ? (pageProgress.page + 1) / pageProgress.totalPages : 0;

  return (
    <View style={[styles.container, { backgroundColor: readerColors.background }]}>
      {/* Şeritler her zaman görünür. Orta bölgeye dokunarak gizleme
          hareketi kaldırıldı — gerekçe PaginatedReaderView'daki
          `handleZonePress` yorumunda. */}
      <ReaderHeader
        onOpenChapterList={() => chapterListSheetRef.current?.present()}
        onOpenSettings={() => settingsSheetRef.current?.present()}
        onOpenBookWords={() => bookWordsSheetRef.current?.present()}
        onToggleSpeech={tts.toggle}
        isSpeaking={isSpeaking}
        canPlaySpeech={canPlayAudio}
        isPreparingSpeech={tts.isPreparing}
        wordQuotaRemaining={wordQuotaRemaining}
        onPressQuota={handleOpenPaywallFromQuota}
        onClose={onBack}
      />

      <View style={styles.readerWrap}>
        <PaginatedReaderView
          ref={readerRef}
          chapter={chapter}
          settings={{
            fontScale: settings.fontScale,
            lineHeightScale: settings.lineHeightScale,
            fontFamily: settings.fontFamily,
            marginScale: settings.marginScale,
          }}
          highlightsEnabled={settings.highlightsEnabled}
          restorePosition={restorePosition}
          onWordTap={handleWordTap}
          onSentenceLongPress={handleSentenceLongPress}
          onPageChange={handlePageChange}
          onChapterEnd={handleChapterEnd}
          onPositionUpdate={handlePositionUpdate}
          onPagesReady={handlePagesReady}
        />

        {chapterEnded ? (
          <View
            style={[styles.chapterCompleteOverlay, { backgroundColor: readerColors.background }]}
          >
            <ChapterCompleteCard
              sectionIndex={chapter.sectionIndex}
              chapterTitle={chapter.title}
              wordCount={chapter.wordCount}
              hasNextChapter={chapter.nextChapterId !== null}
              onNextChapter={() => {
                if (chapter.nextChapterId) onOpenChapter(chapter.nextChapterId);
              }}
              onBackToBook={onBack}
              onFinishBook={() => {
                if (chapter.bookId) onFinishBook(chapter.bookId);
              }}
            />
          </View>
        ) : null}
      </View>

      {/* Ses kontrol çubuğu YALNIZCA seslendirmesi olan ve erişimi açık
          kitaplarda. Kilitli bir çubuk göstermek okuma ekranına premium
          promosyonu sokmak olurdu (Ürün İlkesi #1, ADR-012). */}
      {canPlayAudio ? (
        <ReaderAudioBar
          isSpeaking={isSpeaking}
          isPreparing={tts.isPreparing}
          onToggle={tts.toggle}
          onSkipWord={tts.skipWord}
        />
      ) : null}

      <ReaderFooter
        progress={progress}
        onLastPage={pageProgress.totalPages > 0 && pageProgress.page >= pageProgress.totalPages - 1}
        hasNextChapter={chapter.nextChapterId !== null}
        onFinishChapter={handleChapterEnd}
      />

      <WordSheet
        word={activeWord}
        lemmaDictionary={lemmaDictionary}
        lemmaState={getLemmaState(activeWord?.lemma ?? null)}
        onSave={handleSaveWord}
        onUnsave={handleUnsaveWord}
        onMarkKnown={handleMarkKnown}
        onUnmarkKnown={handleUnmarkKnown}
        onSentenceQuotaExhausted={() => {
          trackEvent("paywall_opened", { source: "sentence_quota_exhausted" });
          router.push("/paywall?source=sentence_quota");
        }}
        onDismiss={() => {
          setActiveWord(null);
          if (!resumeAfterSheetRef.current) return;
          resumeAfterSheetRef.current = false;
          // `toggle` duraklamışken devam ettirir; konumu `resumePosition.ts`
          // koruyor, yani sayfanın başına dönmüyor.
          tts.toggle();
        }}
      />
      <SentenceSheet
        ref={sentenceSheetRef}
        sentence={activeSentence}
        onDismiss={() => setActiveSentence(null)}
      />
      <ReaderSettingsSheet ref={settingsSheetRef} />
      <ChapterListSheet
        ref={chapterListSheetRef}
        bookId={chapter.bookId}
        currentChapterId={chapterId}
        onSelectChapter={onOpenChapter}
      />
      <BookWordsSheet ref={bookWordsSheetRef} bookId={chapter.bookId} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  readerWrap: {
    flex: 1,
  },
  chapterCompleteOverlay: {
    ...StyleSheet.absoluteFill,
    paddingTop: spacing.xl,
  },
});
