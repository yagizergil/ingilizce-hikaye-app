import { useCallback, useEffect } from "react";

import Constants from "expo-constants";

import { trackEvent } from "@/lib/analytics";
import { useActivationStore } from "@/hooks/useActivationStore";
import { useDialogGuardStore } from "@/hooks/useDialogGuard";
import { useSubscriptionQuery, useTrialOffer } from "@/features/paywall";

import { recordImpression } from "@/features/offers/api/offerApi";
import { useOfferContextQuery } from "@/features/offers/api/useOfferContextQuery";
import { useOfferRulesQuery } from "@/features/offers/api/useOfferRulesQuery";
import { useOfferHistoryStore } from "@/features/offers/hooks/useOfferHistoryStore";
import { buildRuleContext, HOLDOUT_PERCENT, isInHoldout } from "@/features/offers/rules/context";
import { pickRule } from "@/features/offers/rules/engine";

import type { Rule, RuleTrigger } from "@/features/offers/types";

const APP_VERSION = Constants.expoConfig?.version ?? "0.0.0";

/** Holdout ataması oturumda bir kez analitiğe yazılır. */
let holdoutReported = false;

export interface FireOptions {
  /** `paywall_closed` için kapanan paywall'un kaynağı. */
  source?: string;
}

/**
 * Kural motorunun TEK giriş noktası (rapor C6 adım 3).
 *
 * `fire(trigger)` o an uygun kuralı seçer, gösterimi (yerel + sunucu) kaydeder
 * ve kuralı döndürür; ne gösterileceğine çağıran karar verir (tam ekran
 * teklif rotası, onboarding sheet'i...). Veriler henüz yüklenmediyse
 * (`ready=false`) hiçbir kural seçilmez -- yarım bağlamla teklif göstermek,
 * örneğin premium durumu gelmeden indirim açmak, yanlış olurdu.
 *
 * OKUYUCU BUNU ÇAĞIRAMAZ: `features/reader` içinden `@/features/offers`
 * importu ESLint'te yasak (Ürün İlkesi #1) ve bir test bunu ayrıca denetliyor.
 */
export function useInterruptions() {
  const rulesQuery = useOfferRulesQuery();
  const contextQuery = useOfferContextQuery();
  const subscription = useSubscriptionQuery();
  const trialDays = useTrialOffer();
  const firstChapterFinishedAt = useActivationStore((state) => state.firstChapterFinishedAt);

  // Kalıcı holdout ataması analitiğe (U4): kova sunucuda sabit, olay
  // oturum başına bir kez -- analiz kullanıcının son değerini okur.
  const holdoutBucket = contextQuery.data?.holdoutBucket ?? null;
  useEffect(() => {
    if (holdoutReported || holdoutBucket === null) return;
    holdoutReported = true;
    trackEvent("offer_holdout_assigned", {
      in_holdout: isInHoldout(holdoutBucket) === true,
      holdout_bucket: holdoutBucket,
      holdout_percent: HOLDOUT_PERCENT,
    });
  }, [holdoutBucket]);

  const ready =
    rulesQuery.data !== undefined && contextQuery.isFetched && subscription.data !== undefined;

  const fire = useCallback(
    (trigger: RuleTrigger, options: FireOptions = {}): Rule | null => {
      if (!rulesQuery.data || !subscription.data) return null;
      const store = useOfferHistoryStore.getState();
      const now = Date.now();
      const { context, history } = buildRuleContext({
        now,
        isPremium: subscription.data.isPremium,
        trialEligible: trialDays !== null,
        firstChapterFinished: firstChapterFinishedAt !== null,
        server: contextQuery.data ?? null,
        local: store,
        source: options.source ?? null,
      });
      const rule = pickRule(trigger, rulesQuery.data.rules, context, {
        appVersion: APP_VERSION,
        history,
        fullscreenShownThisSession: store.fullscreenShownThisSession,
        dialogOpen: useDialogGuardStore.getState().openCount > 0,
        now,
      });
      if (!rule) return null;

      store.markShown({
        ruleId: rule.id,
        presentation: rule.presentation,
        actionKind: rule.action.kind,
        exemptGlobalCooldown: rule.exemptGlobalCooldown,
        at: now,
      });
      trackEvent("interruption_shown", {
        rule_id: rule.id,
        trigger,
        presentation: rule.presentation,
        config_fetch_state: rulesQuery.data.source,
        days_since_install: context.daysSinceInstall ?? -1,
        in_holdout: context.inHoldout === true,
        ...(options.source ? { source: options.source } : {}),
      });
      void recordImpression({
        ruleId: rule.id,
        trigger,
        presentation: rule.presentation,
        actionKind: rule.action.kind,
      }).then((id) => {
        if (id !== null) useOfferHistoryStore.getState().setImpressionId(rule.id, id);
      });
      return rule;
    },
    [rulesQuery.data, subscription.data, trialDays, firstChapterFinishedAt, contextQuery.data],
  );

  /** Kuralı kimliğiyle bulur (teklif ekranı rotadan kimlik alıyor). */
  const findRule = useCallback(
    (id: string): Rule | null => rulesQuery.data?.rules.find((rule) => rule.id === id) ?? null,
    [rulesQuery.data],
  );

  return {
    ready,
    fire,
    findRule,
    userBucket: contextQuery.data?.userBucket ?? null,
    configFetchState: rulesQuery.data?.source ?? null,
  };
}
