import { evalCondition, parseRules, pickRule, semverGte } from "@/features/offers/rules/engine";

import type { Rule, RuleContext } from "@/features/offers/types";

const HOUR = 60 * 60 * 1000;
const NOW = 1_800_000_000_000;

function ctx(overrides: Partial<RuleContext> = {}): RuleContext {
  return {
    isPremium: false,
    trialEligible: true,
    everSubscribed: false,
    billingIssue: false,
    daysSinceInstall: 5,
    readSessions24h: 1,
    userBucket: 10,
    inHoldout: false,
    firstChapterFinished: true,
    hoursSinceLastFullscreen: 9999,
    hoursSinceLastSale: 9999,
    hoursToNextCalendarSale: 9999,
    source: null,
    ...overrides,
  };
}

function rule(overrides: Partial<Rule> = {}): Rule {
  return {
    id: "r",
    trigger: "app_open",
    presentation: "fullscreen",
    rank: 10,
    conditions: [],
    action: { kind: "sale", offering_id: "sale" },
    cooldownHours: null,
    maxShows: null,
    exemptGlobalCooldown: false,
    minAppVersion: null,
    ...overrides,
  };
}

const base = { appVersion: "1.2.0", history: {}, fullscreenShownThisSession: false, now: NOW };

describe("parseRules", () => {
  it("geçerli satırları çevirir, bozukları atar ama listeyi durdurmaz", () => {
    const rules = parseRules([
      {
        id: "ok",
        trigger: "app_open",
        presentation: "fullscreen",
        rank: 3,
        conditions: [],
        action: { kind: "sale" },
        cooldown_hours: 24,
        max_shows: null,
      },
      {
        id: "reader",
        trigger: "reader_open",
        presentation: "fullscreen",
        conditions: [],
        action: { kind: "sale" },
      },
      {
        id: "badop",
        trigger: "app_open",
        presentation: "sheet",
        conditions: [{ field: "x", op: "~", value: 1 }],
        action: { kind: "sale" },
      },
      { id: "noaction", trigger: "app_open", presentation: "sheet", conditions: [] },
      "çöp",
    ]);
    expect(rules.map((r) => r.id)).toEqual(["ok"]);
    expect(rules[0]?.cooldownHours).toBe(24);
    expect(rules[0]?.maxShows).toBeNull();
  });

  it("dizi olmayan girdide boş liste", () => {
    expect(parseRules(null)).toEqual([]);
    expect(parseRules({})).toEqual([]);
  });
});

describe("evalCondition", () => {
  it("sayısal, eşitlik ve liste operatörleri", () => {
    const c = ctx({ daysSinceInstall: 3, source: "audio" });
    expect(evalCondition(c, { field: "daysSinceInstall", op: ">=", value: 3 })).toBe(true);
    expect(evalCondition(c, { field: "daysSinceInstall", op: "<", value: 3 })).toBe(false);
    expect(evalCondition(c, { field: "isPremium", op: "=", value: false })).toBe(true);
    expect(evalCondition(c, { field: "source", op: "in", value: ["audio", "word_pack"] })).toBe(
      true,
    );
    expect(evalCondition(c, { field: "source", op: "not_in", value: ["audio"] })).toBe(false);
  });

  it("bilinmeyen ya da null alan hiçbir zaman uygun sayılmaz", () => {
    expect(evalCondition(ctx(), { field: "nope", op: "=", value: 1 })).toBe(false);
    const unknownDays = ctx({ daysSinceInstall: null });
    expect(evalCondition(unknownDays, { field: "daysSinceInstall", op: ">=", value: 0 })).toBe(
      false,
    );
    expect(evalCondition(unknownDays, { field: "daysSinceInstall", op: "!=", value: 2 })).toBe(
      false,
    );
  });

  it('tür uyuşmazlığında false ("2" sayı 2 değildir)', () => {
    expect(
      evalCondition(ctx({ daysSinceInstall: 2 }), {
        field: "daysSinceInstall",
        op: "=",
        value: "2",
      }),
    ).toBe(false);
  });
});

describe("semverGte", () => {
  it("sürüm karşılaştırır", () => {
    expect(semverGte("1.2.10", "1.2.9")).toBe(true);
    expect(semverGte("1.1.0", "1.2.0")).toBe(false);
    expect(semverGte("1.2.0-dev", "1.2.0")).toBe(true);
    expect(semverGte("0.0.1", null)).toBe(true);
  });
});

describe("pickRule", () => {
  it("tetikleyici eşleşmeli ve en yüksek rank kazanır", () => {
    const rules = [
      rule({ id: "a", rank: 5 }),
      rule({ id: "b", rank: 9 }),
      rule({ id: "c", trigger: "home_focus", rank: 99 }),
    ];
    expect(pickRule("app_open", rules, ctx(), base)?.id).toBe("b");
  });

  it("okuyucu kaynaklı paywall kapanışı hiçbir kuralı tetiklemez", () => {
    const cascade = rule({ id: "cascade", trigger: "paywall_closed", conditions: [] });
    for (const source of ["word_quota", "word_quota_badge", "sentence_quota", "reader_listen"]) {
      expect(pickRule("paywall_closed", [cascade], ctx({ source }), base)).toBeNull();
    }
    expect(pickRule("paywall_closed", [cascade], ctx({ source: "audio" }), base)?.id).toBe(
      "cascade",
    );
  });

  it("ödeme sorunu varken indirim seçilmez", () => {
    expect(pickRule("app_open", [rule()], ctx({ billingIssue: true }), base)).toBeNull();
  });

  it("kalıcı holdout (ya da bilinmeyen atama) zamanlanmış teklif görmez, kart görür", () => {
    const sale = rule({ id: "sale" });
    const downsell = rule({ id: "down", presentation: "sheet", action: { kind: "downsell" } });
    const card = rule({
      id: "card",
      presentation: "card",
      exemptGlobalCooldown: true,
      action: { kind: "trial_card" },
    });
    for (const inHoldout of [true, null]) {
      expect(pickRule("app_open", [sale, downsell], ctx({ inHoldout }), base)).toBeNull();
      expect(pickRule("app_open", [card], ctx({ inHoldout }), base)?.id).toBe("card");
    }
  });

  it("ilk gün koruması: kurulum günü (ya da kurulum anı bilinmiyorsa) tam ekran yok", () => {
    expect(pickRule("app_open", [rule()], ctx({ daysSinceInstall: 0 }), base)).toBeNull();
    expect(pickRule("app_open", [rule()], ctx({ daysSinceInstall: null }), base)).toBeNull();
    const sheet = rule({
      presentation: "sheet",
      action: { kind: "downsell" },
      exemptGlobalCooldown: true,
    });
    expect(pickRule("app_open", [sheet], ctx({ daysSinceInstall: 0 }), base)).not.toBeNull();
  });

  it("tam ekran: oturumda bir tane ve aralarında 20 saat", () => {
    expect(
      pickRule("app_open", [rule()], ctx(), { ...base, fullscreenShownThisSession: true }),
    ).toBeNull();
    expect(
      pickRule("app_open", [rule()], ctx({ hoursSinceLastFullscreen: 19.9 }), base),
    ).toBeNull();
    expect(
      pickRule("app_open", [rule()], ctx({ hoursSinceLastFullscreen: 20 }), base),
    ).not.toBeNull();
    const exempt = rule({ exemptGlobalCooldown: true });
    expect(
      pickRule("app_open", [exempt], ctx({ hoursSinceLastFullscreen: 1 }), {
        ...base,
        fullscreenShownThisSession: true,
      }),
    ).not.toBeNull();
  });

  it("başka bir diyalog açıkken hiçbir şey seçilmez", () => {
    expect(pickRule("app_open", [rule()], ctx(), { ...base, dialogOpen: true })).toBeNull();
  });

  it("ömür boyu sınır ve cooldown", () => {
    const once = rule({ id: "once", maxShows: 1 });
    expect(
      pickRule("app_open", [once], ctx(), {
        ...base,
        history: { once: { shows: 1, lastShownAt: NOW - 1000 * HOUR } },
      }),
    ).toBeNull();

    const weekly = rule({ id: "weekly", cooldownHours: 168 });
    const shownAt = (hoursAgo: number) => ({
      weekly: { shows: 1, lastShownAt: NOW - hoursAgo * HOUR },
    });
    expect(pickRule("app_open", [weekly], ctx(), { ...base, history: shownAt(100) })).toBeNull();
    expect(pickRule("app_open", [weekly], ctx(), { ...base, history: shownAt(168) })?.id).toBe(
      "weekly",
    );
  });

  it("asgari sürüm", () => {
    expect(pickRule("app_open", [rule({ minAppVersion: "2.0.0" })], ctx(), base)).toBeNull();
  });
});
