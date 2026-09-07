import { fetchProfileStats } from "@/features/profile/api/useProfileStatsQuery";

/**
 * Seri (streak) ve haftalık grafik hesabının testleri.
 *
 * NEDEN TEST EDİLİYOR: bu mantık tarih sınırlarında yaşıyor — "seri dün
 * bitmişse hâlâ geçerli", "hafta Pazartesi başlar", "okunmayan gün 0
 * dakikayla grafikte yer alır". Elle doğrulaması zor, sessizce yanlış
 * olması kolay: kullanıcı 12 günlük serisini bir sabah 0 görürse bunu bize
 * bildirmez, uygulamayı bırakır.
 *
 * Test, sistem saatini sabitleyip `user_reading_stats` satırlarını mock
 * ediyor; hesabın kendisi saf.
 */

const mockFrom = jest.fn();
jest.mock("@/lib/supabase", () => ({
  supabase: {
    from: (...args: unknown[]) => mockFrom(...args),
  },
}));

/** 2026-09-07 bir Pazartesi; haftanın ilk günü olması testleri okunur kılıyor. */
const NOW = new Date("2026-09-10T15:00:00");

/** `NOW`'dan `offset` gün önceki YYYY-MM-DD anahtarı. */
function daysAgo(offset: number): string {
  const date = new Date(NOW);
  date.setHours(12, 0, 0, 0);
  date.setDate(date.getDate() - offset);
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

function mockRows(rows: { date: string; minutes: number }[]) {
  mockFrom.mockImplementation((table: string) => {
    if (table === "user_reading_stats") {
      return {
        select: () => ({
          order: () => ({ returns: () => Promise.resolve({ data: rows, error: null }) }),
        }),
      };
    }
    // user_book_progress — bitirilen kitap sayısı.
    return {
      select: () => ({ not: () => Promise.resolve({ count: 3, error: null }) }),
    };
  });
}

beforeEach(() => {
  jest.useFakeTimers({ doNotFake: ["nextTick"] });
  jest.setSystemTime(NOW);
  mockFrom.mockReset();
});

afterEach(() => {
  jest.useRealTimers();
});

describe("fetchProfileStats", () => {
  it("bugün dahil kesintisiz günleri seri olarak sayar", async () => {
    mockRows([
      { date: daysAgo(3), minutes: 10 },
      { date: daysAgo(2), minutes: 10 },
      { date: daysAgo(1), minutes: 10 },
      { date: daysAgo(0), minutes: 10 },
    ]);

    const stats = await fetchProfileStats();

    expect(stats.currentStreak).toBe(4);
    expect(stats.readToday).toBe(true);
  });

  it("bugün henüz okunmadıysa seriyi kırmaz (dün biten seri geçerli)", async () => {
    mockRows([
      { date: daysAgo(3), minutes: 10 },
      { date: daysAgo(2), minutes: 10 },
      { date: daysAgo(1), minutes: 10 },
    ]);

    const stats = await fetchProfileStats();

    // Gün bitmedi: kullanıcı sabah uygulamayı açtığında serisini sıfır
    // görmemeli.
    expect(stats.currentStreak).toBe(3);
    expect(stats.readToday).toBe(false);
  });

  it("iki gün öncesinde biten seriyi geçersiz sayar", async () => {
    mockRows([
      { date: daysAgo(4), minutes: 10 },
      { date: daysAgo(3), minutes: 10 },
      { date: daysAgo(2), minutes: 10 },
    ]);

    const stats = await fetchProfileStats();

    expect(stats.currentStreak).toBe(0);
    // Geçmişteki en uzun seri yine de korunuyor.
    expect(stats.longestStreak).toBe(3);
  });

  it("en uzun seriyi geçmişteki en uzun kesintisiz dizi olarak bulur", async () => {
    mockRows([
      { date: "2026-01-01", minutes: 5 },
      { date: "2026-01-02", minutes: 5 },
      { date: "2026-01-03", minutes: 5 },
      { date: "2026-01-04", minutes: 5 },
      { date: "2026-01-05", minutes: 5 },
      // Boşluk.
      { date: "2026-02-01", minutes: 5 },
      { date: "2026-02-02", minutes: 5 },
    ]);

    const stats = await fetchProfileStats();

    expect(stats.longestStreak).toBe(5);
  });

  it("hiç okunmamışsa her şey sıfır, hafta yine 7 gün", async () => {
    mockRows([]);

    const stats = await fetchProfileStats();

    expect(stats.currentStreak).toBe(0);
    expect(stats.longestStreak).toBe(0);
    expect(stats.totalMinutes).toBe(0);
    expect(stats.totalActiveDays).toBe(0);
    expect(stats.weekDays).toHaveLength(7);
    expect(stats.weekDays.every((day) => day.minutes === 0)).toBe(true);
  });

  it("haftalık grafik Pazartesi'den Pazar'a 7 gün döner, okunmayan gün 0", async () => {
    // NOW = 2026-09-10 (Perşembe); haftanın Pazartesi'si 2026-09-07.
    mockRows([
      { date: "2026-09-07", minutes: 20 },
      { date: "2026-09-10", minutes: 35 },
      // Önceki haftadan bir gün: bu haftanın grafiğine girmemeli.
      { date: "2026-09-01", minutes: 99 },
    ]);

    const stats = await fetchProfileStats();

    expect(stats.weekDays.map((day) => day.date)).toEqual([
      "2026-09-07",
      "2026-09-08",
      "2026-09-09",
      "2026-09-10",
      "2026-09-11",
      "2026-09-12",
      "2026-09-13",
    ]);
    expect(stats.weekDays.map((day) => day.minutes)).toEqual([20, 0, 0, 35, 0, 0, 0]);
    expect(stats.readingMinutesThisWeek).toBe(55);
    expect(stats.daysActiveThisWeek).toBe(2);

    // Tüm zamanlar önceki haftayı da içeriyor.
    expect(stats.totalMinutes).toBe(154);
    expect(stats.totalActiveDays).toBe(3);
  });

  it("bitirilen kitap sayısını user_book_progress'ten alır", async () => {
    mockRows([]);

    const stats = await fetchProfileStats();

    expect(stats.completedBookCount).toBe(3);
  });
});
