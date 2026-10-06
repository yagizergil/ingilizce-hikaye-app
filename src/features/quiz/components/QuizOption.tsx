import { Pressable, StyleSheet, Text, View } from "react-native";

import { Ionicons } from "@expo/vector-icons";

import { detailColors, homeSpace, quizColors, quizMetrics, quizType } from "@/theme";

export type QuizOptionState = "idle" | "selected" | "correct" | "wrong" | "dimmed";

interface QuizOptionProps {
  label: string;
  state: QuizOptionState;
  disabled: boolean;
  onPress: () => void;
}

/**
 * Cevap seçeneği: içeriğe göre büyüyen yumuşak kart (gerçek sorularda
 * seçenekler bir cümle uzunluğunda olabiliyor). Kontrolden sonra doğru
 * seçenek yeşil, yanlış seçilen kırmızı; diğerleri soluk.
 */
export function QuizOption({ label, state, disabled, onPress }: QuizOptionProps) {
  const icon = state === "correct" ? "checkmark-circle" : state === "wrong" ? "close-circle" : null;
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="radio"
      accessibilityState={{ selected: state === "selected", disabled }}
      accessibilityLabel={label}
      style={({ pressed }) => [
        styles.card,
        cardStyle[state],
        pressed && !disabled ? styles.pressed : null,
      ]}
    >
      <Text
        style={[
          state === "idle" || state === "dimmed" ? quizType.option : quizType.optionSelected,
          styles.label,
          labelStyle[state],
        ]}
      >
        {label}
      </Text>
      {icon ? (
        <Ionicons
          name={icon}
          size={quizMetrics.radio + 2}
          color={state === "correct" ? quizColors.selected : quizColors.wrong}
        />
      ) : (
        <View style={[styles.ring, state === "selected" ? styles.ringSelected : null]}>
          {state === "selected" ? <View style={styles.dot} /> : null}
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    minHeight: quizMetrics.optionMinHeight,
    flexDirection: "row",
    alignItems: "center",
    gap: homeSpace.md,
    paddingHorizontal: homeSpace.lg,
    paddingVertical: homeSpace.md,
    borderRadius: quizMetrics.optionCardRadius,
    borderWidth: 1.5,
  },
  label: {
    flex: 1,
  },
  pressed: {
    transform: [{ scale: 0.98 }],
  },
  ring: {
    width: quizMetrics.radio,
    height: quizMetrics.radio,
    borderRadius: quizMetrics.radio / 2,
    borderWidth: 2,
    borderColor: quizColors.radioRing,
    alignItems: "center",
    justifyContent: "center",
  },
  ringSelected: {
    borderColor: detailColors.circle,
  },
  dot: {
    width: quizMetrics.radioDot,
    height: quizMetrics.radioDot,
    borderRadius: quizMetrics.radioDot / 2,
    backgroundColor: detailColors.circle,
  },
});

const cardStyle = StyleSheet.create({
  idle: { backgroundColor: quizColors.optionBg, borderColor: quizColors.optionBorder },
  selected: { backgroundColor: quizColors.selected, borderColor: quizColors.selected },
  correct: { backgroundColor: quizColors.correctBg, borderColor: quizColors.selected },
  wrong: { backgroundColor: quizColors.wrongBg, borderColor: quizColors.wrong },
  dimmed: {
    backgroundColor: quizColors.optionBg,
    borderColor: quizColors.optionBorder,
    opacity: 0.55,
  },
});

const labelStyle = StyleSheet.create({
  idle: { color: quizColors.option },
  selected: { color: detailColors.circle },
  correct: { color: quizColors.correctInk },
  wrong: { color: quizColors.wrong },
  dimmed: { color: quizColors.option },
});
