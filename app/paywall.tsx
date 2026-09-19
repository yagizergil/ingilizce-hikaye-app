import { router, useLocalSearchParams } from "expo-router";

import { PaywallScreen } from "@/features/paywall";
import { ErrorBoundary } from "@/components/ui";

export default function PaywallRoute() {
  /** `word`: günlük kelime hakkı bittiği için gelindiyse kullanıcının
   * takıldığı kelime. Paywall onu adıyla gösteriyor (bkz. PaywallActivity). */
  const { source, word } = useLocalSearchParams<{ source?: string; word?: string }>();

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
