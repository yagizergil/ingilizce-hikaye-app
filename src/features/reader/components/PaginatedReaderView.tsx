import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { FlatList, Pressable, StyleSheet, View } from "react-native";

import { getReadingTypeScale } from "@/theme";
import { getPagePadding, useChapterPagination } from "@/features/reader/hooks/useChapterPagination";
import { ReaderPage } from "@/features/reader/components/ReaderPage";
import { buildPageSpeech } from "@/features/reader/tts/ttsPlan";

import type { ReactElement } from "react";
import type { LayoutChangeEvent, NativeScrollEvent, NativeSyntheticEvent } from "react-native";
import type { Page } from "@/features/reader/pagination/types";
import type { SpeechSegment } from "@/features/reader/tts/ttsPlan";
import type { ReaderChapter, ReaderSettings } from "@/features/reader/types";
import type { ReaderWordTapPayload } from "@/features/reader/types";

/**
 * PROP-SHAPE DECISION: mirrors how `ReaderScreen.tsx` splits responsibility
 * with `ReaderWebView.tsx` today (deliberately NOT re-architected here,
 * per the task's "do not modify ReaderScreen.tsx" constraint -- this is
 * shape-mirroring only, this component is not wired into ReaderScreen in
 * this change).
 *
 * `ReaderWebView` does NOT receive pre-paginated content -- it receives
 * `chapter` + `settings` + lemma sets + callbacks, and builds its own HTML
 * (i.e. does its own "layout") internally via `buildReaderHtml` inside a
 * `useMemo`. `ReaderScreen` owns data-fetching (chapter query, lemma
 * dictionary, saved words), position persistence (`useReaderPosition`), and
 * screen-level UI state (chrome visibility, page/progress display,
 * chapter-complete overlay) -- it never touches WebView-internal concerns
 * like DOM construction or touch-zone math.
 *
 * `PaginatedReaderView` follows the exact same split: it receives `chapter`
 * + `settings` + lemma sets + callbacks (the same inputs `ReaderWebView`
 * takes, replacing the WebView-specific `pageTransitionMs`-only settings
 * slice with the couple of extra fields native pagination needs) and calls
 * `useChapterPagination` ITSELF internally, exactly like `ReaderWebView`
 * calls `buildReaderHtml` itself -- the caller (a future ReaderScreen
 * integration) never sees `Page[]` or pagination internals, same as it
 * never sees WebView HTML today.
 */
export interface PaginatedReaderViewSettings {
  fontScale: ReaderSettings["fontScale"];
  lineHeightScale: ReaderSettings["lineHeightScale"];
  fontFamily: ReaderSettings["fontFamily"];
  marginScale: ReaderSettings["marginScale"];
}

export interface PaginatedReaderRestorePosition {
  paragraphId: string;
  charOffset: number;
}

export interface PaginatedPageChangePayload {
  page: number;
  totalPages: number;
}

export interface PaginatedPositionUpdatePayload {
  paragraphId: string;
  charOffset: number;
  percent: number;
}

export interface PaginatedPagesReadyPayload {
  totalPages: number;
}

/**
 * Sesli okumanın ihtiyaç duyduğu iki iş.
 *
 * NEDEN IMPERATIVE BIR API: sayfalama (`useChapterPagination`) ve ölçülen
 * kap boyutu bu bileşenin İÇİNDE yaşıyor; `pages` dışarı sızdırılsaydı
 * ReaderScreen'in de aynı hesabı yapması ya da bu bileşenin iç yapısını
 * bilmesi gerekirdi. Bunun yerine dışarıya yalnızca iki fiil veriliyor:
 * "şu anki sayfanın konuşulacak parçalarını ver" ve "bir sayfa ilerle".
 */
export interface PaginatedReaderHandle {
  /** Görünen sayfanın konuşma parçaları; sayfa hazır değilse boş dizi. */
  getCurrentPageSpeech: () => SpeechSegment[];
  /** Bir sonraki sayfaya geçer. Son sayfadaysa `false` döner. */
  advancePage: () => boolean;
}

interface PaginatedReaderViewProps {
  chapter: ReaderChapter;
  settings: PaginatedReaderViewSettings;
  highlightsEnabled: boolean;
  restorePosition: PaginatedReaderRestorePosition | null;
  onWordTap: (payload: ReaderWordTapPayload) => void;
  onSentenceLongPress: (payload: { sentenceText: string; paragraphId: string }) => void;
  onPageChange: (payload: PaginatedPageChangePayload) => void;
  onPositionUpdate: (payload: PaginatedPositionUpdatePayload) => void;
  onChapterEnd: () => void;
  /** Fires whenever a fresh, renderable `pages` array becomes available --
   * both the very first pagination pass for a chapter (cache hit or a
   * completed measurement) AND every subsequent repagination triggered by a
   * settings change (font/line-height/family/margin). The caller
   * (`ReaderScreen`) is the one that knows whether a given call is "first
   * paint" or "reflow after settings change" (it owns that timing context),
   * so this callback just reports the raw "pages are ready" transition --
   * mirroring how `useChapterPagination`'s `isPaginating: true -> false`
   * edge is the signal, without leaking `Page[]` internals to the caller. */
  onPagesReady?: (payload: PaginatedPagesReadyPayload) => void;
}

/**
 * Pure helper: which page (index into `pages`) contains the given
 * paragraph/charOffset position, or `null` if it can't be found (empty
 * `pages`, or a paragraphId that isn't present -- e.g. a stale saved
 * position from before a repagination). Picks the segment whose
 * [charStart, charEnd) range contains `charOffset`, falling back to the
 * FIRST segment for that paragraphId if no segment's range contains the
 * exact offset (a paragraph's char ranges are contiguous and gapless per
 * `paginate.ts`, so this only matters for an out-of-range/stale offset).
 */
export function findPageForPosition(
  pages: Page[],
  paragraphId: string,
  charOffset: number,
): number | null {
  let firstMatchIndex: number | null = null;

  for (let pageIndex = 0; pageIndex < pages.length; pageIndex++) {
    const page = pages[pageIndex];
    if (!page) continue;
    for (const segment of page.segments) {
      if (segment.paragraphId !== paragraphId) continue;
      if (firstMatchIndex === null) firstMatchIndex = pageIndex;
      if (charOffset >= segment.charStart && charOffset < segment.charEnd) {
        return pageIndex;
      }
    }
  }

  return firstMatchIndex;
}

/** Horizontal/vertical page dimensions, measured via `onLayout` (NOT
 * `useWindowDimensions`): `useChapterPagination`'s `PageDimensions` doc
 * comment is explicit that it wants the actual measured size of the page
 * CONTAINER, since "chrome above/below the reading surface, safe-area
 * insets, etc. are the caller's concern" -- the window's full size would
 * be wrong the moment a header/chrome bar is visible above this view.
 * `onLayout` reports this component's own allotted box after that chrome
 * has already taken its space in the parent flex layout, which is exactly
 * the number pagination needs.
 *
 * YÜKSEKLİK ASLA BÜYÜMEZ -- SALINIM YAPISAL OLARAK İMKÂNSIZ (2026-09-19).
 *
 * Bu okuma yüzeyi, ekranın flex sütununda kardeşleri (başlık, ses çubuğu,
 * footer) olan bir kutu. Kardeşlerden biri boy değiştirirse buranın
 * yüksekliği de değişir ve bütün bölüm yeniden sayfalanır. Sorun tek bir
 * kardeşin hatası değil, geri besleme DÖNGÜSÜ: footer'ın görünümü
 * "kullanıcı son sayfada mı" sorusunun cevabına bağlı, o cevap sayfa
 * sayısına bağlı, sayfa sayısı da footer'ın boyuna. A -> B -> A.
 * Kullanıcının videosunda bölümün sonu iki sayfalama arasında saniyede
 * birkaç kez gidip geliyordu.
 *
 * Tek tek tetikleyicileri kapatmak (footer'ı sabitlemek -- ki ayrıca
 * yapıldı) bu turu kapatır, bir sonrakini kapatmaz. Burada döngünün KENDİSİ
 * kırılıyor: kabul edilen yükseklik ZAMANLA AZALAN bir dizi. Büyüme yok
 * sayılıyor, yalnızca küçülme kabul ediliyor. Azalan bir dizi birkaç
 * ölçümde durulur ve tanımı gereği bir daha ASLA eski değerine dönemez --
 * yani "A -> B -> A" fiziksel olarak kurulamaz.
 *
 * Neden küçülme kabul, büyüme ret (tersi değil): sayfa içeriği hem
 * ölçülürken hem render edilirken burada saklanan yüksekliği kullanıyor.
 * Gerçek kap saklanandan BÜYÜKSE en altta bir miktar kullanılmamış boşluk
 * kalır (görünmez). KÜÇÜKSE metin taşar ve `overflow:"hidden"` altında
 * kırpılır -- okuyucunun hiç göremeyeceği satırlar. Yani güvenli yön
 * küçüğü tutmak.
 *
 * Genişlik değişimi (ekran döndürme, iPad çoklu görev) gerçek bir yeniden
 * boyutlanmadır ve yüksekliği sıfırlar; aksi hâlde dikeyde ölçülmüş bir
 * yükseklik yatayda kilitli kalırdı.
 *
 * `EPSILON`: `onLayout` alt piksel değerler bildirebiliyor (ör. 731.9998 vs
 * 732). Yarım pikselden küçük farklar gürültüdür; yeniden sayfalamaya
 * değmez.
 */
const LAYOUT_EPSILON = 0.5;

export interface PageContainerSize {
  width: number;
  height: number;
}

/**
 * Yukarıdaki kuralın saf hâli -- `onLayout`'tan gelen bir ölçümün saklanan
 * boyutu nasıl güncelleyeceği. Ayrı ve dışa açık bir fonksiyon olmasının
 * sebebi test edilebilirliği: "yükseklik asla büyümez" bu okuma ekranının
 * bir DEĞİŞMEZİ ve bir sonraki katkıcı onu farkında olmadan bozabilir.
 */
export function nextPageContainerSize(
  previous: PageContainerSize,
  measured: PageContainerSize,
): PageContainerSize {
  // Genişlik gerçekten değiştiyse (döndürme) her şey sıfırdan.
  if (Math.abs(previous.width - measured.width) > LAYOUT_EPSILON) return measured;
  // İlk ölçüm.
  if (previous.height === 0) return measured;
  // Büyüme yok sayılır; yalnızca anlamlı bir küçülme kabul edilir.
  if (measured.height < previous.height - LAYOUT_EPSILON) {
    return { width: previous.width, height: measured.height };
  }
  return previous;
}

function usePageContainerLayout(): {
  width: number;
  height: number;
  onLayout: (event: LayoutChangeEvent) => void;
} {
  const [size, setSize] = useState<PageContainerSize>({ width: 0, height: 0 });

  const onLayout = useCallback((event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    setSize((previous) => nextPageContainerSize(previous, { width, height }));
  }, []);

  return { width: size.width, height: size.height, onLayout };
}

export const PaginatedReaderView = forwardRef<PaginatedReaderHandle, PaginatedReaderViewProps>(
  function PaginatedReaderView(
    {
      chapter,
      settings,
      highlightsEnabled,
      restorePosition,
      onWordTap,
      onSentenceLongPress,
      onPageChange,
      onPositionUpdate,
      onChapterEnd,
      onPagesReady,
    },
    ref,
  ): ReactElement {
    const { width, height, onLayout } = usePageContainerLayout();

    const readerSettings: ReaderSettings = useMemo(
      () => ({
        fontScale: settings.fontScale,
        lineHeightScale: settings.lineHeightScale,
        fontFamily: settings.fontFamily,
        marginScale: settings.marginScale,
        // Not used by useChapterPagination (WebView-only fields kept for
        // ReaderSettings shape compatibility); values are irrelevant here.
        pageTransitionMs: 0,
        // Sayfalama ile ilgisi yok — seslendirme hızı `useChapterAudio`'ya
        // doğrudan gidiyor. Burada yalnızca tip şeklini tamamlıyor.
        speechRate: 1,
        speechVoiceId: null,
        highlightsEnabled,
      }),
      [
        settings.fontScale,
        settings.lineHeightScale,
        settings.fontFamily,
        settings.marginScale,
        highlightsEnabled,
      ],
    );

    // `isPaginating` bilerek okunmuyor: "olcum suruyor mu" artik ekranda ne
    // gosterilecegini belirlemiyor. Belirleyen sey gosterilebilir bir
    // sayfalamanin (yeni ya da bir onceki) VAR OLUP OLMADIGI.
    const { pages: paginatedPages, measurementNode } = useChapterPagination(
      chapter,
      readerSettings,
      {
        width,
        height,
      },
    );

    /**
     * YENIDEN AKIS SIRASINDA EKRAN BOS KALMAZ (2026-09-19).
     *
     * Okuma yuzeyinin boyutu degistiginde `useChapterPagination` yeni bir
     * onbellek anahtarina gecer; onbellekte karsiligi yoksa BUTUN bolum
     * yeniden olculur ve o sure boyunca `pages` null olur. Eskiden bu,
     * okuma yuzeyinin tamamen kaybolmasi demekti -- kullanicinin "bug
     * oluyor" dedigi bos/atlayan kare. Oysa elimizde hala gayet gecerli
     * bir onceki sayfalama var: yenisi hazir olana kadar onu gostermeye
     * devam ediyoruz, sonra cipa yeni sayfalamaya uygulanip sessizce
     * yerine geciyor.
     *
     * Bolum degistiginde tutulan sayfalar bilerek atiliyor: bir onceki
     * bolumun metnini gostermek bos ekrandan daha kotu olurdu.
     */
    const [heldPages, setHeldPages] = useState<{ chapterId: string; pages: Page[] } | null>(null);

    // Render sirasinda turetilen state (React'in "adjust state while
    // rendering" deseni): bir effect'e tasimak, ekranin bir kare boyunca
    // yedeksiz -- yani bos -- kalmasi demek olurdu, ki duzeltilmek istenen
    // sey tam olarak bu.
    if (paginatedPages && heldPages?.pages !== paginatedPages) {
      setHeldPages({ chapterId: chapter.id, pages: paginatedPages });
    }

    const pages = paginatedPages ?? (heldPages?.chapterId === chapter.id ? heldPages.pages : null);

    const { paragraph: textStyle, paragraphGap } = useMemo(
      () => getReadingTypeScale(settings.fontScale, settings.lineHeightScale, settings.fontFamily),
      [settings.fontScale, settings.lineHeightScale, settings.fontFamily],
    );

    // `paginatedPages` (tutulan yedek DEGIL): bu geri cagirma "sayfalama
    // tamamlandi" anini bildiriyor, "ekranda bir seyler var" anini degil.
    useEffect(() => {
      if (!paginatedPages) return;
      onPagesReady?.({ totalPages: paginatedPages.length });
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [paginatedPages]);

    const listRef = useRef<FlatList<Page>>(null);
    const currentPageRef = useRef(0);

    /**
     * OKUMA KONUMUNUN TEK KAYNAĞI (2026-09-19 yeniden yazımı).
     *
     * Eskiden görünen sayfa yalnızca bir SAYIYDI (`currentPageRef`) ve
     * `pages` dizisi yeniden hesaplandığında o sayı olduğu yerde kalıyordu.
     * Ama yeni sayfalamada aynı index BAŞKA bir metne denk geliyor: kullanıcı
     * parmağını bile sürmeden okuduğu paragraf bir başkasıyla değişiyordu.
     * Kullanıcının videoda gösterdiği "son sayfada birden başka bir cümle
     * geliyor" davranışı buydu. Bugüne kadarki düzeltmeler tek tek
     * TETİKLEYİCİLERİ (footer'ın yüksekliği, onLayout gürültüsü) kapatmaya
     * çalıştı; ama yeniden sayfalamanın meşru sebepleri de var --
     * yazı tipi/satır aralığı/kenar boşluğu ayarı, ekran döndürme, ses
     * çubuğunun (premium erişim yanıtı geldiğinde) belirmesi. Tetikleyici
     * avlamak bitmeyen bir işti.
     *
     * Bu yüzden konum artık bir index değil, METNE bağlı bir ÇIPA:
     * (paragraphId, charOffset). Sayfa numarası ondan TÜRETİLİYOR. Yeniden
     * sayfalama olduğunda çıpanın düştüğü yeni sayfaya sessizce ve
     * animasyonsuz gidiliyor -- kullanıcı aynı cümleyi okumaya devam ediyor,
     * yalnızca sayfa numarası ve toplam sayfa değişiyor. Yeniden sayfalama
     * artık bir hata değil, görünmez bir yeniden akış.
     */
    const anchorRef = useRef<PaginatedReaderRestorePosition | null>(restorePosition);
    /** Çıpa henüz kullanıcı tarafından hiç taşınmadıysa (ilk açılış),
     * `restorePosition` geç geldiğinde (sunucudan okuma ilerlemesi) hâlâ
     * kabul edilebilir. Kullanıcı bir kez sayfa çevirdiyse artık çıpanın
     * sahibi odur; geç gelen bir sunucu yanıtı onu geri sarmamalı. */
    const anchorMovedByUserRef = useRef(false);
    /** Çıpanın hangi (`pages`, `width`) çiftine uygulandığı -- aynı çift
     * için ikinci kez kaydırma yapılmasın diye. */
    const appliedAnchorForRef = useRef<{ pages: Page[]; width: number } | null>(null);
    /**
     * Bölüm değişimi. Bu layout effect, aşağıdaki çıpa-uygulama effect'inden
     * ÖNCE tanımlı olduğu için aynı commit'te ondan önce çalışıyor -- yani
     * yeni bölümün ilk çıpa uygulaması artık eski bölümün paragraphId'siyle
     * değil, yeni bölümün kayıtlı konumuyla yapılıyor.
     *
     * `restorePosition` prop'u BURADA DOĞRUDAN okunuyor (bir ref üzerinden
     * değil): `useReaderPosition` onu `chapterId`'den türettiği için bölüm
     * değişimiyle AYNI render'da güncelleniyor, dolayısıyla bu effect
     * çalışırken zaten yeni bölümün konumu. Bir ref'e yazıp oradan okumak,
     * ref senkronizasyonu pasif bir effect olduğu için tam tersini yapardı:
     * bu layout effect eski bölümün konumunu görürdü.
     */
    useLayoutEffect(() => {
      anchorRef.current = restorePosition;
      anchorMovedByUserRef.current = false;
      currentPageRef.current = 0;
      appliedAnchorForRef.current = null;
      // Bağımlılık YALNIZCA `chapter.id`: bu bir sıfırlama, bir senkronizasyon
      // değil. `restorePosition` sonradan (sunucu yanıtı) değişirse onu
      // aşağıdaki effect, kullanıcı henüz sayfa çevirmediyse kabul ediyor.
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [chapter.id]);

    /** Çıpayı görünen sayfanın ilk segmentine taşır. */
    const setAnchorFromPage = useCallback((pageIndex: number, pagesForAnchor: Page[]) => {
      const firstSegment = pagesForAnchor[pageIndex]?.segments[0];
      if (!firstSegment) return;
      anchorMovedByUserRef.current = true;
      anchorRef.current = {
        paragraphId: firstSegment.paragraphId,
        charOffset: firstSegment.charStart,
      };
    }, []);

    const reportPositionForPage = useCallback(
      (pageIndex: number, pagesForReport: Page[]) => {
        const page = pagesForReport[pageIndex];
        const firstSegment = page?.segments[0];
        if (!firstSegment) return;

        const percent = pagesForReport.length > 1 ? pageIndex / (pagesForReport.length - 1) : 0;
        onPositionUpdate({
          paragraphId: firstSegment.paragraphId,
          charOffset: firstSegment.charStart,
          percent,
        });
      },
      [onPositionUpdate],
    );

    /**
     * Çıpayı yeni `pages` dizisine uygular: çıpanın düştüğü sayfayı bulur,
     * listeyi oraya ANİMASYONSUZ götürür ve dışarıya yeni sayfa/toplam
     * sayfa bilgisini bildirir.
     *
     * NEDEN `useLayoutEffect`: normal bir `useEffect` boyamadan SONRA
     * çalışır, yani kullanıcı bir kare boyunca yanlış sayfayı görürdü --
     * düzeltilmek istenen "metin bir anlığına değişti" hissinin ta kendisi.
     * Layout effect commit'ten sonra ama boyamadan önce çalışıyor.
     *
     * NEDEN `scrollToOffset` (`scrollToIndex` değil): `getItemLayout` her
     * index için tam offset'i (width * index) zaten biliyor; scrollToIndex
     * ölçülmemiş bir hedefte önce tahmine sıçrayıp sonra düzeltiyor.
     */
    const applyAnchor = useCallback(() => {
      if (!pages || pages.length === 0 || width === 0) return;
      const applied = appliedAnchorForRef.current;
      if (applied && applied.pages === pages && applied.width === width) return;
      appliedAnchorForRef.current = { pages, width };

      const anchor = anchorRef.current;
      const targetIndex = anchor
        ? (findPageForPosition(pages, anchor.paragraphId, anchor.charOffset) ?? 0)
        : 0;
      const clamped = Math.min(pages.length - 1, Math.max(0, targetIndex));

      currentPageRef.current = clamped;
      listRef.current?.scrollToOffset({ offset: clamped * width, animated: false });
      onPageChange({ page: clamped, totalPages: pages.length });
    }, [pages, width, onPageChange]);

    useLayoutEffect(() => {
      applyAnchor();
    }, [applyAnchor]);

    /**
     * Geç gelen kayıtlı konum. Okuma ilerlemesi sunucudan sayfalamadan SONRA
     * dönebiliyor; kullanıcı o ana kadar hiç sayfa çevirmediyse çıpa hâlâ
     * onundur, güncellenip yeniden uygulanır. Kullanıcı bir kez sayfa
     * çevirdiyse çıpanın sahibi odur -- geç gelen bir yanıt onu geri sarmaz.
     *
     * `applyAnchor`'dan SONRA tanımlı olması bilinçli: ona doğrudan
     * erişebilmesi için (bir ref üzerinden dolaşmadan).
     */
    useEffect(() => {
      if (anchorMovedByUserRef.current) return;
      if (!restorePosition) return;
      anchorRef.current = restorePosition;
      appliedAnchorForRef.current = null;
      applyAnchor();
      // `applyAnchor` bilerek bağımlılık değil: bu effect'in tetikleyicisi
      // yalnızca YENİ bir kayıtlı konumun gelmesi. `applyAnchor` her
      // sayfalama/genişlik değişiminde kimliğini değiştiriyor ve onu
      // bağımlılığa koymak bu sıfırlamayı alakasız anlarda tekrarlardı.
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [restorePosition]);

    /**
     * Listenin kendi çerçevesi değiştiğinde (ilk montaj, genişlik değişimi)
     * çıpa yeniden uygulanıyor. `scrollToOffset`, liste henüz içerik boyutunu
     * öğrenmemişken çağrılırsa etkisiz kalabiliyor -- bu yüzden layout
     * effect'teki "uygulandı" işareti burada bilerek sıfırlanıyor. Çıpa
     * kullanıcının güncel konumu olduğu için tekrar uygulamak kayıpsız:
     * zaten bulunduğu sayfaya gidiyor.
     */
    const handleListLayout = useCallback(() => {
      appliedAnchorForRef.current = null;
      applyAnchor();
    }, [applyAnchor]);

    const handleMomentumScrollEnd = useCallback(
      (event: NativeSyntheticEvent<NativeScrollEvent>) => {
        if (!pages || pages.length === 0 || width === 0) return;
        const offsetX = event.nativeEvent.contentOffset.x;
        const pageIndex = Math.min(pages.length - 1, Math.max(0, Math.round(offsetX / width)));
        currentPageRef.current = pageIndex;
        setAnchorFromPage(pageIndex, pages);
        onPageChange({ page: pageIndex, totalPages: pages.length });
        reportPositionForPage(pageIndex, pages);
      },
      [pages, width, onPageChange, reportPositionForPage, setAnchorFromPage],
    );

    /**
     * DENETİM BULGUSU (2026-09-18, kullanıcı videosu): `scrollToIndex`
     * hedef sayfa henüz FlatList'in dar sanallaştırma penceresinde
     * ölçülmemişse (hızlı art arda kaydırma/zone-tap sırasında sık
     * oluyordu) RN önce `averageItemLength` ile TAHMİNİ bir konuma atlıyor,
     * sonra gerçek ölçüm gelince DÜZELTİYOR -- kullanıcının "sayfa önce
     * sıçrıyor, sonra geri geliyor" diye tarif ettiği iki adımlı sıçrama bu.
     * `getItemLayout` zaten HER index için TAM offset'i (width * index)
     * biliyor, yani tahmine hiç gerek yok -- `scrollToOffset` ile doğrudan
     * kesin konuma gidiyoruz.
     */
    const handleScrollToIndexFailed = useCallback(
      (info: { index: number }) => {
        if (width === 0) return;
        listRef.current?.scrollToOffset({ offset: info.index * width, animated: false });
      },
      [width],
    );

    /**
     * TOUCH-ZONE / FLATLIST-SWIPE GESTURE COMPOSITION.
     *
     * Bölgeler: kelime dokunuşu önce kazanır (yapısal olarak, aşağıya bak),
     * sonra sol %25 -> önceki sayfa, sağ %25 -> sonraki sayfa (son sayfada
     * `onChapterEnd`). ORTA %50 HİÇBİR ŞEY YAPMAZ.
     *
     * ORTA BÖLGE NEDEN KALDIRILDI (2026-09-07): orta %50'ye dokunmak
     * başlık ve alt şeridi gizleyip gösteriyordu. Kullanıcı bunu bir
     * özellik olarak değil, "boşluğa dokununca ekran büyüyor" diye bir
     * hata olarak bildirdi — çünkü metnin ortasına dokunmak (kelime
     * ıskalayınca sık olan bir şey) beklenmedik biçimde bütün arayüzü
     * kaldırıyordu.
     *
     * Daha kötüsü: gizlenen şeritlerden biri, bölümün son sayfasında
     * "sonraki bölüm" düğmesini taşıyan alt şerit. Yani kazara tetiklenen
     * bu hareket, bölümü bitiren kullanıcıyı devam yolundan da ediyordu.
     *
     * Kaybedilen şey (tam ekran okuma) küçük: şeritler zaten ince ve
     * reklam/promosyon taşımıyor (ürün ilkesi #1). Kazanılan şey,
     * dokunmanın öngörülebilir olması.
     *
     * "Word-tap wins, checked first" is NOT implemented as an if/else
     * priority chain here -- it falls out of how RN actually resolves
     * touches, which is worth spelling out because it's the reason this
     * composition works at all:
     *
     * 1. `ReaderPage`'s content (see that file's own top-of-file comment)
     *    is nested `<Text>` -- RN's Text renderer does its own INTERNAL
     *    hit-testing across nested inline spans, and only claims the
     *    touch responder if the exact point falls on a `<Text>` node that
     *    registered `onPress`/`onLongPress` (a word or sentence span). A
     *    tap landing on whitespace, paragraph margins, or blank page space
     *    is simply never claimed by the Text tree at all.
     * 2. This per-page `<Pressable>` overlay is rendered as an
     *    absolutely-positioned layer BEHIND `ReaderPage` in the same
     *    wrapping `<View>` (earlier in JSX = lower in paint/z order for
     *    overlapping siblings). Native hit-testing (both iOS `hitTest:`
     *    and Android's touch dispatch) walks front-to-back: it offers the
     *    touch to the front-most (ReaderPage's Text) layer first, and only
     *    continues to the layer behind (this overlay) when nothing in
     *    front claimed it.
     * 3. Net effect: a tap on a word/sentence is resolved entirely by
     *    `ReaderPage` and never reaches this Pressable at all -- "word-tap
     *    wins" is a structural consequence of z-order + Text's internal
     *    hit-testing, not a runtime priority check this component has to
     *    perform itself.
     *
     * `Pressable`'s discrete tap gesture composes safely with
     * `FlatList`'s own horizontal scroll (a plain native `UIScrollView` /
     * Android `RecyclerView`-backed scroll, not a JS `PanResponder`):
     * `Pressable`'s underlying `Pressability` does not eagerly claim the
     * JS responder on `touchmove` the way a custom `PanResponder` would --
     * it tracks press state without blocking ancestor scroll negotiation,
     * which is the same reason `TouchableOpacity`/`Pressable` children
     * inside a horizontal `FlatList`/`ScrollView` are an extremely common,
     * well-established RN pattern (tappable carousel cards). A quick tap
     * (no meaningful horizontal movement) resolves as `onPress` on this
     * overlay; a drag that exceeds the platform scroll-view's own pan
     * threshold is captured by the native scroll view itself and this
     * overlay's press is cancelled (never fires) -- so a swipe never also
     * triggers a spurious zone-tap.
     */
    /**
     * Sesli okumanın kullandığı imperative API.
     *
     * `advancePage` bilerek `onChapterEnd()` ÇAĞIRMIYOR: sağdaki dokunma
     * bölgesi son sayfada bölüm sonu ekranını açıyor, ama sesli okuma son
     * sayfayı bitirdiğinde kullanıcıya sormadan ekran değiştirmemeli.
     * Sadece `false` dönüyor, çağıran susup duruyor.
     */
    useImperativeHandle(
      ref,
      () => ({
        getCurrentPageSpeech: () => {
          const page = pages?.[currentPageRef.current];
          if (!page) return [];
          return buildPageSpeech(page, chapter.paragraphs);
        },
        advancePage: () => {
          if (!pages || pages.length === 0) return false;
          const current = currentPageRef.current;
          if (current >= pages.length - 1) return false;
          const target = current + 1;
          currentPageRef.current = target;
          setAnchorFromPage(target, pages);
          listRef.current?.scrollToIndex({ index: target, animated: true });
          onPageChange({ page: target, totalPages: pages.length });
          reportPositionForPage(target, pages);
          return true;
        },
      }),
      [pages, chapter.paragraphs, onPageChange, reportPositionForPage, setAnchorFromPage],
    );

    const handleZonePress = useCallback(
      (locationXRatio: number) => {
        if (!pages || pages.length === 0) return;
        const current = currentPageRef.current;

        if (locationXRatio < 0.25) {
          if (current > 0) {
            const target = current - 1;
            currentPageRef.current = target;
            setAnchorFromPage(target, pages);
            listRef.current?.scrollToIndex({ index: target, animated: true });
          }
        } else if (locationXRatio > 0.75) {
          if (current >= pages.length - 1) {
            onChapterEnd();
          } else {
            const target = current + 1;
            currentPageRef.current = target;
            setAnchorFromPage(target, pages);
            listRef.current?.scrollToIndex({ index: target, animated: true });
          }
        }
        // Orta %50: bilerek boş — yukarıdaki gerekçeye bak.
      },
      [pages, onChapterEnd, setAnchorFromPage],
    );

    // Must match useChapterPagination's own `getPagePadding` exactly -- that
    // hook subtracts this same padding from the container size BEFORE
    // measuring/paginating, so a page's content is laid out assuming this much
    // inset. Rendering without applying it here would place text (sized for
    // the smaller, padded content box) flush in the corner of the full,
    // unpadded page box, leaving unused space along the bottom/trailing edges.
    const pagePadding = getPagePadding(settings.marginScale);

    const renderItem = useCallback(
      ({ item }: { item: Page }) => (
        <View style={[styles.pageSlot, { width, height }]}>
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={(event) => {
              if (width === 0) return;
              handleZonePress(event.nativeEvent.locationX / width);
            }}
          />
          <View style={[styles.pageContent, { padding: pagePadding }]}>
            <ReaderPage
              page={item}
              paragraphs={chapter.paragraphs}
              textStyle={textStyle}
              paragraphGap={paragraphGap}
              onWordTap={onWordTap}
              onSentenceLongPress={onSentenceLongPress}
            />
          </View>
        </View>
      ),
      [
        width,
        height,
        pagePadding,
        chapter.paragraphs,
        textStyle,
        paragraphGap,
        onWordTap,
        onSentenceLongPress,
        handleZonePress,
      ],
    );

    const keyExtractor = useCallback(
      (_page: Page, index: number) => `${chapter.id}-${index}`,
      [chapter.id],
    );

    const getItemLayout = useCallback(
      (_data: ArrayLike<Page> | null | undefined, index: number) => ({
        length: width,
        offset: width * index,
        index,
      }),
      [width],
    );

    if (width === 0 || height === 0) {
      // Not measured yet -- render the (invisible) measurement node so
      // `useChapterPagination`/`useChapterMeasurement` can still receive a
      // request once dimensions resolve, without flashing any reading
      // content at the wrong size.
      return <View style={styles.container} onLayout={onLayout} />;
    }

    // Olcum suruyor VE gosterilecek hicbir sayfa yok: yalnizca bolumun ilk
    // acilisinda (onbellek bos) olan durum. Yeniden akista `pages` bir
    // onceki sayfalamayi tutuyor, dolayisiyla bu dala hic girilmiyor.
    if (!pages) {
      return (
        <View style={styles.container} onLayout={onLayout}>
          {measurementNode}
        </View>
      );
    }

    return (
      <View style={styles.container} onLayout={onLayout}>
        {measurementNode}
        <FlatList
          ref={listRef}
          data={pages}
          horizontal
          pagingEnabled
          decelerationRate="fast"
          showsHorizontalScrollIndicator={false}
          keyExtractor={keyExtractor}
          renderItem={renderItem}
          getItemLayout={getItemLayout}
          onMomentumScrollEnd={handleMomentumScrollEnd}
          onScrollToIndexFailed={handleScrollToIndexFailed}
          // Liste yeni monte olduysa layout effect'in `scrollToOffset`'i
          // henüz bir şeye denk gelmemiş olabilir; ilk layout'ta çıpa bir
          // kez daha uygulanıyor. `applyAnchor` kendi içinde tekrarı
          // eliyor (aynı pages+width için ikinci kez çalışmıyor).
          onLayout={handleListLayout}
          // DENETİM BULGUSU (2026-09-18): eski değerler (3/2/2) çok dardı --
          // hızlı art arda kaydırmada bir sonraki/bir önceki sayfa henüz
          // mount edilmemiş oluyordu. `scrollToIndex` (bkz.
          // `onScrollToIndexFailed`) hedef index'in ölçülmüş bir layout'u
          // olmadan çağrılırsa RN önce YAKLAŞIK bir konuma sıçrıyor, ölçüm
          // tamamlanınca DÜZELTİYOR -- kullanıcının tarif ettiği "önce
          // sıçrıyor, sonra geri geliyor" hissi tam olarak bu iki adımlı
          // düzeltme. Komşu sayfaları önceden monte etmek bu riski azaltıyor.
          windowSize={5}
          initialNumToRender={3}
          maxToRenderPerBatch={3}
        />
      </View>
    );
  },
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  pageSlot: {
    overflow: "hidden",
  },
  pageContent: {
    flex: 1,
  },
});
