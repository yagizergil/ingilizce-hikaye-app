import { resumeSeekTarget } from "@/features/reader/tts/resumePosition";

/**
 * "Kaldığı yerden devam et" davranışının testleri.
 *
 * Bu testlerin varlık sebebi gerçek bir kullanıcı şikâyeti: kelimeye
 * dokunup sözlüğe bakınca, geri dönüldüğünde seslendirme sayfanın başına
 * dönüyordu. Eski kural mesafeye bakıyordu; doğru soru kapsamaydı.
 */

describe("resumeSeekTarget", () => {
  // Sayfa 100. saniyede başlıyor, 160. saniyede bitiyor (sonraki sayfanın
  // ilk kelimesi orada).
  const page = { pageStartTime: 100, pageEndTime: 160 };

  it("sayfanın ORTASINDA duraklatıldıysa atlamaz", () => {
    // ASIL HATA BUYDU: 130. saniyede duraklatan kullanıcı, devam edince
    // 100'e geri sarılıyordu.
    expect(resumeSeekTarget({ ...page, currentTime: 130 })).toBeNull();
  });

  it("sayfanın ilk kelimesindeyse atlamaz", () => {
    expect(resumeSeekTarget({ ...page, currentTime: 100 })).toBeNull();
  });

  it("sayfanın son anındaysa atlamaz", () => {
    expect(resumeSeekTarget({ ...page, currentTime: 159.9 })).toBeNull();
  });

  it("kullanıcı İLERİ sayfa çevirdiyse sayfanın başına alır", () => {
    // Ses hâlâ önceki sayfada (80), ekran ise 100'de başlayan sayfada.
    expect(resumeSeekTarget({ ...page, currentTime: 80 })).toBe(100);
  });

  it("kullanıcı GERİ sayfa çevirdiyse sayfanın başına alır", () => {
    // Ses ilerideki bir sayfada (200), ekran geride.
    expect(resumeSeekTarget({ ...page, currentTime: 200 })).toBe(100);
  });

  it("sonraki sayfanın ilk kelimesi TAM sınırdaysa artık bu sayfada değil", () => {
    // 160 sonraki sayfanın ilk kelimesi; o an ekranda o sayfa olmalı.
    expect(resumeSeekTarget({ ...page, currentTime: 160 })).toBe(100);
  });

  it("son sayfada üst sınır yok — ses ne kadar ilerlerse ilerlesin atlamaz", () => {
    // `pageEndTime: null` bölümün son sayfası demek. Burada "ileride" diye
    // bir yer yok; sesin sonuna kadar bu sayfadayız.
    expect(
      resumeSeekTarget({ pageStartTime: 100, pageEndTime: null, currentTime: 400 }),
    ).toBeNull();
  });

  it("son sayfada bile ses GERİDEyse sayfanın başına alır", () => {
    expect(resumeSeekTarget({ pageStartTime: 100, pageEndTime: null, currentTime: 40 })).toBe(100);
  });

  it("sayfa sesin başındaysa (0) ve ses de başındaysa atlamaz", () => {
    expect(resumeSeekTarget({ pageStartTime: 0, pageEndTime: 60, currentTime: 0 })).toBeNull();
  });
});
