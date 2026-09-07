const { withEntitlementsPlist } = require("expo/config-plugins");

/**
 * iOS `aps-environment` yetkilendirmesini (entitlement) kaldırır.
 *
 * NEDEN GEREKLİ
 * -------------
 * `expo-notifications` config plugin'i, uygulama uzak (push) bildirim
 * kullanmasa bile iOS yetkilendirmelerine KOŞULSUZ olarak
 * `aps-environment` ekliyor — plugin'in kendi kaynağında bunu atlamak
 * için bir seçenek yok (`withNotificationsIOS.js`, mode varsayılanı
 * 'development').
 *
 * Bu uygulama yalnızca YEREL bildirim kullanıyor (ADR-010): tekrar
 * zamanı, yarım kalan hikâye ve seri kurtarma hatırlatmalarının verisi
 * zaten cihazda. APNs sertifikası, bildirim sunucusu ve cihaz jetonu
 * saklama YOK. Yerel bildirimler `aps-environment` olmadan çalışıyor.
 *
 * Yetkilendirme yerinde bırakılsaydı iki somut sorun çıkardı:
 *
 *  1. **App ID'de Push Notifications yetkinliği açılmak zorunda kalırdı.**
 *     Sağlanma profili, yetkilendirmede olup App ID'de açık olmayan bir
 *     yetkinlik gördüğünde derleme başarısız oluyor.
 *
 *  2. **Üretim derlemesi yükleme doğrulamasında düşerdi.** Dağıtım
 *     derlemesinde `aps-environment` değeri 'production' olmalı;
 *     plugin'in varsayılanı 'development'. Kullanmadığımız bir özellik
 *     için bu uyumsuzluğu yönetmenin hiçbir karşılığı yok.
 *
 * Kısacası: istemediğimiz bir yetkinliği talep etmiyoruz. Apple'ın genel
 * kuralı da bu — kullanılmayan yetkilendirme talep edilmez.
 *
 * SIRA ÖNEMLİ VE TERSTİR: Expo config plugin mod'ları KAYIT SIRASININ
 * TERSİNE çalışıyor — en son kaydedilen mod ilk çalışıyor. Bu yüzden bu
 * plugin `app.config.ts` içinde "expo-notifications"tan **ÖNCE**
 * yazılmalı ki ondan **SONRA** çalışsın. (Sezgiye aykırı; deneyerek
 * doğrulandı — yanlış sırada `config.modResults` boş geliyor, yani
 * silinecek bir şey henüz eklenmemiş oluyor.)
 *
 * DOĞRULAMA: `npx expo config --type introspect` çıktısında
 * `ios.entitlements` altında `aps-environment` GÖRÜNMEMELİ.
 *
 * GELECEKTE PUSH EKLENİRSE: bu plugin'i `plugins` dizisinden çıkar,
 * App ID'de Push Notifications yetkinliğini aç ve expo-notifications'a
 * `mode` ayarını ver.
 */
module.exports = function withoutPushEntitlement(config) {
  return withEntitlementsPlist(config, (config) => {
    delete config.modResults["aps-environment"];
    return config;
  });
};
