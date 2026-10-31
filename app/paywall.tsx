import { useCallback } from "react";

import { router, useLocalSearchParams } from "expo-router";

import { PaywallScreen } from "@/features/paywall";
import { offerRoute, useInterruptions } from "@/features/offers";
import { ErrorBoundary } from "@/components/ui";

import type { PaywallCloseReason } from "@/features/paywall";

export default function PaywallRoute() {
  /** `word`: günlük kelime hakkı bittiği için gelindiyse kullanıcının
   * takıldığı kelime. Paywall onu adıyla gösteriyor (bkz. PaywallActivity). */
  const { source, word } = useLocalSearchParams<{ source?: string; word?: string }>();
  const { fire } = useInterruptions();
  const resolvedSource = source ?? "unknown";

  /**
   * İndirim kaskadı (rapor C7, `sale_cascade`): kilitli özellik paywall'u
   * SATIN ALMADAN kapatılınca kural motoru sorulur. Okuyucu kaynakları
   * (word_quota, sentence_quota, reader_listen) motorda engelli -- okumaya
   * dönen kullanıcının önüne teklif çıkmaz (Ürün İlkesi #1).
   */
  const handleClose = useCallback(
    (reason: PaywallCloseReason) => {
      if (reason === "dismissed") {
        const rule = fire("paywall_closed", { source: resolvedSource });
        const route = rule ? offerRoute(rule) : null;
        if (route) {
          router.replace(route);
          return;
        }
      }
      router.back();
    },
    [fire, resolvedSource],
  );

  return (
    <ErrorBoundary source="paywall">
      <PaywallScreen onClose={handleClose} source={resolvedSource} blockedWord={word ?? null} />
    </ErrorBoundary>
  );
}
