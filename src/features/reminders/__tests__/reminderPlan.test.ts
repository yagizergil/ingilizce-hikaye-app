import { buildReminderPlan } from "@/features/reminders/reminderPlan";

import type { ReminderInput } from "@/features/reminders/reminderPlan";

/**
 * Hatırlatma planının testleri.
 *
 * NEDEN BU TESTLER VAR: yanlış zamanlanmış ya da artık doğru olmayan bir
 * bildirim, uygulamanın silinme sebeplerinin başında geliyor. "Bitirdiğin
 * kitaba devam et" ya da "serini kaybediyorsun (zaten okumuşken)" gibi bir
 * bildirim, hatırlatmaların tamamının kapatılmasına yol açar. Bu yüzden
 * mantık cihaz API'sinden ayrı ve tarih verilerek test ediliyor.
 */

/** 10 Eylül 2026, Perşembe 14:00 — akşam saatlerinin hepsi hâlâ ileride. */
const NOON = new Date(2026, 8, 10, 14, 0, 0, 0);

const baseInput: ReminderInput = {
  dueCount: 0,
  unfinishedBookTitle: null,
  streakDays: 0,
  readToday: false,
};

function idsOf(input: Partial<ReminderInput>, now: Date = NOON): string[] {
  return buildReminderPlan({ ...baseInput, ...input }, now).map((item) => item.id);
}

describe("buildReminderPlan", () => {
  it("yapılacak bir şey yoksa hiçbir şey planlamaz", () => {
    // "Seni özledik" türü içeriksiz bildirim bilerek yok.
    expect(idsOf({})).toEqual([]);
  });

  describe("seri kurtarma", () => {
    it("seri varken ve bugün okunmamışken bugün 21:00'e planlar", () => {
      const plan = buildReminderPlan({ ...baseInput, streakDays: 5 }, NOON);
      expect(plan).toHaveLength(1);
      expect(plan[0]?.id).toBe("streakRescue");
      expect(plan[0]?.params).toEqual({ count: 5 });
      expect(plan[0]?.fireAt.getHours()).toBe(21);
      expect(plan[0]?.fireAt.getDate()).toBe(NOON.getDate());
    });

    it("bugün zaten okunduysa planlanmaz", () => {
      // Kaybedilecek bir seri yok; bildirim yalan söylerdi.
      expect(idsOf({ streakDays: 5, readToday: true })).toEqual([]);
    });

    it("tek günlük seri için planlanmaz", () => {
      // Bir günlük "seri" henüz alışkanlık değil; kaybı da bir kayıp değil.
      expect(idsOf({ streakDays: 1 })).toEqual([]);
    });

    it("saat 21:00'i geçtiyse o akşam için planlanmaz", () => {
      const late = new Date(2026, 8, 10, 21, 30, 0, 0);
      expect(idsOf({ streakDays: 5 }, late)).toEqual([]);
    });

    it("21:00'e 15 dakikadan az kaldıysa planlanmaz", () => {
      // Neredeyse anında patlayan bir bildirim, kullanıcı telefonu
      // cebine koyarken gelir ve rahatsız edicidir.
      const almost = new Date(2026, 8, 10, 20, 50, 0, 0);
      expect(idsOf({ streakDays: 5 }, almost)).toEqual([]);
    });
  });

  describe("tekrar hatırlatması", () => {
    it("vadesi gelen kart varsa YARIN 20:00'ye planlar", () => {
      const plan = buildReminderPlan({ ...baseInput, dueCount: 12, readToday: true }, NOON);
      expect(plan).toHaveLength(1);
      expect(plan[0]?.id).toBe("reviewDue");
      expect(plan[0]?.params).toEqual({ count: 12 });
      expect(plan[0]?.fireAt.getHours()).toBe(20);
      // Bugüne konmuyor: kullanıcı uygulamayı az önce kapattı, kartlar
      // zaten önündeydi.
      expect(plan[0]?.fireAt.getDate()).toBe(NOON.getDate() + 1);
    });

    it("vadesi gelen kart yoksa planlanmaz", () => {
      expect(idsOf({ dueCount: 0, readToday: true })).toEqual([]);
    });
  });

  describe("yarım kalan kitap", () => {
    it("3 gün sonra 19:00'a planlar ve kitabın adını taşır", () => {
      const plan = buildReminderPlan(
        { ...baseInput, unfinishedBookTitle: "The Gift of the Magi" },
        NOON,
      );
      expect(plan).toHaveLength(1);
      expect(plan[0]?.id).toBe("continueReading");
      expect(plan[0]?.params).toEqual({ title: "The Gift of the Magi" });
      expect(plan[0]?.fireAt.getHours()).toBe(19);
      expect(plan[0]?.fireAt.getDate()).toBe(NOON.getDate() + 3);
    });

    it("bugün okunduysa planlanmaz", () => {
      // Okuyan bir kullanıcıya "devam et" demek gereksiz.
      expect(idsOf({ unfinishedBookTitle: "Frankenstein", readToday: true })).toEqual([]);
    });

    it("yarım kalan kitap yoksa planlanmaz", () => {
      expect(idsOf({ unfinishedBookTitle: null })).toEqual([]);
    });
  });

  describe("gün başına en fazla bir bildirim", () => {
    it("üç hatırlatma da uygunsa hiçbiri aynı güne düşmez", () => {
      const plan = buildReminderPlan(
        {
          dueCount: 12,
          unfinishedBookTitle: "Frankenstein",
          streakDays: 4,
          readToday: false,
        },
        NOON,
      );

      expect(plan.map((item) => item.id)).toEqual([
        "streakRescue",
        "reviewDue",
        "continueReading",
      ]);

      const days = plan.map((item) => item.fireAt.toDateString());
      expect(new Set(days).size).toBe(plan.length);
    });

    it("planlanan her hatırlatma gelecekte", () => {
      const plan = buildReminderPlan(
        {
          dueCount: 3,
          unfinishedBookTitle: "Frankenstein",
          streakDays: 4,
          readToday: false,
        },
        NOON,
      );
      for (const item of plan) {
        expect(item.fireAt.getTime()).toBeGreaterThan(NOON.getTime());
      }
    });
  });

  it("ay sonunda bir sonraki aya doğru şekilde taşar", () => {
    // 30 Eylül + 3 gün = 3 Ekim. Elle gün toplayan bir hesap burada patlardı.
    const monthEnd = new Date(2026, 8, 30, 14, 0, 0, 0);
    const plan = buildReminderPlan(
      { ...baseInput, unfinishedBookTitle: "Frankenstein" },
      monthEnd,
    );
    expect(plan[0]?.fireAt.getMonth()).toBe(9);
    expect(plan[0]?.fireAt.getDate()).toBe(3);
  });
});
