import { Pressable, StyleSheet, Text, View } from "react-native";

import { monoType, radius, spacing } from "@/theme";
import { useTheme } from "@/theme/useTheme";

export interface SegmentOption<T extends string> {
  value: T;
  label: string;
}

interface SegmentedControlProps<T extends string> {
  options: readonly SegmentOption<T>[];
  value: T;
  onChange: (value: T) => void;
}

/**
 * FAZ 4 (2026-09-14, referans uygulama eşleştirmesi): "Kelimeler" ekranının
 * "Favoriler (0)" / "Geçmiş (58)" seçicisi -- TEK bir yuvarlak pill parça
 * (`FilterTab`'ın her seçeneği kendi ayrı sınırlı pill'i olan eski
 * tasarımından farklı): dış track sabit bir yüzey, seçili segment üzerinde
 * kayan daha açık bir dolgu taşıyor. `FilterTab`'a dokunulmadı (Kütüphane
 * ekranında hâlâ kullanılıyor) -- bu, yalnızca Kelimeler ekranının
 * ihtiyacı için ayrı bir bileşen.
 */
export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
}: SegmentedControlProps<T>) {
  const { theme } = useTheme();

  return (
    <View style={[styles.track, { backgroundColor: theme.bg.surface }]}>
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <Pressable
            key={option.value}
            style={[styles.segment, selected && { backgroundColor: theme.secondaryMuted }]}
            onPress={() => onChange(option.value)}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            accessibilityLabel={option.label}
          >
            <Text
              style={[
                monoType.rowText,
                styles.label,
                { color: selected ? theme.text.primary : theme.text.secondary },
              ]}
              numberOfLines={1}
            >
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    flexDirection: "row",
    borderRadius: radius.full,
    padding: spacing.xxs,
  },
  segment: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
  },
  label: {
    fontWeight: "700",
  },
});
