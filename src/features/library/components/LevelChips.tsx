import { Pressable, ScrollView, StyleSheet, Text } from "react-native";

import { useTranslation } from "react-i18next";

import { detailColors, homeColors, homeMetrics, homeSpace, homeType } from "@/theme";

import type { LibraryFilters } from "@/features/library/types";

type LevelOption = LibraryFilters["levelGroup"];

const OPTIONS: LevelOption[] = ["all", "beginner", "intermediate", "advanced"];

interface LevelChipsProps {
  value: LevelOption;
  onChange: (value: LevelOption) => void;
}

/**
 * Ara ekranındaki seviye seçici (Tümü / A1-A2 / B1-B2 / C1-C2).
 *
 * NEDEN (2026-10-05, ilk-kullanıcı denetimi): filtre deposunda seviye
 * grubu VARDI ama Ara ekranında arayüzü yoktu; A2 bir kullanıcı C2
 * klasiklerin arasında okuyabileceği kitabı arıyordu. Varsayılan seçim
 * onboarding seviyesi (bkz. library.tsx).
 */
export function LevelChips({ value, onChange }: LevelChipsProps) {
  const { t } = useTranslation();
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.row}
      accessibilityRole="tablist"
    >
      {OPTIONS.map((option) => {
        const active = option === value;
        return (
          <Pressable
            key={option}
            onPress={() => onChange(option)}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            style={[styles.chip, active ? styles.chipActive : null]}
          >
            <Text
              style={[
                homeType.statLabel,
                { color: active ? detailColors.amberInk : homeColors.mutedStrong },
              ]}
            >
              {t(`library.levelChips.${option}`)}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: {
    gap: homeSpace.sm,
    paddingHorizontal: homeMetrics.gutter,
  },
  chip: {
    height: homeMetrics.continueButton,
    paddingHorizontal: homeSpace.lg,
    borderRadius: homeMetrics.continueButton / 2,
    backgroundColor: homeColors.peach,
    alignItems: "center",
    justifyContent: "center",
  },
  chipActive: {
    backgroundColor: detailColors.amber,
  },
});
