import { useCallback } from "react";
import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";

import { Ionicons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import { useTranslation } from "react-i18next";
import { router } from "expo-router";

import { monoType, radius, spacing, type, mascotSize } from "@/theme";
import { useTheme } from "@/theme/useTheme";
import { trackEvent } from "@/lib/analytics";
import {
  Button,
  EmptyState,
  ErrorState,
  LoadingState,
  MascotAnim,
  SkyHeader,
  useToast,
} from "@/components/ui";

import { useWordPackQuery } from "@/features/vocabulary/api/useWordPackQuery";
import { useAddPackToDecksMutation } from "@/features/vocabulary/api/useAddPackToDecksMutation";

import type { WordPackWord } from "@/features/vocabulary/api/useWordPackQuery";

/** Ücretsiz kullanıcıya açık gösterilen kelime sayısı; gerisi bulanık. */
const FREE_VISIBLE_WORDS = 3;
/** Kilitli listede bulanık gösterilen satır sayısı (listenin devamı hissi). */
const BLURRED_ROWS = 8;

/**
 * Bulanık önizleme satırları. Sunucu ücretsiz kullanıcıya yalnızca 5 kelime
 * gönderiyor; gerisi hiç gelmiyor, yani satırların bir kısmı bilerek aynı
 * kelimelerin tekrarı -- bulanıklığın altında okunamıyorlar ve bir şey vaat
 * etmiyorlar. Kilit gerçekten sunucuda (migration 050).
 */
function blurredPreviewWords(words: WordPackWord[]): WordPackWord[] {
  if (words.length === 0) return [];
  return Array.from(
    { length: BLURRED_ROWS },
    (_, index) => words[(FREE_VISIBLE_WORDS + index) % words.length] as WordPackWord,
  );
}

function PackWordRow({ word }: { word: WordPackWord }) {
  const { theme } = useTheme();
  return (
    <View style={[styles.row, { borderColor: theme.border.hairline }]}>
      <Text style={[type.chapterRowTitle, { color: theme.text.primary }]}>{word.lemma}</Text>
      <Text
        style={[monoType.rowText, styles.gloss, { color: theme.text.secondary }]}
        numberOfLines={1}
      >
        {word.gloss ?? "—"}
      </Text>
    </View>
  );
}

interface WordPackScreenProps {
  level: string;
  onClose: () => void;
}

/**
 * Keşfet paketi detayı. Ücretsiz kullanıcı sunucunun döndürdüğü 5 kelimelik
 * önizlemeyi ve kilitli bir kartı görüyor (reader dışında, kullanıcının
 * kendi açtığı bir ekran -- Ürün İlkesi #1 ile uyumlu). Premium tam listeyi
 * tek dokunuşla kendi destesine çeviriyor.
 */
export function WordPackScreen({ level, onClose }: WordPackScreenProps) {
  const { t } = useTranslation();
  const { theme, themeName } = useTheme();
  const { show: showToast } = useToast();
  const pack = useWordPackQuery(level);
  const addPack = useAddPackToDecksMutation();

  const handleUnlock = useCallback(() => {
    trackEvent("paywall_opened", { source: "word_pack" });
    router.push("/paywall?source=word_pack");
  }, []);

  const handleAdd = useCallback(() => {
    if (!pack.data) return;
    addPack.mutate(
      {
        name: t("vocabulary.packs.deckName", { level }),
        level,
        words: pack.data.words,
      },
      {
        onSuccess: (deckId) => {
          showToast(t("vocabulary.packs.added"));
          router.replace(`/deck/${deckId}`);
        },
        onError: () => showToast(t("vocabulary.packs.addError")),
      },
    );
  }, [addPack, level, pack.data, showToast, t]);

  const renderWord = useCallback(
    ({ item }: { item: WordPackWord }) => <PackWordRow word={item} />,
    [],
  );

  const title = t("vocabulary.packs.cardTitle", { level });

  let body;
  if (pack.isLoading || (!pack.data && !pack.isError)) {
    body = <LoadingState message={t("vocabulary.packs.loading")} />;
  } else if (pack.isError || !pack.data) {
    body = <ErrorState message={t("vocabulary.packs.error")} onRetry={() => void pack.refetch()} />;
  } else if (pack.data.words.length === 0) {
    body = (
      <EmptyState
        title={t("vocabulary.packs.emptyTitle")}
        description={t("vocabulary.packs.emptyBody")}
      />
    );
  } else {
    const data = pack.data;
    const visible = data.locked ? data.words.slice(0, FREE_VISIBLE_WORDS) : data.words;
    body = (
      <FlatList
        data={visible}
        keyExtractor={(item) => item.lemma}
        renderItem={renderWord}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          <Text style={[monoType.rowText, styles.intro, { color: theme.text.secondary }]}>
            {t("vocabulary.packs.intro", { level })}
          </Text>
        }
        ListFooterComponent={
          data.locked ? (
            <View>
              {/*
              KULLANICI BULGUSU (2026-09-25): önceki sürüm bulanıklığı
              saydam metin + textShadow ile taklit ediyordu; iOS saydam
              metnin gölgesini çizmiyor, geriye yalnızca boş ayırıcı
              çizgiler kalıyordu. Satırlar artık normal çiziliyor ve
              üstüne gerçek bir BlurView biniyor.
            */}
              <Pressable
                onPress={handleUnlock}
                accessibilityElementsHidden
                importantForAccessibility="no-hide-descendants"
                style={styles.blurredList}
              >
                {blurredPreviewWords(data.words).map((word, index) => (
                  <PackWordRow key={`blur-${index}`} word={word} />
                ))}
                <BlurView
                  intensity={22}
                  tint={themeName === "dark" ? "dark" : "light"}
                  style={StyleSheet.absoluteFill}
                />
              </Pressable>
              <Pressable
                onPress={handleUnlock}
                accessibilityRole="button"
                style={[
                  styles.locked,
                  { backgroundColor: theme.accentMuted, borderColor: theme.accent },
                ]}
              >
                <Ionicons name="lock-closed" size={22} color={theme.accent} />
                <Text style={[type.chapterRowTitle, styles.center, { color: theme.text.primary }]}>
                  {t("vocabulary.packs.lockedTitle", { count: data.total - FREE_VISIBLE_WORDS })}
                </Text>
                <Text style={[monoType.metaTight, styles.center, { color: theme.text.secondary }]}>
                  {t("vocabulary.packs.lockedBody")}
                </Text>
                <Button label={t("vocabulary.packs.unlock")} onPress={handleUnlock} fullWidth />
              </Pressable>
            </View>
          ) : (
            <View style={styles.footer}>
              <Button
                label={t("vocabulary.packs.addToDecks")}
                onPress={handleAdd}
                loading={addPack.isPending}
                disabled={addPack.isPending}
                fullWidth
              />
            </View>
          )
        }
      />
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.bg.primary }]}>
      <SkyHeader
        title={title}
        onBack={onClose}
        art={<MascotAnim name="words" width={mascotSize.header} />}
      />
      {body}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  list: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.screenBottom,
  },
  intro: {
    paddingBottom: spacing.md,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  gloss: {
    flexShrink: 1,
    textAlign: "right",
  },
  blurredList: {
    overflow: "hidden",
  },
  locked: {
    marginTop: spacing.lg,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    padding: spacing.lg,
    gap: spacing.sm,
    alignItems: "center",
  },
  center: {
    textAlign: "center",
  },
  footer: {
    paddingTop: spacing.lg,
  },
});
