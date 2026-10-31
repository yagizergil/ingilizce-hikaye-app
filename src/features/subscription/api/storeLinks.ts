import { Linking } from "react-native";

import { trackError } from "@/lib/analytics";
import {
  APPLE_BILLING_URL,
  APPLE_SUBSCRIPTIONS_URL,
  showManageSubscriptions,
} from "@/lib/revenuecat";

async function openUrl(url: string, source: string): Promise<boolean> {
  try {
    await Linking.openURL(url);
    return true;
  } catch (error) {
    trackError(source, error, { url });
    return false;
  }
}

/**
 * App Store abonelik yönetimi (iptal, plan değişikliği, yenilemeyi açma).
 * iOS'ta iptal YALNIZCA orada yapılabilir. SDK'nın yerleşik sayfası
 * açılamazsa Apple'ın hesap adresine düşülüyor.
 */
export async function openStoreSubscriptions(): Promise<boolean> {
  if (await showManageSubscriptions()) return true;
  return openUrl(APPLE_SUBSCRIPTIONS_URL, "subscription.openSubscriptions");
}

/**
 * Apple hesabının ödeme yöntemleri sayfası (ödeme sorunu). Kart bilgisi
 * bizde değil Apple'da güncellenir. Açılamazsa abonelik sayfasına düşülür.
 */
export async function openStoreBilling(): Promise<boolean> {
  if (await openUrl(APPLE_BILLING_URL, "subscription.openBilling")) return true;
  return openStoreSubscriptions();
}

/** Tarihi kullanıcının arayüz dilinde "12 Kasım" biçiminde yazar. */
export function formatDay(date: Date, language: string): string {
  return date.toLocaleDateString(language, { day: "numeric", month: "long" });
}
