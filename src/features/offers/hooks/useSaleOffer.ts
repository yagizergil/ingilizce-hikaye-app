import { useEffect, useMemo, useRef, useState } from "react";

import { useTranslation } from "react-i18next";

import { isPurchasesAvailable } from "@/lib/revenuecat";

import { grantOffer } from "@/features/offers/api/offerApi";
import { scheduleOfferReminder } from "@/features/offers/api/offerReminder";
import { useNamedOfferingQuery } from "@/features/offers/api/useNamedOfferingQuery";
import { useOfferRulesQuery } from "@/features/offers/api/useOfferRulesQuery";
import { remainingUntil, resolveSaleOffer } from "@/features/offers/offerModel";

import type { NamedOfferingPackages } from "@/lib/revenuecat";
import type { SaleOffer } from "@/features/offers/offerModel";
import type { Rule, RuleTrigger } from "@/features/offers/types";

/** Ekranın durumu: yükleniyor, gösterilecek teklif, ya da normal paywall'a düş. */
export type SaleOfferState =
  | { status: "loading" }
  | { status: "missing_rule" }
  | {
      status: "fallback";
      reason: "no_offering" | "no_discount" | "store_error" | "no_store";
      trigger: RuleTrigger;
    }
  | { status: "ready"; rule: Rule; offer: SaleOffer; offeringId: string };

const TICK_MS = 30_000;

/**
 * Ekran durumunun SAF kararı (testli). Sıra: kural -> mağaza -> offering ->
 * gerçek indirim. Her "yok" sessiz bir geri düşüştür, hata değil.
 */
export function deriveSaleOfferState(input: {
  rulesLoaded: boolean;
  rule: Rule | null;
  purchasesAvailable: boolean;
  offeringError: boolean;
  offering: NamedOfferingPackages | undefined;
}): SaleOfferState {
  const { rule, offering } = input;
  if (!input.rulesLoaded) return { status: "loading" };
  if (!rule || rule.action.kind !== "sale") return { status: "missing_rule" };
  const { trigger } = rule;
  if (!input.purchasesAvailable) return { status: "fallback", reason: "no_store", trigger };
  if (input.offeringError) return { status: "fallback", reason: "store_error", trigger };
  if (!offering) return { status: "loading" };
  if (offering.requested === null) return { status: "fallback", reason: "no_offering", trigger };
  const offer = resolveSaleOffer(offering.requested, offering.current);
  if (!offer) return { status: "fallback", reason: "no_discount", trigger };
  return { status: "ready", rule, offer, offeringId: rule.action.offering_id ?? "sale" };
}

/**
 * İndirim ekranının verisi: kural -> offering -> gerçek indirim -> sunucu
 * süreli teklif (`grant_offer`) -> geri sayım.
 *
 * SESSİZ GERİ DÜŞÜŞ: App Store'da indirimli ürün ya da RevenueCat'te `sale`
 * offering'i yoksa (bugünkü durum) ekran `fallback` der ve çağıran normal
 * paywall'a geçer. Kullanıcı hata görmez, yalnızca analitik görür.
 */
export function useSaleOffer(ruleId: string) {
  const { t } = useTranslation();
  const rulesQuery = useOfferRulesQuery();
  const rule = rulesQuery.data?.rules.find((item) => item.id === ruleId) ?? null;
  const offeringId = rule ? (rule.action.offering_id ?? "sale") : null;
  const offeringQuery = useNamedOfferingQuery(offeringId);

  const rulesLoaded = rulesQuery.data !== undefined;
  const offeringData = offeringQuery.data;
  const offeringError = offeringQuery.isError;
  const state = useMemo(
    () =>
      deriveSaleOfferState({
        rulesLoaded,
        rule,
        purchasesAvailable: isPurchasesAvailable,
        offeringError,
        offering: offeringData,
      }),
    [rulesLoaded, rule, offeringError, offeringData],
  );

  // Sunucu süreli teklif: yalnızca gösterilecek bir indirim varsa açılır.
  const [expiresAt, setExpiresAt] = useState<number | null>(null);
  const grantedRef = useRef(false);
  const ready = state.status === "ready" ? state : null;
  useEffect(() => {
    if (!ready || grantedRef.current) return;
    grantedRef.current = true;
    void grantOffer(ready.rule.id).then((grant) => {
      if (!grant) return;
      setExpiresAt(grant.expiresAt);
      void scheduleOfferReminder(grant.expiresAt, ready.rule.action.notify_before_hours, t);
    });
  }, [ready, t]);

  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (expiresAt === null) return;
    const timer = setInterval(() => setNow(Date.now()), TICK_MS);
    return () => clearInterval(timer);
  }, [expiresAt]);

  const remaining = expiresAt === null ? null : remainingUntil(expiresAt, now);
  return { state, remaining };
}
