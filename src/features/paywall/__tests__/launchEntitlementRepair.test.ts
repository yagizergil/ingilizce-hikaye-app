import { shouldRepairEntitlementOnLaunch } from "@/features/paywall/api/launchEntitlementRepair";

describe("shouldRepairEntitlementOnLaunch", () => {
  it("mağaza premium, sunucu free -> onar (kaçan webhook)", () => {
    expect(shouldRepairEntitlementOnLaunch({ serverPremium: false, storePremium: true })).toBe(
      true,
    );
  });

  it("sunucu premium, mağaza değil -> onarım yok (yetkiyi yalnızca EXPIRATION alır)", () => {
    expect(shouldRepairEntitlementOnLaunch({ serverPremium: true, storePremium: false })).toBe(
      false,
    );
  });

  it("sunucu durumu bilinmiyorsa karar verilmez", () => {
    expect(shouldRepairEntitlementOnLaunch({ serverPremium: undefined, storePremium: true })).toBe(
      false,
    );
  });

  it("ikisi de free -> bir şey yapılmaz", () => {
    expect(shouldRepairEntitlementOnLaunch({ serverPremium: false, storePremium: false })).toBe(
      false,
    );
  });
});
