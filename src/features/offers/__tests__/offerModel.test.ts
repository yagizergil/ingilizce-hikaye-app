import {
  offerReminderFireAt,
  periodOf,
  remainingUntil,
  resolveDownsellPackage,
  resolveSaleOffer,
} from "@/features/offers/offerModel";

import type { PurchasesPackage } from "react-native-purchases";

function pkg(
  identifier: string,
  packageType: string,
  productId: string,
  price: number,
  subscriptionPeriod: string | null = packageType === "MONTHLY" ? "P1M" : "P1Y",
): PurchasesPackage {
  return {
    identifier,
    packageType,
    product: { identifier: productId, price, priceString: `₺${price}`, subscriptionPeriod },
  } as unknown as PurchasesPackage;
}

const annual = pkg("$rc_annual", "ANNUAL", "premium.yearly", 599);
const monthly = pkg("$rc_monthly", "MONTHLY", "premium.monthly", 99);
const saleAnnual = pkg("sale_annual", "CUSTOM", "premium.yearly.sale", 299);
const current = [annual, monthly];

describe("resolveSaleOffer", () => {
  it("offering tanımsızsa null (normal paywall'a düş)", () => {
    expect(resolveSaleOffer(null, current)).toBeNull();
    expect(resolveSaleOffer([], current)).toBeNull();
  });

  it("çapa + indirimli paketten gerçek yüzdeyi hesaplar", () => {
    const offer = resolveSaleOffer([annual, saleAnnual], current);
    expect(offer?.anchor.identifier).toBe("$rc_annual");
    expect(offer?.sale.identifier).toBe("sale_annual");
    expect(offer?.percent).toBe(50); // floor((1 - 299/599) * 100)
  });

  it("offering'de çapa yoksa güncel teklifin yıllığı çapa olur", () => {
    expect(resolveSaleOffer([saleAnnual], current)?.anchor.identifier).toBe("$rc_annual");
  });

  it("indirim gerçek değilse teklif yok", () => {
    const same = pkg("sale_annual", "CUSTOM", "premium.yearly.sale", 599);
    expect(resolveSaleOffer([annual, same], current)).toBeNull();
    // Dönem farklıysa (aylığı yıllıkla kıyaslamak) sahte yüzde üretmez.
    const monthlySale = pkg("sale_m", "CUSTOM", "premium.monthly.sale", 49, "P1M");
    expect(resolveSaleOffer([monthlySale], current)).toBeNull();
    // Yalnızca normal ürünler varsa (yanlış kurulmuş offering).
    expect(resolveSaleOffer([annual, monthly], current)).toBeNull();
  });

  it("dönemi paket türünden de okur", () => {
    expect(periodOf(pkg("x", "ANNUAL", "y", 1, null))).toBe("year");
  });
});

describe("resolveDownsellPackage", () => {
  it("önce offering'deki tür, yoksa varsayılandaki, yoksa null", () => {
    const special = pkg("downsell_monthly", "MONTHLY", "premium.monthly", 99);
    expect(resolveDownsellPackage([special], current, "MONTHLY")?.identifier).toBe(
      "downsell_monthly",
    );
    expect(resolveDownsellPackage(null, current, "MONTHLY")?.identifier).toBe("$rc_monthly");
    expect(resolveDownsellPackage(null, [annual], "MONTHLY")).toBeNull();
  });
});

describe("zaman", () => {
  const HOUR = 60 * 60 * 1000;
  it("kalan süre aşağı yuvarlanır ve negatife düşmez", () => {
    expect(remainingUntil(10 * HOUR + 61_000, 0)).toEqual({
      hours: 10,
      minutes: 1,
      expired: false,
    });
    expect(remainingUntil(0, 5)).toEqual({ hours: 0, minutes: 0, expired: true });
  });

  it("hatırlatma bitişten N saat önce; bir saatten yakınsa planlanmaz", () => {
    expect(offerReminderFireAt(48 * HOUR, 6, 0)?.getTime()).toBe(42 * HOUR);
    expect(offerReminderFireAt(6.5 * HOUR, 6, 0)).toBeNull();
    expect(offerReminderFireAt(48 * HOUR, undefined, 0)).toBeNull();
  });
});
