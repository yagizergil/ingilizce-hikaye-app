import { useCallback, useEffect, useRef } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";

import { monoType, motion, spacing, type } from "@/theme";
import { useTheme } from "@/theme/useTheme";
import { trackEvent } from "@/lib/analytics";
import { maybeRequestReview } from "@/lib/storeReview";
import { Button, ErrorState, LoadingState } from "@/components/ui";
import { useSubscriptionQuery } from "@/features/paywall";

import { useBookCompletionQuery } from "@/features/completion/api/useBookCompletionQuery";

interface BookFinishedScreenProps {
  bookId: string | null;
  onClose: () => void;
  onOpenPaywall: () => void;
  onOpenReview: () => void;
}

/**
 * Kitap bitirme ekranı.
 *
 * NEDEN AYRI BİR ROUTE, READER'IN İÇİNDE DEĞİL: ürün ilkesi #1 okuma
 * ekranının içinde premium teklifini yasaklıyor ve bu doğru. Ama kitabı
 * bitirmek ürünün en güçlü değer anı — teklifi göstermek için en doğru an
 * da o. İkisini birden sağlamanın yolu, bitirme anında reader'dan ÇIKIP
 * ayrı bir ekrana geçmek. Kullanıcı artık okumuyor; kutlama ekranındadır.
 *
 * BURADA ÜÇ ŞEY OLUYOR, HEPSİ AYNI ANIN HAKKI:
 *  1. Az önce yapılan işin karşılığı gösteriliyor (kelime, dakika, kaçıncı
 *     kitap).
 *  2. İkinci kitaptan itibaren App Store puanı isteniyor — uygulamadaki en
 *     net başarı anı (bkz. src/lib/storeReview.ts).
 *  3. Ücretsiz kullanıcıya premium teklifi SESSİZ bir satır olarak
 *     sunuluyor: birincil eylem değil, kapatılabilir, ekranı kesmiyor.
 */
export function BookFinishedScreen({
  bookId,
  onClose,
  onOpenPaywall,
  onOpenReview,
}: BookFinishedScreenProps) {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const { data, isLoading, isError, refetch } = useBookCompletionQuery(bookId);
  const { data: subscription } = useSubscriptionQuery();

  // Puan bir kez istenir; veri tazelendiğinde tekrar tetiklenmemeli.
  const reviewAsked = useRef(false);

  useEffect(() => {
    if (!data) return;
    trackEvent("book_finished_viewed", {
      bookId: bookId ?? "unknown",
      completed_books: data.completedBookCount,
      saved_words: data.savedWordCount,
    });
  }, [bookId, data]);

  useEffect(() => {
    if (!data || reviewAsked.current) return;
    reviewAsked.current = true;
    // Kullanıcı ekranı okusun diye kısa bir gecikme: kutlama ile sistem
    // diyaloğu aynı anda gelirse ikisi de okunmaz.
    const timer = setTimeout(() => {
      void maybeRequestReview(data.completedBookCount);
    }, 1200);
    return () => clearTimeout(timer);
  }, [data]);

  const handlePaywall = useCallback(() => {
    trackEvent("paywall_opened", { source: "book_finished" });
    onOpenPaywall();
  }, [onOpenPaywall]);

  const showUpgrade = subscription != null && !subscription.isPremium;

  return (
    <SafeAreaView style={[styles.fill, { backgroundColor: theme.bg.primary }]}>
      <View style={styles.header}>
        <Pressable
          onPress={onClose}
          hitSlop={spacing.sm}
          accessibilityRole="button"
          accessibilityLabel={t("common.dismiss")}
          style={({ pressed }) => ({ opacity: pressed ? motion.pressed.opacity : 1 })}
        >
          <Ionicons name="close" size={24} color={theme.text.secondary} />
        </Pressable>
      </View>

      {isLoading ? (
        <LoadingState />
      ) : isError || !data ? (
        <ErrorState message={t("completion.error")} onRetry={() => void refetch()} />
      ) : (
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <View style={[styles.mark, { borderColor: theme.accent }]}>
            <Ionicons name="book" size={28} color={theme.accent} />
          </View>

          <View style={styles.heading}>
            <Text style={[monoType.eyebrow, styles.centered, { color: theme.text.secondary }]}>
              {t("completion.eyebrow", { count: data.completedBookCount })}
            </Text>
            <Text style={[type.display, styles.centered, { color: theme.text.primary }]}>
              {data.bookTitle}
            </Text>
            {data.bookAuthor ? (
              <Text style={[monoType.author, styles.centered, { color: theme.text.secondary }]}>
                {data.bookAuthor}
              </Text>
            ) : null}
          </View>

          <View style={styles.stats}>
            <Stat value={String(data.savedWordCount)} label={t("completion.wordsLabel")} />
            <View style={[styles.divider, { backgroundColor: theme.text.secondary }]} />
            <Stat
              value={t("completion.minutesValue", { count: data.minutes })}
              label={t("completion.minutesLabel")}
            />
          </View>

          <View style={styles.actions}>
            {data.savedWordCount > 0 ? (
              <Button label={t("completion.reviewWords")} onPress={onOpenReview} fullWidth />
            ) : null}
            <Button
              label={t("completion.findNextBook")}
              onPress={onClose}
              variant={data.savedWordCount > 0 ? "secondary" : "primary"}
              fullWidth
            />
          </View>

          {/*
            Premium teklifi: sessiz bir satır, birincil eylem DEĞİL.
            Kullanıcı kitabı bitirdi; ona önce yaptığı işin karşılığı
            gösteriliyor, teklif en altta ve göz ardı edilebilir duruyor.
          */}
          {showUpgrade ? (
            <Pressable
              onPress={handlePaywall}
              accessibilityRole="button"
              style={({ pressed }) => [
                styles.upgrade,
                { borderColor: theme.border.hairline, opacity: pressed ? motion.pressed.opacity : 1 },
              ]}
            >
              <View style={styles.upgradeText}>
                <Text style={[monoType.rowText, { color: theme.text.primary }]}>
                  {t("completion.upgradeTitle")}
                </Text>
                <Text style={[monoType.metaTight, { color: theme.text.secondary }]}>
                  {t("completion.upgradeHint")}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={theme.text.secondary} />
            </Pressable>
          ) : null}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  const { theme } = useTheme();
  return (
    <View style={styles.stat}>
      <Text style={[monoType.statValueLg, styles.statValue, { color: theme.text.primary }]}>
        {value}
      </Text>
      <Text style={[monoType.statLabel, { color: theme.text.secondary }]}>{label}</Text>
    </View>
  );
}

const MARK_SIZE = 64;

const styles = StyleSheet.create({
  fill: {
    flex: 1,
  },
  header: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    alignItems: "flex-start",
  },
  content: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxl,
    alignItems: "center",
    gap: spacing.lg,
  },
  mark: {
    width: MARK_SIZE,
    height: MARK_SIZE,
    borderRadius: MARK_SIZE / 2,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
    marginTop: spacing.lg,
  },
  heading: {
    alignItems: "center",
    gap: spacing.xs,
  },
  centered: {
    textAlign: "center",
  },
  stats: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xl,
  },
  stat: {
    alignItems: "center",
    gap: spacing.xxs,
  },
  statValue: {
    fontVariant: ["tabular-nums"],
  },
  divider: {
    width: StyleSheet.hairlineWidth,
    height: spacing.xl,
    opacity: 0.4,
  },
  actions: {
    alignSelf: "stretch",
    gap: spacing.sm,
  },
  upgrade: {
    alignSelf: "stretch",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    minHeight: 44,
  },
  upgradeText: {
    flex: 1,
    gap: spacing.xxs,
  },
});
