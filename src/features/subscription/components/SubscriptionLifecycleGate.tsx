import { useEffect, useState } from "react";

import { router, usePathname } from "expo-router";
import { useTranslation } from "react-i18next";

import { trackEvent } from "@/lib/analytics";
import { useToast } from "@/components/ui";

import { useSubscriptionLifecycleQuery } from "@/features/subscription/api/useSubscriptionLifecycleQuery";
import { syncLifecycleNotifications } from "@/features/subscription/api/syncLifecycleNotifications";
import { useLifecycleMemoryStore } from "@/features/subscription/hooks/useLifecycleMemoryStore";
import { decideAutoOpen, isBillingRecovery } from "@/features/subscription/lifecycle";

/** Kalıcı hafıza diskten okunmadan karar verilmesin (aynı ekran iki kez açılmasın). */
function useMemoryHydrated(): boolean {
  const [hydrated, setHydrated] = useState(() => useLifecycleMemoryStore.persist.hasHydrated());
  useEffect(() => {
    if (hydrated) return undefined;
    return useLifecycleMemoryStore.persist.onFinishHydration(() => setHydrated(true));
  }, [hydrated]);
  return hydrated;
}

/**
 * Abonelik yaşam döngüsünün görünmez yöneticisi (sekmelerin içinde, yani
 * onboarding bittikten sonra):
 *  - oturum başına EN FAZLA bir kendiliğinden ekran: ödeme sorunu varsa
 *    "ödemeyi düzelt" (24 saatte bir), abonelik yeni bittiyse "tekrar hoş
 *    geldin" (bitiş başına bir kez, 30 günden eskiyse hiç);
 *  - ödeme sorunu çözülünce "Ödeme düzeldi" bildirimi;
 *  - yerel bildirimlerin yeniden planlanması.
 * Okuyucunun üstüne HİÇBİR ŞEY açmaz (Ürün İlkesi #1).
 */
export function SubscriptionLifecycleGate() {
  const { t, i18n } = useTranslation();
  const { show } = useToast();
  const pathname = usePathname();
  const hydrated = useMemoryHydrated();
  const { data: lifecycle } = useSubscriptionLifecycleQuery();

  useEffect(() => {
    if (!lifecycle || !hydrated) return;
    const memory = useLifecycleMemoryStore.getState();

    if (isBillingRecovery(memory.lastStatus, lifecycle.status)) {
      trackEvent("billing_recovered", { status: lifecycle.status });
      show(t("subscription.billing.recovered"));
    }
    if (memory.lastStatus !== lifecycle.status) memory.setLastStatus(lifecycle.status);

    if (memory.decidedThisSession || pathname.startsWith("/reader")) return;
    memory.markDecided();
    const decision = decideAutoOpen(lifecycle, memory, Date.now());
    if (decision?.kind === "billing_fix") {
      memory.markBillingFixShown(Date.now());
      router.push("/billing-fix?source=auto");
    } else if (decision?.kind === "winback") {
      memory.markWinbackShown(decision.key);
      router.push("/winback?source=auto");
    }
  }, [lifecycle, hydrated, pathname, show, t]);

  const status = lifecycle?.status;
  const expiresMs = lifecycle?.expiresAt?.getTime() ?? null;
  useEffect(() => {
    if (!lifecycle) return;
    void syncLifecycleNotifications(lifecycle, t, i18n.language);
    // Yalnızca durum ya da bitiş değişince yeniden planla.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, expiresMs]);

  return null;
}
