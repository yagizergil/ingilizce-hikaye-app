import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Animated, Pressable, StyleSheet, Text, View } from "react-native";

import { Ionicons } from "@expo/vector-icons";
import { useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import * as Speech from "expo-speech";
import { Image } from "expo-image";

import {
  detailColors,
  detailMetrics,
  detailType,
  homeColors,
  homeMetrics,
  homeSpace,
  homeType,
  motion,
  radius,
  spacing,
} from "@/theme";
import { useTheme } from "@/theme/useTheme";
import { useReduceMotion } from "@/hooks/useReduceMotion";
import { LevelBadge, Skeleton, SlideUpModal } from "@/components/ui";
import { getVoiceIdentifier } from "@/features/reader/tts/pronunciationVoice";
import { useReaderSettings } from "@/features/reader/hooks/useReaderSettings";
import { pairLemmaQueryKey, usePairLemmaLookup } from "@/features/reader/api/usePairLemmaLookup";
import { useActiveLanguagePairQuery } from "@/features/languagePair";
import { getLanguage } from "@/lib/languages";
import { useGlobalLemmaLookup } from "@/features/reader/api/useGlobalLemmaLookup";
import { useLiveWordTranslation } from "@/features/reader/api/useLiveWordTranslation";
import { useContextualWordGloss } from "@/features/reader/api/useContextualWordGloss";
import { wordLookupRoute } from "@/features/reader/api/wordLookupRoute";
import { useSentenceTranslationQuery } from "@/features/reader/api/useSentenceTranslationQuery";
import { inflectionHint, lemmaCandidates } from "@/features/reader/text/tokenizer";

import type {
  BookLemmaDictionary,
  BookLemmaEntry,
} from "@/features/reader/api/useBookLemmaDictionary";
import type { LemmaState } from "@/features/reader/api/useSavedWordsQuery";

export interface WordSheetWord {
  surface: string;
  lemma: string;
  sentenceText: string;
  paragraphId: string;
  /** Character offset of `surface` within `sentenceText`, if known — see
   * `buildSentenceSegments`'s doc comment for why this matters. */
  sentenceCharOffset?: number;
  /** Dokunmanın ekrandaki dikey konumu — kartın kelimenin altında mı
   * üstünde mi açılacağını belirliyor (bkz. `ReaderWordTapPayload.anchorY`). */
  anchorY?: number;
}

interface WordSheetProps {
  word: WordSheetWord | null;
  lemmaDictionary: BookLemmaDictionary;
  /** Single source of truth for the Save/Know button matrix — see the
   * component body for the full 3-state transition table. */
  lemmaState: LemmaState;
  onSave: () => void;
  onUnsave: () => void;
  onMarkKnown: () => void;
  onUnmarkKnown: () => void;
  onDismiss: () => void;
  /**
   * Günlük AI cümle çevirisi hakkı bittiğinde çağrılır.
   *
   * ÇÖZDÜĞÜ SORUN: kota tavanına çarpıldığında sorgu hata veriyor ve bu
   * dal ekranda HİÇBİR ŞEY göstermiyordu -- kullanıcı "çeviriyi göster"e
   * basıyor, hiçbir şey olmuyordu. Arıza ile sınır ayırt edilemiyordu.
   *
   * İsteğe bağlı: onboarding'in ilk okuma adımı da bu kartı kullanıyor ve
   * orada paywall'a gitmek anlamsız (kullanıcı henüz uygulamayı
   * görmedi) -- verilmezse yalnızca açıklama metni gösteriliyor.
   */
  onSentenceQuotaExhausted?: () => void;
  /**
   * ONBOARDING'E ÖZEL: kaydet düğmesinde ölçek nabzı + ikon sırasının
   * altında tek satırlık açıklama. Verilmezse (reader'da her zaman böyle)
   * kart bit bit aynı davranıyor.
   *
   * NEDEN TEK PROP: nabız ve açıklama ayrı iki anahtara bağlansaydı
   * zamanla yarım bir tedavi (biri açık, diğeri kapalı) oluşabilirdi.
   *
   * ÇÖZDÜĞÜ SORUN (2026-09-19, kullanıcı geri bildirimi + video): ilk
   * okuma adımında kullanıcı kelimeye dokunuyor, kart açılıyor ve üç
   * ikondan HANGİSİNİN kaydettiğini anlamıyordu. Kartı kapatıyor,
   * "3 kelime daha seç" yazısı duruyor ve adımda sıkışıyordu.
   */
  saveHint?: string | null;
}

interface SentenceSegment {
  text: string;
  emphasized: boolean;
}

/** Splits `sentenceText` into segments around the tapped word so the exact
 * occurrence can be rendered with emphasis.
 *
 * Prefers `sentenceCharOffset` (the tapped word's real character position
 * within the sentence, threaded through from `ReaderPage`'s tokenizer) when
 * available — this is the ONLY reliable way to pick the right occurrence:
 * a plain `indexOf(surface)` search (the previous approach) finds the
 * FIRST substring match anywhere in the sentence, which can land inside an
 * unrelated word (tapping the standalone word "a" would highlight the "a"
 * inside "heard" if that appeared earlier in the sentence). Falls back to
 * a word-boundary-aware regex search (never a bare substring search) only
 * when no offset was supplied — e.g. a future caller that hasn't threaded
 * it through yet — so at minimum whole-word matches are never confused
 * with a substring inside a longer word. */
function buildSentenceSegments(
  sentenceText: string,
  surface: string,
  sentenceCharOffset: number | undefined,
): SentenceSegment[] {
  if (!surface) return [{ text: sentenceText, emphasized: false }];

  let index = -1;
  if (
    sentenceCharOffset !== undefined &&
    sentenceCharOffset >= 0 &&
    sentenceCharOffset + surface.length <= sentenceText.length &&
    sentenceText.slice(sentenceCharOffset, sentenceCharOffset + surface.length).toLowerCase() ===
      surface.toLowerCase()
  ) {
    index = sentenceCharOffset;
  } else {
    // Fallback: word-boundary match, not a bare substring search, so a
    // short word (e.g. "a") still can't match inside a longer word.
    const escaped = surface.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const match = new RegExp(`\\b${escaped}\\b`, "i").exec(sentenceText);
    index = match ? match.index : -1;
  }

  if (index === -1) return [{ text: sentenceText, emphasized: false }];

  const segments: SentenceSegment[] = [];
  if (index > 0) segments.push({ text: sentenceText.slice(0, index), emphasized: false });
  segments.push({ text: sentenceText.slice(index, index + surface.length), emphasized: true });
  const rest = sentenceText.slice(index + surface.length);
  if (rest.length > 0) segments.push({ text: rest, emphasized: false });
  return segments;
}

/**
 * FAZ 4/5 (2026-09-14, referans uygulama eşleştirmesi): kelime popup'ı artık
 * bir BOTTOM SHEET DEĞİL -- referans ekran görüntüsünde kart ekranın alt
 * kenarına yapışık değil, metnin ÜZERİNDE, dikey olarak ORTALANMIŞ yüzen
 * bir kart (altında "%29" sayfa yüzdesi hâlâ görünür durumda). Bir bottom
 * sheet (`@gorhom/bottom-sheet`, her zaman alt kenara sabit) bunu hiçbir
 * ayarla üretemez -- bu yüzden component tamamen React Native'in kendi
 * `Modal`'ına (`transparent`, ortalanmış içerik) taşındı. Artık `ref`
 * YOK: görünürlük doğrudan `word !== null`'a bağlı (kontrollü component),
 * `ReaderScreen`'in eskiden çağırdığı `.present()` imperative çağrısı
 * kaldırıldı -- `setActiveWord(...)` zaten tek gereken tetikleyiciydi.
 *
 * Kart içeriği: ortada büyük/kalın karşılık, altında 3 yuvarlak ikon
 * düğmesi (kaydet, seslendir, detayları aç/kapat), sağ-üstte kapatma
 * düğmesi -- referansla birebir.
 *
 * FONKSİYONELLİK KAYBOLMADI, TAŞINDI: IPA, cümle bağlamı, diğer anlamlar ve
 * "Biliyorum" eylemi varsayılan görünümden kalktı ama 3. ikona (detaylar)
 * dokununca aynı kartın içinde açılıyor -- referansın minimal varsayılan
 * görünümünü, öğrenme döngüsünün (SRS, kelime defteri) hiçbir parçasını
 * silmeden koruyoruz.
 */
export function WordSheet({
  word: wordProp,
  lemmaDictionary,
  lemmaState,
  onSave,
  saveHint = null,
  onUnsave,
  onMarkKnown,
  onUnmarkKnown,
  onDismiss,
  onSentenceQuotaExhausted,
}: WordSheetProps) {
  /**
   * Panel kapanırken (kaydırma animasyonu sürerken) içerik boşalmasın diye
   * son kelime tutuluyor; görünürlük yine `wordProp`tan geliyor.
   */
  const [lastWord, setLastWord] = useState(wordProp);
  if (wordProp && wordProp !== lastWord) setLastWord(wordProp);
  const word = wordProp ?? lastWord;
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { theme } = useTheme();
  const speechVoiceId = useReaderSettings((state) => state.speechVoiceId);

  const activePairQuery = useActiveLanguagePairQuery();
  /**
   * ÇÖZÜLEN HATA (kullanıcı bulgusu, 2026-09-16): "book_lemmas" +
   * `lemma_canonical` (aşağıdaki `bookEntry`/`globalEntry`) tek bir
   * kolon taşıyor -- `tr_gloss` -- çünkü bu ikisi ADR-013 ÖNCESİNDEN
   * kalma İngilizce→Türkçe sözlüğün ta kendisi. Dil çiftleri v2 (ADR-013)
   * geldiğinde bu iki kaynak GÜNCELLENMEDİ: `entry` zinciri hep
   * `bookEntry ?? globalEntry ?? pairEntry ?? liveEntry` sırasıyla
   * kuruluyordu, yani hedef dili İngilizce olan HER kitapta (katalogdaki
   * 113 kitabın hepsi) bookEntry/globalEntry neredeyse her zaman bir
   * sonuç buluyor ve gösteriliyordu -- kullanıcının ana dili Fransızca,
   * Almanca, her ne olursa olsun, ekranda hep TÜRKÇE karşılık çıkıyordu.
   * Doğru, dil çiftine duyarlı kaynak (`usePairLemmaLookup`,
   * `lemma_translations` tablosu) zaten vardı ama sırada üçüncü olduğu
   * için pratikte hiç devreye giremiyordu.
   *
   * Düzeltme: `tr_gloss` yalnızca ana dil GERÇEKTEN Türkçe olduğunda
   * güvenilir bir karşılıktır. Ana dil başka bir şeyse bu iki kaynak
   * tamamen devre dışı bırakılıyor (zincir doğrudan `pairEntry`'ye
   * düşüyor) -- kelimenin İngilizce meta verisi (seviye, IPA, ses) değil,
   * SADECE `trGloss` alanı dile özel olduğu için bu ayrım yeterli.
   */
  // 2026-10-10: yalnızca ana dile bakmak yetmiyordu -- tr->fr çiftinde
  // Fransızca kelimeler İngilizce sözlükte aranıyordu ("au" -> "altın").
  // Karar artık tek yerde, iki dile birden bakıyor (bkz. wordLookupRoute).
  const lookupRoute = wordLookupRoute(activePairQuery.data);
  const nativeIsTurkish = lookupRoute === "en-tr-dictionary";
  const isContextual = lookupRoute === "contextual";

  // Kitap sözlüğünde ARANACAK ADAYLAR (bkz. tokenizer.js
  // `lemmaCandidates`): cihazdaki kural tabanlı gövdeleyici tek bir kök
  // üretmek zorunda kaldığında "hotter" -> "hott", "happier" -> "happi"
  // gibi sözlükte olmayan kökler çıkarıyor ve kullanıcı yaygın bir kelimede
  // "karşılık bulunamadı" görüyordu. Adayları sırayla deneyip ilk tutanı
  // kullanmak, kuralları tek tek sıkılaştırmaktan hem daha güvenli hem
  // daha kapsayıcı.
  // eslint-disable-next-line react-hooks/preserve-manual-memoization -- forwardRef'ten düz fonksiyona geçişte derleyici bu bloğu yeniden yazamadı; davranış aynı, yalnızca otomatik memoizasyon uygulanamıyor.
  const bookLookup = useMemo(() => {
    if (!word) return { entry: undefined, lemma: null };
    for (const candidate of lemmaCandidates(word.surface || word.lemma)) {
      const found = lemmaDictionary.get(candidate);
      if (found) return { entry: found, lemma: candidate };
    }
    // Gövdeleyicinin kökü aday listesinde her zaman ilk sırada; yine de
    // doğrudan dene (yüzey biçimi boşsa aday listesi boş olabilir).
    const direct = lemmaDictionary.get(word.lemma);
    return { entry: direct, lemma: direct ? word.lemma : null };
  }, [word, lemmaDictionary]);

  // `tr_gloss` yalnızca ana dil Türkçe iken güvenilir -- bkz. yukarıdaki
  // `nativeIsTurkish` yorumu. Başka bir ana dilde bu kaynak hiç
  // denenmiyor bile (ağ isteği dahi yapılmıyor, aşağıya bak).
  const bookEntry = nativeIsTurkish ? bookLookup.entry : undefined;
  // Task 1: per-book dictionary miss -> point lookup against the global
  // lemma_canonical table. Only enabled once we know the book dictionary
  // missed, and only while the sheet actually has a word open, so this
  // never blocks the sheet opening (it fires as a secondary enrichment
  // fetch after the sheet is already visible). Ana dil Türkçe değilse bu
  // tablo zaten kullanılamaz, sorgu hiç tetiklenmiyor.
  const bookMissed = word !== null && !bookEntry;
  const globalLookupEnabled = nativeIsTurkish && bookMissed;
  const globalLookup = useGlobalLemmaLookup(
    globalLookupEnabled ? word.lemma : null,
    globalLookupEnabled ? word.surface : null,
  );
  const globalEntry = nativeIsTurkish ? (globalLookup.data ?? undefined) : undefined;

  // Task 4: 3rd-tier live-translation fallback. Only fires once BOTH the
  // per-book dictionary AND the global lemma_canonical lookup have missed
  // (globalLookup settled with no result), and only once per word (guarded
  // by lastLiveRequestedLemmaRef) -- re-opening the sheet on the same
  // unresolved word should not re-trigger a fresh LLM call every time.
  // `lemma_translations` önbelleği: bir kez AI ile çevrilen kelime ikinci
  // dokunuşta buradan geliyor (bkz. usePairLemmaLookup). Yalnızca genel
  // sözlük ıskaladıktan SONRA sorgulanıyor. Ana dil Türkçe değilse genel
  // sözlük hiç denenmediği için buraya hemen (ilk render'da) düşülüyor.
  // Bağlamsal yolda bu katmanlar (ve eski AI çağrısı) hiç çalışmıyor.
  const globalMissed = nativeIsTurkish
    ? bookMissed && globalLookup.isFetched && !globalEntry
    : false;
  const pairLookup = usePairLemmaLookup(
    globalMissed && word ? word.lemma : null,
    globalMissed && word ? word.surface : null,
  );
  const pairEntry = pairLookup.data ?? undefined;

  const liveTranslation = useLiveWordTranslation();
  const lastLiveRequestedLemmaRef = useRef<string | null>(null);
  const bothMissed = globalMissed && pairLookup.isFetched && !pairEntry;

  useEffect(() => {
    if (!word || !bothMissed) return;
    if (lastLiveRequestedLemmaRef.current === word.lemma) return;
    lastLiveRequestedLemmaRef.current = word.lemma;

    const { surface, lemma, sentenceText } = word;
    liveTranslation.mutate(
      { surface, lemma, contextSentence: sentenceText },
      {
        onSuccess: (result) => {
          if (!result) return;
          /**
           * AI'ın ürettiği karşılık ÖNBELLEĞE DE yazılıyor.
           *
           * ÇÖZDÜĞÜ KİLİTLENME: edge function sonucu `lemma_translations`'a
           * yazıyor ama istemcideki çift sorgusu `staleTime: Infinity` ile
           * çalışıyor -- yani aynı kelimeye ikinci dokunuşta sunucuya hiç
           * gidilmiyor, önbellekteki ESKİ "bulunamadı" cevabı okunuyordu.
           * Sonuç: ilk dokunuşta gelen karşılık, ikinci dokunuşta sonsuza
           * kadar yer tutucuda kalıyordu. Artık sonuç yazıldığı anda
           * önbellek de doğru cevabı taşıyor; ikinci dokunuş ne sunucuya
           * ne de AI'a gidiyor, anında açılıyor.
           */
          queryClient.setQueryData(pairLemmaQueryKey(lemma, surface), {
            pos: result.pos,
            cefrLevel: null,
            trGloss: result.trGloss,
            ipa: null,
            audioUrl: null,
            isPhrasal: false,
            falseFriendNoteTr: null,
          } satisfies BookLemmaEntry);
        },
      },
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps -- liveTranslation is a mutation object, intentionally excluded (would re-run on every render otherwise)
  }, [word, bothMissed, queryClient]);

  /**
   * ÖNCEKİ KELİMENİN ANLAMI GÖRÜNÜYORDU -- sebebi ve çözümü.
   *
   * `liveTranslation` bir MUTATION; `data`sı sorgu önbelleği gibi anahtara
   * bağlı değil, son başarılı çağrının sonucunu TUTMAYA devam ediyor.
   * Kullanıcı B kelimesine dokunduğunda A'nın karşılığı hâlâ oradaydı ve
   * yeni çağrı dönene kadar ekranda B'nin altında A'nın anlamı yazıyordu.
   *
   * İki kat koruma: (1) mutation kelime değişince sıfırlanıyor,
   * (2) `variables` ile veri HANGİ kelimeye ait olduğu doğrulanıyor --
   * sıfırlama ile yeni sonucun gelmesi arasındaki kareler için.
   */
  useEffect(() => {
    liveTranslation.reset();
    // "Bu kelime için çağrı yapıldı" kilidi de burada açılıyor.
    //
    // ÇÖZDÜĞÜ KİLİTLENME: kilit yalnızca kart KAPANIRKEN (word === null)
    // açılıyordu. Kart kapanmadan başka bir kelimeye geçilip geri
    // dönüldüğünde kilit hâlâ kapalı, mutation ise sıfırlanmış oluyordu --
    // ne yeni çağrı yapılıyor ne de gösterilecek veri kalıyordu, kart yer
    // tutucuda donuyordu. Kilit artık mutation ile AYNI anda sıfırlanıyor;
    // ikisinin ayrı yerlerde sıfırlanması bu hatanın kendisiydi.
    lastLiveRequestedLemmaRef.current = null;
    // eslint-disable-next-line react-hooks/exhaustive-deps -- mutation nesnesi bilerek dışarıda (her render'da yeniden çalışırdı)
  }, [word?.lemma]);

  const liveBelongsToWord = word !== null && liveTranslation.variables?.lemma === word.lemma;

  const liveEntry: BookLemmaEntry | undefined =
    liveTranslation.data && liveBelongsToWord
      ? {
          pos: liveTranslation.data.pos,
          cefrLevel: null,
          trGloss: liveTranslation.data.trGloss,
          ipa: null,
          audioUrl: null,
          isPhrasal: false,
          falseFriendNoteTr: null,
        }
      : undefined;

  const contextualLookup = useContextualWordGloss(
    isContextual && word
      ? { surface: word.surface || word.lemma, lemma: word.lemma, sentence: word.sentenceText }
      : null,
    isContextual ? (activePairQuery.data ?? null) : null,
  );
  const contextualData = isContextual ? contextualLookup.data : undefined;
  const contextualEntry: BookLemmaEntry | undefined = contextualData
    ? {
        pos: contextualData.pos,
        cefrLevel: null,
        trGloss: contextualData.gloss,
        ipa: null,
        audioUrl: null,
        isPhrasal: false,
        falseFriendNoteTr: null,
        senses: [
          { pos: contextualData.pos, trGloss: contextualData.gloss },
          ...contextualData.alternatives.map((alt) => ({ pos: null, trGloss: alt })),
        ],
      }
    : undefined;

  const entry = bookEntry ?? globalEntry ?? pairEntry ?? liveEntry ?? contextualEntry;

  /**
   * "ARANIYOR" İLE "BULUNAMADI" ARASINDA ZIPLAMA VARDI -- sebebi ve çözümü.
   *
   * Eski koşul her katmanın `isLoading`/`isPending` bayrağını OR'luyordu.
   * O bayraklar katmanlar ARASINDA kısa süre hep birden false oluyor:
   * genel sözlük cevabı döndü, çift sorgusu daha etkinleşmedi; ya da çift
   * sorgusu bitti, AI çağrısını başlatan effect henüz çalışmadı (effect'ler
   * render'dan SONRA koşuyor). O karelerde ne karşılık var ne de "aranıyor"
   * -- ekran "karşılık bulunamadı" yazıp hemen ardından yer tutucuya
   * dönüyordu. Kullanıcının gördüğü glitch tam olarak buydu.
   *
   * Yeni hesap bayraklara değil, SIRANIN NEREDE OLDUĞUNA bakıyor: her
   * katman ya cevabını verdi (`isFetched`) ya da sıra henüz ona gelmedi.
   * Sıra bitmeden "bulunamadı" yazılmıyor, dolayısıyla arada boşluk yok.
   */
  const globalSettled = !nativeIsTurkish || !bookMissed || globalLookup.isFetched;
  const pairSettled = !globalMissed || pairLookup.isFetched;
  // AI adımı yalnızca çağrı BU kelime için başlayıp bittiğinde tamamlanmış
  // sayılıyor; effect çalışmadan önceki kareler de "devam ediyor" sayılsın.
  const liveSettled = !bothMissed || (liveBelongsToWord && !liveTranslation.isPending);
  const contextualSettled =
    lookupRoute !== "pending" && (!isContextual || contextualLookup.isFetched);

  /**
   * Karşılık geldiğinde yumuşak bir belirme.
   *
   * `useRef(new Animated.Value(...)).current` render sırasında okunamıyor
   * (react-hooks/refs); lazy initializer aynı "bir kez üret" davranışında.
   */
  const [glossFade] = useState(() => new Animated.Value(0));

  /**
   * Kaydet düğmesinin ölçek nabzı (yalnızca `saveHint` verilince).
   *
   * BURADA ÖLÇEK ÇALIŞIYOR, kelimede çalışmıyor: bu bir GERÇEK view
   * (`styles.iconButton`, 40x40), dolayısıyla `transform` ve native
   * sürücü kullanılabiliyor. Satır içi bir `<Text>` ise iOS'ta bir view
   * değil, üst paragrafın attributed string'inde bir aralık -- orada
   * `transform` diye bir kavram yok (bkz. onboarding tarafındaki not).
   *
   * `transform` yerleşimi ETKİLEMİYOR, yani `iconRow`un
   * `space-between` geometrisi ve reader'daki görünüm birebir aynı kalıyor.
   */
  const [savePulse] = useState(() => new Animated.Value(0));
  const reduceMotion = useReduceMotion();

  /**
   * DENETİM BULGUSU (2026-09-19, kullanıcı bulgusu): bu efekt `saveHint`e
   * bağlıydı ama onboarding'de `saveHint` HER kelime için AYNI sabit metin
   * -- yani efekt yalnızca kart bileşeni İLK kez "saveHint doğru" olduğunda
   * ateşleniyor, sonraki kelimeler için `saveHint` DEĞİŞMEDİĞİ için efekt
   * bir daha hiç çalışmıyordu. `word` her zaman aynı `Modal` örneğinde
   * (`visible` prop'uyla açılıp kapanıyor, bkz. dosyanın alt kısmı)
   * göründüğü/kaybolduğu için döngünün "zaten sürüyor olması" ekrana bağlı
   * kırılgan bir varsayımdı. Artık `word` (kelime değişince YENİ bir kart
   * açılmış demektir) de bağımlılıkta -- her kart açılışında nabız SIFIRDAN
   * başlıyor, hangi kelime olduğuna bakılmaksızın.
   */
  useEffect(() => {
    if (!saveHint || !word) {
      savePulse.setValue(0);
      return;
    }
    // Hareket azaltma açıkken nabız OYNAMIYOR ama sinyal KAYBOLMUYOR:
    // değer en belirgin ucunda sabitleniyor (gerekçe `useReduceMotion`da).
    if (reduceMotion) {
      savePulse.setValue(1);
      return;
    }
    savePulse.setValue(0);
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(savePulse, {
          toValue: 1,
          duration: motion.duration.slow,
          useNativeDriver: true,
        }),
        Animated.timing(savePulse, {
          toValue: 0,
          duration: motion.duration.slow,
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [saveHint, word, reduceMotion, savePulse]);

  const isResolvingTranslation =
    word !== null && !entry && !(globalSettled && pairSettled && liveSettled && contextualSettled);

  /**
   * Gösterilecek anlam(lar).
   *
   * ÇÖZÜLEN HATA (2026-09-07): sözlükte 2.345 kelimenin hem isim hem fiil
   * anlamı var; `lemma_canonical` bunlardan hep İSMİ ana karşılık olarak
   * seçiyordu (bkz. migration 027). Kullanıcı "He watched the door"
   * cümlesinde "watched" kelimesine dokunduğunda "kol saati" görüyordu —
   * eksik değil, YANLIŞ çeviri; üstelik doğrusu veritabanında duruyordu.
   *
   * İki katmanlı çözüm:
   *  1. Yüzey biçimindeki çekim eki hangi türün kastedildiğini söylüyor
   *     ("-ed"/"-ing" -> fiil). O türde bir anlam varsa ana karşılık o
   *     oluyor. Cümleyi anlamayı gerektirmiyor, ek ağ isteği de yok.
   *  2. Diğer anlamlar da altta listeleniyor: bir sözlük zaten böyle
   *     çalışır ve ipucu yanıldığında kullanıcı doğrusunu yine görüyor.
   */
  const senses = entry?.senses ?? [];
  // Çekim eki ipucu İngilizceye özgü; bağlamsal yolda anlamı model seçiyor.
  const hint = word && !isContextual ? inflectionHint(word.surface) : null;
  const primarySense = (hint && senses.find((sense) => sense.pos === hint)) || null;
  const primaryGloss = primarySense?.trGloss ?? entry?.trGloss ?? null;
  const otherSenses = senses.filter((sense) => sense.trGloss && sense.trGloss !== primaryGloss);

  useEffect(() => {
    // Yeni kelimede sıfırdan başlıyor; karşılık geldiğinde 1'e gidiyor.
    glossFade.setValue(0);
    if (!primaryGloss) return;
    const animation = Animated.timing(glossFade, {
      toValue: 1,
      duration: 220,
      useNativeDriver: true,
    });
    animation.start();
    return () => animation.stop();
  }, [primaryGloss, glossFade]);

  const segments = useMemo(
    () =>
      word ? buildSentenceSegments(word.sentenceText, word.surface, word.sentenceCharOffset) : [],
    [word],
  );

  /**
   * Kelimenin GERÇEK dilinde okunacak locale.
   *
   * ÇÖZÜLEN HATA (2026-09-15): burada `language: "en-US"` SABİT
   * KODLANMIŞTI -- Almanca ya da İtalyanca bir kitapta kelimeye dokunan
   * kullanıcı, kelimeyi her zaman İngilizce aksanla duyuyordu. Kelimenin
   * dili kitabın hedef dili, yani kullanıcının AKTİF dil çiftinin
   * `targetLanguage`'ı; ana dili (arayüz dili) DEĞİL.
   *
   * Sorgu zaten 5 dakika taze kalıyor (`useActiveLanguagePairQuery`), yani
   * her kelime kartında yeniden ağa gitmiyor.
   */
  const ttsLocale = getLanguage(activePairQuery.data?.targetLanguage ?? "en")?.ttsLocale ?? "en-US";
  const ttsLanguagePrefix = ttsLocale.split("-")[0] ?? "en";

  const handlePronounce = useCallback(() => {
    if (!word) return;
    // Sözlük hoparlörü bölüm seslendirmesinden BAĞIMSIZ: o stüdyo
    // kaydıyla yapılıyor (ADR-012), burası cihazın kendi sentezleyicisi.
    void getVoiceIdentifier(speechVoiceId, ttsLanguagePrefix).then((voice) => {
      Speech.speak(word.surface, {
        language: ttsLocale,
        ...(voice ? { voice } : {}),
      });
    });
  }, [speechVoiceId, word, ttsLocale, ttsLanguagePrefix]);

  // Stop any in-flight speech whenever the sheet closes -- either via the
  // user dismissing it (onDismiss) or the component unmounting outright
  // (e.g. navigating away from the reader mid-pronunciation).
  const handleDismiss = useCallback(() => {
    Speech.stop();
    onDismiss();
  }, [onDismiss]);

  useEffect(() => {
    return () => {
      Speech.stop();
    };
  }, []);

  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const sentenceTranslation = useSentenceTranslationQuery(word?.sentenceText ?? null);

  /**
   * Kota tavanı mı, başka bir arıza mı?
   *
   * Edge function sebebi hata mesajı olarak veriyor (`free_tier_daily_limit`
   * / `rate_limited`); ikisi kullanıcı için aynı anlama geliyor: bugünlük
   * hak bitti. Diğer hatalar (ağ, sağlayıcı) ayrı bir metin alıyor --
   * "yarın tekrar dene" demek, aslında ağın koptuğu bir durumda yanlış
   * olurdu.
   */
  const sentenceErrorReason =
    sentenceTranslation.error instanceof Error ? sentenceTranslation.error.message : null;
  const sentenceQuotaExhausted =
    sentenceErrorReason === "free_tier_daily_limit" || sentenceErrorReason === "rate_limited";

  // Collapse the detail panel whenever a different word/sentence is
  // opened, so stale content from the previous word can't flash before
  // the new one is ready.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- kasıtlı: farklı bir kelime/cümle açıldığında önceki kelimenin detay panelinin bir an görünüp kaybolmasını (stale flash) önlüyor.
    setIsDetailOpen(false);
  }, [word?.sentenceText]);

  const handleToggleDetail = useCallback(() => {
    setIsDetailOpen((previous) => {
      const next = !previous;
      if (next && !sentenceTranslation.isFetched) {
        void sentenceTranslation.refetch();
      }
      return next;
    });
  }, [sentenceTranslation]);

  const isSaved = lemmaState === "learning";

  const surfaceTitle = word ? word.surface.charAt(0).toUpperCase() + word.surface.slice(1) : "";

  return (
    <SlideUpModal
      visible={wordProp !== null}
      onClose={handleDismiss}
      sheetStyle={[styles.sheet, { backgroundColor: theme.bg.surface }]}
    >
      {word ? (
        <>
          <View style={styles.handle} />

          <View style={styles.sheetHeader}>
            <Text style={[detailType.sheetTitle, { color: detailColors.title }]}>
              {t("reader.wordSheet.definitions")}
            </Text>
            <Pressable
              onPress={onDismiss}
              accessibilityRole="button"
              accessibilityLabel={t("common.close")}
              hitSlop={spacing.md}
            >
              <Ionicons name="close" size={24} color={detailColors.muted} />
            </Pressable>
          </View>

          <View style={styles.wordRow}>
            <View style={styles.wordTexts}>
              <Text style={[detailType.sheetWord, { color: detailColors.green }]}>
                {surfaceTitle}
              </Text>
              {entry?.ipa ? (
                <Text style={[detailType.sheetTitle, styles.ipa]}>{entry.ipa}</Text>
              ) : null}
            </View>
            <Pressable
              onPress={handlePronounce}
              accessibilityRole="button"
              accessibilityLabel={t("reader.wordSheet.pronounce")}
              style={styles.speaker}
            >
              <Ionicons name="volume-high" size={22} color={detailColors.amberInk} />
            </Pressable>
          </View>

          {/* HİYERARŞİ (2026-10-05, kullanıcı bulgusu): kullanıcının aradığı
                  şey çeviri; eskiden "Anlam" etiketi başlık gibi büyük, çevirinin
                  kendisi en küçük gövde yazısıydı ve gözden kaçıyordu. Şimdi
                  etiket küçük ve gri, çeviri kartın en büyük yazısı. */}
          <View style={styles.meaningCard}>
            <View style={styles.meaningHead}>
              <Text style={[homeType.statLabel, { color: detailColors.muted }]}>
                {t("reader.wordSheet.meaning")}
              </Text>
              {entry?.cefrLevel ? <LevelBadge level={entry.cefrLevel} /> : null}
            </View>
            {primaryGloss ? (
              <Animated.Text style={[detailType.heroTitle, styles.gloss, { opacity: glossFade }]}>
                {primaryGloss}
              </Animated.Text>
            ) : isResolvingTranslation ? (
              <View accessibilityLabel={t("reader.wordSheet.lookingUpTranslation")}>
                <Skeleton width={180} height={28} borderRadius={radius.sm} />
              </View>
            ) : (
              <Text style={[detailType.statLabel, { color: detailColors.body }]}>
                {t("reader.wordSheet.noTranslation")}
              </Text>
            )}
          </View>

          <View style={styles.chips}>
            <Animated.View
              style={{
                flex: 1,
                transform: [
                  {
                    scale: savePulse.interpolate({
                      inputRange: [0, 1],
                      outputRange: [1, 1.12],
                    }),
                  },
                ],
              }}
            >
              <Pressable
                onPress={isSaved ? onUnsave : onSave}
                accessibilityRole="button"
                style={[styles.chip, styles.chipSave, isSaved ? styles.chipActive : null]}
              >
                <Text style={[detailType.statLabel, { color: detailColors.amberInk }]}>
                  {t(isSaved ? "reader.wordSheet.savedRemove" : "reader.wordSheet.save")}
                </Text>
              </Pressable>
            </Animated.View>
            <Pressable
              onPress={lemmaState === "known" ? onUnmarkKnown : onMarkKnown}
              accessibilityRole="button"
              style={[styles.chip, styles.chipFlex]}
            >
              <Text style={[detailType.statLabel, { color: detailColors.chipText }]}>
                {t(lemmaState === "known" ? "reader.wordSheet.knownUndo" : "reader.wordSheet.know")}
              </Text>
            </Pressable>
          </View>

          {saveHint ? (
            <Text style={[detailType.statLabel, styles.saveHint, { color: detailColors.green }]}>
              {saveHint}
            </Text>
          ) : null}

          <Pressable
            onPress={handleToggleDetail}
            accessibilityRole="button"
            accessibilityState={{ expanded: isDetailOpen }}
            style={styles.more}
          >
            <Text style={[detailType.sheetMore, { color: detailColors.amberDeep }]}>
              {t("reader.wordSheet.moreDefinitions")}
            </Text>
            <Ionicons
              name={isDetailOpen ? "chevron-up" : "chevron-down"}
              size={16}
              color={detailColors.amberDeep}
            />
          </Pressable>

          {isDetailOpen ? (
            <View style={styles.detailBlock}>
              {otherSenses.length > 0 ? (
                <Text style={[detailType.sheetBody, { color: detailColors.body }]}>
                  {otherSenses
                    .map((sense) =>
                      sense.pos
                        ? t("reader.wordSheet.senseWithPos", {
                            pos: t(`reader.wordSheet.pos.${sense.pos}`, {
                              defaultValue: sense.pos,
                            }),
                            gloss: sense.trGloss,
                          })
                        : sense.trGloss,
                    )
                    .join(" · ")}
                </Text>
              ) : null}

              <Text style={[detailType.sheetBody, { color: detailColors.body }]}>
                {segments.map((segment, index) =>
                  segment.emphasized ? (
                    <Text
                      key={index}
                      style={[
                        styles.emphasis,
                        {
                          color: detailColors.title,
                          backgroundColor: detailColors.wordHighlight,
                        },
                      ]}
                    >
                      {segment.text}
                    </Text>
                  ) : (
                    <Text key={index}>{segment.text}</Text>
                  ),
                )}
              </Text>

              <Pressable
                onPress={() => void sentenceTranslation.refetch()}
                accessibilityRole="button"
                accessibilityLabel={t("reader.sentenceTranslation.toggle")}
              >
                <Text style={[detailType.sheetMore, { color: detailColors.amberDeep }]}>
                  {t("reader.sentenceTranslation.toggle")}
                </Text>
              </Pressable>
              {sentenceTranslation.isFetching ? (
                <Text style={[detailType.sheetBody, { color: detailColors.body }]}>
                  {t("reader.sentenceTranslation.loading")}
                </Text>
              ) : sentenceTranslation.data?.translation ? (
                <Text style={[detailType.sheetBody, { color: detailColors.title }]}>
                  {sentenceTranslation.data.translation}
                </Text>
              ) : sentenceQuotaExhausted ? (
                <Pressable
                  onPress={onSentenceQuotaExhausted}
                  disabled={!onSentenceQuotaExhausted}
                  accessibilityRole={onSentenceQuotaExhausted ? "button" : "text"}
                >
                  <Text style={[detailType.sheetBody, { color: detailColors.body }]}>
                    {t("reader.sentenceTranslation.quotaExhausted")}
                  </Text>
                </Pressable>
              ) : sentenceTranslation.isError ? (
                <Text style={[detailType.sheetBody, { color: detailColors.body }]}>
                  {t("reader.sentenceTranslation.failed")}
                </Text>
              ) : null}
            </View>
          ) : null}

          <Image source={FOOTER} style={styles.footer} contentFit="cover" transition={0} />
        </>
      ) : null}
    </SlideUpModal>
  );
}

const FOOTER = require("../../../../assets/home/sheet-footer.jpg") as number;

const styles = StyleSheet.create({
  sheet: {
    borderTopLeftRadius: detailMetrics.sheetRadius,
    borderTopRightRadius: detailMetrics.sheetRadius,
    overflow: "hidden",
    paddingTop: spacing.sm,
    gap: spacing.md,
  },
  handle: {
    alignSelf: "center",
    width: detailMetrics.handleWidth,
    height: detailMetrics.handleHeight,
    borderRadius: detailMetrics.handleHeight / 2,
    backgroundColor: detailColors.chipBorder,
  },
  // Bütün satırlar AYNI kenar boşluğunda (eskiden üç farklı değer vardı:
  // gutter-3, gutter+10, gutter-3 -- metin sütunları birbirine hizasızdı).
  sheetHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: detailMetrics.gutter,
    paddingTop: spacing.sm,
  },
  wordRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: detailMetrics.gutter,
  },
  wordTexts: {
    flex: 1,
  },
  ipa: {
    color: detailColors.title,
  },
  speaker: {
    width: detailMetrics.speaker,
    height: detailMetrics.speaker,
    borderRadius: detailMetrics.speaker / 2,
    backgroundColor: detailColors.amber,
    alignItems: "center",
    justifyContent: "center",
  },
  meaningCard: {
    marginHorizontal: detailMetrics.gutter,
    padding: homeSpace.lg,
    gap: homeSpace.sm,
    borderRadius: homeMetrics.cardRadius,
    backgroundColor: homeColors.peach,
  },
  meaningHead: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.sm,
  },
  gloss: {
    color: detailColors.title,
  },
  chips: {
    flexDirection: "row",
    gap: homeSpace.md,
    paddingHorizontal: detailMetrics.gutter,
  },
  chip: {
    height: homeMetrics.continueButton + homeSpace.md,
    paddingHorizontal: spacing.ml,
    borderRadius: radius.full,
    borderWidth: 1.5,
    borderColor: detailColors.chipBorder,
    alignItems: "center",
    justifyContent: "center",
  },
  chipFlex: {
    flex: 1,
  },
  chipSave: {
    borderColor: homeColors.peach,
    backgroundColor: homeColors.peach,
  },
  chipActive: {
    backgroundColor: detailColors.amber,
    borderColor: detailColors.amber,
  },
  saveHint: {
    textAlign: "center",
  },
  more: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs,
  },
  detailBlock: {
    gap: spacing.sm,
    paddingHorizontal: detailMetrics.gutter,
  },
  emphasis: {
    fontWeight: "700",
  },
  footer: {
    width: "100%",
    height: detailMetrics.sheetFooter,
    marginTop: spacing.xs,
  },
});
