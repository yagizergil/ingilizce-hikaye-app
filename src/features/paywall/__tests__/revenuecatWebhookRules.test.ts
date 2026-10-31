import {
  decideEntitlementWrite,
  eventTimestampMs,
  normalizeEnvironment,
  resolveUserId,
  secretsMatch,
  touchesPremium,
} from "../../../../supabase/functions/revenuecat-webhook/rules";

const NOW = Date.parse("2026-10-31T12:00:00Z");
const USER = "0f8fad5b-d9cb-469f-a165-70867728950e";

describe("decideEntitlementWrite", () => {
  it("geçerli bitişli yenileme premium yazar", () => {
    const expiresAtMs = NOW + 30 * 86_400_000;
    expect(decideEntitlementWrite({ type: "RENEWAL", expiration_at_ms: expiresAtMs }, NOW)).toEqual(
      { action: "apply", tier: "premium", expiresAtMs },
    );
  });

  it("EXPIRATION ve SUBSCRIPTION_PAUSED free yazar", () => {
    for (const type of ["EXPIRATION", "SUBSCRIPTION_PAUSED"]) {
      const decision = decideEntitlementWrite({ type, expiration_at_ms: NOW - 1 }, NOW);
      expect(decision).toMatchObject({ action: "apply", tier: "free" });
    }
  });

  it("geç teslim edilmiş, süresi dolmuş yenileme yetki vermez", () => {
    expect(
      decideEntitlementWrite({ type: "RENEWAL", expiration_at_ms: NOW - 1000 }, NOW),
    ).toMatchObject({ action: "apply", tier: "free" });
  });

  it("CANCELLATION ve BILLING_ISSUE dönem sonuna kadar premium bırakır", () => {
    for (const type of ["CANCELLATION", "BILLING_ISSUE"]) {
      expect(
        decideEntitlementWrite({ type, expiration_at_ms: NOW + 86_400_000 }, NOW),
      ).toMatchObject({ action: "apply", tier: "premium" });
    }
  });

  it("bitişsiz premium olay yazılmaz (süresiz premium yok)", () => {
    expect(decideEntitlementWrite({ type: "INITIAL_PURCHASE" }, NOW)).toEqual({
      action: "ignore",
      reason: "no_expiration",
    });
  });

  it("bitişsiz EXPIRATION yine free yazar", () => {
    expect(decideEntitlementWrite({ type: "EXPIRATION" }, NOW)).toEqual({
      action: "apply",
      tier: "free",
      expiresAtMs: null,
    });
  });
});

describe("normalizeEnvironment", () => {
  it("bilinen değerleri büyük harfe çevirir", () => {
    expect(normalizeEnvironment("SANDBOX")).toBe("SANDBOX");
    expect(normalizeEnvironment(" production ")).toBe("PRODUCTION");
  });

  it("bilinmeyeni null yapar (SANDBOX sanılıp gerçek ödeme düşmesin)", () => {
    expect(normalizeEnvironment(undefined)).toBeNull();
    expect(normalizeEnvironment("staging")).toBeNull();
    expect(normalizeEnvironment(42)).toBeNull();
  });
});

describe("eventTimestampMs", () => {
  it("sayı değilse null", () => {
    expect(eventTimestampMs({ event_timestamp_ms: 123 })).toBe(123);
    expect(eventTimestampMs({ event_timestamp_ms: null })).toBeNull();
    expect(eventTimestampMs({})).toBeNull();
  });
});

describe("resolveUserId", () => {
  it("anonim RevenueCat kimliğinde takma addaki uuid'yi bulur", () => {
    expect(
      resolveUserId({ app_user_id: "$RCAnonymousID:abc", aliases: [USER.toUpperCase()] }),
    ).toBe(USER);
  });

  it("uuid yoksa null", () => {
    expect(resolveUserId({ app_user_id: "$RCAnonymousID:abc" })).toBeNull();
  });
});

describe("touchesPremium", () => {
  it("başka yetkiye ait olayı ayırır, yetki alanı yoksa premium sayar", () => {
    expect(touchesPremium({ entitlement_ids: ["premium"] })).toBe(true);
    expect(touchesPremium({ entitlement_ids: ["pro"] })).toBe(false);
    expect(touchesPremium({})).toBe(true);
  });
});

describe("secretsMatch", () => {
  it("yalnızca birebir aynı sırrı kabul eder", () => {
    expect(secretsMatch("abc", "abc")).toBe(true);
    expect(secretsMatch("abc", "abd")).toBe(false);
    expect(secretsMatch("abc", "abcd")).toBe(false);
  });
});
