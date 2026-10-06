import { ScrollView, StyleSheet, Text, View } from "react-native";

import { useLocalSearchParams, useRouter } from "expo-router";
import { useTranslation } from "react-i18next";

import { detailColors, homeColors, homeMetrics, homeSpace, homeType, mascotSize } from "@/theme";
import { EmptyState, ErrorState, LoadingState, MascotAnim, SkyHeader } from "@/components/ui";
import { useSubscriptionQuery } from "@/features/paywall";
import { useBookQuizQuery } from "@/features/quiz/api/quizApi";
import { QuizLevelCard } from "@/features/quiz/components/QuizLevelCard";
import { levelState } from "@/features/quiz/levelState";

/** Bir kitabın üç quiz basamağı (kolay -> zor). Premium basamak paywall'a, açık basamak soru ekranına gider. */
export function BookQuizScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { bookId } = useLocalSearchParams<{ bookId: string }>();
  const quizQuery = useBookQuizQuery(bookId);
  const isPremium = useSubscriptionQuery().data?.isPremium ?? false;
  const book = quizQuery.data;

  const header = (
    <SkyHeader
      title={book?.title ?? t("quiz.levels.screenTitle")}
      subtitle={t("quiz.levels.subtitle")}
      onBack={() => router.back()}
      art={<MascotAnim name="quiz" width={mascotSize.header} />}
    />
  );

  if (quizQuery.isLoading) {
    return (
      <View style={styles.container}>
        {header}
        <LoadingState />
      </View>
    );
  }
  if (quizQuery.isError) {
    return (
      <View style={styles.container}>
        {header}
        <ErrorState message={t("quiz.error")} onRetry={() => void quizQuery.refetch()} />
      </View>
    );
  }
  if (!book || book.levels.length === 0) {
    return (
      <View style={styles.container}>
        {header}
        <EmptyState
          title={t("quiz.levels.empty.title")}
          description={t("quiz.levels.empty.description")}
        />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {header}
        <View style={styles.list}>
          {book.levels.map((level, index) => {
            const state = levelState(book.levels, index, isPremium);
            return (
              <QuizLevelCard
                key={level.quizId}
                level={level}
                state={state}
                onPress={() => {
                  if (state === "premium") router.push("/paywall?source=book_quiz");
                  else
                    router.push({
                      pathname: "/quiz-question",
                      params: { quizId: level.quizId, level: String(level.level) },
                    });
                }}
              />
            );
          })}
          <Text style={[homeType.cardSub, styles.note]}>{t("quiz.levels.note")}</Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: detailColors.circle,
  },
  content: {
    paddingBottom: homeSpace.xl * 2,
  },
  list: {
    marginHorizontal: homeMetrics.gutter,
    gap: homeSpace.md,
  },
  note: {
    color: homeColors.muted,
    textAlign: "center",
    marginTop: homeSpace.sm,
  },
});
