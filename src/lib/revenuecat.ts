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

/**
 * `INTRO_ELIGIBILITY_STATUS_ELIGIBLE` sayısal karşılığı.
 *
 * Enum `react-native-purchases`ten geliyor ve o paket Expo Go'da YOK;
 * değerini burada sabitlemek, tip dışında bir çalışma zamanı importu
 * eklememek için (dosyanın başındaki tembel yükleme gerekçesi).
 */
const INTRO_ELIGIBILITY_ELIGIBLE = 2;

/** Expo Go'da native modül yok — orada satın alma akışı çalışmaz. */
export const isPurchasesAvailable =
  Constants.executionEnvironment !== ExecutionEnvironment.StoreClient;

type PurchasesModule = typeof import("react-native-purchases").default;

let cachedModule: PurchasesModule | null = null;

/**
 * Kurulum tek seferlik ve paylaşılan bir söz.
 *
 * NEDEN SÖZ, BAYRAK DEĞİL: eskiden `configured` bayrağı vardı. Kullanıcı
 * paywall'a kurulum bitmeden ulaşırsa satın alma çağrısı yapılandırılmamış
 * SDK'ya giderdi. Söz ile her çağıran aynı kurulumu BEKLİYOR.
 */
let configurePromise: Promise<PurchasesModule | null> | null = null;

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

async function currentSupabaseUserId(): Promise<string | null> {
  const { data } = await supabase.auth.getSession();
  return data.session?.user.id ?? null;
}

/**
 * RevenueCat kimliğini Supabase kullanıcısıyla EŞİTLER.
 *
 * NEDEN HER SATIN ALMADAN ÖNCE (Apple incelemesi, 2026-09-11): SDK açılışta
 * `app/_layout.tsx` içinde kuruluyor, anonim Supabase oturumu ise AYNI ANDA
 * `useAuthBootstrap` içinde açılıyor. Taze kurulumda kurulum oturumdan önce
 * bitiyor, SDK kimliksiz (`$RCAnonymousID`) yapılandırılıyor ve sonra
 * hiçbir şey `logIn` çağırmıyordu. İnceleme cihazı her zaman taze kurulum
 * olduğu için bu yarışı HER SEFERİNDE kaybediyordu:
 *
 *   - satın alma anonim RevenueCat kimliğine yazıldı,
 *   - webhook kimliği uuid olarak çözemedi (yok sayıldı),
 *   - `sync-entitlement` uuid ile sordu, RevenueCat boş abone döndü,
 *   - kullanıcı ödedi, premium açılmadı.
 *
 * Telemetri kanıtı: satın alma 14:27:34'te tamamlandı; RevenueCat'te o
 * uuid'nin kaydı ilk kez 14:27:38'de — onarım sorgusuyla — oluştu.
 *
 * Yarışı zamanlamayla "kazanmaya" çalışmak yerine burada KESİN garanti
 * veriyoruz: kimlik farklıysa `logIn`. `logIn` anonim kimlikteki satın
 * almaları da yeni kimliğe taşıyor, yani daha önce kaybolmuş bir satın alma
 * bir sonraki geri yüklemede geri geliyor.
 */
async function ensureIdentity(purchases: PurchasesModule): Promise<void> {
  const userId = await currentSupabaseUserId();
  if (!userId) return;

  try {
    const current = await purchases.getAppUserID();
    if (current !== userId) {
      await purchases.logIn(userId);
      trackEvent("revenuecat_identity_linked", {
        from_anonymous: current.startsWith("$RCAnonymousID"),
      });
    }
  } catch (error) {
    // Kimlik eşitlenemezse satın alma yine denenir; geri yükleme ve
    // onarım yolu daha sonra düzeltebilir. Yutulmuyor, kaydediliyor.
    trackError("revenuecat.identity", error);
  }
}

/**
 * SDK'yı kurar (bir kez) ve kimliği eşitler. Kurulamıyorsa null.
 *
 * Satın alma, geri yükleme ve teklif okuma bunu çağırıyor; açılıştaki
 * çağrı yalnızca işi erkene almak için.
 */
async function readyPurchases(): Promise<PurchasesModule | null> {
  if (!configurePromise) {
    configurePromise = (async () => {
      const purchases = await loadPurchases();
      if (!purchases) return null;

      // Şimdilik yalnızca iOS anahtarı tanımlı; Android'e çıkarken buraya
      // platforma göre anahtar seçimi eklenecek.
      const apiKey = Platform.OS === "ios" ? env.revenueCatApiKeyIos : "";
      if (!apiKey) {
        // Anahtarsız bir build'de paywall "paket yok" der. Bunu sessiz
        // bırakmak bir inceleme reddini teşhis edilemez yapardı.
        trackError("revenuecat.configure", new Error("missing_ios_api_key"));
        return null;
      }

      try {
        const appUserId = await currentSupabaseUserId();
        purchases.configure({ apiKey, appUserID: appUserId });
        return purchases;
      } catch (error) {
        trackError("revenuecat.configure", error);
        configurePromise = null; // Bir sonraki çağrı yeniden denesin.
        return null;
      }
    })();
  }

  const purchases = await configurePromise;
  if (purchases) await ensureIdentity(purchases);
  return purchases;
}

/**
 * SDK'yı kurar ve RevenueCat kullanıcısını Supabase kullanıcısıyla
 * eşleştirir; oturum sonradan açılır ya da değişirse (anonim → Apple ile
 * giriş) eşleştirmeyi tekrarlar.
 *
 * Eşleştirme şart: anonim kullanıcı sonradan hesap açtığında aboneliğinin
 * onunla taşınması gerekiyor (migration 011'deki hesap birleştirmenin
 * abonelik tarafı).
 *
 * @returns Aboneliği kaldıran fonksiyon.
 */
export function configurePurchases(): () => void {
  void readyPurchases();

  const { data } = supabase.auth.onAuthStateChange((_event, session) => {
    if (!session?.user.id) return;
    void readyPurchases();
  });

  return () => data.subscription.unsubscribe();
}

/**
 * Satın alınabilir paketleri döndürür.
 *
 * HATA ARTIK YUTULMUYOR (Apple reddi 1.0(8), Guideline 2.1(b)): eskiden
 * StoreKit hatası boş diziye çevriliyordu. Sonuç, inceleme cihazında tek
 * bir geçici hatanın kalıcı "paket yok" ekranına dönüşmesiydi — ne yeniden
 * deneme vardı ne de düğme. Şimdi hata fırlıyor; TanStack Query geri
 * çekilmeyle yeniden deniyor ve paywall "Tekrar dene" gösteriyor.
 */
export async function fetchOfferingPackages(
  offeringId?: string | null,
): Promise<PurchasesPackage[]> {
  const purchases = await readyPurchases();
  if (!purchases) return [];

  try {
    const offerings = await purchases.getOfferings();

    /**
     * İSTENEN OFFERING YOKSA VARSAYILANA DÜŞÜLÜYOR.
     *
     * Onboarding'de ayrı bir teklif (örn. "onboarding") gösterilmek
     * isteniyor ama o teklifin RevenueCat'te tanımlı olup olmadığına
     * uygulama karar veremez -- mağaza tarafında kurulmamışsa paywall'ın
     * BOŞ açılması, hiç açılmamasından daha kötü olurdu. Tanımlıysa o
     * kullanılıyor, değilse güncel teklif.
     */
    const requested = offeringId ? offerings.all[offeringId] : null;
    const chosen: PurchasesOffering | null = requested ?? offerings.current;
    const packages = chosen?.availablePackages ?? [];

    // EKSİK PLANLAR VARSAYILANDAN TAMAMLANIYOR (kullanıcı bulgusu,
    // 2026-10-07): "onboarding" teklifinde yalnızca yıllık paket vardı;
    // onboarding sonundaki paywall'da aylık hiç görünmüyor, kullanıcı
    // seçeneksiz yıllığa itiliyordu. Özel teklifin paketleri korunur (ör.
    // indirimli yıllık), sahip olmadığı plan türleri güncel tekliften gelir.
    if (requested && offerings.current && requested !== offerings.current) {
      const types = new Set(packages.map((pkg) => pkg.packageType));
      const missing = offerings.current.availablePackages.filter(
        (pkg) => !types.has(pkg.packageType),
      );
      return [...packages, ...missing];
    }
    return packages;
  } catch (error) {
    trackError("revenuecat.offerings", error);
    throw error;
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
/**
 * Satın alma olaylarına eklenen bağlam.
 *
 * NEDEN: `purchase_completed` yalnızca `package_id` taşıyordu. Huni
 * analizi için paywall'ın HANGİ tetikleyiciden açıldığı en kritik boyut —
 * profilden gelen kullanıcı ile kitabını bitirmiş kullanıcı aynı değil.
 * Bağlam çağıran tarafta biliniyor, bu yüzden parametre olarak geçiyor.
 */
export interface PurchaseContext {
  source: string;
  plan: string;
}

export async function purchasePackage(
  pkg: PurchasesPackage,
  context?: PurchaseContext,
): Promise<PurchaseOutcome> {
  const purchases = await readyPurchases();
  if (!purchases) return { status: "error" };

  try {
    const { customerInfo } = await purchases.purchasePackage(pkg);

    if (!hasPremium(customerInfo)) {
      trackError("revenuecat.purchase.notEntitled", new Error("entitlement_inactive"), {
        package_id: pkg.identifier,
      });
      return { status: "not_entitled" };
    }

    trackEvent("purchase_completed", { package_id: pkg.identifier, ...context });
    return { status: "success" };
  } catch (error) {
    if (
      typeof error === "object" &&
      error !== null &&
      (error as { userCancelled?: boolean }).userCancelled === true
    ) {
      trackEvent("purchase_cancelled", { package_id: pkg.identifier, ...context });
      return { status: "cancelled" };
    }
    trackError("revenuecat.purchase", error, { package_id: pkg.identifier });
    return { status: "error" };
  }
}

/**
 * Geri yükleme denemesinin sonucu.
 *
 * NEDEN ÜÇ DURUM, BOOLEAN DEĞİL (denetim bulgusu): eskiden `boolean`
 * dönüyordu ve ÜÇ farklı şey aynı `false`'a düşüyordu — (1) gerçekten
 * geri yüklenecek bir şey yok, (2) ağ/StoreKit hatası, (3) SDK hiç
 * kurulamadı. Çağıran hepsini "abonelik yok" diye okuyup kullanıcıya
 * "Bu Apple hesabında aktif bir abonelik yok" diyordu. Zayıf bağlantıda
 * uygulamayı yeniden kuran ÖDEYEN bir aboneye söylenen bu cümle olgusal
 * olarak yanlıştı ve kullanıcı denemeyi bırakıyordu — doğrudan gelir
 * kaybı. Hata ile yokluk artık ayrı.
 */
export type RestoreOutcome =
  /** RevenueCat premium yetkisini aktif gördü. */
  | { status: "restored" }
  /** Çağrı başarılı ama bu hesapta aktif abonelik yok. */
  | { status: "none" }
  /** Ağ/StoreKit hatası ya da SDK kurulamadı — "abonelik yok" DEMEK DEĞİL. */
  | { status: "error" };

/** Önceki satın alımları geri yükler (App Store için zorunlu). */
export async function restorePurchases(): Promise<RestoreOutcome> {
  const purchases = await readyPurchases();
  // SDK kurulamadıysa mağazaya hiç sorulmadı; bu bir bilgi eksikliği,
  // "abonelik yok" bilgisi değil.
  if (!purchases) return { status: "error" };

  try {
    const info = await purchases.restorePurchases();
    const restored = hasPremium(info);
    trackEvent("purchase_restored", { restored });
    return restored ? { status: "restored" } : { status: "none" };
  } catch (error) {
    trackError("revenuecat.restore", error);
    return { status: "error" };
  }
}

/**
 * Bu KULLANICININ ücretsiz denemeye hak kazanıp kazanmadığı.
 *
 * NEDEN GEREKLİ (App Store Guideline 2.3.1 riski): `product.introPrice`
 * ÜRÜNÜN giriş fiyatını anlatıyor, BU kullanıcının ona hak kazanıp
 * kazanmadığını değil. 7 günlük denemeyi bir kez kullanmış biri paywall'da
 * yine "7 gün ücretsiz dene" görüyor, sonra anında ücretlendiriliyordu.
 * CLAUDE.md'nin kuralı: bir fayda önce üründe gerçek olmalı, sonra
 * paywall'a yazılabilir.
 *
 * BİLİNMİYORSA GİZLİYORUZ: RevenueCat "unknown" dönebiliyor (StoreKit
 * yanıtı yoksa) ve çağrı hata da verebilir. Kazanılmamış bir cümle
 * kaybedilmiş bir satırdır; yanlış bir cümle rededilme sebebidir.
 *
 * @returns Denemeye hak kazanılan ürün kimlikleri. Emin olunamayan hiçbir
 *          ürün kümede YOK.
 */
export async function fetchTrialEligibleProductIds(
  productIds: string[],
): Promise<ReadonlySet<string>> {
  const empty: ReadonlySet<string> = new Set<string>();
  if (productIds.length === 0) return empty;

  const purchases = await readyPurchases();
  if (!purchases) return empty;

  try {
    const result = await purchases.checkTrialOrIntroductoryPriceEligibility(productIds);
    const eligible = new Set<string>();
    for (const [productId, eligibility] of Object.entries(result)) {
      // 2 = INTRO_ELIGIBILITY_STATUS_ELIGIBLE. Enum'un kendisi
      // `react-native-purchases`ten geliyor; burada sayıyı yazmak, saf
      // tip importu dışında o native paketi çalışma zamanına sokmamak
      // için (bkz. dosyanın başındaki Expo Go gerekçesi).
      if (eligibility?.status === INTRO_ELIGIBILITY_ELIGIBLE) eligible.add(productId);
    }
    return eligible;
  } catch (error) {
    // Yutulmuyor: kaydediliyor ve çağıran boş küme alıyor — yani deneme
    // iddiası hiç yazılmıyor.
    trackError("revenuecat.trialEligibility", error);
    return empty;
  }
}

/** Güncel abonelik durumunu okur. */
export async function fetchCustomerInfo(): Promise<CustomerInfo | null> {
  const purchases = await readyPurchases();
  if (!purchases) return null;

  try {
    return await purchases.getCustomerInfo();
  } catch (error) {
    trackError("revenuecat.customerInfo", error);
    return null;
  }
}
