import { ScrollView, StyleSheet, Text, View } from "react-native";

import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";

import {
  detailColors,
  detailType,
  homeColors,
  homeMetrics,
  homeSpace,
  homeType,
  mascotSize,
} from "@/theme";
import { MascotAnim, PressableScale, SkyHeader, UiIcon } from "@/components/ui";
import { useDueCardsQuery } from "@/features/srs";
import {
  MIN_PRACTICE_WORDS,
  useSmartPracticeQuotaQuery,
  useVocabularyQuery,
} from "@/features/vocabulary";
import { QuizBookShelf } from "@/features/quiz/components/QuizBookShelf";

import type { UiIconName } from "@/components/ui";

type HeroState = "due" | "practice" | "empty";

/**
 * Quiz sekmesi = pratik merkezi.
 *
 * YENİDEN TASARIM (2026-10-05, ilk-kullanıcı denetimi + araştırma):
 * - Eskiden en büyük kart "Kitap quizi"ydi ama ÖRNEK sorular açıyordu
 *   (`sampleQuestions.ts`) -- kitaba özel soru vaadi tutulmuyordu. Artık
 *   kahraman kart kullanıcının GERÇEK durumunu gösteriyor: vadesi gelen
 *   kelime varsa tekrar (aralıklı tekrar: en güçlü geri dönüş sebebi),
 *   yoksa kaydedilen kelimelerle Akıllı Tekrar, hiç kelime yoksa okumaya
 *   yönlendirme. Tek birincil eylem (Hick yasası).
 * - Geri çağırma pratiği (testing effect) meta-analizlerde g≈0,5-0,6
 *   etki büyüklüğüyle tekrar okumadan üstün; ekranın odağı tekrar ve pratik.
 * - Örnek kitap quizi kaldırılmadı ama küçüldü ve dürüstçe "örnek" yazıyor.
 * - Statik "günde 5 dakika" ipucu kartı hiçbir şey yapmadığı için kaldırıldı.
 */
export function QuizHome() {
  const { t } = useTranslation();
  const router = useRouter();
  const dueQuery = useDueCardsQuery();
  const vocabularyQuery = useVocabularyQuery();
  const quotaQuery = useSmartPracticeQuotaQuery();

  const dueCount = dueQuery.data?.dueCount ?? 0;
  const words = vocabularyQuery.data?.words ?? [];
  const savedCount = words.length;
  const knownCount = words.filter((word) => word.state === "known").length;
  const canPractice = savedCount >= MIN_PRACTICE_WORDS;

  const hero: HeroState = dueCount > 0 ? "due" : canPractice ? "practice" : "empty";
  const heroCount = hero === "due" ? dueCount : savedCount;

  const practiceSubtitle = quotaQuery.data?.isPremium
    ? t("vocabulary.hub.practiceUnlimited")
    : (quotaQuery.data?.remaining ?? 0) > 0
      ? t("vocabulary.hub.practiceFreeLeft")
      : t("vocabulary.hub.practiceFreeUsed");

  const handleHero = () => {
    if (hero === "due") router.push("/review");
    else if (hero === "practice") router.push("/practice");
    else router.push("/library");
  };

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <SkyHeader title={t("quiz.home.title")} subtitle={t("quiz.home.subtitle")} />

        <PressableScale
          onPress={handleHero}
          accessibilityRole="button"
          accessibilityLabel={t(`quiz.home.hero.${hero}.title`, { count: heroCount })}
          style={styles.hero}
        >
          <View style={styles.heroTexts}>
            <Text style={[detailType.sheetTitle, styles.heroTitle]}>
              {t(`quiz.home.hero.${hero}.title`, { count: heroCount })}
            </Text>
            <Text style={[homeType.cardSub, styles.heroDescription]}>
              {hero === "practice" ? practiceSubtitle : t(`quiz.home.hero.${hero}.description`)}
            </Text>
            <View style={styles.heroButton}>
              <Text style={[detailType.statLabel, styles.heroButtonText]}>
                {t(`quiz.home.hero.${hero}.cta`)}
              </Text>
              <Ionicons name="arrow-forward" size={16} color={detailColors.amberInk} />
            </View>
          </View>
          <MascotAnim name="quiz" width={mascotSize.header} persist />
        </PressableScale>

        {/* İlerleme özeti: kullanıcı neyin beklediğini bir bakışta görür. */}
        <View style={styles.stats}>
          <Stat icon="cards" value={dueCount} label={t("quiz.home.stats.due")} />
          <Stat icon="bookmark" value={savedCount} label={t("quiz.home.stats.saved")} />
          <Stat icon="trophy" value={knownCount} label={t("quiz.home.stats.known")} />
        </View>

        <QuizBookShelf />

        <Text style={[homeType.sectionTitle, styles.sectionTitle]}>{t("quiz.home.moreTitle")}</Text>

        <Row
          icon="cards"
          title={t("quiz.home.words.title")}
          description={t("quiz.home.words.description")}
          badge={dueCount > 0 ? t("vocabulary.decks.card.dueBadge", { count: dueCount }) : null}
          onPress={() => router.push("/vocabulary")}
        />
        <Row
          icon="bulb"
          title={t("vocabulary.hub.practiceTitle")}
          description={
            canPractice
              ? practiceSubtitle
              : t("quiz.home.smartLocked", { count: MIN_PRACTICE_WORDS })
          }
          badge={t("vocabulary.hub.premiumBadge")}
          onPress={() => router.push(canPractice ? "/practice" : "/library")}
        />
      </ScrollView>
    </View>
  );
}

function Stat({ icon, value, label }: { icon: UiIconName; value: number; label: string }) {
  return (
    <View style={styles.stat} accessible accessibilityLabel={`${label} ${value}`}>
      <UiIcon name={icon} size={homeMetrics.rowIcon} />
      <Text style={[detailType.heroTitle, styles.statValue]}>{value}</Text>
      <Text style={[homeType.cardSub, styles.statLabel]} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

interface RowProps {
  icon: UiIconName;
  title: string;
  description: string;
  badge: string | null;
  onPress: () => void;
}

function Row({ icon, title, description, badge, onPress }: RowProps) {
  return (
    <PressableScale
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={title}
      style={styles.card}
    >
      <UiIcon name={icon} size={homeMetrics.stepIcon} />
      <View style={styles.cardTexts}>
        <Text style={[detailType.sectionTitle, styles.cardTitle]}>{title}</Text>
        <Text style={[homeType.cardSub, styles.cardDescription]} numberOfLines={2}>
          {description}
        </Text>
      </View>
      {badge ? (
        <View style={styles.badge}>
          <Text style={[homeType.cardSub, styles.badgeText]}>{badge}</Text>
        </View>
      ) : (
        <Ionicons name="chevron-forward" size={20} color={detailColors.muted} />
      )}
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: detailColors.circle,
  },
  content: {
    paddingBottom: homeMetrics.tabBarHeight + homeMetrics.tabBarMargin * 2,
    gap: homeSpace.lg,
  },
  hero: {
    marginHorizontal: homeMetrics.gutter,
    padding: homeSpace.xl,
    borderRadius: homeMetrics.cardRadius,
    backgroundColor: detailColors.amber,
    flexDirection: "row",
    alignItems: "center",
    overflow: "hidden",
  },
  heroTexts: {
    flex: 1,
    gap: homeSpace.xs,
  },
  heroTitle: {
    color: detailColors.amberInk,
  },
  heroDescription: {
    color: detailColors.amberInk,
  },
  heroButton: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: homeSpace.xs,
    marginTop: homeSpace.md,
    height: homeMetrics.continueButton,
    paddingHorizontal: homeSpace.lg,
    borderRadius: homeMetrics.continueButton / 2,
    backgroundColor: detailColors.circle,
  },
  heroButtonText: {
    color: detailColors.amberInk,
  },
  stats: {
    flexDirection: "row",
    gap: homeSpace.md,
    marginHorizontal: homeMetrics.gutter,
  },
  stat: {
    flex: 1,
    alignItems: "center",
    gap: homeSpace.xs,
    paddingVertical: homeSpace.lg,
    borderRadius: homeMetrics.cardRadius,
    backgroundColor: homeColors.card,
    shadowColor: homeColors.shadow,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.07,
    shadowRadius: 18,
    elevation: 4,
  },
  statValue: {
    color: detailColors.title,
    fontVariant: ["tabular-nums"],
  },
  statLabel: {
    color: detailColors.muted,
  },
  sectionTitle: {
    color: homeColors.ink,
    marginHorizontal: homeMetrics.gutter,
  },
  card: {
    marginHorizontal: homeMetrics.gutter,
    padding: homeSpace.lg,
    borderRadius: homeMetrics.cardRadius,
    backgroundColor: detailColors.circle,
    flexDirection: "row",
    alignItems: "center",
    gap: homeSpace.lg,
    shadowColor: homeColors.shadow,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.07,
    shadowRadius: 18,
    elevation: 4,
  },
  cardTexts: {
    flex: 1,
    gap: homeSpace.xxs,
  },
  cardTitle: {
    color: homeColors.ink,
  },
  cardDescription: {
    color: homeColors.mutedStrong,
  },
  badge: {
    paddingHorizontal: homeSpace.sm,
    height: homeMetrics.continueButton - homeSpace.sm,
    borderRadius: homeMetrics.continueButton / 2,
    backgroundColor: detailColors.amber,
    alignItems: "center",
    justifyContent: "center",
  },
  badgeText: {
    color: detailColors.amberInk,
  },
  pressed: {
    opacity: 0.9,
  },
});
