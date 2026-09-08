import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { StyleSheet, View } from "react-native";

import { BottomSheetModal } from "@gorhom/bottom-sheet";
import { useTranslation } from "react-i18next";

import { spacing } from "@/theme";
import { ErrorState, LoadingState } from "@/components/ui";
import { trackEvent } from "@/lib/analytics";
import { useChapterQuery } from "@/features/reader/api/useChapterQuery";
import { usePrefetchNextChapter } from "@/features/reader/api/usePrefetchNextChapter";
import { useReadingSession } from "@/features/reader/api/useReadingSession";
import {
  useInitialReadingProgress,
  useReadingProgressMutation,
} from "@/features/reader/api/useReadingProgressMutation";
import { useBookLemmaDictionary } from "@/features/reader/api/useBookLemmaDictionary";
import { useUserLemmaStatesForBook } from "@/features/reader/api/useUserLemmaStatesForBook";
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
import { useReaderSettings } from "@/features/reader/hooks/useReaderSettings";
import { useReaderThemeColors } from "@/features/reader/hooks/useReaderThemeColors";
import { ReaderHeader } from "@/features/reader/components/ReaderHeader";
import { useReaderTts } from "@/features/reader/tts/useReaderTts";
import { useChapterAudio } from "@/features/reader/tts/useChapterAudio";
import { useTtsStore } from "@/features/reader/tts/useTtsStore";
import { ReaderFooter } from "@/features/reader/components/ReaderFooter";
import { PaginatedReaderView } from "@/features/reader/components/PaginatedReaderView";
import { WordSheet } from "@/features/reader/components/WordSheet";
import { SentenceSheet } from "@/features/reader/components/SentenceSheet";
import { ReaderSettingsSheet } from "@/features/reader/components/ReaderSettingsSheet";
import { ChapterCompleteCard } from "@/features/reader/components/ChapterCompleteCard";

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
  const lemmasForBook = useMemo(
    () => (lemmaDictionary ? Array.from(lemmaDictionary.keys()) : []),
    [lemmaDictionary],
  );
  const {
    data: unknownLemmas,
    isLoading: isUnknownLemmasLoading,
    isError: isUnknownLemmasError,
    refetch: refetchUnknownLemmas,
  } = useUserLemmaStatesForBook(lemmasForBook);

  const { data: savedLemmasData } = useSavedLemmas();
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
  const [chapterEnded, setChapterEnded] = useState(false);

  /**
   * Sesli okuma. Sayfalama ve ölçülen kap boyutu `PaginatedReaderView`'ın
   * içinde yaşadığı için okuma-konuşma köprüsü bir ref üzerinden kuruluyor
   * (bkz. `PaginatedReaderHandle`).
   */
  const readerRef = useRef<PaginatedReaderHandle | null>(null);
  const isSpeaking = useTtsStore((state) => state.status === "speaking");

  /**
   * Sesli okumanın İKİ sürücüsü var ve hangisinin kullanılacağı bölümde
   * hazır ses olup olmadığına bağlı:
   *
   *  - `useChapterAudio` — önceden üretilmiş Google TTS sesi ve sunucudan
   *    gelen kelime zaman damgaları. Yalnızca özgün hikâyelerde var
   *    (bkz. `pipeline/scripts/generate_audio.py`).
   *  - `useReaderTts` — cihazın kendi konuşma motoru (ADR-011). Her kitapta
   *    çalışır, klasiklerin tek seçeneği.
   *
   * İkisi de her render'da çağrılıyor çünkü hook'lar koşullu olamaz;
   * `enabled` bayrağı pasif olanın ortak vurgu deposuna dokunmasını
   * engelliyor. Dışarıya tek bir denetleyici veriliyor, arayüz aynı —
   * `ReaderHeader` hangi kaynağın çaldığını bilmiyor ve bilmesi gerekmiyor.
   */
  const hasCloudAudio = Boolean(chapter?.audioUrl && chapter?.audioTimingsUrl);

  const cloudAudio = useChapterAudio({
    readerRef,
    chapter,
    rate: settings.speechRate,
    enabled: hasCloudAudio,
  });

  const deviceTts = useReaderTts({
    readerRef,
    chapterId: hasCloudAudio ? undefined : chapter?.id,
    bookId: chapter?.bookId,
    rate: settings.speechRate,
    voiceId: settings.speechVoiceId,
  });

  const tts = hasCloudAudio ? cloudAudio : deviceTts;
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

  const wordSheetRef = useRef<BottomSheetModal>(null);
  const sentenceSheetRef = useRef<BottomSheetModal>(null);
  const settingsSheetRef = useRef<BottomSheetModal>(null);
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
      // etmemeli. Konum korunuyor, sözlükten dönünce kalınan yerden devam
      // ediyor.
      pauseSpeech();

      setActiveWord({
        surface: payload.surface,
        lemma: payload.lemma,
        sentenceText: payload.sentenceText,
        paragraphId: payload.paragraphId ?? "",
        sentenceCharOffset: payload.sentenceCharOffset,
      });
      wordSheetRef.current?.present();
    },
    [pauseSpeech],
  );

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
  if (isLemmaDictionaryError || isUnknownLemmasError) {
    return (
      <View style={[styles.centered, { backgroundColor: readerColors.background }]}>
        <ErrorState
          message={t("reader.error.loadFailed")}
          onRetry={() => {
            void refetchLemmaDictionary();
            void refetchUnknownLemmas();
          }}
        />
      </View>
    );
  }

  // Block PaginatedReaderView until the book's lemma dictionary and the
  // user's per-lemma "unknown" set have both resolved. Rendering it earlier
  // would tokenize/underline words against an empty dictionary and empty
  // unknown-set, then require a full repagination once real data arrives —
  // worse for the user than a slightly longer initial spinner.
  const isVocabDataLoading =
    isLemmaDictionaryLoading || isUnknownLemmasLoading || !lemmaDictionary || !unknownLemmas;

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
        isUnknownLemmasLoading,
        hasLemmaDictionary: !!lemmaDictionary,
        hasUnknownLemmas: !!unknownLemmas,
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
        title={chapter.title ?? ""}
        onBack={onBack}
        onOpenSettings={() => settingsSheetRef.current?.present()}
        onToggleSpeech={tts.toggle}
        isSpeaking={isSpeaking}
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
          savedLemmas={savedLemmasData ?? new Set<string>()}
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

      <ReaderFooter
        progress={progress}
        onLastPage={pageProgress.totalPages > 0 && pageProgress.page >= pageProgress.totalPages - 1}
        hasNextChapter={chapter.nextChapterId !== null}
        onFinishChapter={handleChapterEnd}
      />

      <WordSheet
        ref={wordSheetRef}
        word={activeWord}
        lemmaDictionary={lemmaDictionary}
        lemmaState={getLemmaState(activeWord?.lemma ?? null)}
        onSave={handleSaveWord}
        onUnsave={handleUnsaveWord}
        onMarkKnown={handleMarkKnown}
        onUnmarkKnown={handleUnmarkKnown}
        onDismiss={() => setActiveWord(null)}
      />
      <SentenceSheet
        ref={sentenceSheetRef}
        sentence={activeSentence}
        onDismiss={() => setActiveSentence(null)}
      />
      <ReaderSettingsSheet ref={settingsSheetRef} />
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
