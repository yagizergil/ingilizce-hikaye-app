import { ScrollView, StyleSheet, Text } from "react-native";

import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";

import { monoType, spacing } from "@/theme";
import { levelAccent, onLevelAccent } from "@/theme/tokens/colors";

import { OnboardingFooterButton } from "@/features/onboarding/components/OnboardingFooterButton";
import { OnboardingOptionCard } from "@/features/onboarding/components/OnboardingOptionCard";
import { OnboardingScaffold } from "@/features/onboarding/components/OnboardingScaffold";

import type { CefrLevel } from "@/features/onboarding/levelEstimate";
import type { ComponentProps } from "react";

type IoniconName = ComponentProps<typeof Ionicons>["name"];

/**
 * Seviye seçimi (referans: `docs/reference/bookvo-04-seviye-secimi.jpeg`).
 *
 * REFERANSLA AYNI MANTIK: kullanıcı seviyesini KENDİ BEYAN EDİYOR, test
 * çözmüyor. Bizde 36 kelimelik bir seviye TESTİ de var ve silinmedi --
 * o, bu adımın altındaki "emin değilim" yolu olarak duruyor (bkz.
 * `LevelTestScreen`). Referansın akışı hızlı olan yolu varsayılan
 * yapıyor; test isteyen kullanıcı için hâlâ doğru cevap orada.
 *
 * ÖLÇÜLER: kart 12 pt yarıçap, 16 pt padding, 44x44 rozet, aralar 12 pt --
 * hepsi referanstan piksel olarak (docs/plans/2026-09-14-onboarding-tasarim.md).
 */

/**
 * Referansta altı satır var: Pre, A1, A2, B1, B2, C1. "Pre" bizim CEFR
 * ölçeğimizde yok -- onun karşılığı A1 ve ayrı bir satır olarak DEĞİL,
 * A1'in kendi açıklamasıyla veriliyor. Sahte bir seviye kodu üretmek
 * kataloğun seviye filtresini bozardı (kitaplar `cefr_level` ile
 * eşleşiyor).
 */
const LEVELS: CefrLevel[] = ["A1", "A2", "B1", "B2", "C1", "C2"];

/**
 * Satırda seviye KODU yerine ikon.
 *
 * NEDEN: "A1/B2" ölçeği Avrupa dilleri için tanımlı ve uygulama artık on
 * arayüz diliyle çalışıyor -- Çince ya da Japonca okuyan birine "B2" hiçbir
 * şey söylemiyor. Satırın kendi başlığı ve açıklaması zaten seviyeyi
 * anlatıyor; kod, anlamayan kullanıcı için gürültü, anlayan için de
 * fazlalık. Ölçek sistemin İÇİNDE duruyor (kitaplar `cefr_level` ile
 * filtreleniyor), yalnızca bu ekranda gösterilmiyor.
 *
 * İkonlar bir BÜYÜME hikâyesi anlatıyor: filiz -> yaprak -> kitap ->
 * konuşma -> pusula -> zirve. Rastgele altı ikon değil, sırası olan bir
 * dizi; satırlar arasında ilerleme hissi veren şey bu.
 */
const LEVEL_ICONS: Record<CefrLevel, IoniconName> = {
  A1: "leaf-outline",
  A2: "sunny-outline",
  B1: "book-outline",
  B2: "chatbubbles-outline",
  C1: "compass-outline",
  C2: "trophy-outline",
};

interface OnboardingLevelStepProps {
  progress: number;
  selected: CefrLevel | null;
  onSelect: (level: CefrLevel) => void;
  onContinue: () => void;
  onTakeTest: () => void;
  submitting?: boolean;
}

export function OnboardingLevelStep({
  progress,
  selected,
  onSelect,
  onContinue,
  onTakeTest,
  submitting = false,
}: OnboardingLevelStepProps) {
  const { t } = useTranslation();

  return (
    <OnboardingScaffold
      progress={progress}
      title={t("onboarding.level.title")}
      subtitle={t("onboarding.level.subtitle")}
      footer={
        <OnboardingFooterButton
          label={t("common.continue")}
          onPress={onContinue}
          disabled={selected === null}
          loading={submitting}
        />
      }
    >
      <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
        {LEVELS.map((level) => (
          <OnboardingOptionCard
            key={level}
            badge={<Ionicons name={LEVEL_ICONS[level]} size={20} color={onLevelAccent} />}
            badgeColor={levelAccent[level]}
            title={t(`onboarding.level.options.${level}.title`)}
            subtitle={t(`onboarding.level.options.${level}.body`)}
            selected={selected === level}
            onPress={() => onSelect(level)}
          />
        ))}

        {/* Seviye TESTİ silinmedi, ikinci yola dönüştü: referansın hızlı
            akışı varsayılan, emin olmayan kullanıcı teste gidebiliyor. */}
        <Text
          accessibilityRole="button"
          onPress={onTakeTest}
          style={[monoType.meta, styles.testLink]}
        >
          {t("onboarding.level.takeTest")}
        </Text>
      </ScrollView>
    </OnboardingScaffold>
  );
}

const styles = StyleSheet.create({
  list: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.xl,
    gap: spacing.sm,
  },
  testLink: {
    textAlign: "center",
    paddingVertical: spacing.md,
    textDecorationLine: "underline",
  },
});
