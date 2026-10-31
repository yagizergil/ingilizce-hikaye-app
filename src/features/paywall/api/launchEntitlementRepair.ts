/**
 * Açılışta yetki onarımı gerekiyor mu? (G4, mevcut durum raporu; C5)
 *
 * Kaçan bir webhook (yanlış yapılandırma, geçici 5xx, kaynak satırı olmayan
 * TRANSFER) eskiden yalnızca kullanıcı satın alma ya da geri yükleme
 * yaptığında onarılıyordu. Webhook'un kendi yorumu "uygulama açılışta
 * sync-entitlement ile gerçek durumu okur" diyordu ama böyle bir çağrı yoktu.
 *
 * Kural tek yönlü, `sync-entitlement` gibi: mağaza (RevenueCat SDK) premium
 * diyor VE sunucu 'free' diyorsa onar. Tersi (sunucu premium, mağaza değil)
 * onarım DEĞİL: yetkiyi kaldırmak yalnızca EXPIRATION webhook'unun işi
 * (ADR-009); sync-entitlement zaten alamaz.
 *
 * Sunucu durumu bilinmiyorsa (sorgu yükleniyor/hata) karar verilmez.
 */
export function shouldRepairEntitlementOnLaunch(input: {
  serverPremium: boolean | undefined;
  storePremium: boolean;
}): boolean {
  return input.serverPremium === false && input.storePremium;
}
