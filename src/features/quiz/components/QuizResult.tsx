import { useEffect } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { useTranslation } from "react-i18next";

import {
  detailColors,
  detailType,
  homeColors,
  homeMetrics,
  homeSpace,
  homeType,
  quizMetrics,
  quizType,
  mascotSize,
} from "@/theme";
import { MascotAnim } from "@/components/ui";
import { playSfx } from "@/lib/sfx";

interface QuizResultProps {
  correct: number;
  total: number;
  onRetry: () => void;
  onClose: () => void;
  /** Verilirse "2. basamak açıldı" kartı gösterilir; dokununca çağrılır. */
  nextLevelUpsell?: () => void;
}

/** Quiz bitişi: kanat çırpan maskot, "N / M doğru" ve iki düğme (tekrar dene, kapat). */
export function QuizResult({ correct, total, onRetry, onClose, nextLevelUpsell }: QuizResultProps) {
  const { t } = useTranslation();
  useEffect(() => playSfx("complete"), []);

  return (
    <View style={styles.container}>
      <MascotAnim name="profile" width={mascotSize.empty} style={styles.mascot} />
      <Text style={[quizType.resultTitle, styles.title]}>
        {t("quiz.result.title", { correct, total })}
      </Text>
      <Text style={[homeType.cardSub, styles.sub]}>
        {t(correct === total ? "quiz.result.perfect" : "quiz.result.keepGoing")}
      </Text>
      {nextLevelUpsell ? (
        <Pressable
          onPress={nextLevelUpsell}
          accessibilityRole="button"
          style={({ pressed }) => [styles.upsell, pressed ? styles.pressed : null]}
        >
          <Text style={[detailType.cta, { color: detailColors.amberInk }]}>
            {t("quiz.result.nextLevelTitle")}
          </Text>
          <Text style={[homeType.cardSub, styles.sub]}>{t("quiz.result.nextLevelBody")}</Text>
        </Pressable>
      ) : null}
      <View style={styles.buttons}>
        <Pressable
          onPress={onRetry}
          accessibilityRole="button"
          style={({ pressed }) => [styles.primary, pressed ? styles.pressed : null]}
        >
          <Text style={[detailType.cta, { color: detailColors.amberInk }]}>
            {t("quiz.result.retry")}
          </Text>
        </Pressable>
        <Pressable
          onPress={onClose}
          accessibilityRole="button"
          style={({ pressed }) => [styles.secondary, pressed ? styles.pressed : null]}
        >
          <Text style={[detailType.cta, { color: homeColors.mutedStrong }]}>
            {t("quiz.result.close")}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  upsell: {
    alignSelf: "stretch",
    gap: homeSpace.xs,
    padding: homeSpace.lg,
    borderRadius: homeMetrics.cardRadius,
    borderWidth: 2,
    borderColor: detailColors.amber,
    backgroundColor: homeColors.card,
    alignItems: "center",
  },
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: homeMetrics.gutter + homeSpace.sm,
    backgroundColor: detailColors.circle,
  },
  mascot: {
    marginBottom: homeSpace.xl,
    // "profile" pozunda kanatlar bir yana açık: görünür ağırlık merkezi
    // karenin %13 solunda (sprite ilk karesinden ölçüldü). Kutuyu
    // ortalamak papağanı solda gösteriyordu; o kadar sağa kaydırılıyor.
    transform: [{ translateX: Math.round(mascotSize.empty * (430 / 464) * 0.129) }],
  },
  title: {
    color: detailColors.title,
    textAlign: "center",
  },
  sub: {
    color: homeColors.muted,
    textAlign: "center",
    marginTop: homeSpace.sm,
  },
  buttons: {
    alignSelf: "stretch",
    gap: homeSpace.md,
    marginTop: homeSpace.xl * 2,
  },
  primary: {
    height: quizMetrics.buttonHeight,
    borderRadius: quizMetrics.buttonHeight / 2,
    backgroundColor: detailColors.amber,
    alignItems: "center",
    justifyContent: "center",
  },
  secondary: {
    height: quizMetrics.buttonHeight,
    alignItems: "center",
    justifyContent: "center",
  },
  pressed: {
    opacity: 0.85,
  },
});
