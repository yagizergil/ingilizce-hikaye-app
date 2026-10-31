import { router, useLocalSearchParams } from "expo-router";

import { PaywallScreen } from "@/features/paywall";
import {
  BillingFixScreen,
  needsBillingFix,
  useSubscriptionLifecycleQuery,
} from "@/features/subscription";
import { ErrorBoundary } from "@/components/ui";

export default function PaywallRoute() {
  /** `word`: günlük kelime hakkı bittiği için gelindiyse kullanıcının
   * takıldığı kelime. Paywall onu adıyla gösteriyor (bkz. PaywallActivity). */
  const { source, word } = useLocalSearchParams<{ source?: string; word?: string }>();
  const { data: lifecycle } = useSubscriptionLifecycleQuery();

  /**
   * ÖDEME SORUNU VARKEN SATIŞ DEĞİL DÜZELTME (C10, Vocabulary §11.4): grace
   * ya da billing retry'daki aboneye yeni bir abonelik satmaya çalışmak
   * yanlış (zaten abone, kartı reddedildi). Hangi tetikleyiciden gelirse
   * gelsin paywall yerine "ödemeyi düzelt" ekranı açılıyor. Yaşam döngüsü
   * henüz yüklenmediyse normal paywall.
   */
  if (needsBillingFix(lifecycle)) {
    return (
      <ErrorBoundary source="billing_fix">
        <BillingFixScreen source={`paywall:${source ?? "unknown"}`} onClose={() => router.back()} />
      </ErrorBoundary>
    );
  }

  return (
    <ErrorBoundary source="paywall">
      <PaywallScreen
        onClose={() => router.back()}
        source={source ?? "unknown"}
        blockedWord={word ?? null}
      />
    </ErrorBoundary>
  );
}
