import { useEffect, useState } from "react";
import { Animated, StyleSheet, Text, View } from "react-native";

import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";

import { monoType, radius, spacing, type } from "@/theme";
import { useTheme } from "@/theme/useTheme";

import { OnboardingScaffold } from "@/features/onboarding/components/OnboardingScaffold";

/**
 * "Planın hazırlanıyor" ekranı (referans: `bookvo-12-plan-olusturuluyor.jpeg`).
 *
 * REFERANSTA SAHTE BİR BEKLEME VAR: dört madde sırayla işaretleniyor ama
 * arkada bir iş yapılmıyor -- sadece zaman geçiriliyor. Burada aynı
 * görünümü GERÇEK işe bağladık: bu ekran açıkken çağıran taraf kütüphaneyi
 * ve kullanıcı verisini önden çekiyor (bkz. `steps` prop'u). Maddeler
 * gerçekten biten işlere göre işaretleniyor.
 *
 * NEDEN ÖNEMLİ: onboarding biter bitmez ana ekran açılıyor. O veriyi bu
 * ekran açıkken çekmek, kullanıcının ilk gördüğü ekranın boş bir iskelet
 * olmasını engelliyor -- yani bu bekleme, beklemeyi AZALTIYOR.
 *
 * Hiçbir iş kalmasa bile ekran kısa bir süre duruyor (`MIN_VISIBLE_MS`):
 * bir kare görünüp kaybolan "hazırlanıyor" ekranı arıza gibi görünür.
 */
const MIN_VISIBLE_MS = 1400;

export interface OnboardingPlanTask {
  key: string;
  done: boolean;
}

interface OnboardingPlanStepProps {
  progress: number;
  tasks: OnboardingPlanTask[];
  onDone: () => void;
}

export function OnboardingPlanStep({ progress, tasks, onDone }: OnboardingPlanStepProps) {
  const { t } = useTranslation();
  const { theme } = useTheme();

  const [minElapsed, setMinElapsed] = useState(false);
  const [spin] = useState(() => new Animated.Value(0));

  useEffect(() => {
    const timer = setTimeout(() => setMinElapsed(true), MIN_VISIBLE_MS);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(spin, { toValue: 1, duration: 1100, useNativeDriver: true }),
    );
    loop.start();
    return () => loop.stop();
  }, [spin]);

  const allDone = tasks.every((task) => task.done);

  useEffect(() => {
    if (allDone && minElapsed) onDone();
  }, [allDone, minElapsed, onDone]);

  const rotate = spin.interpolate({ inputRange: [0, 1], outputRange: ["0deg", "360deg"] });
  const completed = tasks.filter((task) => task.done).length;

  return (
    <OnboardingScaffold
      progress={progress}
      title={t("onboarding.plan.title")}
      subtitle={t("onboarding.plan.subtitle")}
    >
      <View style={styles.body}>
        <View style={[styles.ringOuter, { borderColor: theme.border.hairline }]}>
          <Animated.View
            style={[styles.ringSpinner, { borderTopColor: theme.accent, transform: [{ rotate }] }]}
          />
          <Text style={[type.continueTitle, { color: theme.text.primary }]}>
            {`${completed}/${tasks.length}`}
          </Text>
        </View>

        <View style={styles.list}>
          {tasks.map((task) => (
            <View
              key={task.key}
              style={[
                styles.task,
                { backgroundColor: theme.bg.surface, borderColor: theme.border.hairline },
              ]}
            >
              <Ionicons
                name={task.done ? "checkmark-circle" : "ellipsis-horizontal"}
                size={20}
                color={task.done ? theme.accent : theme.text.secondary}
              />
              <Text style={[monoType.rowText, styles.taskText, { color: theme.text.primary }]}>
                {t(`onboarding.plan.tasks.${task.key}`)}
              </Text>
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
    alignItems: "center",
    paddingHorizontal: spacing.md,
    gap: spacing.section,
  },
  ringOuter: {
    width: 120,
    height: 120,
    borderRadius: radius.full,
    borderWidth: 4,
    alignItems: "center",
    justifyContent: "center",
  },
  /** Dönen yay: yalnızca üst kenarı renkli bir halka. */
  ringSpinner: {
    position: "absolute",
    width: 120,
    height: 120,
    borderRadius: radius.full,
    borderWidth: 4,
    borderColor: "transparent",
  },
  list: {
    alignSelf: "stretch",
    gap: spacing.xs,
  },
  task: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
  },
  taskText: {
    flex: 1,
  },
});
