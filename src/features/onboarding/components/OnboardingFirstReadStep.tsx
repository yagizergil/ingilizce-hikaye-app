import { useMemo, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";

import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";

import { getReadingTypeScale } from "@/theme/tokens/typography";
import { monoType, radius, spacing } from "@/theme";
import { useTheme } from "@/theme/useTheme";
import { LoadingState } from "@/components/ui";
import { lemmatize, splitSentences, tokenize } from "@/features/reader/text/tokenizer";
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
          if (token.type !== "word") return { ...token, lemma: null, sentence: text };
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

  const remaining = Math.max(0, REQUIRED_WORDS - picked.length);
  const ready = picked.length >= REQUIRED_WORDS;

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
            label={ready ? t("onboarding.firstRead.cta") : t("onboarding.firstRead.ctaPending", { count: remaining })}
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
              <Text style={[monoType.label, { color: theme.text.secondary }]}>
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
                  return (
                    <Text
                      key={`w${tokenIndex}`}
                      style={isPicked ? { color: theme.accent, fontWeight: "700" } : undefined}
                      onPress={() =>
                        setActive({
                          surface: token.text,
                          lemma: token.lemma as string,
                          sentenceText: token.sentence,
                          paragraphId: paragraph.key,
                        })
                      }
                    >
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
                style={[styles.chip, { backgroundColor: theme.bg.surface, borderColor: theme.accent }]}
              >
                <Text style={[monoType.meta, { color: theme.text.primary }]}>{word.surface}</Text>
                <Ionicons
                  name="close"
                  size={14}
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
    gap: spacing.xxs,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.full,
    borderWidth: 1,
  },
  chipEmpty: {
    width: 84,
    height: 34,
    borderRadius: radius.full,
    borderWidth: 1,
    borderStyle: "dashed",
  },
});
