import { useCallback, useRef, useState } from "react";
import { Alert } from "react-native";

import { useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";

import { trackEvent } from "@/lib/analytics";
import { purchasePackage, restorePurchases } from "@/lib/revenuecat";

import { waitForServerPremium } from "@/features/paywall/api/waitForServerPremium";
import { offerTrialReminder } from "@/features/reminders";

import type { PurchasesPackage } from "react-native-purchases";

/**
 * Paywall'un neden kapandığı. Teklif motoru (`paywall_closed` tetikleyicisi,
 * onboarding çıkış teklifi) yalnızca satın almadan kapanışı dinliyor.
 */
export type PaywallCloseReason = "dismissed" | "purchased";

/** Ekranın o anda hangi işi yaptığı. */
export type PurchaseBusy =
  null | { kind: "purchase"; id: string } | { kind: "restore" } | { kind: "activating" };

interface PurchaseFlowOptions {
  source: string;
  /** C15: huni olaylarına eklenen yer türü (kaynaktan türetilir). */
  placement?: string;
  onClose: (reason: PaywallCloseReason) => void;
  /** Apple satın almayı onayladığında (sunucu beklenmeden önce) bir kez. */
  onPurchased?: () => void;
}

export interface PurchaseRequest {
  pkg: PurchasesPackage;
  plan: string;
  /** Seçili planda kullanıcıya gerçekten sunulan deneme (gün); yoksa null. */
  trialDays: number | null;
}

/**
 * Satın alma ve geri yükleme akışı -- paywall, indirim ekranı ve onboarding
 * çıkış teklifinin ORTAK yolu.
 *
 * NEDEN AYRI BİR HOOK: bu akışın her satırı bir denetim bulgusunun ürünü
 * (ADR-009: yetkiyi sunucu yazar, istemci bekler; "abonelik yok" kararını
 * sunucu verir; geri yüklemenin üç ayrı sonucu). İkinci bir ekranda kopyası
 * olsaydı, bir sonraki düzeltme yalnızca birinde yaşardı. Gerekçelerin
 * tamamı aşağıda, eskiden PaywallScreen'de duran yorumlarla birlikte.
 */
export function usePurchaseFlow({ source, placement, onClose, onPurchased }: PurchaseFlowOptions) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [busy, setBusy] = useState<PurchaseBusy>(null);
  /** Kapanış bir vazgeçme mi yoksa başarılı satın almanın sonucu mu. */
  const outcomeRef = useRef<"pending" | "purchased">("pending");

  /**
   * Premium AÇILDIKTAN SONRA HER ŞEYİN yenilenmesi gerekiyor -- yalnızca
   * abonelik durumunun değil (2026-09-15 hatası: "Dinle" düğmesi, kelime
   * kotası ve cümle kotası kendi staleTime'ları dolana kadar eski "ücretsiz"
   * durumu gösteriyordu). Parametresiz invalidate bilinçli.
   */
  const refreshStatus = useCallback(() => {
    void queryClient.invalidateQueries();
  }, [queryClient]);

  const markPurchased = useCallback(() => {
    if (outcomeRef.current === "purchased") return;
    outcomeRef.current = "purchased";
    onPurchased?.();
  }, [onPurchased]);

  const purchase = useCallback(
    async ({ pkg, plan, trialDays }: PurchaseRequest) => {
      // C14: CTA dokunuşu, satın alma sonucundan bağımsız olarak huniye yazılır.
      trackEvent("paywall_cta_tapped", {
        source,
        ...(placement ? { placement } : {}),
        plan,
        package_id: pkg.identifier,
      });
      setBusy({ kind: "purchase", id: pkg.identifier });
      const outcome = await purchasePackage(pkg, {
        source,
        plan,
        placement,
        offerType: trialDays !== null ? "intro" : "none",
      });

      if (outcome.status === "cancelled") {
        setBusy(null);
        return;
      }

      if (outcome.status === "error") {
        setBusy(null);
        Alert.alert(t("common.errorTitle"), t("paywall.purchaseError"));
        return;
      }

      // "YETKİ GÖRÜNMÜYOR" KARARINI SUNUCU VERİR, İSTEMCİ DEĞİL (denetim
      // bulgusu 2026-09-19): yerel görüntü bayat olabilir; gerçek kapı
      // sunucudaki `user_entitlements` satırı (ADR-009).
      if (outcome.status === "not_entitled") {
        setBusy({ kind: "activating" });
        const confirmed = await waitForServerPremium();
        setBusy(null);
        refreshStatus();

        if (confirmed) {
          markPurchased();
          Alert.alert(t("paywall.restoreFoundTitle"), t("paywall.restoreFoundBody"), [
            { text: t("common.ok"), onPress: () => onClose("purchased") },
          ]);
          return;
        }

        Alert.alert(t("paywall.notEntitledTitle"), t("paywall.notEntitledBody"));
        return;
      }

      // Apple onayladı. Kapanış artık bir vazgeçme değil.
      markPurchased();
      if (trialDays !== null) {
        // Deneme başlangıcı ayrı bir olay: deneme->ödeme dönüşümü ancak
        // denemenin ne zaman başladığı bilinirse ölçülebilir.
        trackEvent("trial_started", {
          source,
          ...(placement ? { placement } : {}),
          plan,
          trial_days: trialDays,
        });
      }

      // Sunucunun webhook ile yetkiyi yazmasını bekle.
      setBusy({ kind: "activating" });
      const confirmed = await waitForServerPremium();
      setBusy(null);
      refreshStatus();

      // Deneme başladıysa: bitmeden hatırlatalım mı? İzin bu bağlamda,
      // kullanıcının kendi eylemiyle isteniyor (ADR-010 notu).
      if (outcome.trialEndsAt) await offerTrialReminder(outcome.trialEndsAt, t);

      if (confirmed) {
        onClose("purchased");
        return;
      }

      // Zaman aşımı bir hata değil: satın alma Apple tarafında tamamlandı,
      // yalnızca sunucu tarafı gecikti.
      Alert.alert(t("paywall.activatingTitle"), t("paywall.activatingBody"), [
        { text: t("common.ok"), onPress: () => onClose("purchased") },
      ]);
    },
    [markPurchased, onClose, placement, refreshStatus, source, t],
  );

  /**
   * GERİ YÜKLEME ÜÇ FARKLI SONUÇ VERİR, ÜÇÜ DE AYRI ANLATILIR (denetim
   * bulgusu 2026-09-19): mağaza hatası "aboneliğin yok" değildir, ve "yok"
   * kararı ancak mağaza bir şey bulamadığında VE sunucu da doğrulamadığında
   * verilir. `waitForServerPremium` kaçan bir webhook'u da onarıyor.
   */
  const restore = useCallback(async () => {
    setBusy({ kind: "restore" });
    const outcome = await restorePurchases();

    if (outcome.status === "error") {
      setBusy(null);
      Alert.alert(t("common.errorTitle"), t("paywall.restoreErrorBody"));
      return;
    }

    setBusy({ kind: "activating" });
    const confirmed = await waitForServerPremium();
    setBusy(null);
    refreshStatus();

    if (outcome.status === "none" && !confirmed) {
      Alert.alert(t("paywall.restoreEmptyTitle"), t("paywall.restoreEmptyBody"));
      return;
    }

    if (confirmed) outcomeRef.current = "purchased";
    Alert.alert(
      confirmed ? t("paywall.restoreFoundTitle") : t("paywall.activatingTitle"),
      confirmed ? t("paywall.restoreFoundBody") : t("paywall.activatingBody"),
      [{ text: t("common.ok"), onPress: () => onClose("purchased") }],
    );
  }, [onClose, refreshStatus, t]);

  return { busy, purchase, restore, outcomeRef };
}
