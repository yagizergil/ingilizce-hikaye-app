import { fetchSubscriptionStatus } from "@/features/paywall/api/useSubscriptionQuery";
import { syncEntitlementFromStore } from "@/features/paywall/api/syncEntitlement";
import { trackEvent } from "@/lib/analytics";

/**
 * Satın alma sonrası sunucunun yetkiyi yazmasını bekler.
 *
 * NEDEN BEKLEMEK GEREKİYOR: yetkiyi artık istemci değil, RevenueCat
 * webhook'u yazıyor (bkz. supabase/functions/revenuecat-webhook ve
 * migration 028). Apple satın almayı onayladığı an ile webhook'un satırı
 * yazdığı an arasında tipik olarak bir-iki saniye var. O aralıkta
 * `useSubscriptionQuery` hâlâ `free` görür; beklemeden paywall kapatılırsa
 * kullanıcı ödediği hâlde bir an için ücretsiz katmanda kalır.
 *
 * NEDEN İYİMSER AÇMIYORUZ: ücretsiz katman sınırını sunucudaki tetikleyici
 * zorluyor (migration 024). İstemci "premium" gösterip sunucu hâlâ 'free'
 * derse, kullanıcı 101. kelimeyi kaydetmeye çalıştığında anlaşılmaz bir
 * hata alır. Tek doğruluk kaynağı sunucu; istemci onu bekler.
 *
 * Zaman aşımı bir HATA DEĞİL: webhook birkaç dakika gecikebilir. O durumda
 * çağıran, kullanıcıya "birazdan etkinleşecek" der ve ekranı kapatır —
 * satın alma kaybolmuş değildir, "Satın alımları geri yükle" her zaman
 * durumu tazeler.
 *
 * ONARIM ADIMI: webhook birkaç saniyede gelmezse bir kez `sync-entitlement`
 * çağrılıyor. Buna neden gerek olduğu `syncEntitlement.ts` içinde yazılı —
 * özeti: kaçan bir webhook eskiden yetkinin KALICI kaybı demekti. Beklemeye
 * yalnızca yoklama eklenirse o durum hiç düzelmez, sonsuza kadar yoklanır.
 */

/** Toplam bekleme süresi. Webhook tipik olarak 1-2 sn içinde ulaşıyor. */
const TIMEOUT_MS = 20_000;

/** İlk yoklamalar sık, sonrakiler seyrek — hızlı webhook'ta gecikme yaratmaz. */
const POLL_DELAYS_MS: readonly [number, ...number[]] = [
  400, 600, 1000, 1500, 2000, 3000, 4000, 5000,
];

/**
 * Kaçıncı yoklamadan sonra onarım denenecek.
 *
 * 3 yoklama ~2 saniye demek: normal bir webhook bu süre içinde zaten
 * ulaşıyor, dolayısıyla mutlu yolda RevenueCat API'sine hiç dokunulmuyor.
 */
const SYNC_AFTER_ATTEMPT = 3;

/** Son eleman tekrar eder; dizinin sınırını aşmak mümkün değil. */
function delayForAttempt(attempt: number): number {
  return POLL_DELAYS_MS[Math.min(attempt, POLL_DELAYS_MS.length - 1)] ?? POLL_DELAYS_MS[0];
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

/**
 * Sunucudaki yetki `premium` olana kadar yoklar.
 *
 * @returns Yetki göründüyse `true`, süre dolduysa `false`.
 */
export async function waitForServerPremium(): Promise<boolean> {
  const startedAt = Date.now();
  let attempt = 0;
  let syncTried = false;

  while (Date.now() - startedAt < TIMEOUT_MS) {
    await delay(delayForAttempt(attempt));
    attempt += 1;

    try {
      const status = await fetchSubscriptionStatus();
      if (status.isPremium) {
        trackEvent("entitlement_confirmed", {
          attempts: attempt,
          elapsed_ms: Date.now() - startedAt,
          repaired: syncTried,
        });
        return true;
      }

      if (!syncTried && attempt >= SYNC_AFTER_ATTEMPT) {
        syncTried = true;
        // Dönüş değerine güvenmiyoruz: doğruluk kaynağı sunucudaki satır,
        // bir sonraki yoklama onu zaten okuyacak.
        await syncEntitlementFromStore();
      }
    } catch {
      // Ağ hatası geçici olabilir; süre dolana kadar denemeye devam et.
      // Yutulan bir hata değil: döngü biterse çağıran `false` alıyor ve
      // kullanıcıya görünür bir mesaj gösteriyor.
    }
  }

  trackEvent("entitlement_wait_timeout", { attempts: attempt, repaired: syncTried });
  return false;
}
