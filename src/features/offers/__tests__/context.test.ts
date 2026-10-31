import {
  buildRuleContext,
  daysSince,
  hoursToNextCalendarSale,
  isInHoldout,
  mergeHistory,
  parseServerContext,
} from "@/features/offers/rules/context";

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;
const NOW = 1_800_000_000_000;

describe("mergeHistory", () => {
  it("gösterim sayısının büyüğünü, son gösterimin sonuncusunu alır", () => {
    const merged = mergeHistory(
      { a: { shows: 2, lastShownAt: 100 }, b: { shows: 1, lastShownAt: 50 } },
      { a: { shows: 1, lastShownAt: 300 }, c: { shows: 4, lastShownAt: null } },
    );
    expect(merged).toEqual({
      a: { shows: 2, lastShownAt: 300 },
      b: { shows: 1, lastShownAt: 50 },
      c: { shows: 4, lastShownAt: null },
    });
  });
});

describe("gün hesapları", () => {
  it("daysSince tam gün, bilinmiyorsa null", () => {
    expect(daysSince(NOW - 2.9 * DAY, NOW)).toBe(2);
    expect(daysSince(null, NOW)).toBeNull();
  });

  it("D2'ye kalan saat yalnızca ilk iki günde anlamlı", () => {
    expect(hoursToNextCalendarSale(NOW - 1.5 * DAY, NOW)).toBeCloseTo(12);
    expect(hoursToNextCalendarSale(NOW - 3 * DAY, NOW)).toBeGreaterThan(1000);
    expect(hoursToNextCalendarSale(null, NOW)).toBeGreaterThan(1000);
  });
});

describe("holdout", () => {
  it("kova < 10 holdout, bilinmiyorsa null", () => {
    expect(isInHoldout(0)).toBe(true);
    expect(isInHoldout(9)).toBe(true);
    expect(isInHoldout(10)).toBe(false);
    expect(isInHoldout(null)).toBeNull();
  });
});

describe("parseServerContext", () => {
  it("RPC yanıtını çevirir", () => {
    const parsed = parseServerContext({
      install_at: "2026-10-01T00:00:00Z",
      ever_subscribed: true,
      read_sessions_24h: 3,
      user_bucket: 42,
      holdout_bucket: 7,
      impressions: [{ rule_id: "sale_d2", shows: 1, last_shown_at: "2026-10-03T00:00:00Z" }],
      last_fullscreen_at: null,
      last_sale_at: "2026-10-03T00:00:00Z",
    });
    expect(parsed?.installAt).toBe(Date.parse("2026-10-01T00:00:00Z"));
    expect(parsed?.everSubscribed).toBe(true);
    expect(parsed?.holdoutBucket).toBe(7);
    expect(parsed?.history.sale_d2?.shows).toBe(1);
    expect(parsed?.lastFullscreenAt).toBeNull();
  });

  it("şekli tutmayan yanıtta null", () => {
    expect(parseServerContext(null)).toBeNull();
    expect(parseServerContext([1])).toBeNull();
  });
});

describe("buildRuleContext", () => {
  it("yerel ve sunucu son gösterimlerinden yeniyi kullanır", () => {
    const { context } = buildRuleContext({
      now: NOW,
      isPremium: false,
      trialEligible: true,
      firstChapterFinished: false,
      server: {
        installAt: NOW - 5 * DAY,
        everSubscribed: false,
        readSessions24h: 0,
        userBucket: 1,
        holdoutBucket: 50,
        history: {},
        lastFullscreenAt: NOW - 30 * HOUR,
        lastSaleAt: null,
      },
      local: { history: {}, lastFullscreenAt: NOW - 2 * HOUR, lastSaleAt: NOW - 4 * HOUR },
      source: "audio",
    });
    expect(context.daysSinceInstall).toBe(5);
    expect(context.hoursSinceLastFullscreen).toBeCloseTo(2);
    expect(context.hoursSinceLastSale).toBeCloseTo(4);
    expect(context.inHoldout).toBe(false);
    expect(context.source).toBe("audio");
  });

  it("sunucu bağlamı yoksa bilinmeyenler null", () => {
    const { context } = buildRuleContext({
      now: NOW,
      isPremium: false,
      trialEligible: false,
      firstChapterFinished: false,
      server: null,
      local: { history: {}, lastFullscreenAt: null, lastSaleAt: null },
    });
    expect(context.daysSinceInstall).toBeNull();
    expect(context.everSubscribed).toBeNull();
    expect(context.inHoldout).toBeNull();
  });
});
