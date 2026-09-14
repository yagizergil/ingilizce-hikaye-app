import { ScrollView, StyleSheet, Text } from "react-native";

import { useTranslation } from "react-i18next";
import { SvgXml } from "react-native-svg";

import { monoType, spacing } from "@/theme";
import { useTheme } from "@/theme/useTheme";

import { levelIconXml } from "@/features/onboarding/levelIconXml";
import { OnboardingFooterButton } from "@/features/onboarding/components/OnboardingFooterButton";
import { OnboardingOptionCard } from "@/features/onboarding/components/OnboardingOptionCard";
import { OnboardingScaffold } from "@/features/onboarding/components/OnboardingScaffold";

import type { CefrLevel } from "@/features/onboarding/levelEstimate";

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
 * Satırda seviye KODU yerine illüstrasyon.
 *
 * NEDEN: "A1/B2" ölçeği Avrupa dilleri için tanımlı ve uygulama artık on
 * arayüz diliyle çalışıyor -- Çince ya da Japonca okuyan birine "B2" hiçbir
 * şey söylemiyor. Satırın kendi başlığı ve açıklaması zaten seviyeyi
 * anlatıyor; kod, anlamayan kullanıcı için gürültü, anlayan için de
 * fazlalık. Ölçek sistemin İÇİNDE duruyor (kitaplar `cefr_level` ile
 * filtreleniyor), yalnızca bu ekranda gösterilmiyor.
 *
 * İllüstrasyonlar bir BÜYÜME hikâyesi anlatıyor: yaprak -> güneş ->
 * kitap -> konuşma -> pusula -> kupa. Rastgele altı görsel değil, sırası
 * olan bir dizi; satırlar arasında ilerleme hissi veren şey bu.
 *
 * ROZETİN ARKA PLANI SEVİYE RENGİ DEĞİL, NÖTR: görseller kendi renklerini
 * taşıyor (tek renge boyanamıyorlar). Renkli bir görseli renkli bir
 * dairenin üstüne koymak ikisini de bulanıklaştırırdı; nötr zemin
 * görselin kendi renklerini öne çıkarıyor.
 */

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
  const { theme } = useTheme();

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
            badge={<SvgXml xml={levelIconXml[level] as string} width={26} height={26} />}
            badgeColor={theme.bg.primary}
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
          style={[monoType.rowText, styles.testLink]}
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
