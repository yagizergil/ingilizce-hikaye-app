import {
  cancelLossItems,
  normalizeCancelNote,
  retentionChoiceFor,
  supportUrlFrom,
} from "@/features/subscription/cancelFlow";
import { planLifecycleNotifications } from "@/features/subscription/lifecycleNotifications";
import { manageCopyFor } from "@/features/subscription/manageCopy";
import { statusBannerFor } from "@/features/subscription/statusBanner";
import { winbackSourceFor } from "@/features/subscription/winbackOffer";

import type { SubscriptionLifecycle } from "@/features/subscription/lifecycle";

const NOW = new Date("2026-10-31T12:00:00");
const DAY = 86_400_000;
const inDays = (days: number) => new Date(NOW.getTime() + days * DAY);

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

describe("iptal akışı (C11)", () => {
  const ctx = { hasPromotionalOffer: false, canSwitchToMonthly: false, hasSupportUrl: true };

  it("'pahalı': önce promotional, yoksa yıllıktan aylığa geçiş, yoksa yalnızca teşekkür", () => {
    expect(retentionChoiceFor("too_expensive", { ...ctx, hasPromotionalOffer: true })).toBe(
      "promotional",
    );
    expect(retentionChoiceFor("too_expensive", { ...ctx, canSwitchToMonthly: true })).toBe(
      "monthly_switch",
    );
    expect(retentionChoiceFor("too_expensive", ctx)).toBe("none");
  });

  it("diğer nedenler: hedef, destek (adres varsa), teşekkür", () => {
    expect(retentionChoiceFor("not_using", ctx)).toBe("goal");
    expect(retentionChoiceFor("technical", ctx)).toBe("support");
    expect(retentionChoiceFor("missing_content", { ...ctx, hasSupportUrl: false })).toBe("none");
    expect(retentionChoiceFor("other", ctx)).toBe("none");
  });

  it("kaybedilecekler yalnızca gerçek premium faydaları; kelime yoksa kelime satırı yok", () => {
    const keys = (n: number) =>
      cancelLossItems({ savedWordCount: n, savedWordLimit: 100, freeWordLookups: 10 }).map(
        (item) => item.key,
      );
    expect(keys(0)).toEqual(["audio", "lookups", "smartPractice", "quiz"]);
    expect(keys(42)).toContain("savedWords");
    const words = cancelLossItems({ savedWordCount: 42, savedWordLimit: 100, freeWordLookups: 10 });
    expect(words.find((item) => item.key === "savedWords")?.params).toEqual({
      count: 42,
      limit: 100,
    });
  });

  it("not kırpılır ve boşsa null", () => {
    expect(normalizeCancelNote("   ")).toBeNull();
    expect(normalizeCancelNote(" pahalı ")).toBe("pahalı");
    expect(normalizeCancelNote("x".repeat(2000))?.length).toBe(1000);
  });

  it("destek adresi gizlilik sayfasının yanından türetilir", () => {
    expect(supportUrlFrom("https://example.github.io/app/privacy.html")).toBe(
      "https://example.github.io/app/support.html",
    );
    expect(supportUrlFrom("")).toBeNull();
    expect(supportUrlFrom("http://insecure/privacy.html")).toBeNull();
  });
});

describe("yaşam döngüsü bildirimleri (ADR-010, yerel)", () => {
  it("iptal edilmiş abone: bitişe 3 gün kala ve bitişten 24 saat sonra, gündüz saatinde", () => {
    const end = new Date(inDays(10).setHours(14, 0, 0, 0));
    const plan = planLifecycleNotifications(
      lifecycle({ status: "cancelled", expiresAt: end }),
      NOW,
    );
    expect(plan.endingAt?.getTime()).toBe(end.getTime() - 3 * DAY);
    expect(plan.winbackAt?.getTime()).toBe(end.getTime() + DAY);
  });

  it("denemede yalnızca winback planlanır (dönüşürse sonraki açılışta iptal)", () => {
    const end = new Date(inDays(5).setHours(14, 0, 0, 0));
    const plan = planLifecycleNotifications(lifecycle({ status: "trial", expiresAt: end }), NOW);
    expect(plan.endingAt).toBeNull();
    expect(plan.winbackAt?.getTime()).toBe(end.getTime() + DAY);
  });

  it("gece saatine düşen bildirim gündüze çekilir", () => {
    const end = new Date(inDays(10).setHours(23, 30, 0, 0));
    const plan = planLifecycleNotifications(
      lifecycle({ status: "cancelled", expiresAt: end }),
      NOW,
    );
    expect(plan.endingAt?.getHours()).toBe(20);
  });

  it("aktif, grace ya da bitmiş durumda plan boş (ikisi de iptal edilir)", () => {
    for (const status of ["active", "grace", "lapsed_paid"] as const) {
      expect(planLifecycleNotifications(lifecycle({ status, expiresAt: inDays(10) }), NOW)).toEqual(
        {
          endingAt: null,
          winbackAt: null,
        },
      );
    }
  });

  it("bitişe 3 günden az kaldıysa yalnızca winback", () => {
    const plan = planLifecycleNotifications(
      lifecycle({ status: "cancelled", expiresAt: new Date(NOW.getTime() + 2 * DAY) }),
      NOW,
    );
    expect(plan.endingAt).toBeNull();
    expect(plan.winbackAt).not.toBeNull();
  });
});

describe("ana sayfa durum kartı", () => {
  it("öncelik: ödeme sorunu > bitmek üzere > denemenin son günü", () => {
    expect(statusBannerFor(lifecycle({ status: "grace", graceEndsAt: inDays(5) }), NOW)?.kind).toBe(
      "grace",
    );
    expect(statusBannerFor(lifecycle({ status: "billing_retry" }), NOW)?.kind).toBe(
      "billing_retry",
    );
    expect(
      statusBannerFor(lifecycle({ status: "cancelled", expiresAt: inDays(2) }), NOW)?.kind,
    ).toBe("ending");
    expect(
      statusBannerFor(
        lifecycle({ status: "trial", expiresAt: new Date(NOW.getTime() + 3_600_000) }),
        NOW,
      )?.kind,
    ).toBe("trial_last_day");
  });

  it("uzak bitişte ve sağlıklı abonede kart yok", () => {
    expect(
      statusBannerFor(lifecycle({ status: "cancelled", expiresAt: inDays(20) }), NOW),
    ).toBeNull();
    expect(statusBannerFor(lifecycle({ status: "active", expiresAt: inDays(2) }), NOW)).toBeNull();
    expect(statusBannerFor(null, NOW)).toBeNull();
  });
});

describe("abonelik yönetimi içeriği", () => {
  it("her durumun bir eylemi var; iptal yalnızca yenilemesi açık abonede", () => {
    expect(manageCopyFor(lifecycle({ status: "active", expiresAt: inDays(5) })).actions[0]).toBe(
      "cancel",
    );
    expect(manageCopyFor(lifecycle({ status: "cancelled" })).actions).toEqual(["turnOnRenewal"]);
    expect(manageCopyFor(lifecycle({ status: "grace" })).actions[0]).toBe("fixPayment");
    expect(manageCopyFor(lifecycle({ status: "lapsed_trial", isPremium: false })).actions[0]).toBe(
      "winback",
    );
    expect(manageCopyFor(lifecycle({ status: "none", isPremium: false })).actions).toEqual([
      "goPremium",
    ]);
  });

  it("tarih bilinmiyorsa NoDate metni", () => {
    expect(manageCopyFor(lifecycle({ status: "active" })).detail).toBe("activeNoDate");
    expect(manageCopyFor(lifecycle({ status: "grace" })).detail).toBe("graceNoDate");
  });
});

describe("winback teklif kaynağı (IZLENECEK-YOL §3.2)", () => {
  it("ödemiş eski abone: mağaza teklifi, yoksa sale", () => {
    expect(
      winbackSourceFor({ status: "lapsed_paid", hasStoreOffer: true, hasSalePackage: true }),
    ).toBe("store_offer");
    expect(
      winbackSourceFor({ status: "lapsed_paid", hasStoreOffer: false, hasSalePackage: true }),
    ).toBe("sale");
  });

  it("yalnızca deneme kullanmış: yalnızca sale (mağaza teklifi uygun değil)", () => {
    expect(
      winbackSourceFor({ status: "lapsed_trial", hasStoreOffer: true, hasSalePackage: false }),
    ).toBe("none");
    expect(
      winbackSourceFor({ status: "lapsed_trial", hasStoreOffer: false, hasSalePackage: true }),
    ).toBe("sale");
  });

  it("teklif yoksa ya da kullanıcı eski abone değilse yalnızca bilgilendirme", () => {
    expect(
      winbackSourceFor({ status: "lapsed_paid", hasStoreOffer: false, hasSalePackage: false }),
    ).toBe("none");
    expect(winbackSourceFor({ status: "active", hasStoreOffer: true, hasSalePackage: true })).toBe(
      "none",
    );
  });
});
