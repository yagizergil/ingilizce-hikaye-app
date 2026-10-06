import { FlatList, StyleSheet, Text, View } from "react-native";

import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";

import {
  detailColors,
  homeColors,
  homeMetrics,
  homeSpace,
  homeType,
  quizColors,
  quizMetrics,
} from "@/theme";
import { BookCover3D, PressableScale } from "@/components/ui";
import { useSubscriptionQuery } from "@/features/paywall";
import { useQuizBooksQuery } from "@/features/quiz/api/quizApi";
import { levelState } from "@/features/quiz/levelState";

import type { QuizBook, QuizLevelState } from "@/features/quiz/types";

const COVER_W = quizMetrics.shelfCover;
const COVER_H = (quizMetrics.shelfCover * 3) / 2;

/** Quiz sekmesindeki kitap quizi rafı: okunan kitaplar önce, her kartta 3 basamağın durumu. */
export function QuizBookShelf() {
  const { t } = useTranslation();
  const router = useRouter();
  const booksQuery = useQuizBooksQuery();
  const isPremium = useSubscriptionQuery().data?.isPremium ?? false;
  const books = booksQuery.data ?? [];

  if (booksQuery.isError) {
    // Eskiden raf hatada sessizce kayboluyordu; kullanıcı quizlerin
    // neden olmadığını bilemiyordu.
    return (
      <PressableScale
        onPress={() => void booksQuery.refetch()}
        accessibilityRole="button"
        style={styles.errorRow}
      >
        <Ionicons name="refresh" size={18} color={homeColors.mutedStrong} />
        <Text style={[homeType.cardSub, { color: homeColors.mutedStrong }]}>
          {t("quiz.home.books.error")}
        </Text>
      </PressableScale>
    );
  }
  if (books.length === 0) return null;

  return (
    <View style={styles.section}>
      <View style={styles.header}>
        <Text style={[homeType.sectionTitle, styles.title]}>{t("quiz.home.books.title")}</Text>
        <Text style={[homeType.cardSub, styles.subtitle]}>{t("quiz.home.books.subtitle")}</Text>
      </View>
      <FlatList
        horizontal
        data={books}
        keyExtractor={(book) => book.bookId}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <ShelfCard
            book={item}
            isPremium={isPremium}
            onPress={() =>
              router.push({ pathname: "/book-quiz/[bookId]", params: { bookId: item.bookId } })
            }
          />
        )}
      />
    </View>
  );
}

function ShelfCard({
  book,
  isPremium,
  onPress,
}: {
  book: QuizBook;
  isPremium: boolean;
  onPress: () => void;
}) {
  return (
    <PressableScale
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={book.title}
      style={styles.card}
    >
      <BookCover3D uri={book.coverUrl} width={COVER_W} height={COVER_H} />
      <Text style={[homeType.cardSub, styles.cardTitle]} numberOfLines={2}>
        {book.title}
      </Text>
      <View style={styles.dots}>
        {book.levels.map((level, index) => (
          <Dot key={level.quizId} state={levelState(book.levels, index, isPremium)} />
        ))}
      </View>
    </PressableScale>
  );
}

function Dot({ state }: { state: QuizLevelState }) {
  if (state === "premium" || state === "locked") {
    return (
      <View style={[styles.dot, styles.dotLocked]}>
        <Ionicons
          name={state === "premium" ? "diamond" : "lock-closed"}
          size={9}
          color={homeColors.muted}
        />
      </View>
    );
  }
  return <View style={[styles.dot, state === "done" ? styles.dotDone : styles.dotOpen]} />;
}

const styles = StyleSheet.create({
  errorRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: homeSpace.sm,
    paddingHorizontal: homeMetrics.gutter,
    paddingVertical: homeSpace.md,
  },
  section: {
    gap: homeSpace.md,
  },
  header: {
    marginHorizontal: homeMetrics.gutter,
    gap: homeSpace.xxs,
  },
  title: {
    color: homeColors.ink,
  },
  subtitle: {
    color: homeColors.mutedStrong,
  },
  list: {
    paddingHorizontal: homeMetrics.gutter,
    gap: homeSpace.lg,
  },
  card: {
    width: COVER_W + homeSpace.sm,
    gap: homeSpace.xs,
  },
  cardTitle: {
    color: detailColors.title,
  },
  dots: {
    flexDirection: "row",
    gap: homeSpace.xs,
  },
  dot: {
    width: quizMetrics.levelBadge / 2,
    height: quizMetrics.levelBadge / 2,
    borderRadius: quizMetrics.levelBadge / 4,
    alignItems: "center",
    justifyContent: "center",
  },
  dotDone: {
    backgroundColor: quizColors.selected,
  },
  dotOpen: {
    backgroundColor: detailColors.amber,
  },
  dotLocked: {
    backgroundColor: quizColors.optionBg,
  },
});
