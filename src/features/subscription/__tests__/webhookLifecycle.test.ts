import { readFileSync } from "fs";
import { join } from "path";

import { lifecyclePatchFor } from "../../../../supabase/functions/revenuecat-webhook/lifecycle";

/**
 * revenuecat-webhook'un yaşam döngüsü eşlemesi (migration 100). Saf modül;
 * yetki (tier/expires_at) kararına DOKUNMUYOR -- o index.ts'te değişmeden.
 */
const NOW = Date.UTC(2026, 9, 31, 12, 0, 0);
const EVENT_MS = Date.UTC(2026, 9, 30, 8, 0, 0);
const iso = (ms: number) => new Date(ms).toISOString();

describe("lifecyclePatchFor", () => {
  it("BILLING_ISSUE ödeme sorununu ve grace bitişini yazar", () => {
    const grace = EVENT_MS + 16 * 86_400_000;
    const patch = lifecyclePatchFor(
      { type: "BILLING_ISSUE", event_timestamp_ms: EVENT_MS, grace_period_expiration_at_ms: grace },
      NOW,
    );
    expect(patch).toEqual({ billing_issue_at: iso(EVENT_MS), grace_expires_at: iso(grace) });
  });

  it("RENEWAL ödeme sorununu ve iptal izini temizler, ödemiş sayar", () => {
    const patch = lifecyclePatchFor({ type: "RENEWAL", period_type: "NORMAL" }, NOW);
    expect(patch).toMatchObject({
      will_renew: true,
      billing_issue_at: null,
      grace_expires_at: null,
      cancelled_at: null,
      expiration_reason: null,
      had_paid: true,
    });
  });

  it("deneme INITIAL_PURCHASE'ı deneme kullanıldı sayar ama ödemiş saymaz", () => {
    const patch = lifecyclePatchFor({ type: "INITIAL_PURCHASE", period_type: "TRIAL" }, NOW);
    expect(patch).toMatchObject({ trial_used: true, will_renew: true, period_type: "TRIAL" });
    expect(patch).not.toHaveProperty("had_paid");
  });

  it("ücretli INITIAL_PURCHASE ödemiş sayar", () => {
    expect(
      lifecyclePatchFor({ type: "INITIAL_PURCHASE", period_type: "NORMAL" }, NOW),
    ).toMatchObject({ had_paid: true });
  });

  it("CANCELLATION yenilemeyi kapatır ve nedeni yazar; UNCANCELLATION geri açar", () => {
    expect(
      lifecyclePatchFor(
        { type: "CANCELLATION", event_timestamp_ms: EVENT_MS, cancel_reason: "UNSUBSCRIBE" },
        NOW,
      ),
    ).toEqual({ will_renew: false, cancelled_at: iso(EVENT_MS), cancel_reason: "UNSUBSCRIBE" });
    expect(lifecyclePatchFor({ type: "UNCANCELLATION" }, NOW)).toEqual({
      will_renew: true,
      cancelled_at: null,
      cancel_reason: null,
    });
  });

  it("BILLING_ERROR ile biten abonelikte ödeme sorunu izi korunur (billing retry)", () => {
    const patch = lifecyclePatchFor(
      { type: "EXPIRATION", expiration_reason: "BILLING_ERROR", expiration_at_ms: EVENT_MS },
      NOW,
    );
    expect(patch).toMatchObject({
      will_renew: false,
      expired_at: iso(EVENT_MS),
      expiration_reason: "BILLING_ERROR",
    });
    expect(patch).not.toHaveProperty("billing_issue_at");
  });

  it("normal EXPIRATION ödeme sorunu izini temizler; denemedeyse deneme kullanıldı", () => {
    const patch = lifecyclePatchFor(
      { type: "EXPIRATION", expiration_reason: "UNSUBSCRIBE", period_type: "TRIAL" },
      NOW,
    );
    expect(patch).toMatchObject({ billing_issue_at: null, trial_used: true });
    expect(patch?.expired_at).toBe(iso(NOW));
  });

  it("ilgisiz olaylarda null döner (fonksiyon çağrılmaz)", () => {
    for (const type of ["TEST", "SUBSCRIBER_ALIAS", "TRANSFER", "PRODUCT_CHANGE", undefined]) {
      expect(lifecyclePatchFor({ type }, NOW)).toBeNull();
    }
  });

  it("üretilen her anahtarı migration 100'deki SQL fonksiyonu tanıyor", () => {
    const sql = readFileSync(
      join(
        __dirname,
        "../../../../supabase/migrations/20261031100000_100_subscription_lifecycle.sql",
      ),
      "utf8",
    );
    const samples = [
      { type: "INITIAL_PURCHASE", period_type: "TRIAL" },
      { type: "INITIAL_PURCHASE", period_type: "NORMAL" },
      { type: "RENEWAL" },
      { type: "UNCANCELLATION" },
      { type: "CANCELLATION" },
      { type: "BILLING_ISSUE" },
      { type: "EXPIRATION", period_type: "TRIAL" },
      { type: "SUBSCRIPTION_PAUSED" },
      { type: "NON_RENEWING_PURCHASE" },
    ];
    const keys = new Set<string>();
    for (const sample of samples) {
      Object.keys(lifecyclePatchFor(sample, NOW) ?? {}).forEach((key) => keys.add(key));
    }
    const unknown = [...keys].filter(
      (key) => !sql.includes(`p_patch ? '${key}'`) && !sql.includes(`p_patch->>'${key}'`),
    );
    expect(unknown).toEqual([]);
  });
});
