import {
  NEW_CARD,
  cardStage,
  scheduleCard,
  type SrsCardState,
} from "@/features/srs/scheduler";

/** Sabit bir "şimdi" — testlerin gerçek saate bağlı olmaması için. */
const NOW = new Date("2026-09-07T12:00:00.000Z");

function daysBetween(from: Date, to: Date): number {
  return (to.getTime() - from.getTime()) / (24 * 60 * 60 * 1000);
}

describe("scheduleCard", () => {
  describe("yeni kart", () => {
    it("ilk 'easy' cevabında 1 gün sonraya planlar", () => {
      const result = scheduleCard(NEW_CARD, "easy", NOW);

      expect(result.repetitions).toBe(1);
      expect(result.intervalDays).toBe(1);
      expect(daysBetween(NOW, result.dueAt)).toBeCloseTo(1, 5);
    });

    it("ilk 'hard' cevabında da 1 gün bekletir", () => {
      const result = scheduleCard(NEW_CARD, "hard", NOW);

      expect(result.intervalDays).toBe(1);
    });

    it("'easy' ease'i yükseltir, 'hard' düşürür", () => {
      const easy = scheduleCard(NEW_CARD, "easy", NOW);
      const hard = scheduleCard(NEW_CARD, "hard", NOW);

      expect(easy.ease).toBeGreaterThan(NEW_CARD.ease);
      expect(hard.ease).toBeLessThan(NEW_CARD.ease);
    });
  });

  describe("ikinci başarılı tekrar", () => {
    it("6 güne çıkar", () => {
      const first = scheduleCard(NEW_CARD, "easy", NOW);
      const second = scheduleCard(first, "easy", NOW);

      expect(second.repetitions).toBe(2);
      expect(second.intervalDays).toBe(6);
    });
  });

  describe("üçüncü ve sonraki tekrarlar", () => {
    it("aralığı ease çarpanıyla büyütür", () => {
      const card: SrsCardState = {
        repetitions: 2,
        intervalDays: 6,
        ease: 2.5,
        lapses: 0,
      };

      const result = scheduleCard(card, "easy", NOW);

      // 6 * (2.5 + 0.1) = 15.6
      expect(result.intervalDays).toBeCloseTo(15.6, 1);
      expect(result.repetitions).toBe(3);
    });

    it("'hard' aralığı yalnızca az büyütür, 'easy' çok daha fazla", () => {
      const card: SrsCardState = {
        repetitions: 4,
        intervalDays: 30,
        ease: 2.5,
        lapses: 0,
      };

      const hard = scheduleCard(card, "hard", NOW);
      const easy = scheduleCard(card, "easy", NOW);

      expect(hard.repetitions).toBe(5);
      // 30 * 1.2 = 36 — kullanıcı zorlandığını söyledi, aralık az açılmalı.
      expect(hard.intervalDays).toBeCloseTo(36, 1);
      // "Kolay" ease çarpanını kullanır: 30 * 2.6 = 78.
      expect(easy.intervalDays).toBeGreaterThan(hard.intervalDays * 2);
    });

    it("ikinci tekrarda 'hard' 'easy'den kısa aralık verir", () => {
      const first = scheduleCard(NEW_CARD, "easy", NOW);

      expect(scheduleCard(first, "hard", NOW).intervalDays).toBe(4);
      expect(scheduleCard(first, "easy", NOW).intervalDays).toBe(6);
    });
  });

  describe("'again' cevabı", () => {
    it("kartı başa döndürür ve lapses'i artırır", () => {
      const card: SrsCardState = {
        repetitions: 5,
        intervalDays: 40,
        ease: 2.5,
        lapses: 1,
      };

      const result = scheduleCard(card, "again", NOW);

      expect(result.repetitions).toBe(0);
      expect(result.intervalDays).toBe(0);
      expect(result.lapses).toBe(2);
    });

    it("kartı aynı gün içinde ama hemen değil geri getirir", () => {
      const result = scheduleCard(NEW_CARD, "again", NOW);
      const minutes = (result.dueAt.getTime() - NOW.getTime()) / 60000;

      // Arka arkaya aynı kelimeyi göstermek hatırlama değil kopyalamadır.
      expect(minutes).toBeCloseTo(10, 1);
    });
  });

  describe("sınırlar", () => {
    it("ease 1.3'ün altına inmez", () => {
      let card: SrsCardState = { ...NEW_CARD };
      for (let i = 0; i < 20; i += 1) {
        card = scheduleCard(card, "again", NOW);
      }

      expect(card.ease).toBeGreaterThanOrEqual(1.3);
    });

    it("aralık 365 günü aşmaz", () => {
      const card: SrsCardState = {
        repetitions: 10,
        intervalDays: 300,
        ease: 2.8,
        lapses: 0,
      };

      const result = scheduleCard(card, "easy", NOW);

      expect(result.intervalDays).toBe(365);
    });

    it("uzun bir doğru seri boyunca aralık büyür ve tavanda durur", () => {
      let card: SrsCardState = { ...NEW_CARD };
      let previous = -1;

      for (let i = 0; i < 8; i += 1) {
        card = scheduleCard(card, "easy", NOW);
        expect(card.intervalDays).toBeGreaterThanOrEqual(previous);
        previous = card.intervalDays;
      }

      // Sekiz doğru cevaptan sonra tavana ulaşmış olmalı.
      expect(card.intervalDays).toBe(365);
    });
  });
});

describe("cardStage", () => {
  it("hiç çalışılmamış kart 'new'", () => {
    expect(cardStage(NEW_CARD)).toBe("new");
  });

  it("kısa aralıklı kart 'learning'", () => {
    expect(cardStage({ repetitions: 2, intervalDays: 6, ease: 2.5, lapses: 0 })).toBe(
      "learning",
    );
  });

  it("21 gün ve üstü aralık 'known'", () => {
    expect(cardStage({ repetitions: 5, intervalDays: 21, ease: 2.5, lapses: 0 })).toBe(
      "known",
    );
  });

  it("unutulan kart 'learning'e geri döner", () => {
    const lapsed = scheduleCard(
      { repetitions: 5, intervalDays: 40, ease: 2.5, lapses: 0 },
      "again",
      NOW,
    );

    expect(cardStage(lapsed)).toBe("new");
  });
});
