import { buildPlanOptions, computeSavingsPercent, readTrial } from "@/features/paywall/planModel";

import type { PurchasesPackage } from "react-native-purchases";

/**
 * `react-native-purchases` CALISMA ZAMANINDA import EDILMIYOR -- native
 * modul Jest ortaminda (ve Expo Go'da) yok. planModel de ayni sebeple
 * yalnizca tip importu kullaniyor; PACKAGE_TYPE enum'unun degerleri zaten
 * bu string sabitler.
 */
const PACKAGE_TYPE = { ANNUAL: "ANNUAL", MONTHLY: "MONTHLY", CUSTOM: "CUSTOM" } as const;
type PackageTypeValue = (typeof PACKAGE_TYPE)[keyof typeof PACKAGE_TYPE];

/**
 * Plan seçicinin saf mantığının testleri.
 *
 * NEDEN BU TESTLER VAR: bu dosyadaki hesaplar doğrudan kullanıcıya
 * gösterilen fiyat iddialarına dönüşüyor — "%58 tasarruf", "ayda ₺33,33",
 * "7 gün ücretsiz". Yanlış bir hesap yalnızca çirkin bir arayüz değil,
 * yanıltıcı fiyat gösterimidir (App Store Guideline 3.1.2).
 */

type IntroPrice = NonNullable<PurchasesPackage["product"]["introPrice"]>;

function makePackage(overrides: {
  identifier: string;
  packageType: PackageTypeValue;
  price: number;
  priceString?: string;
  pricePerMonth?: number | null;
  pricePerMonthString?: string | null;
  introPrice?: Partial<IntroPrice> | null;
}): PurchasesPackage {
  const intro = overrides.introPrice
    ? ({
        price: 0,
        priceString: "₺0,00",
        cycles: 1,
        period: "P1W",
        periodUnit: "WEEK",
        periodNumberOfUnits: 1,
        ...overrides.introPrice,
      } as IntroPrice)
    : null;

  return {
    identifier: overrides.identifier,
    packageType: overrides.packageType,
    offeringIdentifier: "default",
    product: {
      identifier: `${overrides.identifier}_product`,
      title: overrides.identifier,
      price: overrides.price,
      priceString: overrides.priceString ?? `₺${overrides.price}`,
      pricePerMonth: overrides.pricePerMonth ?? null,
      pricePerMonthString: overrides.pricePerMonthString ?? null,
      introPrice: intro,
    },
  } as unknown as PurchasesPackage;
}

const annual = makePackage({
  identifier: "$rc_annual",
  packageType: PACKAGE_TYPE.ANNUAL,
  price: 399.99,
  priceString: "₺399,99",
  pricePerMonth: 33.33,
  pricePerMonthString: "₺33,33",
  introPrice: { periodUnit: "DAY", periodNumberOfUnits: 7, period: "P7D" },
});

const monthly = makePackage({
  identifier: "$rc_monthly",
  packageType: PACKAGE_TYPE.MONTHLY,
  price: 79.99,
  priceString: "₺79,99",
  pricePerMonth: 79.99,
  pricePerMonthString: "₺79,99",
});

describe("computeSavingsPercent", () => {
  it("yıllığın aylığa göre tasarrufunu aşağı yuvarlayarak hesaplar", () => {
    // 1 - (33,33 / 79,99) = %58,3 -> aşağı yuvarlanınca 58.
    expect(computeSavingsPercent(annual, monthly)).toBe(58);
  });

  it("aşağı yuvarlar: gerçekte olduğundan büyük bir tasarruf iddia etmez", () => {
    const almostHalf = makePackage({
      identifier: "annual2",
      packageType: PACKAGE_TYPE.ANNUAL,
      price: 480,
      pricePerMonth: 40.4,
    });
    const hundred = makePackage({
      identifier: "monthly2",
      packageType: PACKAGE_TYPE.MONTHLY,
      price: 100,
    });
    // Gerçek oran %59,6; yukarı yuvarlansaydı %60 denirdi.
    expect(computeSavingsPercent(almostHalf, hundred)).toBe(59);
  });

  it("yıllık aylıktan pahalıysa tasarruf iddia etmez", () => {
    const badAnnual = makePackage({
      identifier: "annual3",
      packageType: PACKAGE_TYPE.ANNUAL,
      price: 1200,
      pricePerMonth: 100,
    });
    expect(computeSavingsPercent(badAnnual, monthly)).toBeNull();
  });

  it("aylık eşdeğer fiyat yoksa (RevenueCat null döndüyse) null döner", () => {
    const noPerMonth = makePackage({
      identifier: "annual4",
      packageType: PACKAGE_TYPE.ANNUAL,
      price: 399.99,
      pricePerMonth: null,
    });
    expect(computeSavingsPercent(noPerMonth, monthly)).toBeNull();
  });
});

describe("readTrial", () => {
  it("gün cinsinden denemeyi okur", () => {
    expect(readTrial(annual)).toEqual({ days: 7 });
  });

  it("hafta cinsinden denemeyi güne çevirir", () => {
    const weekly = makePackage({
      identifier: "w",
      packageType: PACKAGE_TYPE.ANNUAL,
      price: 399,
      introPrice: { periodUnit: "WEEK", periodNumberOfUnits: 2, period: "P2W" },
    });
    expect(readTrial(weekly)).toEqual({ days: 14 });
  });

  it("ÜCRETLİ bir giriş fiyatını deneme saymaz", () => {
    // İlk ay yarı fiyat da introPrice olarak gelir; buna "ücretsiz
    // deneme" demek yanıltıcı olurdu.
    const discounted = makePackage({
      identifier: "d",
      packageType: PACKAGE_TYPE.ANNUAL,
      price: 399,
      introPrice: { price: 39.99, periodUnit: "MONTH", periodNumberOfUnits: 1 },
    });
    expect(readTrial(discounted)).toBeNull();
  });

  it("giriş fiyatı yoksa null döner", () => {
    expect(readTrial(monthly)).toBeNull();
  });
});

describe("buildPlanOptions", () => {
  it("yıllığı başa alır ve önerilen olarak işaretler", () => {
    const options = buildPlanOptions([monthly, annual]);
    expect(options.map((option) => option.kind)).toEqual(["annual", "monthly"]);
    expect(options[0]?.isRecommended).toBe(true);
    expect(options[1]?.isRecommended).toBe(false);
  });

  it("tasarruf rozetini yalnızca yıllığa koyar", () => {
    const options = buildPlanOptions([annual, monthly]);
    expect(options[0]?.savingsPercent).toBe(58);
    expect(options[1]?.savingsPercent).toBeNull();
  });

  it("aylık planda aylık eşdeğer fiyat göstermez", () => {
    // Aylık planda "ayda ₺79,99" yazmak, fiyatın kendisini tekrar etmek olurdu.
    const options = buildPlanOptions([annual, monthly]);
    expect(options[0]?.monthlyEquivalent).toBe("₺33,33");
    expect(options[1]?.monthlyEquivalent).toBeNull();
  });

  it("tek plan varsa onu önerilen yapar — hiçbir planın seçili olmadığı durum oluşmaz", () => {
    const options = buildPlanOptions([monthly]);
    expect(options).toHaveLength(1);
    expect(options[0]?.isRecommended).toBe(true);
    expect(options[0]?.savingsPercent).toBeNull();
  });

  it("hiç paket yoksa boş liste döner", () => {
    expect(buildPlanOptions([])).toEqual([]);
  });
});
