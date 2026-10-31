import { deriveSaleOfferState } from "@/features/offers/hooks/useSaleOffer";

import type { PurchasesPackage } from "react-native-purchases";
import type { Rule } from "@/features/offers/types";

jest.mock("@/lib/supabase", () => ({ supabase: {} }));
jest.mock("@/lib/revenuecat", () => ({
  isPurchasesAvailable: true,
  fetchNamedOffering: jest.fn(),
}));
jest.mock("@/lib/notifications", () => ({}));
jest.mock("@/lib/analytics", () => ({ trackError: jest.fn(), trackEvent: jest.fn() }));

function pkg(identifier: string, packageType: string, productId: string, price: number) {
  return {
    identifier,
    packageType,
    product: { identifier: productId, price, priceString: `₺${price}`, subscriptionPeriod: "P1Y" },
  } as unknown as PurchasesPackage;
}

const rule: Rule = {
  id: "sale_d2",
  trigger: "app_open",
  presentation: "fullscreen",
  rank: 11,
  conditions: [],
  action: { kind: "sale", offering_id: "sale" },
  cooldownHours: null,
  maxShows: 1,
  exemptGlobalCooldown: false,
  minAppVersion: null,
};

const annual = pkg("$rc_annual", "ANNUAL", "premium.yearly", 599);
const base = { rulesLoaded: true, rule, purchasesAvailable: true, offeringError: false };

describe("deriveSaleOfferState -- sessiz geri düşüş", () => {
  it("App Store'da indirimli ürün / RevenueCat'te offering yoksa normal paywall'a düşer", () => {
    const state = deriveSaleOfferState({
      ...base,
      offering: { requested: null, current: [annual] },
    });
    expect(state).toEqual({ status: "fallback", reason: "no_offering", trigger: "app_open" });
  });

  it("mağaza hatası ve Expo Go da sessiz geri düşüş", () => {
    expect(deriveSaleOfferState({ ...base, offeringError: true, offering: undefined }).status).toBe(
      "fallback",
    );
    expect(
      deriveSaleOfferState({ ...base, purchasesAvailable: false, offering: undefined }).status,
    ).toBe("fallback");
  });

  it("kural yoksa ya da indirim kuralı değilse kapanır", () => {
    expect(deriveSaleOfferState({ ...base, rule: null, offering: undefined }).status).toBe(
      "missing_rule",
    );
  });

  it("gerçek indirim varsa hazır", () => {
    const sale = pkg("sale_annual", "CUSTOM", "premium.yearly.sale", 399);
    const state = deriveSaleOfferState({
      ...base,
      offering: { requested: [annual, sale], current: [annual] },
    });
    expect(state.status).toBe("ready");
    if (state.status === "ready") {
      expect(state.offer.percent).toBe(33);
      expect(state.offeringId).toBe("sale");
    }
  });
});
