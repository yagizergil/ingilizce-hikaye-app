import { localDateKey, localDateKeyDaysAgo } from "@/lib/localDate";

/**
 * Migration 044'ün istemci tarafı: "bugün" artık her yerde CİHAZIN takvim
 * günü. Buradaki testler o tanımın UTC'ye kaymadığını kilitliyor --
 * kaydığı anda gece okuyan kullanıcının dakikaları yanlış güne yazılıyor.
 */
describe("localDateKey", () => {
  it("gece yarısından sonraki yerel saatte YEREL günü veriyor, UTC gününü değil", () => {
    // 2026-03-15 01:30 yerel. Sistem saat dilimi UTC+3 ise UTC karşılığı
    // 2026-03-14 22:30'dur; `toISOString().slice(0,10)` burada DÜNÜ verirdi.
    const local = new Date(2026, 2, 15, 1, 30, 0);
    expect(localDateKey(local)).toBe("2026-03-15");
  });

  it("ay ve günü iki haneye tamamlıyor", () => {
    expect(localDateKey(new Date(2026, 0, 5, 12, 0, 0))).toBe("2026-01-05");
  });

  it("gün sonundaki saatlerde de aynı günü veriyor", () => {
    expect(localDateKey(new Date(2026, 2, 15, 23, 59, 59))).toBe("2026-03-15");
  });
});

describe("localDateKeyDaysAgo", () => {
  it("0 bugünü veriyor", () => {
    const now = new Date(2026, 2, 15, 23, 59, 0);
    expect(localDateKeyDaysAgo(0, now)).toBe("2026-03-15");
  });

  it("ay sınırını geriye doğru geçebiliyor", () => {
    const now = new Date(2026, 2, 2, 9, 0, 0);
    expect(localDateKeyDaysAgo(3, now)).toBe("2026-02-27");
  });

  it("gece yarısına yakın saatte bile bir gün kaydırmıyor", () => {
    // Gün ortasına sabitlenmeseydi, DST geçişi olan bir günde 00:30'dan
    // 24 saat çıkarmak aynı güne düşebiliyordu.
    const now = new Date(2026, 2, 15, 0, 30, 0);
    expect(localDateKeyDaysAgo(1, now)).toBe("2026-03-14");
  });

  it("verilen anı DEĞİŞTİRMİYOR", () => {
    const now = new Date(2026, 2, 15, 0, 30, 0);
    const before = now.getTime();
    localDateKeyDaysAgo(5, now);
    expect(now.getTime()).toBe(before);
  });
});
