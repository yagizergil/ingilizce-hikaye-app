import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";

import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";

import { detailColors, detailType, homeColors, homeSpace, homeType, radius } from "@/theme";
import { useHomePalette } from "@/features/home";

import { CANCEL_NOTE_MAX, CANCEL_REASONS } from "@/features/subscription/cancelFlow";
import { LifecycleCard } from "@/features/subscription/components/LifecycleCard";

import type { CancelReason } from "@/features/subscription/cancelFlow";

interface CancelReasonStepProps {
  reason: CancelReason | null;
  note: string;
  onSelect: (reason: CancelReason) => void;
  onChangeNote: (note: string) => void;
}

/** İptal akışı 2. adım: neden anketi (5 seçenek + isteğe bağlı not). */
export function CancelReasonStep({ reason, note, onSelect, onChangeNote }: CancelReasonStepProps) {
  const { t } = useTranslation();
  const palette = useHomePalette();
  return (
    <LifecycleCard>
      <Text style={[detailType.sectionTitle, { color: palette.ink }]}>
        {t("subscription.cancel.reasonTitle")}
      </Text>
      <Text style={[homeType.cardSub, { color: palette.muted }]}>
        {t("subscription.cancel.reasonSubtitle")}
      </Text>
      {CANCEL_REASONS.map((item) => {
        const selected = item === reason;
        return (
          <Pressable
            key={item}
            onPress={() => onSelect(item)}
            accessibilityRole="radio"
            accessibilityState={{ selected }}
            style={[styles.option, selected ? styles.optionSelected : null]}
          >
            <Ionicons
              name={selected ? "radio-button-on" : "radio-button-off"}
              size={20}
              color={selected ? detailColors.amberInk : homeColors.muted}
            />
            <Text style={[detailType.statLabel, styles.optionText, { color: palette.ink }]}>
              {t(`subscription.cancel.reasons.${item}`)}
            </Text>
          </Pressable>
        );
      })}
      {reason ? (
        <View>
          <TextInput
            value={note}
            onChangeText={onChangeNote}
            placeholder={t("subscription.cancel.notePlaceholder")}
            placeholderTextColor={homeColors.muted}
            maxLength={CANCEL_NOTE_MAX}
            multiline
            style={[homeType.cardSub, styles.input, { color: palette.ink }]}
            accessibilityLabel={t("subscription.cancel.notePlaceholder")}
          />
        </View>
      ) : null}
    </LifecycleCard>
  );
}

const styles = StyleSheet.create({
  option: {
    flexDirection: "row",
    alignItems: "center",
    gap: homeSpace.md,
    paddingVertical: homeSpace.sm,
    paddingHorizontal: homeSpace.md,
    borderRadius: radius.md,
  },
  optionSelected: {
    backgroundColor: detailColors.amber,
  },
  optionText: {
    flex: 1,
  },
  input: {
    minHeight: 72,
    padding: homeSpace.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: detailColors.circleBorder,
    textAlignVertical: "top",
  },
});
