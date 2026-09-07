import { StyleSheet, Text, View } from "react-native";

import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";

import { monoType, radius, spacing, type } from "@/theme";
import { Button } from "@/components/ui";
import { useReaderThemeColors } from "@/features/reader/hooks/useReaderThemeColors";

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
 * Bölüm bitince görünen tamamlama ekranı.
 *
 * YENİDEN TASARIM (2026-09-07). Öncekinde üç sorun vardı:
 *
 * 1. **Emoji ikon.** Ekranın tepesinde 40 piksellik bir "🎉" duruyordu.
 *    Emoji, cihazın kendi glif setinden geliyor; uygulamanın tipografisiyle
 *    ilgisi yok, iOS'ta Apple'ın kendi çizimi olarak görünüyor ve
 *    uygulamayı "hazır parçalardan yapılmış" gösteriyor. Yerine uygulamanın
 *    kendi renk ve ikon setinden çizilmiş bir halka geldi.
 * 2. **Ölü buton.** "Quiz" düğmesi `onStartQuiz` ile bağlıydı ama o geri
 *    çağrı bilerek boştu (özellik henüz yok). Kullanıcının bastığında
 *    hiçbir şey olmayan bir düğme, olmayan bir düğmeden kötüdür; kaldırıldı.
 * 3. **Hiçbir bilgi yoktu.** Ekran yalnızca "Bölüm tamamlandı" diyordu.
 *    Artık kaçıncı bölümün bittiğini, bölümün adını ve okunan kelime/süreyi
 *    gösteriyor — kullanıcının az önce yaptığı işin karşılığı.
 *
 * Ürün ilkesi #1 korunuyor: burada promosyon, premium teklifi veya banner
 * yok; yalnızca okuma akışının kendi devamı.
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
      <View style={[styles.mark, { borderColor: readerColors.accent }]}>
        <Ionicons name="checkmark" size={30} color={readerColors.accent} />
      </View>

      <View style={styles.heading}>
        <Text style={[monoType.eyebrow, styles.centered, { color: readerColors.textMuted }]}>
          {t("reader.chapterComplete.eyebrow", { number: sectionIndex + 1 })}
        </Text>
        <Text style={[type.sectionHeading, styles.centered, { color: readerColors.text }]}>
          {chapterTitle ?? t("reader.chapterComplete.title")}
        </Text>
      </View>

      {wordCount ? (
        <View style={styles.stats}>
          <Stat value={String(wordCount)} label={t("reader.chapterComplete.wordsLabel")} />
          <View style={[styles.statDivider, { backgroundColor: readerColors.textMuted }]} />
          <Stat
            value={t("reader.chapterComplete.minutesValue", { count: minutes ?? 0 })}
            label={t("reader.chapterComplete.minutesLabel")}
          />
        </View>
      ) : null}

      <View style={styles.actions}>
        {hasNextChapter ? (
          <>
            <Button label={t("reader.chapterComplete.nextChapter")} onPress={onNextChapter} />
            <Button
              label={t("reader.chapterComplete.backToBook")}
              onPress={onBackToBook}
              variant="secondary"
            />
          </>
        ) : (
          <>
            {/*
              Kitabın son bölümü. Buradaki birincil eylem kutlama ekranına
              gidiyor — ürün ilkesi #1 gereği premium teklifi reader'ın
              İÇİNDE gösterilemez, o ekran reader'ın dışında ayrı bir route.
            */}
            <Text style={[monoType.rowText, styles.centered, { color: readerColors.textMuted }]}>
              {t("reader.chapterComplete.bookFinished")}
            </Text>
            <Button label={t("reader.chapterComplete.finishBook")} onPress={onFinishBook} />
            <Button
              label={t("reader.chapterComplete.backToBook")}
              onPress={onBackToBook}
              variant="secondary"
            />
          </>
        )}
      </View>
    </View>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  const readerColors = useReaderThemeColors();
  return (
    <View style={styles.stat}>
      <Text style={[monoType.statValue, styles.statValue, { color: readerColors.text }]}>{value}</Text>
      <Text style={[monoType.statLabel, { color: readerColors.textMuted }]}>{label}</Text>
    </View>
  );
}

const MARK_SIZE = 64;

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    gap: spacing.lg,
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.lg,
  },
  mark: {
    width: MARK_SIZE,
    height: MARK_SIZE,
    borderRadius: MARK_SIZE / 2,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
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
    gap: spacing.lg,
  },
  stat: {
    alignItems: "center",
    gap: spacing.xxs,
  },
  statValue: {
    fontVariant: ["tabular-nums"],
  },
  statDivider: {
    width: StyleSheet.hairlineWidth,
    height: spacing.lg,
    opacity: 0.4,
  },
  actions: {
    alignSelf: "stretch",
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.md,
  },
});
