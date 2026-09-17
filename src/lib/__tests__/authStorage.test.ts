import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";

import { authStorage } from "@/lib/authStorage";

/**
 * DENETİM BULGUSU (2026-09-17): eski tek-jenerasyonlu parçalama şeması
 * atomik değildi -- yazma süreci ortada kesilirse (token yenilemesi
 * sırasında uygulama arka planda sonlandırılırsa) bozuk/yarım bir oturum
 * kalıcı hâle geliyordu, bu da kullanıcının bir sonraki açılışta yeni bir
 * anonim hesaba düşmesine (dolayısıyla onboarding'in ve kütüphanenin
 * kaybolmasına) yol açıyordu. Bu test A/B jenerasyon şemasının yazma
 * kesintisinde ESKİ (sağlam) jenerasyonu koruduğunu doğruluyor.
 */

const mockStore = new Map<string, string>();

jest.mock("expo-secure-store", () => ({
  getItemAsync: jest.fn(async (key: string) => mockStore.get(key) ?? null),
  setItemAsync: jest.fn(async (key: string, value: string) => {
    mockStore.set(key, value);
  }),
  deleteItemAsync: jest.fn(async (key: string) => {
    mockStore.delete(key);
  }),
}));

describe("authStorage", () => {
  beforeEach(() => {
    mockStore.clear();
    jest.clearAllMocks();
    Object.defineProperty(Platform, "OS", { value: "ios", configurable: true });
  });

  it("round-trips a value larger than one chunk", async () => {
    const value = "x".repeat(5000);
    await authStorage.setItem("session", value);
    await expect(authStorage.getItem("session")).resolves.toBe(value);
  });

  it("alternates generations on repeated writes and cleans up the previous one", async () => {
    await authStorage.setItem("session", "a".repeat(4000));
    await authStorage.setItem("session", "b".repeat(4000));

    // İlk yazma pasif ("b") jenerasyona gitti; ikinci yazma "a"ya geçip
    // "b" jenerasyonunun parçalarını temizlemiş olmalı.
    const leftoverGenerationBKeys = [...mockStore.keys()].filter((key) =>
      key.startsWith("session.b."),
    );
    expect(leftoverGenerationBKeys).toHaveLength(0);
    await expect(authStorage.getItem("session")).resolves.toBe("b".repeat(4000));
  });

  it("survives a write interrupted mid-flight by keeping the previous, intact value", async () => {
    const oldValue = "old-session-token".repeat(200);
    await authStorage.setItem("session", oldValue);

    const setItemMock = SecureStore.setItemAsync as jest.Mock;

    // Yeni değeri yazarken YARIDA kesiyoruz: ilk yeni parça yazılıyor,
    // ikincisinde patlıyor -- tam olarak arka planda sonlandırılan bir
    // uygulamanın simülasyonu. Başlık (commit anı) hiç güncellenmiyor.
    let callCount = 0;
    setItemMock.mockImplementation(async (key: string, value: string) => {
      callCount += 1;
      if (callCount > 1) throw new Error("interrupted");
      mockStore.set(key, value);
    });

    const newValue = "new-session-token".repeat(400);
    await expect(authStorage.setItem("session", newValue)).resolves.toBeUndefined();

    setItemMock.mockImplementation(async (key: string, value: string) => {
      mockStore.set(key, value);
    });

    // Kesintiye rağmen okuma hâlâ ESKİ, tam ve bozulmamış değeri dönmeli --
    // yarım yazılmış yeni parçalarla karışmamalı.
    await expect(authStorage.getItem("session")).resolves.toBe(oldValue);
  });

  it("serializes overlapping writes to the same key instead of racing", async () => {
    // Gerçekçi senaryo: token yenilemesiyle tetiklenen bir yazma, başka bir
    // yazmayla NEREDEYSE eş zamanlı gelir. Mock'a küçük bir gecikme
    // ekleyerek iki çağrının gerçekten iç içe geçmesini (interleave)
    // zorluyoruz -- kilit olmasaydı ikisi de aynı pasif jenerasyonu
    // hesaplayıp aynı parça anahtarlarının üzerine yazardı.
    const setItemMock = SecureStore.setItemAsync as jest.Mock;
    setItemMock.mockImplementation(async (key: string, value: string) => {
      await new Promise((resolve) => setTimeout(resolve, 1));
      mockStore.set(key, value);
    });

    const valueA = "AAAA-".repeat(1000);
    const valueB = "BBBB-".repeat(1000);
    await Promise.all([
      authStorage.setItem("session", valueA),
      authStorage.setItem("session", valueB),
    ]);

    const finalValue = await authStorage.getItem("session");
    // Kilit sayesinde ikisi de TAM olarak sırayla işlenmiş olmalı -- sonuç
    // iki değerden birinin BÜTÜNÜ olmalı, ikisinin karışımı değil.
    expect([valueA, valueB]).toContain(finalValue);
  });

  it("reads a legacy unchunked value written before the chunking scheme existed", async () => {
    mockStore.set("session", "legacy-raw-value");
    await expect(authStorage.getItem("session")).resolves.toBe("legacy-raw-value");
  });

  it("reads a legacy single-generation chunked value (no generation prefix)", async () => {
    mockStore.set("session.0", "hello-");
    mockStore.set("session.1", "world");
    mockStore.set("session", "2");
    await expect(authStorage.getItem("session")).resolves.toBe("hello-world");
  });

  it("removeItem deletes all chunks of the active generation", async () => {
    await authStorage.setItem("session", "z".repeat(4000));
    await authStorage.removeItem("session");
    await expect(authStorage.getItem("session")).resolves.toBeNull();
    expect(mockStore.size).toBe(0);
  });
});
