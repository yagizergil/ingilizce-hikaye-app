import { StyleSheet, Text, View } from "react-native";

import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";

import { detailColors, detailType, homeColors, homeMetrics, homeSpace, homeType } from "@/theme";
import { PressableScale, UiIcon } from "@/components/ui";
import { useBookQuizQuery } from "@/features/quiz/api/quizApi";
import { hasPassed } from "@/features/quiz/levelState";

/** Kitap detayında quiz girişi; kitabın quizi yoksa hiç görünmez. */
export function BookQuizEntry({ bookId }: { bookId: string }) {
  const { t } = useTranslation();
  const router = useRouter();
  const levels = useBookQuizQuery(bookId).data?.levels ?? [];
  if (levels.length === 0) return null;
  const passed = levels.filter(hasPassed).length;

  return (
    <PressableScale
      onPress={() => router.push({ pathname: "/book-quiz/[bookId]", params: { bookId } })}
      accessibilityRole="button"
      accessibilityLabel={t("quiz.entry.title")}
      style={styles.card}
    >
      <UiIcon name="trophy" size={homeMetrics.stepIcon} />
      <View style={styles.texts}>
        <Text style={[detailType.sectionTitle, styles.title]}>{t("quiz.entry.title")}</Text>
        <Text style={[homeType.cardSub, styles.sub]}>
          {t("quiz.entry.progress", { passed, total: levels.length })}
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={20} color={detailColors.muted} />
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: homeMetrics.gutter,
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
  texts: {
    flex: 1,
    gap: homeSpace.xxs,
  },
  title: {
    color: homeColors.ink,
  },
  sub: {
    color: homeColors.mutedStrong,
  },
});
