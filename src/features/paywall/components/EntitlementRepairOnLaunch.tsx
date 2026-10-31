import { useEffect, useRef } from "react";

import { useQueryClient } from "@tanstack/react-query";

import { fetchCustomerInfo, hasPremium } from "@/lib/revenuecat";
import { trackEvent } from "@/lib/analytics";
import { shouldRepairEntitlementOnLaunch } from "@/features/paywall/api/launchEntitlementRepair";
import { syncEntitlementFromStore } from "@/features/paywall/api/syncEntitlement";
import {
  subscriptionQueryKeys,
  useSubscriptionQuery,
} from "@/features/paywall/api/useSubscriptionQuery";

/**
 * Açılışta, oturum başına EN FAZLA BİR KEZ: RevenueCat premium diyor ama
 * sunucu 'free' diyorsa `sync-entitlement` ile onar (G4).
 *
 * Görünür bir şey çizmiyor (`ReminderScheduler`, `LanguagePairUiSync` gibi).
 * AuthGate'in içinde duruyor: sync-entitlement kimliği JWT'den okuyor.
 *
 * Maliyet: ücretsiz kullanıcıların çoğunda SDK'nın yerel önbelleğinden
 * dönen bir `getCustomerInfo()`; edge function yalnızca uyuşmazlıkta çağrılır.
 */
export function EntitlementRepairOnLaunch() {
  const queryClient = useQueryClient();
  const { data } = useSubscriptionQuery();
  const serverPremium = data?.isPremium;
  const attemptedRef = useRef(false);

  useEffect(() => {
    if (serverPremium === undefined || attemptedRef.current) return;
    attemptedRef.current = true;
    if (serverPremium) return;

    let alive = true;
    void (async () => {
      const info = await fetchCustomerInfo();
      if (!alive) return;
      const storePremium = hasPremium(info);
      if (!shouldRepairEntitlementOnLaunch({ serverPremium, storePremium })) return;

      const repaired = await syncEntitlementFromStore();
      trackEvent("entitlement_launch_repair", { repaired });
      // Premium'a bağlı bütün sorgular (ses erişimi, kota rozetleri) yenilensin.
      if (repaired) void queryClient.invalidateQueries();
      else void queryClient.invalidateQueries({ queryKey: subscriptionQueryKeys.all });
    })();

    return () => {
      alive = false;
    };
  }, [serverPremium, queryClient]);

  return null;
}
