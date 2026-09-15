import { useEffect } from "react";

import i18n from "@/i18n";
import { storeUiLanguage } from "@/i18n/uiLanguage";
import { UI_LANGUAGE_CODES } from "@/lib/languages";

import { useActiveLanguagePairQuery } from "@/features/languagePair/api/useActiveLanguagePairQuery";

/**
 * Arayüz dilini SUNUCUDAKİ aktif çiftin ana diliyle her zaman senkron tutar.
 *
 * NEDEN VAR: `languagePair.nativeTitle` ekranındaki söz -- "Uygulama
 * arayüzü ve kelime karşılıkları bu dilde gösterilecek" -- bir metin değil,
 * bir değişmez (invariant): ana dil HER ZAMAN arayüz dili demek. Bugüne
 * kadar bu değişmezi yalnızca dil değiştiren EKRANLAR (`OnboardingFlow`,
 * `ManageLanguagePairsScreen`) elle kuruyordu -- `i18n.changeLanguage()` +
 * `storeUiLanguage()` her seçim noktasında ayrı ayrı çağrılıyordu. İki
 * ayrı yerde elle senkron tutulan bir değişmez, üçüncü bir yol (örn. bir
 * cihaz değişimi, geri yüklenen bir yedek, ya da hâlâ tam olarak
 * yeniden üretilemeyen bir yarış durumu -- kullanıcı denetiminde: doğru
 * ana dil sunucuda dururken arayüz İngilizce'ye dönüyordu) devreye
 * girdiğinde sessizce bozuluyordu.
 *
 * Bu bileşen değişmezi TEK bir yerden, sürekli olarak kuruyor: sunucudan
 * gelen aktif çift ne zaman `nativeLanguage` taşırsa (ilk yükleme, arka
 * plandan dönüş, `invalidateQueries` sonrası yeniden çekim -- hepsi aynı
 * `useActiveLanguagePairQuery` üzerinden geçiyor) ve bu, o an ekranda
 * gösterilen dilden FARKLIYSA, arayüz dili oraya çekiliyor. Kullanıcının
 * elle seçtiği bir dil asla EZİLMİYOR -- zaten sunucudaki `nativeLanguage`
 * kullanıcının kendi seçimi (bkz. `set_language_pair`), yani bu senkron
 * kullanıcı tercihiyle çelişmiyor, onu koruyor.
 */
export function LanguagePairUiSync() {
  const { data } = useActiveLanguagePairQuery();
  const nativeLanguage = data?.nativeLanguage;

  useEffect(() => {
    if (!nativeLanguage) return;
    if (!(UI_LANGUAGE_CODES as readonly string[]).includes(nativeLanguage)) return;
    if (nativeLanguage === i18n.language) return;

    void i18n.changeLanguage(nativeLanguage);
    void storeUiLanguage(nativeLanguage);
  }, [nativeLanguage]);

  return null;
}
