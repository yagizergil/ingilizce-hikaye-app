import { StyleSheet, Text, View } from "react-native";

import { useTranslation } from "react-i18next";

import { detailType, homeMetrics, homeSpace, homeType, mascotSize } from "@/theme";
import { Button, MascotAnim, UiIcon } from "@/components/ui";
import { useReaderThemeColors } from "@/features/reader/hooks/useReaderThemeColors";

import type { UiIconName } from "@/components/ui";

interface ChapterCompleteCardProps {
  /** 0 tabanlı bölüm sırası; başlıkta 1 tabanlı gösteriliyor. */
  sectionIndex: number;
  chapterTitle: string | null;
  /** Bu bölümün kelime sayısı; bilinmiyorsa null. */
  wordCount: number | null;
  hasNextChapter: boolean;
  onNextChapter: () => void;
  onBackToBook: () => void;
  /**
   * Son bölüm bitti — kutlama ekranına geç.
   *
   * NEDEN OTOMATİK DEĞİL: bitişte kullanıcıyı haber vermeden başka bir
   * ekrana atmak, az önce okuduğu son paragrafı geri alamaz hâle getirir.
   * Geçişi kullanıcı başlatıyor.
   */
  onFinishBook: () => void;
}

/** Ortalama sessiz okuma hızı (kelime/dakika), B1 civarı bir okur için. */
const WORDS_PER_MINUTE = 140;

/**
 * Bölüm bitince görünen tamamlama ekranı: kutlayan maskot, bölümün adı ve
 * okunan kelime/süre, ardından devam düğmeleri.
 *
 * Ürün ilkesi #1 korunuyor: burada promosyon, premium teklifi veya banner
 * yok; yalnızca okuma akışının kendi devamı. Renkler okuma temasından
 * geliyor (sepya/koyu temada da okunur).
 */
export function ChapterCompleteCard({
  sectionIndex,
  chapterTitle,
  wordCount,
  hasNextChapter,
  onNextChapter,
  onBackToBook,
  onFinishBook,
}: ChapterCompleteCardProps) {
  const { t } = useTranslation();
  const readerColors = useReaderThemeColors();

  const minutes = wordCount ? Math.max(1, Math.round(wordCount / WORDS_PER_MINUTE)) : null;

  return (
    <View style={styles.container}>
      <MascotAnim name="party" width={mascotSize.celebration} />

      <View style={styles.heading}>
        <Text style={[homeType.statLabel, styles.centered, { color: readerColors.textMuted }]}>
          {t("reader.chapterComplete.eyebrow", { number: sectionIndex + 1 })}
        </Text>
        <Text style={[detailType.sheetTitle, styles.centered, { color: readerColors.text }]}>
          {chapterTitle ?? t("reader.chapterComplete.title")}
        </Text>
      </View>

      {wordCount ? (
        <View style={styles.stats}>
          <Stat
            icon="bookmark"
            value={String(wordCount)}
            label={t("reader.chapterComplete.wordsLabel")}
          />
          <Stat
            icon="clock"
            value={t("reader.chapterComplete.minutesValue", { count: minutes ?? 0 })}
            label={t("reader.chapterComplete.minutesLabel")}
          />
        </View>
      ) : null}

      <View style={styles.actions}>
        {hasNextChapter ? (
          <>
            <Button
              label={t("reader.chapterComplete.nextChapter")}
              onPress={onNextChapter}
              fullWidth
            />
            <Button
              label={t("reader.chapterComplete.backToBook")}
              onPress={onBackToBook}
              variant="secondary"
              fullWidth
            />
          </>
        ) : (
          <>
            {/*
              Kitabın son bölümü. Buradaki birincil eylem kutlama ekranına
              gidiyor — ürün ilkesi #1 gereği premium teklifi reader'ın
              İÇİNDE gösterilemez, o ekran reader'ın dışında ayrı bir route.
            */}
            <Text style={[homeType.cardSub, styles.centered, { color: readerColors.textMuted }]}>
              {t("reader.chapterComplete.bookFinished")}
            </Text>
            <Button
              label={t("reader.chapterComplete.finishBook")}
              onPress={onFinishBook}
              fullWidth
            />
            <Button
              label={t("reader.chapterComplete.backToBook")}
              onPress={onBackToBook}
              variant="secondary"
              fullWidth
            />
          </>
        )}
      </View>
    </View>
  );
}

function Stat({ icon, value, label }: { icon: UiIconName; value: string; label: string }) {
  const readerColors = useReaderThemeColors();
  return (
    <View style={[styles.stat, { backgroundColor: readerColors.highlight }]}>
      <UiIcon name={icon} size={homeMetrics.rowIcon} />
      <View>
        <Text style={[detailType.statLabel, styles.statValue, { color: readerColors.text }]}>
          {value}
        </Text>
        <Text style={[homeType.cardSub, { color: readerColors.textMuted }]}>{label}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    gap: homeSpace.lg,
    paddingVertical: homeSpace.xl,
    paddingHorizontal: homeMetrics.gutter,
  },
  heading: {
    alignItems: "center",
    gap: homeSpace.xs,
  },
  centered: {
    textAlign: "center",
  },
  stats: {
    flexDirection: "row",
    gap: homeSpace.md,
    alignSelf: "stretch",
  },
  stat: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: homeSpace.md,
    padding: homeSpace.md,
    borderRadius: homeMetrics.cardRadius,
  },
  statValue: {
    fontVariant: ["tabular-nums"],
  },
  actions: {
    alignSelf: "stretch",
    gap: homeSpace.md,
  },
});
