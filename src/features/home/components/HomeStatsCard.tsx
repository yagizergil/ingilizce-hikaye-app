import { useEffect } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import Svg, { Circle } from "react-native-svg";

import { detailColors, homeColors, homeMetrics, homeSpace, homeType } from "@/theme";
import { useHomePalette } from "@/features/home/useHomePalette";
import { playSfx } from "@/lib/sfx";
import { trackError } from "@/lib/analytics";
import AsyncStorage from "@/lib/storage";

interface HomeStatsCardProps {
  goalMinutes: number;
  minutesToday: number;
  /** Hedefin tutturulduğu gün sayısı (meydan okuma). */
  goalDays: number;
  /** Ardışık hedef günleri. */
  streak: number;
  booksRead: number;
  /** Bir sonraki basamak ve çubuk doluluğu (`profile/goal.ts`). */
  milestone: number;
  milestoneFraction: number;
  milestoneBonus: number;
  completedAll: boolean;
  dateKey: string;
  onPressMore: () => void;
}

const ICON_CALENDAR = require("../../../../assets/home/icon-stat-calendar.png") as number;
const ICON_BOOK = require("../../../../assets/home/icon-stat-book.png") as number;

const RING = 64;
const STROKE = 7;
const CELEBRATED_KEY = "home.goalCelebrated";

/** Hedef halkası: içi doldukça amber, tamamlanınca tik. */
function GoalRing({ fraction, done, label }: { fraction: number; done: boolean; label: string }) {
  const r = (RING - STROKE) / 2;
  const c = 2 * Math.PI * r;
  return (
    <View style={styles.ring}>
      <Svg width={RING} height={RING}>
        <Circle
          cx={RING / 2}
          cy={RING / 2}
          r={r}
          stroke={homeColors.peach}
          strokeWidth={STROKE}
          fill="none"
        />
        <Circle
          cx={RING / 2}
          cy={RING / 2}
          r={r}
          stroke={detailColors.amber}
          strokeWidth={STROKE}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={`${c} ${c}`}
          strokeDashoffset={c * (1 - fraction)}
          transform={`rotate(-90 ${RING / 2} ${RING / 2})`}
        />
      </Svg>
      <View style={styles.ringCenter}>
        {done ? (
          <Ionicons name="checkmark" size={26} color={detailColors.amberInk} />
        ) : (
          <Text style={[homeType.statLabel, styles.ringText]}>{label}</Text>
        )}
      </View>
    </View>
  );
}

/**
 * Ana sayfanın günlük hedef kartı (2026-10-07). Üstte hedef halkası
 * ("8 / 10 dk"), ortada meydan okuma (hedefin tutturulduğu günler, 7 -> 30 ->
 * 120 basamak, bonus XP), altta hedef serisi ve okunan kitap. Hedef
 * tamamlandığı gün bir kez kutlama sesi çalar.
 *
 * Eskiden "Gün meydan okuması" yalnızca okunan günleri sayıyordu, hedefi
 * yoktu ve "Bugüne kadar" başlığının altında BUGÜNKÜ dakika duruyordu.
 */
export function HomeStatsCard(props: HomeStatsCardProps) {
  const { t } = useTranslation();
  const palette = useHomePalette();
  const fraction = props.goalMinutes > 0 ? Math.min(1, props.minutesToday / props.goalMinutes) : 0;
  const done = props.goalMinutes > 0 && props.minutesToday >= props.goalMinutes;
  const remaining = Math.max(0, props.goalMinutes - props.minutesToday);

  // Hedef tamamlandığı gün bir kez kutla (cihaz başına, gün anahtarıyla).
  useEffect(() => {
    if (!done) return;
    AsyncStorage.getItem(CELEBRATED_KEY)
      .then((last) => {
        if (last === props.dateKey) return undefined;
        playSfx("complete");
        return AsyncStorage.setItem(CELEBRATED_KEY, props.dateKey);
      })
      .catch((error: unknown) => trackError("home.goalCelebrate", error));
  }, [done, props.dateKey]);

  return (
    <View style={[styles.card, { backgroundColor: palette.card }]}>
      <View style={styles.top}>
        <GoalRing
          fraction={fraction}
          done={done}
          label={t("home.goal.ringValue", { today: props.minutesToday, goal: props.goalMinutes })}
        />
        <View style={styles.topText}>
          <Text style={[homeType.cardTitle, { color: palette.valueInk }]}>
            {t("home.goal.title")}
          </Text>
          <Text
            style={[homeType.cardSub, { color: done ? detailColors.amberDeep : palette.muted }]}
          >
            {done ? t("home.goal.done") : t("home.goal.remaining", { count: remaining })}
          </Text>
        </View>
        <Pressable
          onPress={props.onPressMore}
          hitSlop={homeSpace.md}
          accessibilityRole="button"
          accessibilityLabel={t("home.stats.more")}
          style={styles.more}
        >
          <Ionicons name="ellipsis-horizontal" size={homeSpace.xl} color={homeColors.mutedStrong} />
        </Pressable>
      </View>

      <View style={styles.divider} />

      <View style={styles.challengeHead}>
        <Text style={[homeType.cardSection, { color: palette.ink }]}>
          {t("home.goal.challenge")}
        </Text>
        <Text style={[homeType.statLabel, { color: palette.ink }]}>
          {props.completedAll
            ? t("home.goal.allDone")
            : t("home.goal.challengeValue", { done: props.goalDays, total: props.milestone })}
        </Text>
      </View>
      <View
        style={styles.track}
        accessibilityRole="progressbar"
        accessibilityValue={{ min: 0, max: props.milestone, now: props.goalDays }}
      >
        <View style={[styles.fill, { width: `${props.milestoneFraction * 100}%` }]} />
      </View>
      {!props.completedAll ? (
        <Text style={[homeType.cardSub, { color: palette.muted }]}>
          {t("home.goal.challengeHint", { total: props.milestone, xp: props.milestoneBonus })}
        </Text>
      ) : null}

      <View style={styles.statRow}>
        <View style={styles.stat}>
          <Image source={ICON_CALENDAR} style={styles.statIcon} contentFit="cover" transition={0} />
          <View>
            <Text style={[homeType.statValue, { color: palette.valueInk }]}>
              {t("home.goal.streakValue", { count: props.streak })}
            </Text>
            <Text style={[homeType.statLabel, { color: palette.muted }]} numberOfLines={1}>
              {t("home.goal.streakLabel")}
            </Text>
          </View>
        </View>
        <View style={styles.stat}>
          <Image source={ICON_BOOK} style={styles.statIcon} contentFit="cover" transition={0} />
          <View>
            <Text style={[homeType.statValue, { color: palette.valueInk }]}>{props.booksRead}</Text>
            <Text style={[homeType.statLabel, { color: palette.muted }]} numberOfLines={1}>
              {t("home.stats.booksRead")}
            </Text>
          </View>
        </View>
      </View>
    </View>
  );
}

const TRACK = 10;

const styles = StyleSheet.create({
  card: {
    marginHorizontal: homeMetrics.gutter,
    padding: homeMetrics.cardPadding,
    paddingBottom: homeMetrics.cardPaddingBottom,
    borderRadius: homeMetrics.cardRadius,
    backgroundColor: homeColors.card,
    gap: homeSpace.md,
    shadowColor: homeColors.shadow,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.07,
    shadowRadius: 24,
    elevation: 6,
  },
  top: {
    flexDirection: "row",
    alignItems: "center",
    gap: homeSpace.md,
  },
  ring: {
    width: RING,
    height: RING,
  },
  ringCenter: {
    ...StyleSheet.absoluteFill,
    alignItems: "center",
    justifyContent: "center",
  },
  ringText: {
    color: detailColors.amberInk,
    fontVariant: ["tabular-nums"],
  },
  topText: {
    flex: 1,
    gap: homeSpace.xxs,
  },
  more: {
    padding: homeSpace.xs,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: homeColors.hairline,
  },
  challengeHead: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  track: {
    height: TRACK,
    borderRadius: TRACK / 2,
    backgroundColor: homeColors.peach,
    overflow: "hidden",
  },
  fill: {
    height: TRACK,
    borderRadius: TRACK / 2,
    backgroundColor: detailColors.amber,
  },
  statRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: homeSpace.md,
    marginTop: homeSpace.xs,
  },
  stat: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: homeSpace.sm,
  },
  statIcon: {
    width: homeMetrics.statIcon,
    height: homeMetrics.statIcon,
    borderRadius: homeMetrics.statIcon / 2,
  },
});
