import { act, create } from "react-test-renderer";

import { LanguagePairUiSync } from "@/features/languagePair/components/LanguagePairUiSync";

/**
 * ÇÖZÜLEN HATA (2026-09-15, kullanıcı bulgusu): ana dil sunucuda doğru
 * (örn. "tr") dururken arayüz dili bir şekilde İngilizce'ye dönebiliyordu.
 * Kod okumasıyla kesin bir tetikleyici bulunamadı -- bu yüzden düzeltme bir
 * TEK hatayı yamamak yerine değişmezi ("arayüz dili == aktif çiftin ana
 * dili") sürekli olarak kuran bu bileşeni ekliyor. Test, o değişmezin
 * gerçekten kurulduğunu doğruluyor: sunucu "tr" derken i18n "en" ise,
 * bileşen mount olur olmaz "tr"ye çekiliyor mu?
 */

const mockChangeLanguage = jest.fn().mockResolvedValue(undefined);
const mockStoreUiLanguage = jest.fn().mockResolvedValue(undefined);

let mockActivePairData: { nativeLanguage: string; targetLanguage: string } | undefined;

jest.mock("@/features/languagePair/api/useActiveLanguagePairQuery", () => ({
  useActiveLanguagePairQuery: () => ({ data: mockActivePairData }),
}));

jest.mock("@/i18n/uiLanguage", () => ({
  storeUiLanguage: (code: string) => mockStoreUiLanguage(code),
}));

jest.mock("@/i18n", () => ({
  __esModule: true,
  default: {
    get language() {
      return "en";
    },
    changeLanguage: (code: string) => mockChangeLanguage(code),
  },
}));

describe("LanguagePairUiSync", () => {
  beforeEach(() => {
    mockChangeLanguage.mockClear();
    mockStoreUiLanguage.mockClear();
    mockActivePairData = undefined;
  });

  it("sunucudaki ana dil arayüzden farklıysa arayüzü ona çeker", () => {
    mockActivePairData = { nativeLanguage: "tr", targetLanguage: "it" };

    act(() => {
      create(<LanguagePairUiSync />);
    });

    expect(mockChangeLanguage).toHaveBeenCalledWith("tr");
    expect(mockStoreUiLanguage).toHaveBeenCalledWith("tr");
  });

  it("sunucudaki ana dil arayüzle aynıysa hiçbir şey yapmaz", () => {
    mockActivePairData = { nativeLanguage: "en", targetLanguage: "it" };

    act(() => {
      create(<LanguagePairUiSync />);
    });

    expect(mockChangeLanguage).not.toHaveBeenCalled();
    expect(mockStoreUiLanguage).not.toHaveBeenCalled();
  });

  it("veri henüz yoksa (yükleniyor) hiçbir şey yapmaz", () => {
    mockActivePairData = undefined;

    act(() => {
      create(<LanguagePairUiSync />);
    });

    expect(mockChangeLanguage).not.toHaveBeenCalled();
  });

  it("desteklenmeyen bir dil kodu gelirse yok sayar", () => {
    mockActivePairData = { nativeLanguage: "xx", targetLanguage: "it" };

    act(() => {
      create(<LanguagePairUiSync />);
    });

    expect(mockChangeLanguage).not.toHaveBeenCalled();
  });
});
