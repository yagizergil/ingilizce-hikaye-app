import { StyleSheet, Text, View } from "react-native";

import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";

import { monoType, radius, spacing } from "@/theme";
import { useTheme } from "@/theme/useTheme";
import { useBookWordOverlapQuery } from "@/features/library/api/useBookWordOverlapQuery";

interface BookWordOverlapProps {
  bookId: string;
}

/** "Kelime defterindeki N kelime bu kitapta geçiyor" -- sıfırsa hiç görünmez. */
export function BookWordOverlap({ bookId }: BookWordOverlapProps) {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const { data } = useBookWordOverlapQuery(bookId);

  if (!data || data.count === 0) return null;

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: theme.bg.surface, borderColor: theme.border.hairline },
      ]}
    >
      <Ionicons name="bookmark" size={18} color={theme.accent} />
      <View style={styles.text}>
        <Text style={[monoType.rowText, { color: theme.text.primary }]}>
          {t("bookDetail.wordOverlap", { count: data.count })}
        </Text>
        {data.sample.length > 0 ? (
          <Text style={[monoType.metaTight, { color: theme.text.secondary }]} numberOfLines={1}>
            {data.sample.join(" · ")}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
  },
  text: {
    flex: 1,
    gap: spacing.xxs,
  },
});
