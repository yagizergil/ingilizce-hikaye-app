import { forwardRef, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { BottomSheetModal, BottomSheetView, BottomSheetBackdrop } from "@gorhom/bottom-sheet";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import * as Speech from "expo-speech";

import { spacing, monoType, readingType, type, tabBarIconSize } from "@/theme";
import { Button, LevelBadge } from "@/components/ui";
import { useReaderThemeColors } from "@/features/reader/hooks/useReaderThemeColors";
import { getVoiceIdentifier } from "@/features/reader/tts/englishVoice";
import { useReaderSettings } from "@/features/reader/hooks/useReaderSettings";
import { useGlobalLemmaLookup } from "@/features/reader/api/useGlobalLemmaLookup";
import { useLiveWordTranslation } from "@/features/reader/api/useLiveWordTranslation";
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

export const WordSheet = forwardRef<BottomSheetModal, WordSheetProps>(function WordSheet(
  { word, lemmaDictionary, lemmaState, onSave, onUnsave, onMarkKnown, onUnmarkKnown, onDismiss },
  ref,
) {
  const { t } = useTranslation();
  const readerColors = useReaderThemeColors();
  const speechVoiceId = useReaderSettings((state) => state.speechVoiceId);
  const snapPoints = useMemo(() => ["55%"], []);

  // Kitap sözlüğünde ARANACAK ADAYLAR (bkz. tokenizer.js
  // `lemmaCandidates`): cihazdaki kural tabanlı gövdeleyici tek bir kök
  // üretmek zorunda kaldığında "hotter" -> "hott", "happier" -> "happi"
  // gibi sözlükte olmayan kökler çıkarıyor ve kullanıcı yaygın bir kelimede
  // "karşılık bulunamadı" görüyordu. Adayları sırayla deneyip ilk tutanı
  // kullanmak, kuralları tek tek sıkılaştırmaktan hem daha güvenli hem
  // daha kapsayıcı.
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

  const bookEntry = bookLookup.entry;
  // Task 1: per-book dictionary miss -> point lookup against the global
  // lemma_canonical table. Only enabled once we know the book dictionary
  // missed, and only while the sheet actually has a word open, so this
  // never blocks the sheet opening (it fires as a secondary enrichment
  // fetch after the sheet is already visible).
  const bookMissed = word !== null && !bookEntry;
  const globalLookup = useGlobalLemmaLookup(
    bookMissed ? word.lemma : null,
    bookMissed ? word.surface : null,
  );
  const globalEntry = globalLookup.data ?? undefined;

  // Task 4: 3rd-tier live-translation fallback. Only fires once BOTH the
  // per-book dictionary AND the global lemma_canonical lookup have missed
  // (globalLookup settled with no result), and only once per word (guarded
  // by lastLiveRequestedLemmaRef) -- re-opening the sheet on the same
  // unresolved word should not re-trigger a fresh LLM call every time.
  const liveTranslation = useLiveWordTranslation();
  const lastLiveRequestedLemmaRef = useRef<string | null>(null);
  const bothMissed = bookMissed && globalLookup.isFetched && !globalEntry;

  useEffect(() => {
    if (!word || !bothMissed) return;
    if (lastLiveRequestedLemmaRef.current === word.lemma) return;
    lastLiveRequestedLemmaRef.current = word.lemma;
    liveTranslation.mutate({
      surface: word.surface,
      lemma: word.lemma,
      contextSentence: word.sentenceText,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- liveTranslation is a mutation object, intentionally excluded (would re-run on every render otherwise)
  }, [word, bothMissed]);

  useEffect(() => {
    if (!word) lastLiveRequestedLemmaRef.current = null;
  }, [word]);

  const liveEntry: BookLemmaEntry | undefined = liveTranslation.data
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

  const entry = bookEntry ?? globalEntry ?? liveEntry;
  const isResolvingTranslation =
    bookMissed && (globalLookup.isLoading || (bothMissed && liveTranslation.isPending));

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
  const hint = word ? inflectionHint(word.surface) : null;
  const primarySense = (hint && senses.find((sense) => sense.pos === hint)) || null;
  const primaryGloss = primarySense?.trGloss ?? entry?.trGloss ?? null;
  const otherSenses = senses.filter((sense) => sense.trGloss && sense.trGloss !== primaryGloss);

  const segments = useMemo(
    () =>
      word ? buildSentenceSegments(word.sentenceText, word.surface, word.sentenceCharOffset) : [],
    [word],
  );

  const renderBackdrop = useCallback(
    (props: React.ComponentProps<typeof BottomSheetBackdrop>) => (
      <BottomSheetBackdrop
        {...props}
        appearsOnIndex={0}
        disappearsOnIndex={-1}
        pressBehavior="close"
      />
    ),
    [],
  );

  const handlePronounce = useCallback(() => {
    if (!word) return;
    // Sesli okumayla AYNI sesi kullanıyor: kullanıcının seçimi tek yerde.
    void getVoiceIdentifier(speechVoiceId).then((voice) => {
      Speech.speak(word.surface, {
        language: "en-US",
        ...(voice ? { voice } : {}),
      });
    });
  }, [speechVoiceId, word]);

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

  const [isSentenceTranslationOpen, setIsSentenceTranslationOpen] = useState(false);
  const sentenceTranslation = useSentenceTranslationQuery(word?.sentenceText ?? null);

  // Collapse the translation row whenever a different word/sentence is
  // opened, so a stale translation from the previous word can't flash
  // before the new one is fetched.
  useEffect(() => {
    setIsSentenceTranslationOpen(false);
  }, [word?.sentenceText]);

  const handleToggleSentenceTranslation = useCallback(() => {
    setIsSentenceTranslationOpen((previous) => {
      const next = !previous;
      if (next && !sentenceTranslation.isFetched) {
        void sentenceTranslation.refetch();
      }
      return next;
    });
  }, [sentenceTranslation]);

  return (
    <BottomSheetModal
      ref={ref}
      snapPoints={snapPoints}
      onDismiss={handleDismiss}
      backdropComponent={renderBackdrop}
      backgroundStyle={{ backgroundColor: readerColors.background }}
      handleIndicatorStyle={{ backgroundColor: readerColors.textMuted }}
    >
      <BottomSheetView style={styles.container}>
        {word ? (
          <>
            <View style={styles.headerRow}>
              <Text style={[type.wordLemma, { color: readerColors.text }]}>{word.lemma}</Text>
              {entry?.cefrLevel ? <LevelBadge level={entry.cefrLevel} /> : null}
            </View>

            {entry?.ipa ? (
              <View style={styles.pronounceRow}>
                <Text style={[monoType.wordGlossMono, { color: readerColors.textMuted }]}>
                  {entry.ipa}
                </Text>
                <Text
                  style={[
                    monoType.wordGlossMono,
                    styles.pronounceButton,
                    { color: readerColors.text },
                  ]}
                  onPress={handlePronounce}
                  accessibilityRole="button"
                  accessibilityLabel={t("reader.wordSheet.pronounce")}
                >
                  {t("reader.wordSheet.pronounce")}
                </Text>
              </View>
            ) : (
              <Text
                style={[
                  monoType.wordGlossMono,
                  styles.pronounceButtonAlone,
                  { color: readerColors.text },
                ]}
                onPress={handlePronounce}
                accessibilityRole="button"
                accessibilityLabel={t("reader.wordSheet.pronounce")}
              >
                {t("reader.wordSheet.pronounce")}
              </Text>
            )}

            {primaryGloss ? (
              <View style={styles.glossBlock}>
                <Text style={[readingType.gloss, { color: readerColors.text }]}>
                  {primaryGloss}
                </Text>
                {otherSenses.length > 0 ? (
                  <Text style={[monoType.rowText, { color: readerColors.textMuted }]}>
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
              </View>
            ) : isResolvingTranslation ? (
              <Text style={[readingType.gloss, { color: readerColors.textMuted }]}>
                {t("reader.wordSheet.lookingUpTranslation")}
              </Text>
            ) : (
              <Text style={[readingType.gloss, { color: readerColors.textMuted }]}>
                {t("reader.wordSheet.noTranslation")}
              </Text>
            )}

            <View style={styles.sentenceRow}>
              <Text style={[monoType.rowText, styles.sentence, { color: readerColors.textMuted }]}>
                {segments.map((segment, index) =>
                  segment.emphasized ? (
                    <Text
                      key={index}
                      style={[
                        styles.emphasis,
                        { color: readerColors.text, backgroundColor: readerColors.highlight },
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
                onPress={handleToggleSentenceTranslation}
                accessibilityRole="button"
                accessibilityLabel={t("reader.sentenceTranslation.toggle")}
                accessibilityState={{ expanded: isSentenceTranslationOpen }}
                hitSlop={spacing.sm}
                style={styles.sentenceTranslationToggle}
              >
                <Ionicons
                  name="options-outline"
                  size={tabBarIconSize}
                  color={isSentenceTranslationOpen ? readerColors.text : readerColors.textMuted}
                />
              </Pressable>
            </View>

            {isSentenceTranslationOpen ? (
              <Text
                style={[
                  readingType.gloss,
                  styles.sentenceTranslationText,
                  { color: readerColors.text },
                ]}
              >
                {sentenceTranslation.isFetching
                  ? t("reader.sentenceTranslation.loading")
                  : sentenceTranslation.isError
                    ? t("reader.sentenceTranslation.error")
                    : (sentenceTranslation.data?.translation ?? "")}
              </Text>
            ) : null}

            <View style={styles.actions}>
              {/* 3-state button matrix, driven entirely by `lemmaState`
                  (see ADR note in useSavedWordsQuery.ts's LemmaState):
                  - "new":      [Kaydet]              [Biliyorum]
                  - "learning": [Kaydedildi — kaldır]  [Biliyorum]
                  - "known":    [Kaydet]               [Biliyorsun — geri al] */}
              {lemmaState === "learning" ? (
                <Button
                  label={t("reader.wordSheet.savedRemove")}
                  onPress={onUnsave}
                  variant="secondary"
                  fullWidth
                />
              ) : (
                <Button label={t("reader.wordSheet.save")} onPress={onSave} fullWidth />
              )}

              {lemmaState === "known" ? (
                <Button
                  label={t("reader.wordSheet.knownUndo")}
                  onPress={onUnmarkKnown}
                  variant="secondary"
                  fullWidth
                />
              ) : (
                <Button
                  label={t("reader.wordSheet.know")}
                  onPress={onMarkKnown}
                  variant="secondary"
                  fullWidth
                />
              )}
            </View>
          </>
        ) : null}
      </BottomSheetView>
    </BottomSheetModal>
  );
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
    gap: spacing.sm,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  pronounceRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  pronounceButton: {
    textDecorationLine: "underline",
  },
  pronounceButtonAlone: {
    textDecorationLine: "underline",
    alignSelf: "flex-start",
  },
  glossBlock: {
    gap: spacing.xxs,
  },
  sentenceRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  sentence: {
    flex: 1,
  },
  sentenceTranslationToggle: {
    paddingTop: spacing.xxs,
  },
  sentenceTranslationText: {
    marginTop: spacing.xxs,
  },
  emphasis: {
    fontWeight: "700",
  },
  actions: {
    marginTop: spacing.md,
    gap: spacing.sm,
  },
});
