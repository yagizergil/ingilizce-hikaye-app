import { useCallback, useEffect, useState } from "react";

import { router, useFocusEffect } from "expo-router";

import { useDialogGuardStore } from "@/hooks/useDialogGuard";

import { useInterruptions } from "@/features/offers/hooks/useInterruptions";
import { offerRoute } from "@/features/offers/offerRoute";

/**
 * Oturumda `app_open` tetikleyicisi bir kez değerlendirildi mi (JS süreci
 * boyunca). Modül düzeyinde: ana sayfa yeniden bağlansa da ikinci kez
 * çalışmasın.
 */
let consumedThisSession = false;

/** Yalnızca testler için. */
export function resetAppOpenForTests(): void {
  consumedThisSession = false;
}

/**
 * Ana sayfa açılışında takvim tekliflerini (`sale_d2`, `sale_d3_d30`,
 * `sale_d30_plus`) değerlendirir.
 *
 * NEDEN ANA SAYFADA VE YALNIZCA İLK ODAKTA: rapor §5.3 "bu oturumda
 * okuyucudan dönülmüş değil (açılış/odak)" diyor. Kullanıcı veriler
 * yüklenmeden ana sayfadan ayrılırsa (örn. doğrudan okumaya devam ettiyse)
 * bu oturumun hakkı yanar -- okuyucudan dönen kullanıcının önüne indirim
 * çıkmaz (Ürün İlkesi #1). Başka bir diyalog açıksa kapanmasını bekler (T3).
 */
export function useAppOpenInterruption(): void {
  const { ready, fire } = useInterruptions();
  const [focused, setFocused] = useState(false);
  const dialogOpen = useDialogGuardStore((state) => state.openCount > 0);

  useFocusEffect(
    useCallback(() => {
      setFocused(true);
      return () => {
        setFocused(false);
        consumedThisSession = true;
      };
    }, []),
  );

  useEffect(() => {
    if (consumedThisSession || !focused || !ready || dialogOpen) return;
    consumedThisSession = true;
    const rule = fire("app_open");
    const route = rule ? offerRoute(rule) : null;
    if (route) router.push(route);
  }, [focused, ready, dialogOpen, fire]);
}
