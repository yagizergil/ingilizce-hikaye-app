import { View, StyleSheet } from "react-native";

import { useTranslation } from "react-i18next";
import { useRouter } from "expo-router";

import { spacing } from "@/theme";
import { EmptyState, Button } from "@/components/ui";

/**
 * EmptyHome's meaning narrowed by the redesign: level-group cards now
 * ALWAYS render (per spec, a fixed nav element, not content), so the old
 * "no continueReading AND no shelves" trigger no longer describes a
 * genuinely empty screen — there would still be 3 level cards to tap.
 * The only state that still makes the whole screen worth replacing with
 * this full-bleed empty view is an empty catalog itself (`newBooks.length
 * === 0` — nothing published yet), since every other section derives from
 * the same book list. See app/(tabs)/index.tsx's `hasAnyContent`.
 */
export function EmptyHome() {
  const { t } = useTranslation();
  const router = useRouter();

  return (
    <EmptyState
      title={t("home.empty.title")}
      description={t("home.empty.description")}
      action={
        <View style={styles.buttonWrap}>
          <Button label={t("home.empty.cta")} onPress={() => router.push("/(tabs)/library")} />
        </View>
      }
    />
  );
}

const styles = StyleSheet.create({
  buttonWrap: {
    marginTop: spacing.sm,
  },
});
