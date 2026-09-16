import { useMemo, useState } from "react";
import { Alert, I18nManager, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import * as Updates from "expo-updates";

import i18n from "@/i18n";
import { storeUiLanguage } from "@/i18n/uiLanguage";
import { monoType, spacing, type } from "@/theme";
import { useTheme } from "@/theme/useTheme";
import { LanguageFlag, LoadingState } from "@/components/ui";
import { CONTENT_TARGET_LANGUAGES, LANGUAGES, isRtlLanguage, getLanguage } from "@/lib/languages";

import { useOwnedLanguagePairsQuery } from "@/features/languagePair/api/useActiveLanguagePairQuery";
import { useSetLanguagePairMutation } from "@/features/languagePair/api/useSetLanguagePairMutation";

import type { LanguageInfo } from "@/lib/languages";
import type { OwnedLanguagePair } from "@/features/languagePair/api/useActiveLanguagePairQuery";

type Phase = "list" | "native" | "target" | "history";

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

  const [phase, setPhase] = useState<Phase>("list");
  const [pendingNative, setPendingNative] = useState<string | null>(null);

  const activePair = owned?.find((p) => p.isActive) ?? null;

  /**
   * ÇÖZÜLEN HATA (kullanıcı bulgusu, 2026-09-16): "seçilebilir diller"
   * listesi eskiden `owned` dizisinin TAMAMINDAN (kullanıcının GEÇMİŞTE
   * denediği HER ana dil için) topladığı hedef kümesini çıkarıyordu. Bir
   * kullanıcı bir noktada Türkçe→İngilizce, başka bir noktada Çince→Rusça
   * denemişse, ana dilini Fransızca'ya çevirdiğinde İngilizce ve Rusça
   * "zaten sahip olunan" sayılıp EKLENEBİLİR listesinden düşüyordu --
   * oysa bu diller o kullanıcının Fransızca ana diliyle hiç eşleşmemişti.
   * Sonuç: "Fransızca ana dilken İngilizce hedef seçilemiyor" gibi anlamsız
   * eksiklikler.
   *
   * Düzeltme: "zaten sahip olunan hedef" kümesi yalnızca AKTİF ana dille
   * eşleşen çiftlerden çıkarılıyor. Farklı bir ana dille denenmiş çiftler
   * "sahiplik" değil, aşağıdaki `historyPairs`'a taşınan bir GEÇMİŞ.
   */
  const pairsForCurrentNative = useMemo(
    () => (owned ?? []).filter((pair) => pair.nativeLanguage === activePair?.nativeLanguage),
    [owned, activePair],
  );

  /** Farklı bir ana dille daha önce kurulmuş çiftler -- "Geçmiş seçimler". */
  const historyPairs = useMemo(
    () => (owned ?? []).filter((pair) => pair.nativeLanguage !== activePair?.nativeLanguage),
    [owned, activePair],
  );

  const ownedTargetsForCurrentNative = useMemo(
    () => new Set(pairsForCurrentNative.map((pair) => pair.targetLanguage)),
    [pairsForCurrentNative],
  );

  const addableTargets = useMemo(() => {
    if (!activePair) return [];
    return CONTENT_TARGET_LANGUAGES.filter(
      (language) =>
        language.code !== activePair.nativeLanguage &&
        !ownedTargetsForCurrentNative.has(language.code),
    );
  }, [activePair, ownedTargetsForCurrentNative]);

  /**
   * Yeni ana dil için hedef seçenekleri -- `nativeLanguage`, ŞU AN aktif
   * hedeften (`activePair.targetLanguage`) farklıysa hedefi DEĞİŞTİRMEDEN
   * devam edilebilir (bkz. `submitPair`'in "target === undefined" dalı).
   * Bu liste yalnızca yeni ana dil ile şu anki hedef ÇAKIŞTIĞINDA (native ==
   * target olamaz kısıtı, `set_language_pair`) devreye giriyor.
   */
  const targetOptionsForNewNative = useMemo(() => {
    if (!pendingNative) return [];
    return CONTENT_TARGET_LANGUAGES.filter((language) => language.code !== pendingNative);
  }, [pendingNative]);

  const applyNativeLanguageSideEffects = (nativeLanguage: string): boolean => {
    // Seçim kalıcı: bir sonraki açılışta cihaz diline dönmesin.
    void storeUiLanguage(nativeLanguage);
    void i18n.changeLanguage(nativeLanguage);
    const needsRtlRestart = isRtlLanguage(nativeLanguage) !== I18nManager.isRTL;
    if (needsRtlRestart) {
      I18nManager.allowRTL(true);
      I18nManager.forceRTL(isRtlLanguage(nativeLanguage));
    }
    return needsRtlRestart;
  };

  const submitPair = (nativeLanguage: string, targetLanguage: string, needsRtlRestart: boolean) => {
    setPair.mutate(
      { nativeLanguage, targetLanguage },
      {
        onSuccess: (result) => {
          if (result === "premium_required") {
            onNeedsPremium();
            return;
          }

          if (needsRtlRestart) {
            Alert.alert(t("languagePair.restartTitle"), t("languagePair.restartBody"), [
              {
                text: t("languagePair.restartCta"),
                onPress: () => {
                  void Updates.reloadAsync().catch(() => {
                    setPhase("list");
                    setPendingNative(null);
                  });
                },
              },
            ]);
            return;
          }

          setPhase("list");
          setPendingNative(null);
        },
        onError: () => {
          Alert.alert(t("common.errorTitle"), t("languagePair.saveError"));
        },
      },
    );
  };

  const handleSelectTarget = (targetLanguage: string) => {
    if (!activePair) return;
    submitPair(activePair.nativeLanguage, targetLanguage, false);
  };

  /**
   * "Geçmiş seçimler" kartına dokunma -- ÇÖZÜLEN HATA: eskiden bu kartlar
   * da `handleSelectTarget` kullanıyordu, yani kartın KENDİ ana dilini
   * yok sayıp ŞU ANKİ aktif ana dille birleştiriyordu. Geçmiş bir Çince→
   * Rusça çiftine dokunmak, mevcut ana dilin (örn. Fransızca) hedefini
   * Rusça'ya çeviriyordu -- ana dili sessizce Fransızca'da bırakarak.
   * Burada hem ana dil hem hedef, kartın kendi çiftinden birlikte
   * uygulanıyor.
   */
  const handleSelectHistoryPair = (pair: OwnedLanguagePair) => {
    const needsRtlRestart = applyNativeLanguageSideEffects(pair.nativeLanguage);
    submitPair(pair.nativeLanguage, pair.targetLanguage, needsRtlRestart);
  };

  const handleSelectNewNative = (nativeLanguage: string) => {
    if (!activePair) return;

    // Ana dil, ŞU ANKİ hedefle çakışıyorsa (native == target olamaz) önce
    // yeni bir hedef seçtiriyoruz -- restart/i18n değişikliği yalnızca son
    // adımda, gerçek çift belirlendiğinde uygulanıyor.
    if (nativeLanguage === activePair.targetLanguage) {
      setPendingNative(nativeLanguage);
      setPhase("target");
      return;
    }

    const needsRtlRestart = applyNativeLanguageSideEffects(nativeLanguage);
    submitPair(nativeLanguage, activePair.targetLanguage, needsRtlRestart);
  };

  const handleConfirmNewNativeTarget = (targetLanguage: string) => {
    if (!pendingNative) return;
    const needsRtlRestart = applyNativeLanguageSideEffects(pendingNative);
    submitPair(pendingNative, targetLanguage, needsRtlRestart);
  };

  if (phase === "history") {
    return (
      <SafeAreaView
        style={[styles.container, { backgroundColor: theme.bg.primary }]}
        edges={["top"]}
      >
        <View style={styles.topbar}>
          <Pressable
            onPress={() => setPhase("list")}
            accessibilityRole="button"
            accessibilityLabel={t("common.back")}
            hitSlop={{ top: spacing.ml, bottom: spacing.ml, left: spacing.ml, right: spacing.ml }}
          >
            <Ionicons name="close" size={22} color={theme.text.primary} />
          </Pressable>
        </View>
        <ScrollView contentContainerStyle={styles.content}>
          <Text style={[type.display, { color: theme.text.primary }]}>
            {t("languagePair.historyPairs")}
          </Text>

          {setPair.isPending ? (
            <LoadingState />
          ) : (
            <View style={styles.list}>
              {historyPairs.map((pair) => (
                <PairRow
                  key={`history-${pair.nativeLanguage}-${pair.targetLanguage}`}
                  native={pair.nativeLanguage}
                  target={pair.targetLanguage}
                  active={false}
                  onPress={() => handleSelectHistoryPair(pair)}
                />
              ))}
            </View>
          )}
        </ScrollView>
      </SafeAreaView>
    );
  }

  if (phase === "native" || phase === "target") {
    const options = phase === "native" ? LANGUAGES : targetOptionsForNewNative;
    return (
      <SafeAreaView
        style={[styles.container, { backgroundColor: theme.bg.primary }]}
        edges={["top"]}
      >
        <View style={styles.topbar}>
          <Pressable
            onPress={() => {
              setPhase("list");
              setPendingNative(null);
            }}
            accessibilityRole="button"
            accessibilityLabel={t("common.back")}
            hitSlop={{ top: spacing.ml, bottom: spacing.ml, left: spacing.ml, right: spacing.ml }}
          >
            <Ionicons name="close" size={22} color={theme.text.primary} />
          </Pressable>
        </View>
        <ScrollView contentContainerStyle={styles.content}>
          <Text style={[type.display, { color: theme.text.primary }]}>
            {t(phase === "native" ? "languagePair.nativeTitle" : "languagePair.targetTitle")}
          </Text>
          <Text style={[monoType.rowText, { color: theme.text.secondary }]}>
            {t(phase === "native" ? "languagePair.nativeBody" : "languagePair.targetBody")}
          </Text>

          {setPair.isPending ? (
            <LoadingState />
          ) : (
            <View style={styles.list}>
              {options.map((language) => (
                <LanguageOptionRow
                  key={language.code}
                  language={language}
                  onPress={() =>
                    phase === "native"
                      ? handleSelectNewNative(language.code)
                      : handleConfirmNewNativeTarget(language.code)
                  }
                />
              ))}
            </View>
          )}
        </ScrollView>
      </SafeAreaView>
    );
  }

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
            {activePair ? (
              <View style={styles.section}>
                <Text style={[monoType.label, { color: theme.text.secondary }]}>
                  {t("languagePair.interfaceLanguageSection")}
                </Text>
                <View style={styles.list}>
                  <Pressable
                    onPress={() => setPhase("native")}
                    accessibilityRole="button"
                    style={({ pressed }) => [
                      styles.row,
                      { borderColor: theme.border.hairline, opacity: pressed ? 0.6 : 1 },
                    ]}
                  >
                    <View style={styles.rowLabel}>
                      <LanguageFlag code={activePair.nativeLanguage} size={28} />
                      <Text style={[monoType.rowText, { color: theme.text.primary }]}>
                        {getLanguage(activePair.nativeLanguage)?.nativeName ??
                          activePair.nativeLanguage}
                      </Text>
                    </View>
                    <Ionicons name="chevron-forward" size={16} color={theme.text.secondary} />
                  </Pressable>
                </View>
              </View>
            ) : null}

            <View style={styles.section}>
              <Text style={[monoType.label, { color: theme.text.secondary }]}>
                {t("languagePair.yourPairs")}
              </Text>
              <View style={styles.list}>
                {pairsForCurrentNative.map((pair) => (
                  <PairRow
                    key={`${pair.nativeLanguage}-${pair.targetLanguage}`}
                    native={pair.nativeLanguage}
                    target={pair.targetLanguage}
                    active={pair.isActive}
                    onPress={
                      pair.isActive ? undefined : () => handleSelectTarget(pair.targetLanguage)
                    }
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
                      onPress={() => handleSelectTarget(language.code)}
                      showPremiumBadge
                    />
                  ))}
                </View>
              </View>
            ) : null}

            {historyPairs.length > 0 ? (
              <View style={styles.section}>
                <Pressable
                  onPress={() => setPhase("history")}
                  accessibilityRole="button"
                  style={({ pressed }) => [
                    styles.row,
                    { borderColor: theme.border.hairline, opacity: pressed ? 0.6 : 1 },
                  ]}
                >
                  <Text style={[monoType.rowText, { color: theme.text.primary }]}>
                    {t("languagePair.historyPairs")}
                  </Text>
                  <View style={styles.rowLabel}>
                    <Text style={[monoType.label, { color: theme.text.secondary }]}>
                      {historyPairs.length}
                    </Text>
                    <Ionicons name="chevron-forward" size={16} color={theme.text.secondary} />
                  </View>
                </Pressable>
              </View>
            ) : null}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function LanguageOptionRow({ language, onPress }: { language: LanguageInfo; onPress: () => void }) {
  const { theme } = useTheme();

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={({ pressed }) => [
        styles.row,
        { borderColor: theme.border.hairline, opacity: pressed ? 0.6 : 1 },
      ]}
    >
      <View style={styles.rowLabel}>
        <LanguageFlag code={language.code} size={32} />
        <View>
          <Text style={[monoType.rowText, { color: theme.text.primary }]}>
            {language.nativeName}
          </Text>
          <Text style={[monoType.label, { color: theme.text.secondary }]}>{language.nameEn}</Text>
        </View>
      </View>
    </Pressable>
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
      <View style={styles.rowLabel}>
        <View style={styles.flagPair}>
          {nativeInfo ? <LanguageFlag code={nativeInfo.code} size={28} /> : null}
          {targetInfo ? <LanguageFlag code={targetInfo.code} size={28} /> : null}
        </View>
        <Text style={[monoType.rowText, { color: theme.text.primary }]}>
          {/* Ok yönü çeviriden: Arapça'da "←". */}
          {t("languagePair.pairArrow", {
            from: nativeInfo?.nativeName ?? native,
            to: targetInfo?.nativeName ?? target,
          })}
        </Text>
      </View>
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
  rowLabel: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  flagPair: {
    flexDirection: "row",
    gap: spacing.xxs,
  },
});
