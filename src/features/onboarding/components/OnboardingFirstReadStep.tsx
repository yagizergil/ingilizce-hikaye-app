import { useEffect, useMemo, useState } from "react";
import { Animated, ScrollView, StyleSheet, Text, View } from "react-native";

import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";

import { getReadingTypeScale } from "@/theme/tokens/typography";
import { monoType, motion, radius, spacing } from "@/theme";
import { useTheme } from "@/theme/useTheme";
import { useReduceMotion } from "@/hooks/useReduceMotion";
import { LoadingState } from "@/components/ui";
import {
  isNumericToken,
  lemmatize,
  splitSentences,
  tokenize,
} from "@/features/reader/text/tokenizer";
import { WordSheet } from "@/features/reader/components/WordSheet";

import { OnboardingFooterButton } from "@/features/onboarding/components/OnboardingFooterButton";
import { OnboardingScaffold } from "@/features/onboarding/components/OnboardingScaffold";

import type { WordSheetWord } from "@/features/reader/components/WordSheet";
import type { OnboardingPassage } from "@/features/onboarding/api/useOnboardingContentQuery";

/**
 * İlk okuma adımı (referans: `bookvo-06-ilk-okuma.jpeg` ve `06b`).
 *
 * MEKANİK: gerçek bir pasaj gösteriliyor, kullanıcı öğrenmek istediği
 * kelimelere dokunuyor. Dokunulan kelime vurgulanıyor ve altta bir çipe
 * dönüşüyor; hedef sayıya ulaşınca alt düğme etkinleşiyor. Referansta da
 * ipucu balonu "öğrenmek istediğin 3 kelimeye dokun" diyor ve düğme o ana
 * kadar pasif ("Alıştırma için 3 kelime kaydet").
 *
 * PASAJ GERÇEK: kullanıcının seçtiği hedef dilde, seviyesine yakın bir
 * kitabın ilk paragrafları (bkz. `useOnboardingContentQuery`).
 *
 * KELİME KARTI OLARAK `WordSheet` YENİDEN KULLANILIYOR: onboarding'de
 * ayrı bir kart yazmak, uygulamanın geri kalanıyla davranışın (IPA, diğer
 * anlamlar, telaffuz, AI çevirisi, kaydetme) zamanla ayrışması demekti.
 * Aynı bileşen, aynı sözlük zinciri.
 */

/** Referansta üç kelime isteniyor; aynı eşik. */
const REQUIRED_WORDS = 3;

export interface OnboardingWord {
  surface: string;
  lemma: string;
  /** Kartta gösterilen karşılık -- çiplerde ve alıştırmada kullanılıyor. */
  gloss: string | null;
}

interface OnboardingFirstReadStepProps {
  progress: number;
  passage: OnboardingPassage | null;
  loading: boolean;
  level: string | null;
  picked: OnboardingWord[];
  onPick: (word: OnboardingWord) => void;
  onUnpick: (lemma: string) => void;
  onContinue: () => void;
  /** Pasaj yoksa (içerik gelmediyse) adım atlanabilmeli. */
  onSkip: () => void;
}

export function OnboardingFirstReadStep({
  progress,
  passage,
  loading,
  level,
  picked,
  onPick,
  onUnpick,
  onContinue,
  onSkip,
}: OnboardingFirstReadStepProps) {
  const { t } = useTranslation();
  const { theme } = useTheme();

  const [active, setActive] = useState<WordSheetWord | null>(null);

  const pickedLemmas = useMemo(() => new Set(picked.map((word) => word.lemma)), [picked]);
  const readingStyle = useMemo(() => getReadingTypeScale().paragraph, []);

  /**
   * Pasajı kelime kelime render edilebilir parçalara böler.
   *
   * Reader'ın kendi tokenizer'ı kullanılıyor -- ayrı bir bölme mantığı
   * yazmak, aynı kelimenin iki ekranda farklı köke çözülmesine yol açardı.
   */
  const rendered = useMemo(() => {
    if (!passage) return [];
    return passage.paragraphs.map((text, paragraphIndex) => {
      const sentences = splitSentences(text);
      const tokens = tokenize(text);
      return {
        key: `p${paragraphIndex}`,
        text,
        tokens: tokens.map((token) => {
          // DENETİM BULGUSU (2026-09-18, kullanıcı geri bildirimi): salt
          // rakamlardan oluşan token'lar ("1945" gibi) sözlük kelimesi
          // değil -- pasajdaki GERÇEK kelime havuzunu daraltıp "3 kelime
          // seç" hedefini bazı kısa pasajlarda imkansız hale getiriyordu.
          // Bkz. tokenizer.js'teki `isNumericToken` doc comment'i.
          if (token.type !== "word" || isNumericToken(token.text)) {
            return { ...token, lemma: null, sentence: text };
          }
          const sentence = sentences.find((s) => token.start >= s.start && token.start < s.end);
          return {
            ...token,
            lemma: lemmatize(token.text),
            sentence: sentence?.text ?? text,
          };
        }),
      };
    });
  }, [passage]);

  /**
   * DENETİM BULGUSU (2026-09-18, kullanıcı geri bildirimi): "İlla üç tane
   * seçmem gerekiyo, o da olmaz" -- bazı pasajlarda (özellikle kısa/tek
   * cümlelik B2 örnekleri) 3'ten AZ gerçek (rakam olmayan) kelime
   * bulunuyordu, yani kullanıcı hedefe ULAŞMASI YAPISAL OLARAK MÜMKÜN
   * DEĞİLDİ -- onboarding'in bu adımında kalıcı olarak sıkışıyordu.
   * Gereken sayı artık pasajda GERÇEKTEN bulunan farklı kelime sayısını
   * aşamıyor; pasajda hiç seçilebilir kelime yoksa adım hiç engel
   * koymuyor (0 gerekiyor, buton baştan aktif).
   */
  const availableWordCount = useMemo(() => {
    const lemmas = new Set<string>();
    for (const paragraph of rendered) {
      for (const token of paragraph.tokens) {
        if (token.lemma) lemmas.add(token.lemma);
      }
    }
    return lemmas.size;
  }, [rendered]);
  const requiredWords = Math.min(REQUIRED_WORDS, availableWordCount);

  /**
   * YÖNLENDİRME (2026-09-19, kullanıcı geri bildirimi + video).
   *
   * İki ayrı şikâyet vardı: (1) kullanıcılar pasajdaki kelimelerin
   * DOKUNULABİLİR olduğunu fark etmiyor, (2) dokununca açılan karttaki üç
   * ikondan hangisinin kaydettiğini bilemiyorlardı. İkisi birleşince adımda
   * sıkışıyorlardı -- "3 kelime daha seç" yazısı hiç değişmiyordu.
   *
   * (1) için İKİ katman var:
   *   - Kalıcı ipucu: dokunulabilir HER kelimenin altında ince noktalı
   *     çizgi. Asıl düzeltme bu -- tek bir kelimeyi oynatmak "şu kelimeye
   *     dokun" der, "kelimeler dokunulabilir" demez.
   *   - Nabız: TEK bir kelimenin arkasında nefes alan bir vurgu.
   *
   * NEDEN VURGU, NEDEN ÖLÇEK DEĞİL: iOS'ta bir `<Text>` içindeki `<Text>`
   * bir view DEĞİL, üst paragrafın attributed string'inde bir aralık.
   * `transform` bir view özelliği; satır içi metinde karşılığı YOK (TS
   * kabul ediyor çünkü `TextStyle extends ViewStyle`, ama sessizce
   * düşüyor). Satır içinde gerçekten canlandırılabilen şeyler `color` ve
   * `backgroundColor`; `fontSize`/`fontWeight` ise her karede bütün
   * paragrafı yeniden dizerdi. Ölçek nabzı kartın KAYDET düğmesinde --
   * orası gerçek bir view (bkz. `WordSheet`in `savePulse` notu).
   *
   * Vurgu `accent` DEĞİL, nötr `highlight`: accent bu ekranda zaten
   * "seçildi" anlamını taşıyor ve ikisini karıştırmak mevcut karışıklığa
   * ekleme yapardı.
   */
  const needsGuidance = picked.length === 0;
  const reduceMotion = useReduceMotion();
  const [wordPulse] = useState(() => new Animated.Value(0));

  /**
   * Nabzın çalacağı kelime. İlk paragraf BİLEREK atlanıyor: seviye rozeti
   * (`levelPill`) kartın sağ üstünde duruyor ve ona bir satır uzaklıktaki
   * renkli bir vurgu, aynı "buraya bak" işini yapan iki rozet gibi okunuyor.
   */
  const pulseTokenKey = useMemo(() => {
    const paragraph = rendered[1] ?? rendered[0];
    if (!paragraph) return null;
    const index = paragraph.tokens.findIndex(
      (token) => token.type === "word" && token.lemma !== null,
    );
    return index === -1 ? null : `${paragraph.key}:${index}`;
  }, [rendered]);

  useEffect(() => {
    if (!needsGuidance || pulseTokenKey === null) {
      wordPulse.setValue(0);
      return;
    }
    if (reduceMotion) {
      // Hareket yok ama sinyal var: vurgu sabit kalıyor.
      wordPulse.setValue(1);
      return;
    }
    /**
     * SINIRLI SAYIDA TEKRAR. Sürekli yanıp sönen bir kelime, okunmaya
     * çalışılan bir metnin ortasında dırdır gibi ve "bozuk render" gibi
     * duruyor. Altı tur sonra sönüyor; noktalı çizgi kalıcı ipucu olarak
     * kalıyor.
     */
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(wordPulse, {
          toValue: 1,
          duration: motion.duration.slow,
          // Renk/arka plan native sürücüyle canlandırılamıyor.
          useNativeDriver: false,
        }),
        Animated.timing(wordPulse, {
          toValue: 0,
          duration: motion.duration.slow,
          useNativeDriver: false,
        }),
      ]),
      { iterations: 6 },
    );
    loop.start();
    return () => loop.stop();
  }, [needsGuidance, pulseTokenKey, reduceMotion, wordPulse]);

  const remaining = Math.max(0, requiredWords - picked.length);
  const ready = picked.length >= requiredWords;

  if (loading) {
    return (
      <OnboardingScaffold progress={progress} title={t("onboarding.firstRead.title")}>
        <LoadingState />
      </OnboardingScaffold>
    );
  }

  // İçerik gelmediyse (ağ hatası ya da o dilde bölüm yok) adımı sessizce
  // atlatıyoruz -- boş bir okuma kartı göstermek akışı tıkardı.
  if (!passage) {
    return (
      <OnboardingScaffold
        progress={progress}
        title={t("onboarding.firstRead.title")}
        subtitle={t("onboarding.firstRead.unavailable")}
        footer={<OnboardingFooterButton label={t("common.continue")} onPress={onSkip} />}
      />
    );
  }

  return (
    <>
      <OnboardingScaffold
        progress={progress}
        title={t("onboarding.firstRead.title")}
        subtitle={t("onboarding.firstRead.subtitle")}
        footer={
          <OnboardingFooterButton
            label={
              ready
                ? t("onboarding.firstRead.cta")
                : t("onboarding.firstRead.ctaPending", { count: remaining })
            }
            onPress={onContinue}
            disabled={!ready}
          />
        }
      >
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          <View
            style={[
              styles.card,
              { backgroundColor: theme.bg.surface, borderColor: theme.border.hairline },
            ]}
          >
            {/* Referanstaki "A1 · sana göre uyarlandı" rozetinin karşılığı:
                pasajın gerçekten hangi seviyeden geldiğini söylüyor. */}
            <View style={[styles.levelPill, { backgroundColor: theme.bg.primary }]}>
              <Text style={[monoType.rowText, { color: theme.text.secondary }]}>
                {t("onboarding.firstRead.levelPill", { level: level ?? "A1" })}
              </Text>
            </View>

            {rendered.map((paragraph) => (
              <Text key={paragraph.key} style={[readingStyle, { color: theme.text.primary }]}>
                {paragraph.tokens.map((token, tokenIndex) => {
                  if (token.type !== "word" || !token.lemma) {
                    return <Text key={`o${tokenIndex}`}>{token.text}</Text>;
                  }
                  const isPicked = pickedLemmas.has(token.lemma);
                  const isPulsing =
                    needsGuidance && pulseTokenKey === `${paragraph.key}:${tokenIndex}`;
                  const onPressWord = () =>
                    setActive({
                      surface: token.text,
                      lemma: token.lemma as string,
                      sentenceText: token.sentence,
                      paragraphId: paragraph.key,
                    });

                  // Seçilmiş kelimede noktalı çizgi KALKIYOR: ipucu
                  // "dokunabilirsin" demek, seçilenin işi bitti.
                  const affordance = isPicked
                    ? { color: theme.accent, fontWeight: "700" as const }
                    : {
                        textDecorationLine: "underline" as const,
                        textDecorationStyle: "dotted" as const,
                        textDecorationColor: theme.border.hairline,
                      };

                  if (isPulsing) {
                    return (
                      <Animated.Text
                        key={`w${tokenIndex}`}
                        style={[
                          affordance,
                          {
                            backgroundColor: wordPulse.interpolate({
                              inputRange: [0, 1],
                              outputRange: ["transparent", theme.secondaryMuted],
                            }),
                          },
                        ]}
                        onPress={onPressWord}
                      >
                        {token.text}
                      </Animated.Text>
                    );
                  }

                  return (
                    <Text key={`w${tokenIndex}`} style={affordance} onPress={onPressWord}>
                      {token.text}
                    </Text>
                  );
                })}
              </Text>
            ))}
          </View>

          {/* Seçilen kelimelerin çipleri -- referansta da kartın altında. */}
          <View style={styles.chips}>
            {picked.map((word) => (
              <View
                key={word.lemma}
                style={[
                  styles.chip,
                  { backgroundColor: theme.bg.surface, borderColor: theme.accent },
                ]}
              >
                <Text style={[monoType.rowText, { color: theme.text.primary }]}>
                  {word.surface}
                </Text>
                <Ionicons
                  name="close"
                  size={16}
                  color={theme.text.secondary}
                  onPress={() => onUnpick(word.lemma)}
                />
              </View>
            ))}
            {Array.from({ length: remaining }).map((_, slot) => (
              <View
                key={`slot${slot}`}
                style={[styles.chipEmpty, { borderColor: theme.border.hairline }]}
              />
            ))}
          </View>
        </ScrollView>
      </OnboardingScaffold>

      {/* Kelime kartı: uygulamanın kendi kartı. Kaydetme burada listeye
          ekliyor -- onboarding'de henüz kelime defteri akışı başlamadı. */}
      <WordSheet
        word={active}
        lemmaDictionary={EMPTY_DICTIONARY}
        lemmaState={active && pickedLemmas.has(active.lemma) ? "learning" : "new"}
        onSave={() => {
          if (!active) return;
          onPick({ surface: active.surface, lemma: active.lemma, gloss: null });
        }}
        onUnsave={() => {
          if (active) onUnpick(active.lemma);
        }}
        saveHint={needsGuidance ? t("onboarding.firstRead.saveHint") : null}
        onMarkKnown={() => undefined}
        onUnmarkKnown={() => undefined}
        onDismiss={() => setActive(null)}
      />
    </>
  );
}

/** Onboarding'de kitap sözlüğü yok; karşılık genel aramadan geliyor. */
const EMPTY_DICTIONARY = new Map();

const styles = StyleSheet.create({
  scroll: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.xl,
    gap: spacing.md,
  },
  card: {
    padding: spacing.md,
    borderRadius: radius.cover,
    borderWidth: StyleSheet.hairlineWidth,
    gap: spacing.sm,
  },
  levelPill: {
    alignSelf: "flex-end",
    paddingHorizontal: spacing.xs,
    paddingVertical: spacing.xxs,
    borderRadius: radius.full,
  },
  chips: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs,
    justifyContent: "center",
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    // Metin 10 -> 13 pt büyüdü; yükseklik onunla birlikte artmazsa kelime
    // çemberin içinde sıkışık durur.
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.full,
    borderWidth: 1,
  },
  chipEmpty: {
    width: 92,
    height: 38,
    borderRadius: radius.full,
    borderWidth: 1,
    borderStyle: "dashed",
  },
});
