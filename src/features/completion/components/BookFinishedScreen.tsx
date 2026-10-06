import { useCallback, useEffect, useRef } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";

import {
  detailColors,
  detailType,
  homeColors,
  homeMetrics,
  homeSpace,
  homeType,
  motion,
  mascotSize,
} from "@/theme";
import { useTheme } from "@/theme/useTheme";
import { trackEvent } from "@/lib/analytics";
import { maybeRequestReview } from "@/lib/storeReview";
import { Button, ErrorState, LoadingState, MascotAnim, SkyHeader, UiIcon } from "@/components/ui";
import { useSubscriptionQuery } from "@/features/paywall";

import { useBookCompletionQuery } from "@/features/completion/api/useBookCompletionQuery";
import { directionalIcon } from "@/lib/rtl";

import type { UiIconName } from "@/components/ui";
import { playSfx } from "@/lib/sfx";

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
 *     kitap) -- kutlayan maskotla birlikte.
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
  useEffect(() => playSfx("complete"), []);
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
    <View style={[styles.fill, { backgroundColor: theme.bg.primary }]}>
      <SkyHeader
        title={data ? t("completion.eyebrow", { count: data.completedBookCount }) : ""}
        subtitle={data?.bookTitle}
        onBack={onClose}
        art={<MascotAnim name="party" width={mascotSize.header} />}
      />

      {isLoading ? (
        <LoadingState />
      ) : isError || !data ? (
        <ErrorState message={t("completion.error")} onRetry={() => void refetch()} />
      ) : (
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          {data.bookAuthor ? (
            <Text style={[homeType.cardSub, styles.author, { color: homeColors.muted }]}>
              {data.bookAuthor}
            </Text>
          ) : null}

          <View style={styles.stats}>
            <Stat
              icon="bookmark"
              value={String(data.savedWordCount)}
              label={t("completion.wordsLabel")}
            />
            <Stat
              icon="clock"
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
            Premium teklifi: sessiz bir kart, birincil eylem DEĞİL.
            Kullanıcı kitabı bitirdi; ona önce yaptığı işin karşılığı
            gösteriliyor, teklif en altta ve göz ardı edilebilir duruyor.
          */}
          {showUpgrade ? (
            <Pressable
              onPress={handlePaywall}
              accessibilityRole="button"
              style={({ pressed }) => [
                styles.upgrade,
                { opacity: pressed ? motion.pressed.opacity : 1 },
              ]}
            >
              <UiIcon name="crown" size={homeMetrics.rowIcon} />
              <View style={styles.upgradeText}>
                <Text style={[detailType.statLabel, { color: detailColors.title }]}>
                  {t("completion.upgradeTitle")}
                </Text>
                <Text style={[homeType.cardSub, { color: detailColors.muted }]}>
                  {t("completion.upgradeHint")}
                </Text>
              </View>
              <Ionicons
                name={directionalIcon("chevron-forward", "chevron-back")}
                size={18}
                color={detailColors.muted}
              />
            </Pressable>
          ) : null}
        </ScrollView>
      )}
    </View>
  );
}

function Stat({ icon, value, label }: { icon: UiIconName; value: string; label: string }) {
  return (
    <View accessible accessibilityLabel={`${label} ${value}`} style={styles.stat}>
      <UiIcon name={icon} size={homeMetrics.statTileIcon} />
      <Text style={[detailType.heroTitle, styles.statValue]}>{value}</Text>
      <Text style={[homeType.statLabel, styles.statLabel]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: {
    flex: 1,
  },
  content: {
    paddingHorizontal: homeMetrics.gutter,
    paddingBottom: homeSpace.xl * 2,
    gap: homeSpace.lg,
  },
  author: {
    textAlign: "center",
  },
  stats: {
    flexDirection: "row",
    gap: homeSpace.md,
  },
  stat: {
    flex: 1,
    alignItems: "center",
    gap: homeSpace.xs,
    paddingVertical: homeSpace.lg,
    borderRadius: homeMetrics.cardRadius,
    backgroundColor: homeColors.peach,
  },
  statValue: {
    color: detailColors.title,
    fontVariant: ["tabular-nums"],
  },
  statLabel: {
    color: detailColors.muted,
  },
  actions: {
    gap: homeSpace.md,
  },
  upgrade: {
    flexDirection: "row",
    alignItems: "center",
    gap: homeSpace.md,
    padding: homeSpace.lg,
    borderRadius: homeMetrics.cardRadius,
    backgroundColor: homeColors.card,
    shadowColor: homeColors.shadow,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.07,
    shadowRadius: 18,
    elevation: 4,
  },
  upgradeText: {
    flex: 1,
    gap: homeSpace.xs,
  },
});
