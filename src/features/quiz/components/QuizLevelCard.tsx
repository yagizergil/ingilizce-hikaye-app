import { StyleSheet, Text, View } from "react-native";

import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";

import {
  detailColors,
  detailType,
  homeColors,
  homeMetrics,
  homeSpace,
  homeType,
  quizColors,
  quizMetrics,
} from "@/theme";
import { PressableScale } from "@/components/ui";

import type { BookQuizLevel, QuizLevelState } from "@/features/quiz/types";

interface QuizLevelCardProps {
  level: BookQuizLevel;
  state: QuizLevelState;
  onPress: () => void;
}

const LEVEL_BG = {
  1: quizColors.levelEasy,
  2: quizColors.levelMid,
  3: quizColors.levelHard,
} as const;

/** Bir quiz basamağı: renkli numara rozeti, ad, açıklama ve durum (bitti / başla / kilitli / premium). */
export function QuizLevelCard({ level, state, onPress }: QuizLevelCardProps) {
  const { t } = useTranslation();
  const locked = state === "locked";
  const status =
    state === "done"
      ? t("quiz.levels.status.done", { correct: level.bestCorrect, total: level.questionCount })
      : state === "premium"
        ? t("quiz.levels.status.premium")
        : state === "locked"
          ? t("quiz.levels.status.locked")
          : level.bestCorrect !== null
            ? t("quiz.levels.status.retry", {
                correct: level.bestCorrect,
                total: level.questionCount,
              })
            : t("quiz.levels.status.open", { n: level.questionCount });

  return (
    <PressableScale
      onPress={onPress}
      disabled={locked}
      accessibilityRole="button"
      accessibilityState={{ disabled: locked }}
      accessibilityLabel={`${t(`quiz.levels.${level.level}.title`)}, ${status}`}
      style={[styles.card, locked ? styles.locked : null]}
    >
      <View style={[styles.badge, { backgroundColor: LEVEL_BG[level.level] }]}>
        <Text style={[detailType.sectionTitle, styles.badgeText]}>{level.level}</Text>
      </View>
      <View style={styles.texts}>
        <Text style={[detailType.sectionTitle, styles.title]}>
          {t(`quiz.levels.${level.level}.title`)}
        </Text>
        <Text style={[homeType.cardSub, styles.description]}>
          {t(`quiz.levels.${level.level}.description`)}
        </Text>
        <Text
          style={[homeType.cardSub, state === "premium" ? styles.statusPremium : styles.status]}
        >
          {status}
        </Text>
      </View>
      <View style={[styles.action, state === "premium" ? styles.actionPremium : null]}>
        <Ionicons
          name={
            state === "done"
              ? "checkmark"
              : state === "locked"
                ? "lock-closed"
                : state === "premium"
                  ? "diamond"
                  : "play"
          }
          size={18}
          color={
            state === "done"
              ? quizColors.selected
              : state === "locked"
                ? homeColors.muted
                : detailColors.amberInk
          }
        />
      </View>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: homeSpace.lg,
    padding: homeSpace.lg,
    borderRadius: homeMetrics.cardRadius,
    backgroundColor: detailColors.circle,
    shadowColor: homeColors.shadow,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.07,
    shadowRadius: 18,
    elevation: 4,
  },
  locked: {
    opacity: 0.6,
  },
  badge: {
    width: quizMetrics.levelBadge * 1.6,
    height: quizMetrics.levelBadge * 1.6,
    borderRadius: quizMetrics.levelBadge * 0.8,
    alignItems: "center",
    justifyContent: "center",
  },
  badgeText: {
    color: detailColors.title,
  },
  texts: {
    flex: 1,
    gap: homeSpace.xxs,
  },
  title: {
    color: homeColors.ink,
  },
  description: {
    color: homeColors.mutedStrong,
  },
  status: {
    color: homeColors.muted,
    marginTop: homeSpace.xxs,
  },
  statusPremium: {
    color: detailColors.amberInk,
    marginTop: homeSpace.xxs,
  },
  action: {
    width: quizMetrics.levelBadge * 1.4,
    height: quizMetrics.levelBadge * 1.4,
    borderRadius: quizMetrics.levelBadge * 0.7,
    backgroundColor: quizColors.optionBg,
    alignItems: "center",
    justifyContent: "center",
  },
  actionPremium: {
    backgroundColor: detailColors.amber,
  },
});
