import {
  entitlementSnapshot,
  syncEventId,
} from "../../../../supabase/functions/sync-entitlement/snapshot";

const NOW = Date.parse("2026-10-31T12:00:00Z");
const PRODUCT = "com.ingilizcehikaye.app.premium.monthly";

describe("entitlementSnapshot", () => {
  it("premium yoksa hiçbir şey yazılmaz", () => {
    expect(entitlementSnapshot({}, NOW)).toEqual({ kind: "none" });
  });

  it("süresi dolmuş yetki yazılmaz", () => {
    expect(
      entitlementSnapshot(
        { entitlements: { premium: { expires_date: "2026-10-30T00:00:00Z" } } },
        NOW,
      ),
    ).toEqual({ kind: "none" });
  });

  it("bitişsiz yetki süresiz premium olarak YAZILMAZ (G3)", () => {
    expect(
      entitlementSnapshot(
        { entitlements: { premium: { expires_date: null, product_identifier: PRODUCT } } },
        NOW,
      ),
    ).toEqual({ kind: "no_expiration", productId: PRODUCT });
  });

  it("olay zamanı onarım anı değil, satın alma zamanı (G3)", () => {
    const snapshot = entitlementSnapshot(
      {
        entitlements: {
          premium: {
            expires_date: "2026-11-30T10:00:00Z",
            purchase_date: "2026-10-30T10:00:00Z",
            product_identifier: PRODUCT,
          },
        },
        subscriptions: {
          [PRODUCT]: { store: "app_store", period_type: "trial", is_sandbox: false },
        },
      },
      NOW,
    );
    expect(snapshot).toEqual({
      kind: "active",
      expiresAt: "2026-11-30T10:00:00Z",
      productId: PRODUCT,
      store: "app_store",
      isTrial: true,
      environment: "PRODUCTION",
      eventMs: Date.parse("2026-10-30T10:00:00Z"),
    });
  });

  it("sandbox aboneliği işaretlenir", () => {
    const snapshot = entitlementSnapshot(
      {
        entitlements: {
          premium: { expires_date: "2026-11-30T10:00:00Z", product_identifier: PRODUCT },
        },
        subscriptions: { [PRODUCT]: { is_sandbox: true } },
      },
      NOW,
    );
    expect(snapshot).toMatchObject({ kind: "active", environment: "SANDBOX" });
  });

  it("satın alma zamanı yoksa ya da gelecekteyse onarım anına sınırlanır", () => {
    const missing = entitlementSnapshot(
      { entitlements: { premium: { expires_date: "2026-11-30T10:00:00Z" } } },
      NOW,
    );
    expect(missing).toMatchObject({ kind: "active", eventMs: NOW, environment: null });

    const future = entitlementSnapshot(
      {
        entitlements: {
          premium: {
            expires_date: "2026-11-30T10:00:00Z",
            purchase_date: "2026-11-01T00:00:00Z",
          },
        },
      },
      NOW,
    );
    expect(future).toMatchObject({ eventMs: NOW });
  });
});

describe("syncEventId", () => {
  it("aynı durum aynı kimliği üretir (idempotans)", () => {
    const subscriber = {
      entitlements: {
        premium: { expires_date: "2026-11-30T10:00:00Z", product_identifier: PRODUCT },
      },
    };
    const a = entitlementSnapshot(subscriber, NOW);
    const b = entitlementSnapshot(subscriber, NOW + 5000);
    if (a.kind !== "active" || b.kind !== "active") throw new Error("expected active");
    expect(syncEventId("u", a)).toBe(syncEventId("u", b));
    expect(syncEventId("u", a)).toBe(`sync:u:${PRODUCT}:2026-11-30T10:00:00Z`);
  });
});
