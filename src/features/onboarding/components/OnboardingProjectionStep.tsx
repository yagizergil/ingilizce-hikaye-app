import { useEffect, useMemo, useState } from "react";
import { Animated, Easing, StyleSheet, Text, View } from "react-native";

import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import Svg, { Circle, Defs, LinearGradient, Path, Stop } from "react-native-svg";

import { monoType, radius, spacing } from "@/theme";
import { levelAccent } from "@/theme/tokens/colors";
import { useTheme } from "@/theme/useTheme";

import { OnboardingFooterButton } from "@/features/onboarding/components/OnboardingFooterButton";
import { OnboardingScaffold } from "@/features/onboarding/components/OnboardingScaffold";

import type { CefrLevel } from "@/features/onboarding/levelEstimate";
import type { ComponentProps } from "react";

type IoniconName = ComponentProps<typeof Ionicons>["name"];

/**
 * "Yolun" ekranı (referans: `docs/reference/bookvo-11-ilerleme-grafigi.jpeg`).
 *
 * DÜZEN: eğrinin altı dolgulu yükselen bir grafik, üzerinde üç düğüm, her
 * düğümün üstünde seviye baloncuğu; grafiğin ALTINDA ayrı bir satırda
 * zaman etiketleri; altta 2x2 özellik kutucukları.
 *
 * ETİKETLER NEDEN AYRI BİR SATIRDA: ilk sürümde her etiket kendi
 * düğümünün altına, yani eğrinin yüksekliğine göre değişen bir y'ye
 * konuyordu; düğümler farklı yüksekliklerde olduğu için etiketler eğriye
 * ve birbirine biniyordu. Şimdi sabit bir taban çizgisinde, üç eşit
 * sütunda -- referanstaki gibi bir x ekseni. Baloncuklar da aynı üç
 * sütunun merkezinde, kendi genişliğinde yuvalarda: hiçbir ekran
 * genişliğinde üst üste binemiyorlar.
 *
 * ANİMASYON: eğri soldan sağa ÇİZİLİYOR (strokeDashoffset), dolgu onun
 * arkasından beliriyor, baloncuklar düğüm sırasına göre tek tek oturuyor.
 * Süslemeden çok anlatım: ekranın söylediği şey "buradan şuraya
 * gideceksin" ve hareketin yönü tam olarak o. Yeni bir animasyon
 * kütüphanesi eklenmedi -- RN'in kendi `Animated`'i yetiyor.
 *
 * TEK İÇERİK FARKI: referansın alt başlığı "6 ayda ~2.700 kelime" diye
 * sayısal bir VAAT veriyor; bizde böyle bir ölçüm yok ve uydurulmuş bir
 * sayı yanıltıcı olurdu (Guideline 2.3.1). Yerine aritmetik olarak doğru
 * olan yazılıyor: kullanıcının kendi günlük hedefi x 6 ay.
 */
const LADDER: CefrLevel[] = ["A1", "A2", "B1", "B2", "C1", "C2"];

/**
 * Alt kutucuklar.
 *
 * RENKLİ İKON ROZETLERİ KALDIRILDI: her kutucuğa ayrı bir renk vermek
 * (mavi/yeşil/sarı/kırmızı) hiçbir şey anlatmıyordu -- renkler bir
 * SINIFLAMA göstermiyordu, sadece süstü, ve ekranın geri kalanında renk
 * SEVİYE demek (A1 mavi, C2 mor). Aynı ekranda aynı rengin iki farklı iş
 * yapması, tasarımı "hazır şablon" gibi gösteren şeydi. İkonlar artık
 * metinle aynı ailede: tek renk, rozet yok.
 */
const FEATURES: { icon: IoniconName; key: string }[] = [
  { icon: "flame-outline", key: "daily" },
  { icon: "headset-outline", key: "audio" },
  { icon: "sparkles-outline", key: "ai" },
  { icon: "repeat-outline", key: "review" },
];

const PLOT_HEIGHT = 200;
const DOT_SIZE = 14;
/** Baloncuğun altı ile düğüm noktası arasındaki boşluk. */
const BUBBLE_GAP = 10;

/**
 * Baloncuk artık DAİRE DEĞİL, hap (pill) -- ve içinde CEFR kodu değil
 * seviyenin ADI yazıyor.
 *
 * NEDEN: "A1/B2" ölçeği Avrupa dillerine ait; uygulama on arayüz diliyle
 * çalışıyor ve Çince okuyan birine "C1" hiçbir şey söylemiyor. Seviye
 * seçim ekranında kodları zaten kaldırmıştık, bu grafik son kalan yerdi.
 * Ad bir daireye sığmadığı için şekil hapa döndü; genişlik sabit bir
 * yuvayla sınırlı, yani komşu baloncuklar hâlâ üst üste binemiyor.
 */
const SLOT_WIDTH = 98;
const BUBBLE_HEIGHT = 26;

const VB_WIDTH = 300;
const VB_HEIGHT = 200;
/** Eğrinin uzunluğundan büyük herhangi bir sayı; kesikli desen buna göre. */
const DASH_LENGTH = 720;

/**
 * Düğümler üç eşit sütunun merkezinde (1/6, 3/6, 5/6).
 *
 * En üstteki düğümün y'si baloncuk yüksekliği + boşluk + noktanın
 * yarısından KÜÇÜK OLAMAZ; daha yukarı çıkarsa baloncuk kartın dışına
 * taşar -- ilk sürümde B2 soldan, C2 yukarıdan kırpılıyordu, sebebi buydu.
 */
const NODES = [
  { x: 50, y: 158 },
  { x: 150, y: 116 },
  { x: 250, y: 74 },
] as const;

const CURVE = [
  "M 4 184",
  `C 22 180, 30 166, ${NODES[0].x} ${NODES[0].y}`,
  `S 112 128, ${NODES[1].x} ${NODES[1].y}`,
  `S 218 82, ${NODES[2].x} ${NODES[2].y}`,
  "S 288 58, 296 54",
].join(" ");

/** Aynı eğrinin tabana kapatılmış hâli -- altındaki dolgu. */
const AREA = `${CURVE} L 296 ${VB_HEIGHT} L 4 ${VB_HEIGHT} Z`;

const AnimatedPath = Animated.createAnimatedComponent(Path);

interface OnboardingProjectionStepProps {
  progress: number;
  level: CefrLevel | null;
  dailyGoalMinutes: number | null;
  onContinue: () => void;
}

export function OnboardingProjectionStep({
  progress,
  level,
  dailyGoalMinutes,
  onContinue,
}: OnboardingProjectionStepProps) {
  const { t } = useTranslation();
  const { theme } = useTheme();

  /** Kullanıcının bulunduğu basamak ve sonraki iki basamak. */
  const path = useMemo<CefrLevel[]>(() => {
    const found = level ? LADDER.indexOf(level) : 0;
    // Merdivenin sonundaysa geriye kaydırılıyor ki grafik hep üç düğümlü
    // kalsın (C1 seçen kullanıcıda B2/C1/C2 görünür).
    const start = Math.min(Math.max(found, 0), LADDER.length - 3);
    return LADDER.slice(start, start + 3);
  }, [level]);

  // `useRef(new Animated.Value(...)).current` render sırasında okunamıyor
  // (react-hooks/refs); lazy initializer aynı "bir kez üret" davranışında.
  const [draw] = useState(() => new Animated.Value(0));
  const [fill] = useState(() => new Animated.Value(0));
  const [bubbles] = useState(() => NODES.map(() => new Animated.Value(0)));

  useEffect(() => {
    const drawing = Animated.timing(draw, {
      toValue: 1,
      duration: 900,
      easing: Easing.out(Easing.cubic),
      // SVG özelliği; native sürücü yalnızca transform/opacity'yi taşıyor.
      useNativeDriver: false,
    });

    const fading = Animated.timing(fill, {
      toValue: 1,
      duration: 600,
      delay: 250,
      useNativeDriver: false,
    });

    // Baloncuklar eğri o noktaya VARDIKÇA oturuyor; gecikmeler düğümlerin
    // yatay konumuyla orantılı, yani hareket çizgiyle aynı hızda ilerliyor.
    const popping = bubbles.map((value, index) =>
      Animated.spring(value, {
        toValue: 1,
        delay: 250 + (NODES[index]?.x ?? 0) * 2.2,
        friction: 6,
        tension: 90,
        useNativeDriver: true,
      }),
    );

    const animation = Animated.parallel([drawing, fading, ...popping]);
    animation.start();
    return () => animation.stop();
  }, [draw, fill, bubbles]);

  /** 6 ayda toplam okuma saati -- aritmetik, vaat değil. */
  const totalHours = dailyGoalMinutes ? Math.round((dailyGoalMinutes * 180) / 60) : null;

  const dashOffset = draw.interpolate({
    inputRange: [0, 1],
    outputRange: [DASH_LENGTH, 0],
  });

  return (
    <OnboardingScaffold
      progress={progress}
      title={t("onboarding.path.title")}
      subtitle={
        totalHours
          ? t("onboarding.path.subtitleWithGoal", {
              hours: totalHours,
              from: t(`onboarding.path.levels.${path[0]}`),
              to: t(`onboarding.path.levels.${path[path.length - 1]}`),
            })
          : t("onboarding.path.subtitle")
      }
      footer={<OnboardingFooterButton label={t("common.continue")} onPress={onContinue} />}
    >
      <View style={styles.body}>
        <View
          style={[
            styles.chartCard,
            { backgroundColor: theme.bg.surface, borderColor: theme.border.hairline },
          ]}
        >
          <View style={styles.plot}>
            <Svg
              width="100%"
              height="100%"
              viewBox={`0 0 ${VB_WIDTH} ${VB_HEIGHT}`}
              style={StyleSheet.absoluteFill}
            >
              <Defs>
                <LinearGradient id="stroke" x1="0" y1="1" x2="1" y2="0">
                  <Stop offset="0" stopColor={levelAccent.A1} />
                  <Stop offset="1" stopColor={theme.accent} />
                </LinearGradient>
                <LinearGradient id="area" x1="0" y1="0" x2="0" y2="1">
                  <Stop offset="0" stopColor={theme.accent} stopOpacity={0.22} />
                  <Stop offset="1" stopColor={theme.accent} stopOpacity={0} />
                </LinearGradient>
              </Defs>

              <AnimatedPath d={AREA} fill="url(#area)" opacity={fill} />

              <AnimatedPath
                d={CURVE}
                stroke="url(#stroke)"
                strokeWidth={4}
                fill="none"
                strokeLinecap="round"
                strokeDasharray={DASH_LENGTH}
                strokeDashoffset={dashOffset}
              />

              {/* Düğümler eğriyle AYNI koordinat sisteminde çiziliyor;
                  ayrı bir View olsalardı yüzde hesabındaki her sapma
                  onları çizgiden kaydırırdı. */}
              {NODES.map((node, index) => (
                <Circle
                  key={path[index] ?? index}
                  cx={node.x}
                  cy={node.y}
                  r={DOT_SIZE / 2}
                  fill={theme.bg.surface}
                  stroke={levelAccent[path[index] as CefrLevel]}
                  strokeWidth={4}
                />
              ))}
            </Svg>

            {/* Seviye baloncukları -- düğümün tam üstünde, sütun merkezinde. */}
            {NODES.map((node, index) => {
              const step = path[index] as CefrLevel;
              const left: `${number}%` = `${(node.x / VB_WIDTH) * 100}%`;
              const top: `${number}%` = `${(node.y / VB_HEIGHT) * 100}%`;
              const value = bubbles[index] as Animated.Value;
              return (
                <Animated.View
                  key={step}
                  style={[
                    styles.bubbleSlot,
                    { left, top },
                    { opacity: value, transform: [{ scale: value }] },
                  ]}
                >
                  <View
                    style={[
                      styles.bubble,
                      { backgroundColor: theme.bg.primary, borderColor: levelAccent[step] },
                    ]}
                  >
                    <Text
                      style={[monoType.metaTight, { color: levelAccent[step] }]}
                      numberOfLines={1}
                      adjustsFontSizeToFit
                      minimumFontScale={0.8}
                    >
                      {t(`onboarding.path.levels.${step}`)}
                    </Text>
                  </View>
                </Animated.View>
              );
            })}
          </View>

          {/* Zaman ekseni: üç eşit sütun, düğümlerle aynı merkezlerde. */}
          <View style={[styles.axis, { borderTopColor: theme.border.hairline }]}>
            {NODES.map((_, index) => (
              <Text
                key={index}
                style={[monoType.meta, styles.axisLabel, { color: theme.text.secondary }]}
                numberOfLines={1}
              >
                {t(`onboarding.path.milestones.${index}`)}
              </Text>
            ))}
          </View>
        </View>

        <View style={styles.features}>
          {FEATURES.map((feature) => (
            <View
              key={feature.key}
              style={[
                styles.feature,
                { backgroundColor: theme.bg.surface, borderColor: theme.border.hairline },
              ]}
            >
              <Ionicons name={feature.icon} size={18} color={theme.accent} />
              <View style={styles.featureText}>
                <Text style={[monoType.rowText, { color: theme.text.primary }]} numberOfLines={2}>
                  {feature.key === "daily" && dailyGoalMinutes
                    ? t("onboarding.goal.minutes", { count: dailyGoalMinutes })
                    : t(`onboarding.path.features.${feature.key}.title`)}
                </Text>
                <Text style={[monoType.meta, { color: theme.text.secondary }]} numberOfLines={2}>
                  {t(`onboarding.path.features.${feature.key}.body`)}
                </Text>
              </View>
            </View>
          ))}
        </View>
      </View>
    </OnboardingScaffold>
  );
}

const styles = StyleSheet.create({
  body: {
    flex: 1,
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
  },
  chartCard: {
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    // Yatay iç boşluk, en soldaki ve en sağdaki BALONCUĞUN yarısından
    // büyük: baloncuklar kartın kenarına değmiyor.
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
  },
  plot: {
    height: PLOT_HEIGHT,
  },
  /**
   * Baloncuk yuvası: genişliği baloncuk kadar ve yarısı kadar sola
   * kaydırılmış, böylece düğüm noktasında ORTALANIYOR; dikeyde de
   * baloncuğun ALTI düğüme değecek şekilde yukarı çekiliyor.
   */
  bubbleSlot: {
    position: "absolute",
    width: SLOT_WIDTH,
    marginLeft: -SLOT_WIDTH / 2,
    marginTop: -(BUBBLE_HEIGHT + BUBBLE_GAP + DOT_SIZE / 2),
    alignItems: "center",
  },
  bubble: {
    // Genişlik içeriğe göre; yuva sabit olduğu için taşma riski yok.
    maxWidth: SLOT_WIDTH,
    height: BUBBLE_HEIGHT,
    paddingHorizontal: spacing.xs,
    borderRadius: radius.full,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  axis: {
    flexDirection: "row",
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingVertical: spacing.sm,
  },
  axisLabel: {
    flex: 1,
    textAlign: "center",
  },
  features: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs,
  },
  feature: {
    flexBasis: "48%",
    flexGrow: 1,
    flexShrink: 1,
    flexDirection: "row",
    // İkon başlığın ilk satırıyla hizalı; başlık iki satıra taşarsa ikon
    // ortaya kayıp satırı eğri göstermiyor.
    alignItems: "flex-start",
    gap: spacing.xs,
    padding: spacing.sm,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
  },
  featureText: {
    flex: 1,
    gap: spacing.xxs,
  },
});
