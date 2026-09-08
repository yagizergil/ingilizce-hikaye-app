import {
  isAwaitingAutoStart,
  shouldAutoStart,
  type AutoStartReadiness,
} from "@/features/reader/tts/autoStartGate";

/**
 * "Dinle" düğmesinin sessizce hiçbir şey yapmamasına karşı koruma.
 *
 * Bu testlerin varlık sebebi gerçek bir hata: otomatik başlatma yalnızca
 * erişim kararını bekliyordu ve düğme çalışmıyordu. Aşağıdaki her koşul,
 * eksikliğinde AYNI sessiz sonucu üreten bir koşul — hiçbiri süs değil.
 */

function readiness(overrides: Partial<AutoStartReadiness> = {}): AutoStartReadiness {
  return {
    requested: true,
    available: true,
    timingsReady: true,
    playerLoaded: true,
    ...overrides,
  };
}

describe("shouldAutoStart", () => {
  it("her şey hazırsa başlatır", () => {
    expect(shouldAutoStart(readiness(), false)).toBe(true);
  });

  it("kullanıcı 'Dinle' ile gelmediyse başlatmaz", () => {
    // Normal 'Oku' akışında ses kendiliğinden başlamamalı.
    expect(shouldAutoStart(readiness({ requested: false }), false)).toBe(false);
  });

  it("bir kez başlatıldıysa tekrar başlatmaz", () => {
    // Otomatik başlatma tek atışlık: kullanıcı duraklattığında sürücü
    // yeniden çalmaya başlarsa duraklatma düğmesi işe yaramaz görünür.
    expect(shouldAutoStart(readiness(), true)).toBe(false);
  });

  it("erişim onaylanmadan başlatmaz", () => {
    expect(shouldAutoStart(readiness({ available: false }), false)).toBe(false);
  });

  it("zaman işaretleri inmeden başlatmaz", () => {
    // Bunsuz ses çalar ama hiçbir kelime vurgulanmaz — ürünün asıl
    // özelliği tam olarak vurgu olduğu için bu da bozuk bir başlangıç.
    expect(shouldAutoStart(readiness({ timingsReady: false }), false)).toBe(false);
  });

  it("ses dosyası yüklenmeden başlatmaz", () => {
    // ASIL HATA BUYDU: yüklenmemiş oynatıcıda `play()` hata fırlatmıyor,
    // sessizce hiçbir şey yapmıyor.
    expect(shouldAutoStart(readiness({ playerLoaded: false }), false)).toBe(false);
  });

  it("koşullardan yalnızca biri eksikse bile başlatmaz", () => {
    const keys: (keyof AutoStartReadiness)[] = [
      "requested",
      "available",
      "timingsReady",
      "playerLoaded",
    ];
    for (const key of keys) {
      expect(shouldAutoStart(readiness({ [key]: false }), false)).toBe(false);
    }
  });
});

describe("isAwaitingAutoStart", () => {
  it("'Dinle' istenmediyse beklemez", () => {
    expect(isAwaitingAutoStart(readiness({ requested: false }))).toBe(false);
  });

  it("ses dosyası yüklenirken bekliyor", () => {
    expect(isAwaitingAutoStart(readiness({ playerLoaded: false }))).toBe(true);
  });

  it("zaman işaretleri inerken bekliyor", () => {
    expect(isAwaitingAutoStart(readiness({ timingsReady: false }))).toBe(true);
  });

  it("erişim kararı gelirken bekliyor", () => {
    expect(isAwaitingAutoStart(readiness({ available: false }))).toBe(true);
  });

  it("her şey hazırken beklemiyor — duraklatılmış hâl dâhil", () => {
    // Bu testin koruduğu şey: `requested` duraklatmadan sonra da true
    // kalıyor. "Başlatılmadı mı" diye sorulsaydı duraklatılmış seslendirme
    // sonsuza kadar "hazırlanıyor" görünürdü.
    expect(isAwaitingAutoStart(readiness())).toBe(false);
  });
});
