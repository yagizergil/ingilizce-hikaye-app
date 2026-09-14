/**
 * Jest kurulum dosyası.
 *
 * AsyncStorage'ın native modülü testlerde yok. `src/i18n/index.ts` artık
 * kalıcı arayüz dilini okuduğu için (bkz. src/i18n/uiLanguage.ts) i18n'i
 * import eden her test o modüle dokunuyor; taklit olmadan
 * `bootstrap.test.ts` "NativeModule: AsyncStorage is null" ile ÇALIŞMADAN
 * düşüyordu -- yani on dilin hepsini koruyan regresyon testi sessizce
 * devre dışı kalırdı.
 *
 * Paketin KENDİ resmî taklidi kullanılıyor; elle yazılmış bir sahte,
 * gerçek davranıştan (çok anahtarlı işlemler, callback imzaları) zamanla
 * ayrışırdı.
 */
jest.mock("@react-native-async-storage/async-storage", () =>
  require("@react-native-async-storage/async-storage/jest/async-storage-mock"),
);
