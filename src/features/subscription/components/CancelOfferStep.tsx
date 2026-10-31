import { Text } from "react-native";

import { useTranslation } from "react-i18next";

import { detailType, homeType } from "@/theme";
import { Button } from "@/components/ui";
import { useHomePalette } from "@/features/home";
import { PaywallLegal } from "@/features/paywall";

import { LifecycleCard } from "@/features/subscription/components/LifecycleCard";

import type { RetentionChoice } from "@/features/subscription/cancelFlow";

interface CancelOfferStepProps {
  choice: RetentionChoice;
  /** Promotional teklifin fiyatı ya da aylık planın fiyatı. */
  priceString: string | null;
  /** Satın alma içeren seçenekte yenilemede alınacak normal fiyat ve dönem (3.1.2(a)). */
  legal: { regularPrice: string; periodLabel: string } | null;
  busy: boolean;
  onAccept: () => void;
}

const CTA_KEY: Partial<Record<RetentionChoice, string>> = {
  promotional: "subscription.cancel.offer.promotionalCta",
  monthly_switch: "subscription.cancel.offer.monthlyCta",
  goal: "subscription.cancel.offer.goalCta",
  support: "subscription.cancel.offer.supportCta",
};

/**
 * İptal akışı 3. adım: nedene göre tek bir seçenek. Teklif yoksa yalnızca
 * teşekkür -- "Yine de iptal et" her durumda ekranın altında.
 */
export function CancelOfferStep({
  choice,
  priceString,
  legal,
  busy,
  onAccept,
}: CancelOfferStepProps) {
  const { t } = useTranslation();
  const palette = useHomePalette();
  const cta = CTA_KEY[choice];
  return (
    <LifecycleCard>
      <Text style={[detailType.sectionTitle, { color: palette.ink }]}>
        {t("subscription.cancel.offerTitle")}
      </Text>
      <Text style={[homeType.cardSub, { color: palette.muted }]}>
        {t(`subscription.cancel.offer.${choice}`, {
          price: priceString ?? "",
          regular: legal?.regularPrice ?? "",
        })}
      </Text>
      {cta ? (
        <Button label={t(cta)} onPress={onAccept} loading={busy} disabled={busy} fullWidth />
      ) : null}
      {legal ? (
        <PaywallLegal
          priceString={legal.regularPrice}
          trialDays={null}
          periodLabel={legal.periodLabel}
        />
      ) : null}
    </LifecycleCard>
  );
}
