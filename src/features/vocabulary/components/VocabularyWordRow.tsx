import { Pressable, StyleSheet, Text, View } from "react-native";

import { useTranslation } from "react-i18next";

import {
  badgePadding,
  levelAccent,
  monoType,
  motion,
  radius,
  readingType,
  spacing,
  type,
} from "@/theme";
import { useTheme } from "@/theme/useTheme";

import { formatDueLabel } from "@/features/vocabulary/api/formatDueLabel";
import { formatPosLabel } from "@/features/vocabulary/api/formatPosLabel";

import type { VocabularyWord } from "@/features/vocabulary/types";

interface VocabularyWordRowProps {
  word: VocabularyWord;
  onPress: (word: VocabularyWord) => void;
}

/**
 * vocabulary.html `.word` — a CSS grid (`1fr auto`) with lemma+due on the
 * first row and gloss+source on the second, tags wrapping full-width below.
 * Replicated here with two explicit two-column rows (RN has no implicit
 * grid), which produces the same baseline-aligned layout as the mockup's
 * `align-items:baseline`.
 */
export function VocabularyWordRow({ word, onPress }: VocabularyWordRowProps) {
  const { t } = useTranslation();
  const { theme } = useTheme();

  const dueLabel = formatDueLabel(t, word.dueAt);
  const posLabel = formatPosLabel(t, word.pos);

  const tags = [posLabel, word.cefrLevel].filter((tag): tag is string => tag !== null);

  // Kelimenin seviyesi sol kenarda bir şerit olarak duruyor — kitap
  // listesindeki desenle aynı, defter de aynı dili konuşuyor.
  const stripe =
    word.cefrLevel != null && word.cefrLevel in levelAccent
      ? levelAccent[word.cefrLevel as keyof typeof levelAccent]
      : theme.border.hairline;

  return (
    <Pressable
      style={({ pressed }) => [
        styles.row,
        { backgroundColor: theme.bg.surface, borderColor: theme.border.hairline },
        pressed ? { opacity: motion.pressed.opacity } : null,
      ]}
      onPress={() => onPress(word)}
      accessibilityRole="button"
      accessibilityLabel={t("vocabulary.word.accessibilityLabel", {
        lemma: word.lemma,
        gloss: word.gloss ?? "",
      })}
    >
      <View style={[styles.stripe, { backgroundColor: stripe }]} />

      <View style={styles.topLine}>
        <Text style={[type.wordLemma, styles.lemma, { color: theme.text.primary }]} numberOfLines={1}>
          {word.lemma}
        </Text>
        {dueLabel !== null ? (
          <Text style={[monoType.dueLabel, styles.due, { color: theme.accent }]}>{dueLabel}</Text>
        ) : null}
      </View>

      <View style={styles.bottomLine}>
        {word.gloss !== null ? (
          <Text style={[readingType.gloss, styles.gloss, { color: theme.text.secondary }]} numberOfLines={1}>
            {word.gloss}
          </Text>
        ) : null}
        {word.sourceTitle !== null ? (
          <Text style={[monoType.sourceLabel, styles.source, { color: theme.text.secondary }]} numberOfLines={1}>
            {word.sourceTitle}
          </Text>
        ) : null}
      </View>

      {tags.length > 0 ? (
        <View style={styles.tags}>
          {tags.map((tag) => (
            <Text
              key={tag}
              style={[
                monoType.tag,
                styles.tag,
                { color: theme.text.secondary, borderColor: theme.border.hairline },
              ]}
            >
              {tag}
            </Text>
          ))}
        </View>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    padding: spacing.md,
    paddingLeft: spacing.ml,
    minHeight: 44,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: "hidden",
  },
  stripe: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
  },
  topLine: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "baseline",
    gap: spacing.sm,
  },
  lemma: {
    flexShrink: 1,
  },
  due: {
    flexShrink: 0,
  },
  bottomLine: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "baseline",
    gap: spacing.sm,
    marginTop: spacing.xxs,
  },
  gloss: {
    flexShrink: 1,
  },
  source: {
    flexShrink: 0,
  },
  tags: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs,
    marginTop: spacing.xxs,
  },
  tag: {
    borderWidth: StyleSheet.hairlineWidth,
    paddingVertical: badgePadding.vertical,
    paddingHorizontal: badgePadding.horizontal,
  },
});
