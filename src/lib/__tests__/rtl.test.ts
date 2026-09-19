import { I18nManager, Platform } from "react-native";

import { applyLayoutDirection, isLayoutRtl } from "@/lib/rtl";

/**
 * YAZIM YÖNÜ -- ÇÖZÜLEN ÜÇ HATA (2026-09-19, ilk kullanıcı denetimi).
 *
 * Bulunuş biçimi: uygulama tarayıcıda gerçekten yürütüldü. Ana dil olarak
 * Türkçe seçilip "Devam et"e basıldığında uygulama kendini yeniden
 * başlatıyor, onboarding en başa dönüyordu; aynı adım tekrarlandığında aynı
 * şey oluyordu. Telemetride `onboarding_rtl_restart {language: tr}` --
 * Türkçe RTL bir dil DEĞİL. Onboarding tamamlanamıyordu.
 */

const constantsSpy = jest.spyOn(I18nManager, "getConstants");
const allowSpy = jest.spyOn(I18nManager, "allowRTL").mockImplementation(() => undefined);
const forceSpy = jest.spyOn(I18nManager, "forceRTL").mockImplementation(() => undefined);

function setCurrentDirection(isRTL: boolean): void {
  constantsSpy.mockReturnValue({ isRTL, doLeftAndRightSwapInRTL: true, localeIdentifier: "tr-TR" });
}

beforeEach(() => {
  allowSpy.mockClear();
  forceSpy.mockClear();
  Platform.OS = "ios";
});

describe("isLayoutRtl", () => {
  it("yönü `getConstants()` üzerinden okur", () => {
    setCurrentDirection(true);
    expect(isLayoutRtl()).toBe(true);
    setCurrentDirection(false);
    expect(isLayoutRtl()).toBe(false);
  });

  /**
   * HATA 1: `I18nManager.isRTL` react-native-web'de YOK (o modül yalnızca
   * allowRTL/forceRTL/getConstants sağlıyor). `isRtlLanguage(dil) !==
   * I18nManager.isRTL` karşılaştırması `false !== undefined` olup DAİMA
   * "yön değişti" diyordu.
   */
  it("`isRTL` alanı tanımsız olsa bile boolean döner", () => {
    setCurrentDirection(false);
    // @ts-expect-error -- web'deki gerçek durumu taklit ediyoruz
    delete I18nManager.isRTL;
    expect(isLayoutRtl()).toBe(false);
    expect(typeof isLayoutRtl()).toBe("boolean");
  });
});

describe("applyLayoutDirection", () => {
  it("yön zaten doğruysa yeniden başlatma istemez", () => {
    setCurrentDirection(false);
    expect(applyLayoutDirection("tr")).toBe(false);
    expect(forceSpy).not.toHaveBeenCalled();
  });

  it("LTR'den Arapçaya geçişte RTL'i açar", () => {
    setCurrentDirection(false);
    expect(applyLayoutDirection("ar")).toBe(true);
    expect(allowSpy).toHaveBeenCalledWith(true);
    expect(forceSpy).toHaveBeenCalledWith(true);
  });

  /**
   * HATA 2: eski kod yönden BAĞIMSIZ olarak `allowRTL(true)` çağırıp
   * `forceRTL(false)` diyordu. `forceRTL(false)` "LTR ol" demek değil,
   * "zorlama" demek -- `allowRTL(true)` açıkken yön CİHAZIN diline düşer.
   * Cihaz dili Arapça olan bir telefonda Türkçe seçen kullanıcıda yön RTL
   * kalıyor, koşul tekrar sağlanıyor ve yeniden başlatma döngüye giriyordu.
   */
  it("RTL'den LTR'ye geçişte `allowRTL(false)` ile LTR'yi GERÇEKTEN zorlar", () => {
    setCurrentDirection(true);
    expect(applyLayoutDirection("tr")).toBe(true);
    expect(allowSpy).toHaveBeenCalledWith(false);
    expect(forceSpy).toHaveBeenCalledWith(false);
  });

  it("web'de yeniden başlatma istemez -- orada `forceRTL` bir no-op", () => {
    Platform.OS = "web";
    setCurrentDirection(false);
    expect(applyLayoutDirection("ar")).toBe(false);
    expect(forceSpy).not.toHaveBeenCalled();
  });
});
