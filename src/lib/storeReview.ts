import { Linking, Platform } from "react-native";

import * as StoreReview from "expo-store-review";

import AsyncStorage from "@/lib/storage";
import { trackError, trackEvent } from "@/lib/analytics";

/** App Store Connect'teki Apple ID -- yorum sayfasına doğrudan bağlantı için. */
const APPLE_APP_ID = "6809447042";

/**
 * App Store puan isteme.
 *
 * NEDEN VAR: puan hem App Store arama sıralamasında bir sinyal hem de ürün
 * sayfasının dönüşüm çarpanı — arama sonucunda 4,8 ile 4,2 arasındaki fark
 * doğrudan indirmeye yansıyor. Uygulamada hiç puan isteme yoktu, yani
 * lansmandan sonra tek yorum bile gelmeyebilirdi.
 *
 * NEDEN BU KADAR KISITLI:
 *
 *  1. **Yalnızca başarı anında.** Apple'ın kendi rehberi ve sektör pratiği
 *     aynı şeyi söylüyor: değer yaşanmadan sorulan puan, düşük puan
 *     getiriyor. Tek tetikleyici bir KİTABI BİTİRMEK — uygulamadaki en net
 *     başarı anı. Hata, boş durum veya çökme sonrası asla istenmez.
 *
 *  2. **İlk kitapta değil.** İlk kitabını bitiren kullanıcı henüz ürünü
 *     yargılayacak kadar kullanmadı. Eşik ikinci kitap.
 *
 *  3. **Ömür boyu bir kez.** iOS zaten yılda en fazla üç kez gösteriyor ve
 *     gösterip göstermediğini söylemiyor. Uygulamanın kendi sayacını
 *     tutması, "istendi mi" sorusunun tek cevabı olması için gerekli;
 *     yoksa her kitap bitişinde tekrar denenirdi.
 *
 * `requestReview()` GÖSTERİLDİĞİNİ GARANTİ ETMEZ — kararı iOS veriyor ve
 * geri bildirim vermiyor. Bu yüzden "istendi" olarak işaretlemek, gerçekten
 * gösterildiği anlamına gelmiyor; sayaç yine de ilerletiliyor çünkü
 * alternatifi (tekrar tekrar denemek) kullanıcı için daha kötü.
 */

const ASKED_KEY = "storeReview.asked";

/** İkinci kitap: ilki ürünü yargılamak için yeterli değil. */
const MIN_COMPLETED_BOOKS = 2;

/**
 * Koşullar uygunsa puan ister.
 *
 * @param completedBookCount Kullanıcının bitirdiği toplam kitap sayısı.
 * @returns Puan isteme diyaloğu tetiklendiyse `true`.
 */
export async function maybeRequestReview(completedBookCount: number): Promise<boolean> {
  if (completedBookCount < MIN_COMPLETED_BOOKS) return false;

  try {
    const alreadyAsked = await AsyncStorage.getItem(ASKED_KEY);
    if (alreadyAsked) return false;

    // Cihaz/derleme puan istemeyi desteklemiyorsa (simülatör, TestFlight
    // dışı bazı durumlar) sayacı harcamıyoruz.
    const available = await StoreReview.isAvailableAsync();
    if (!available) return false;

    const hasAction = await StoreReview.hasAction();
    if (!hasAction) return false;

    await StoreReview.requestReview();
    await AsyncStorage.setItem(ASKED_KEY, new Date().toISOString());

    trackEvent("store_review_requested", { completed_books: completedBookCount });
    return true;
  } catch (error) {
    // Puan isteme başarısız olması kullanıcı için görünür bir sorun değil,
    // ama sessizce yutulmuyor: hiç yorum gelmiyorsa sebebini bilmek gerek.
    trackError("storeReview.request", error);
    return false;
  }
}

/**
 * Ayarlar'daki "Bizi Değerlendir" satırı için: kullanıcı KENDİ isteğiyle
 * puan vermeye gidiyor.
 *
 * NEDEN `maybeRequestReview`'DAN FARKLI: o fonksiyon Apple'ın yılda 3 kez
 * sınırına tabi sessiz `SKStoreReviewController`'ı çağırıyor ve iOS
 * gösterip göstermediğini hiç söylemiyor -- kullanıcı "değerlendir"
 * satırına bastığında ekranda hiçbir şey açılmayabilir, ki bu bir ayarlar
 * satırı için kabul edilemez bir deneyim. Burada bunun yerine doğrudan
 * App Store'un yorum yazma sayfasına (`action=write-review`) gidiyoruz --
 * her zaman açılır, Apple'ın sessiz kotasını hiç tüketmez.
 */
export async function openWriteReviewPage(): Promise<void> {
  trackEvent("store_review_manual_opened");
  const url =
    Platform.OS === "ios"
      ? `itms-apps://itunes.apple.com/app/id${APPLE_APP_ID}?action=write-review`
      : `https://apps.apple.com/app/id${APPLE_APP_ID}?action=write-review`;
  try {
    await Linking.openURL(url);
  } catch (error) {
    trackError("storeReview.manualOpen", error);
  }
}
