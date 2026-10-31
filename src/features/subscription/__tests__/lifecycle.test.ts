import {
  BILLING_FIX_COOLDOWN_MS,
  decideAutoOpen,
  deriveLifecycle,
  GRACE_PERIOD_DAYS,
  isBillingRecovery,
  isPremiumRow,
  isTrialLastDay,
} from "@/features/subscription/lifecycle";

import type {
  EntitlementLifecycleRow,
  SubscriptionLifecycle,
} from "@/features/subscription/lifecycle";
import type { CustomerLifecycleSnapshot } from "@/lib/revenuecat";

const NOW = new Date("2026-10-31T12:00:00Z");
const DAY = 86_400_000;
const future = (days: number) => new Date(NOW.getTime() + days * DAY).toISOString();
const past = (days: number) => new Date(NOW.getTime() - days * DAY).toISOString();

function row(overrides: Partial<EntitlementLifecycleRow>): EntitlementLifecycleRow {
  return { tier: "free", expires_at: null, ...overrides };
}

function store(overrides: Partial<CustomerLifecycleSnapshot>): CustomerLifecycleSnapshot {
  return {
    isActive: true,
    willRenew: true,
    periodType: "NORMAL",
    expirationDate: future(10),
    billingIssueDetectedAt: null,
    unsubscribeDetectedAt: null,
    productIdentifier: "yearly",
    ...overrides,
  };
}

function lifecycle(overrides: Partial<SubscriptionLifecycle>): SubscriptionLifecycle {
  return {
    status: "active",
    isPremium: true,
    isTrial: false,
    expiresAt: null,
    graceEndsAt: null,
    billingIssueAt: null,
    expiredAt: null,
    productId: null,
    ...overrides,
  };
}

describe("deriveLifecycle", () => {
  it("premium kararı sunucudaki kuralla aynı: StoreKit premium AÇAMAZ", () => {
    expect(deriveLifecycle(row({ tier: "free" }), store({ isActive: true }), NOW).isPremium).toBe(
      false,
    );
    expect(isPremiumRow(row({ tier: "premium", expires_at: past(1) }), NOW)).toBe(false);
    expect(isPremiumRow(row({ tier: "premium", expires_at: future(1) }), NOW)).toBe(true);
  });

  it("hiç geçmişi olmayan kullanıcı 'none'", () => {
    expect(deriveLifecycle(null, null, NOW).status).toBe("none");
    expect(deriveLifecycle(row({}), null, NOW).status).toBe("none");
  });

  it("aktif ücretli / deneme / iptal edilmiş ayrımı", () => {
    const active = row({ tier: "premium", expires_at: future(20), will_renew: true });
    expect(deriveLifecycle(active, null, NOW).status).toBe("active");
    expect(deriveLifecycle({ ...active, is_trial: true }, null, NOW).status).toBe("trial");
    expect(deriveLifecycle({ ...active, will_renew: false }, null, NOW).status).toBe("cancelled");
  });

  it("StoreKit görüntüsü yenileme bilgisini sunucudan önce verir (webhook gecikmesi)", () => {
    const active = row({ tier: "premium", expires_at: future(20), will_renew: true });
    expect(deriveLifecycle(active, store({ willRenew: false }), NOW).status).toBe("cancelled");
  });

  it("premium + ödeme sorunu = grace; bitiş bilinmiyorsa 16 gün varsayılır", () => {
    const issue = past(2);
    const result = deriveLifecycle(
      row({ tier: "premium", expires_at: future(14), billing_issue_at: issue }),
      null,
      NOW,
    );
    expect(result.status).toBe("grace");
    expect(result.graceEndsAt?.getTime()).toBe(new Date(issue).getTime() + GRACE_PERIOD_DAYS * DAY);
  });

  it("sunucunun grace bitişi varsa o kullanılır", () => {
    const result = deriveLifecycle(
      row({
        tier: "premium",
        expires_at: future(5),
        billing_issue_at: past(1),
        grace_expires_at: future(5),
      }),
      null,
      NOW,
    );
    expect(result.graceEndsAt?.toISOString()).toBe(future(5));
  });

  it("ödeme hatasıyla bitmiş abonelik = billing_retry (60 gün içinde)", () => {
    const expired = row({
      tier: "free",
      expires_at: past(3),
      expired_at: past(3),
      expiration_reason: "BILLING_ERROR",
      had_paid: true,
    });
    expect(deriveLifecycle(expired, null, NOW).status).toBe("billing_retry");
    expect(
      deriveLifecycle({ ...expired, expired_at: past(61), expires_at: past(61) }, null, NOW).status,
    ).toBe("lapsed_paid");
  });

  it("StoreKit ödeme sorununu temizlediyse bayat sunucu izi billing_retry demez", () => {
    const expired = row({
      tier: "free",
      expired_at: past(3),
      expiration_reason: "BILLING_ERROR",
      billing_issue_at: past(10),
      had_paid: true,
    });
    const cleared = store({ isActive: false, billingIssueDetectedAt: null });
    expect(deriveLifecycle(expired, cleared, NOW).status).toBe("lapsed_paid");
  });

  it("ödemiş / yalnızca deneme kullanmış bitişler ayrışır", () => {
    expect(deriveLifecycle(row({ had_paid: true, expired_at: past(2) }), null, NOW).status).toBe(
      "lapsed_paid",
    );
    expect(deriveLifecycle(row({ trial_used: true, expired_at: past(2) }), null, NOW).status).toBe(
      "lapsed_trial",
    );
  });

  it("migration 100 öncesi satırda son olaydan çıkarım yapılır", () => {
    const legacy = row({ tier: "free", expires_at: past(2), product_id: "yearly", is_trial: true });
    expect(deriveLifecycle(legacy, null, NOW).status).toBe("lapsed_trial");
    expect(deriveLifecycle({ ...legacy, is_trial: false }, null, NOW).status).toBe("lapsed_paid");
    expect(deriveLifecycle(legacy, null, NOW).expiredAt?.toISOString()).toBe(past(2));
  });
});

describe("decideAutoOpen", () => {
  const empty = { billingFixShownAt: null, winbackShownFor: [] };
  const now = NOW.getTime();

  it("ödeme sorununda düzeltme ekranı, 24 saatte en fazla bir kez", () => {
    const grace = lifecycle({ status: "grace" });
    expect(decideAutoOpen(grace, empty, now)).toEqual({ kind: "billing_fix" });
    expect(decideAutoOpen(grace, { ...empty, billingFixShownAt: now - 1000 }, now)).toBeNull();
    expect(
      decideAutoOpen(grace, { ...empty, billingFixShownAt: now - BILLING_FIX_COOLDOWN_MS }, now),
    ).toEqual({ kind: "billing_fix" });
  });

  it("winback bitiş başına bir kez ve 30 günden eski bitişte hiç", () => {
    const expiredAt = new Date(now - 2 * DAY);
    const lapsed = lifecycle({ status: "lapsed_trial", isPremium: false, expiredAt });
    expect(decideAutoOpen(lapsed, empty, now)).toEqual({
      kind: "winback",
      key: expiredAt.toISOString(),
    });
    expect(
      decideAutoOpen(lapsed, { ...empty, winbackShownFor: [expiredAt.toISOString()] }, now),
    ).toBeNull();
    expect(
      decideAutoOpen({ ...lapsed, expiredAt: new Date(now - 31 * DAY) }, empty, now),
    ).toBeNull();
  });

  it("ödeme sorunu winback'ten önce gelir; aktif abonede hiçbir şey açılmaz", () => {
    expect(
      decideAutoOpen(lifecycle({ status: "billing_retry", isPremium: false }), empty, now),
    ).toEqual({ kind: "billing_fix" });
    expect(decideAutoOpen(lifecycle({ status: "active" }), empty, now)).toBeNull();
    expect(decideAutoOpen(lifecycle({ status: "cancelled" }), empty, now)).toBeNull();
    expect(decideAutoOpen(null, empty, now)).toBeNull();
  });
});

describe("isBillingRecovery / isTrialLastDay", () => {
  it("ödeme sorunundan sağlıklı premium'a dönüş algılanır", () => {
    expect(isBillingRecovery("grace", "active")).toBe(true);
    expect(isBillingRecovery("billing_retry", "cancelled")).toBe(true);
    expect(isBillingRecovery("active", "active")).toBe(false);
    expect(isBillingRecovery("grace", "lapsed_paid")).toBe(false);
  });

  it("denemenin son 24 saati; iptal edilmiş denemede değil", () => {
    const soon = new Date(NOW.getTime() + 10 * 3_600_000);
    const later = new Date(NOW.getTime() + 2 * DAY);
    expect(isTrialLastDay(lifecycle({ status: "trial", expiresAt: soon }), NOW)).toBe(true);
    expect(isTrialLastDay(lifecycle({ status: "trial", expiresAt: later }), NOW)).toBe(false);
    expect(isTrialLastDay(lifecycle({ status: "cancelled", expiresAt: soon }), NOW)).toBe(false);
  });
});
