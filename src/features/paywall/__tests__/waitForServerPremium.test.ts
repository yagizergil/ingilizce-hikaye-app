import { waitForServerPremium } from "@/features/paywall/api/waitForServerPremium";

/**
 * Satın alma sonrası yetki bekleme mantığının testleri.
 *
 * NEDEN BU TESTLER VAR: burası paranın geçtiği yer. Yetkiyi artık istemci
 * yazmıyor (bkz. ADR-009); Apple onayı ile RevenueCat webhook'unun sunucuya
 * yazması arasındaki boşluğu bu fonksiyon dolduruyor. İki yönde de
 * bozulabilir:
 *  - Erken pes ederse kullanıcı ödediği hâlde ücretsiz katmanda kalır.
 *  - Hiç pes etmezse paywall sonsuza kadar "etkinleştiriliyor" der.
 *
 * Sahte zamanlayıcı (fake timers) kullanılıyor: gerçek beklemeyle test
 * 20 saniye sürerdi.
 */

const mockFetchStatus = jest.fn();
const mockTrackEvent = jest.fn();

jest.mock("@/features/paywall/api/useSubscriptionQuery", () => ({
  fetchSubscriptionStatus: (...args: unknown[]) => mockFetchStatus(...args),
}));

jest.mock("@/lib/analytics", () => ({
  trackEvent: (...args: unknown[]) => mockTrackEvent(...args),
}));

function status(isPremium: boolean) {
  return { isPremium, savedWordCount: 0, savedWordLimit: 100 };
}

/**
 * Zamanlayıcıları ilerletirken bekleyen sözleri de akıtır.
 *
 * NEDEN KÜÇÜK ADIMLARLA: fonksiyon her yoklamada `await` ile bir ağ
 * çağrısı yapıyor ve BİR SONRAKİ zamanlayıcıyı ancak o söz çözüldükten
 * sonra kuruyor. Tek seferde 25 saniye ilerletmek yalnızca o an kurulmuş
 * olan ilk zamanlayıcıyı tetikler; sonrakiler hiç kurulmamış olur.
 * Bu yüzden zaman küçük adımlarla ilerliyor ve her adımda mikro görev
 * kuyruğu boşaltılıyor.
 */
async function flushMicrotasks() {
  for (let i = 0; i < 10; i += 1) {
    await Promise.resolve();
  }
}

async function advance(totalMs: number, stepMs = 100) {
  let elapsed = 0;
  while (elapsed < totalMs) {
    await flushMicrotasks();
    jest.advanceTimersByTime(stepMs);
    elapsed += stepMs;
  }
  await flushMicrotasks();
}

describe("waitForServerPremium", () => {
  beforeEach(() => {
    jest.useFakeTimers();
    mockFetchStatus.mockReset();
    mockTrackEvent.mockReset();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("sunucu premium der demez true döner", async () => {
    mockFetchStatus.mockResolvedValue(status(true));

    const promise = waitForServerPremium();
    await advance(500);

    await expect(promise).resolves.toBe(true);
    // İlk yoklama 400 ms sonra: webhook hızlı ulaştığında kullanıcı
    // gereksiz yere bekletilmiyor.
    expect(mockFetchStatus).toHaveBeenCalledTimes(1);
  });

  it("webhook birkaç saniye gecikirse beklemeye devam eder", async () => {
    mockFetchStatus
      .mockResolvedValueOnce(status(false))
      .mockResolvedValueOnce(status(false))
      .mockResolvedValue(status(true));

    const promise = waitForServerPremium();
    await advance(3000);

    await expect(promise).resolves.toBe(true);
    expect(mockFetchStatus).toHaveBeenCalledTimes(3);
  });

  it("ağ hatasında pes etmez, denemeye devam eder", async () => {
    // Geçici bir ağ hatası satın almayı kaybetmiş saymamalı.
    mockFetchStatus
      .mockRejectedValueOnce(new Error("network"))
      .mockResolvedValue(status(true));

    const promise = waitForServerPremium();
    await advance(2000);

    await expect(promise).resolves.toBe(true);
  });

  it("süre dolarsa false döner ve sonsuza kadar beklemez", async () => {
    mockFetchStatus.mockResolvedValue(status(false));

    const promise = waitForServerPremium();
    await advance(25_000);

    await expect(promise).resolves.toBe(false);
  });

  it("başarıda ve zaman aşımında farklı olaylar kaydeder", async () => {
    mockFetchStatus.mockResolvedValue(status(true));
    const ok = waitForServerPremium();
    await advance(500);
    await ok;

    expect(mockTrackEvent).toHaveBeenCalledWith(
      "entitlement_confirmed",
      expect.objectContaining({ attempts: 1 }),
    );

    mockTrackEvent.mockReset();
    mockFetchStatus.mockResolvedValue(status(false));
    const timedOut = waitForServerPremium();
    await advance(25_000);
    await timedOut;

    // Zaman aşımı sessiz kalmamalı: hiç premium açılmıyorsa sebebini
    // telemetriden görebilmek gerekiyor.
    expect(mockTrackEvent).toHaveBeenCalledWith(
      "entitlement_wait_timeout",
      expect.objectContaining({ attempts: expect.any(Number) }),
    );
  });
});
