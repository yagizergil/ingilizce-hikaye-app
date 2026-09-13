import { useMemo } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";

import { monoType, spacing, type } from "@/theme";
import { useTheme } from "@/theme/useTheme";
import { LoadingState } from "@/components/ui";
import { CONTENT_TARGET_LANGUAGES, getLanguage } from "@/lib/languages";

import { useOwnedLanguagePairsQuery } from "@/features/languagePair/api/useActiveLanguagePairQuery";
import { useSetLanguagePairMutation } from "@/features/languagePair/api/useSetLanguagePairMutation";

interface ManageLanguagePairsScreenProps {
  onClose: () => void;
  onNeedsPremium: () => void;
}

/**
 * Profil > Dil ayarlarından açılan yönetim ekranı.
 *
 * `LanguagePairScreen` (onboarding) ile KARIŞTIRILMASIN: o ekran "hiç
 * çiftin yok, birini seç" durumunu ele alıyor ve seçim daima ücretsiz.
 * Burası "zaten en az bir çiftin var, başka bir tane ekle/aralarında
 * geçiş yap" durumu -- ikinci ve sonraki çiftler premium gerektiriyor
 * (bkz. `set_language_pair`, migration 033).
 *
 * MEVCUT ÇİFTLER ARASINDA GEÇİŞ HER ZAMAN ÜCRETSİZ: fonksiyon zaten sahip
 * olunan bir çifti tekrar seçmeyi premium kontrolünden muaf tutuyor -- bu
 * ekran o kuralı TEKRARLAMIYOR, yalnızca sunucunun döndürdüğü sonucu
 * yorumluyor.
 */
export function ManageLanguagePairsScreen({
  onClose,
  onNeedsPremium,
}: ManageLanguagePairsScreenProps) {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const { data: owned, isLoading } = useOwnedLanguagePairsQuery();
  const setPair = useSetLanguagePairMutation();

  const ownedTargets = useMemo(() => new Set((owned ?? []).map((p) => p.targetLanguage)), [owned]);
  const activePair = owned?.find((p) => p.isActive) ?? null;

  const addableTargets = useMemo(() => {
    if (!activePair) return [];
    return CONTENT_TARGET_LANGUAGES.filter(
      (language) => language.code !== activePair.nativeLanguage && !ownedTargets.has(language.code),
    );
  }, [activePair, ownedTargets]);

  const handleSelect = (targetLanguage: string) => {
    if (!activePair) return;

    setPair.mutate(
      { nativeLanguage: activePair.nativeLanguage, targetLanguage },
      {
        onSuccess: (result) => {
          if (result === "premium_required") {
            onNeedsPremium();
            return;
          }
          onClose();
        },
        onError: () => {
          Alert.alert(t("common.errorTitle"), t("languagePair.saveError"));
        },
      },
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.bg.primary }]} edges={["top"]}>
      <View style={styles.topbar}>
        <Pressable
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel={t("common.back")}
          hitSlop={{ top: spacing.ml, bottom: spacing.ml, left: spacing.ml, right: spacing.ml }}
        >
          <Ionicons name="close" size={22} color={theme.text.primary} />
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={[type.display, { color: theme.text.primary }]}>
          {t("languagePair.manageTitle")}
        </Text>

        {isLoading ? (
          <LoadingState />
        ) : (
          <>
            <View style={styles.section}>
              <Text style={[monoType.label, { color: theme.text.secondary }]}>
                {t("languagePair.yourPairs")}
              </Text>
              <View style={styles.list}>
                {(owned ?? []).map((pair) => (
                  <PairRow
                    key={`${pair.nativeLanguage}-${pair.targetLanguage}`}
                    native={pair.nativeLanguage}
                    target={pair.targetLanguage}
                    active={pair.isActive}
                    onPress={pair.isActive ? undefined : () => handleSelect(pair.targetLanguage)}
                  />
                ))}
              </View>
            </View>

            {addableTargets.length > 0 ? (
              <View style={styles.section}>
                <Text style={[monoType.label, { color: theme.text.secondary }]}>
                  {t("languagePair.addPair")}
                </Text>
                <View style={styles.list}>
                  {addableTargets.map((language) => (
                    <PairRow
                      key={language.code}
                      native={activePair?.nativeLanguage ?? ""}
                      target={language.code}
                      active={false}
                      onPress={() => handleSelect(language.code)}
                      showPremiumBadge
                    />
                  ))}
                </View>
              </View>
            ) : null}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function PairRow({
  native,
  target,
  active,
  onPress,
  showPremiumBadge = false,
}: {
  native: string;
  target: string;
  active: boolean;
  onPress?: () => void;
  showPremiumBadge?: boolean;
}) {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const nativeInfo = getLanguage(native);
  const targetInfo = getLanguage(target);

  return (
    <Pressable
      disabled={!onPress}
      onPress={onPress}
      style={({ pressed }) => [
        styles.row,
        {
          borderColor: active ? theme.text.primary : theme.border.hairline,
          opacity: pressed ? 0.6 : 1,
        },
      ]}
      accessibilityRole="button"
    >
      <Text style={[monoType.rowText, { color: theme.text.primary }]}>
        {nativeInfo?.nativeName ?? native} → {targetInfo?.nativeName ?? target}
      </Text>
      {active ? (
        <Text style={[monoType.label, { color: theme.accent }]}>
          {t("languagePair.activeBadge")}
        </Text>
      ) : showPremiumBadge ? (
        <Ionicons name="lock-closed-outline" size={16} color={theme.text.secondary} />
      ) : (
        <Ionicons name="chevron-forward" size={16} color={theme.text.secondary} />
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  topbar: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xs,
    paddingBottom: spacing.xs,
  },
  content: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl,
    gap: spacing.lg,
  },
  section: {
    gap: spacing.xs,
  },
  list: {
    gap: spacing.xs,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 8,
  },
});
