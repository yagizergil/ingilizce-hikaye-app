import { Platform } from "react-native";

import Constants, { ExecutionEnvironment } from "expo-constants";

import { env } from "@/lib/env";
import { supabase } from "@/lib/supabase";
import { trackError, trackEvent } from "@/lib/analytics";

import type { CustomerInfo, PurchasesOffering, PurchasesPackage } from "react-native-purchases";

/**
 * RevenueCat sarmalayıcısı.
 *
 * KRİTİK — EXPO GO: `react-native-purchases` bir native modül ve Expo Go
 * içinde YOK. Doğrudan import edilirse uygulama Expo Go'da açılışta çöker.
 * Bu yüzden modül yalnızca gerçek bir derlemede, üstelik tembel (lazy)
 * olarak yükleniyor; Expo Go'da her fonksiyon sessizce "premium yok"
 * davranışına düşüyor. Geliştirme Expo Go'da yapılabilsin diye.
 *
 * FİYATLAR BURADA YOK: paketler ve fiyatlar RevenueCat "offerings"
 * üzerinden geliyor. Fiyat değişikliği uygulama güncellemesi gerektirmiyor.
 * Önerilen fiyatlandırma için bkz. docs/aso/03-fiyatlandirma.md.
 */

/** Uygulamanın RevenueCat'te tanımlı yetki (entitlement) adı. */
export const PREMIUM_ENTITLEMENT = "premium";

/** Expo Go'da native modül yok — orada satın alma akışı çalışmaz. */
export const isPurchasesAvailable =
  Constants.executionEnvironment !== ExecutionEnvironment.StoreClient;

type PurchasesModule = typeof import("react-native-purchases").default;

let cachedModule: PurchasesModule | null = null;
let configured = false;

/**
 * Native modülü tembel yükler. Expo Go'da ve modül bulunamadığında null
 * döner — çağıranlar bunu "premium kapalı" olarak yorumluyor.
 */
async function loadPurchases(): Promise<PurchasesModule | null> {
  if (!isPurchasesAvailable) return null;
  if (cachedModule) return cachedModule;

  try {
    const module = await import("react-native-purchases");
    cachedModule = module.default;
    return cachedModule;
  } catch (error) {
    // Modül gerçekten yoksa bu beklenen bir durum değil (Expo Go zaten
    // yukarıda eleniyor) — sessizce yutmuyoruz.
    trackError("revenuecat.load", error);
    return null;
  }
}

/**
 * SDK'yı kurar ve RevenueCat kullanıcısını Supabase kullanıcısıyla
 * eşleştirir.
 *
 * Eşleştirme şart: anonim kullanıcı sonradan hesap açtığında aboneliğinin
 * onunla taşınması gerekiyor (migration 011'deki hesap birleştirmenin
 * abonelik tarafı).
 */
export async function configurePurchases(): Promise<void> {
  const purchases = await loadPurchases();
  if (!purchases) return;

  // Şimdilik yalnızca iOS anahtarı tanımlı; Android'e çıkarken buraya
  // platforma göre anahtar seçimi eklenecek.
  const apiKey = Platform.OS === "ios" ? env.revenueCatApiKeyIos : "";
  if (!apiKey) return;

  try {
    const { data } = await supabase.auth.getUser();
    const appUserId = data.user?.id;

    if (!configured) {
      await purchases.configure({ apiKey, appUserID: appUserId ?? null });
      configured = true;
    } else if (appUserId) {
      await purchases.logIn(appUserId);
    }
  } catch (error) {
    trackError("revenuecat.configure", error);
  }
}

/** Satın alınabilir paketleri döndürür. Kullanılamıyorsa boş dizi. */
export async function fetchOfferingPackages(): Promise<PurchasesPackage[]> {
  const purchases = await loadPurchases();
  if (!purchases) return [];

  try {
    const offerings = await purchases.getOfferings();
    const current: PurchasesOffering | null = offerings.current;
    return current?.availablePackages ?? [];
  } catch (error) {
    trackError("revenuecat.offerings", error);
    return [];
  }
}

/** `customerInfo` içinde premium yetkisi aktif mi. */
export function hasPremium(info: CustomerInfo | null): boolean {
  if (!info) return false;
  return info.entitlements.active[PREMIUM_ENTITLEMENT] !== undefined;
}

/**
 * SUNUCUYA YETKİYİ İSTEMCİ YAZMAZ.
 *
 * Burada bir zamanlar `syncEntitlementToServer()` vardı ve
 * `user_entitlements`'a upsert atıyordu. O tablo migration 002'den beri
 * select-only RLS ile korunuyor, yani upsert HİÇBİR ZAMAN çalışmadı:
 * hata trackError'a yazılıp yutuluyor, satın alma yine "başarılı"
 * görünüyor ve kullanıcı ücretsiz katmanda kalıyordu (denetim bulgusu,
 * 2026-09-07).
 *
 * Doğru yazar RevenueCat webhook'udur:
 *   RevenueCat → supabase/functions/revenuecat-webhook (service_role)
 *              → public.apply_entitlement_event() (migration 028)
 *
 * İstemcinin işi yalnızca satın almayı başlatmak ve sunucunun yetkiyi
 * yazmasını BEKLEMEK — bkz. `waitForServerPremium()`.
 */

/** Satın alma denemesinin sonucu. */
export type PurchaseOutcome =
  | { status: "success" }
  | { status: "cancelled" }
  /** Apple satın almayı aldı ama yetki aktif değil — destek gerektiren nadir durum. */
  | { status: "not_entitled" }
  | { status: "error" };

/**
 * Bir paketi satın alır.
 *
 * `success` yalnızca Apple satın almayı onayladığında VE RevenueCat premium
 * yetkisini aktif gördüğünde dönüyor. Eskiden burada koşulsuz "success"
 * dönülüyordu; sunucu tarafı sessizce başarısız olduğunda bile kullanıcıya
 * başarı gösterilmesinin sebebi buydu.
 */
export async function purchasePackage(pkg: PurchasesPackage): Promise<PurchaseOutcome> {
  const purchases = await loadPurchases();
  if (!purchases) return { status: "error" };

  try {
    const { customerInfo } = await purchases.purchasePackage(pkg);

    if (!hasPremium(customerInfo)) {
      trackError("revenuecat.purchase.notEntitled", new Error("entitlement_inactive"), {
        package_id: pkg.identifier,
      });
      return { status: "not_entitled" };
    }

    trackEvent("purchase_completed", { package_id: pkg.identifier });
    return { status: "success" };
  } catch (error) {
    if (
      typeof error === "object" &&
      error !== null &&
      (error as { userCancelled?: boolean }).userCancelled === true
    ) {
      trackEvent("purchase_cancelled", { package_id: pkg.identifier });
      return { status: "cancelled" };
    }
    trackError("revenuecat.purchase", error, { package_id: pkg.identifier });
    return { status: "error" };
  }
}

/** Önceki satın alımları geri yükler (App Store için zorunlu). */
export async function restorePurchases(): Promise<boolean> {
  const purchases = await loadPurchases();
  if (!purchases) return false;

  try {
    const info = await purchases.restorePurchases();
    const restored = hasPremium(info);
    trackEvent("purchase_restored", { restored });
    return restored;
  } catch (error) {
    trackError("revenuecat.restore", error);
    return false;
  }
}

/** Güncel abonelik durumunu okur. */
export async function fetchCustomerInfo(): Promise<CustomerInfo | null> {
  const purchases = await loadPurchases();
  if (!purchases) return null;

  try {
    return await purchases.getCustomerInfo();
  } catch (error) {
    trackError("revenuecat.customerInfo", error);
    return null;
  }
}
