import type { PurchasesPackage } from "react-native-purchases";

/**
 * Paywall'daki plan seçicinin saf mantığı.
 *
 * NEDEN AYRI BİR DOSYA: tasarruf yüzdesi, aylık eşdeğer fiyat ve deneme
 * süresi hesapları RevenueCat'ten gelen ham veriden türetiliyor ve
 * bunların yanlış hesaplanması doğrudan yanıltıcı fiyat gösterimi demek
 * (App Store Guideline 3.1.2). Bileşenin içinde yazılsalardı test
 * edilemezlerdi; burada saf fonksiyonlar oldukları için ediliyorlar.
 *
 * BURADA HİÇBİR FİYAT SABİTİ YOK. Tüm rakamlar RevenueCat'ten geliyor;
 * `priceString` ve `pricePerMonthString` App Store'un kullanıcının
 * bölgesi için biçimlediği metinlerdir. Fiyat değişikliği uygulama
 * güncellemesi gerektirmez.
 */

export type PlanKind = "annual" | "monthly" | "other";

export interface FreeTrial {
  /** Deneme süresi gün cinsinden — arayüzde "7 gün ücretsiz" için. */
  days: number;
}

export interface PlanOption {
  pkg: PurchasesPackage;
  kind: PlanKind;
  /** Ekranda ön seçili gelen plan. Yıllık varsa odur. */
  isRecommended: boolean;
  /**
   * Yıllık planın aylığa göre tasarrufu, tam sayı yüzde.
   * Yalnızca her iki plan da varsa hesaplanabilir; yoksa null.
   */
  savingsPercent: number | null;
  /** "ayda ₺33,33" satırı. Aylık planda gösterilmez (aynı sayı olurdu). */
  monthlyEquivalent: string | null;
  /** Ücretsiz deneme varsa süresi. */
  trial: FreeTrial | null;
}

/**
 * SADECE TİP İMPORTU KULLANILIYOR — bu dosya `react-native-purchases`'ı
 * ÇALIŞMA ZAMANINDA import etmemeli.
 *
 * O paket bir native modül ve Expo Go içinde yok; doğrudan import edilirse
 * uygulama Expo Go'da açılışta çöker (bkz. src/lib/revenuecat.ts'in tembel
 * yükleme gerekçesi). PaywallScreen bu dosyayı normal şekilde import
 * ettiği için buradaki bir `PACKAGE_TYPE` enum importu o zinciri geri
 * getirirdi. Enum'un değerleri zaten string sabitler.
 */
const ANNUAL_PACKAGE_TYPE = "ANNUAL";
const MONTHLY_PACKAGE_TYPE = "MONTHLY";

function classify(pkg: PurchasesPackage): PlanKind {
  if (pkg.packageType === ANNUAL_PACKAGE_TYPE) return "annual";
  if (pkg.packageType === MONTHLY_PACKAGE_TYPE) return "monthly";
  return "other";
}

/**
 * Ücretsiz denemeyi RevenueCat'in giriş fiyatından (intro price) çıkarır.
 *
 * Bir giriş fiyatı yalnızca ücreti SIFIR olduğunda "ücretsiz deneme"dir.
 * İndirimli ilk dönem (örn. ilk ay yarı fiyat) de introPrice olarak gelir
 * ve ona "ücretsiz deneme" demek yanıltıcı olurdu.
 */
export function readTrial(pkg: PurchasesPackage): FreeTrial | null {
  const intro = pkg.product.introPrice;
  if (!intro || intro.price > 0) return null;

  const units = intro.periodNumberOfUnits;
  if (!Number.isFinite(units) || units <= 0) return null;

  const perUnitDays: Record<string, number> = { DAY: 1, WEEK: 7, MONTH: 30, YEAR: 365 };
  const multiplier = perUnitDays[intro.periodUnit?.toUpperCase() ?? ""];
  if (!multiplier) return null;

  return { days: units * multiplier * Math.max(intro.cycles || 1, 1) };
}

/**
 * Yıllık planın aylığa göre tasarrufu.
 *
 * `pricePerMonth` yıllık ürünün 12'ye bölünmüş hâli; RevenueCat bunu
 * yaklaşık değer olarak işaretliyor, bu yüzden yüzde aşağı yuvarlanıyor —
 * gerçekte olduğundan büyük bir tasarruf iddia etmemek için.
 */
export function computeSavingsPercent(
  annual: PurchasesPackage,
  monthly: PurchasesPackage,
): number | null {
  const annualPerMonth = annual.product.pricePerMonth;
  const monthlyPrice = monthly.product.price;

  if (
    typeof annualPerMonth !== "number" ||
    !Number.isFinite(annualPerMonth) ||
    !Number.isFinite(monthlyPrice) ||
    monthlyPrice <= 0 ||
    annualPerMonth <= 0 ||
    annualPerMonth >= monthlyPrice
  ) {
    return null;
  }

  const percent = Math.floor((1 - annualPerMonth / monthlyPrice) * 100);
  return percent > 0 ? percent : null;
}

/**
 * Paketleri ekranda gösterilecek sıraya ve biçime çevirir.
 *
 * Sıra bilerek yıllık → aylık → diğer: önerilen plan ilk sırada ve ön
 * seçili gelir. Aylık plan, yıllığın ucuz görünmesini sağlayan çapadır
 * (bkz. docs/aso/03-fiyatlandirma.md §5).
 */
export function buildPlanOptions(packages: PurchasesPackage[]): PlanOption[] {
  const annual = packages.find((pkg) => classify(pkg) === "annual") ?? null;
  const monthly = packages.find((pkg) => classify(pkg) === "monthly") ?? null;

  const savings = annual && monthly ? computeSavingsPercent(annual, monthly) : null;

  const order: Record<PlanKind, number> = { annual: 0, monthly: 1, other: 2 };
  const sorted = [...packages].sort((a, b) => order[classify(a)] - order[classify(b)]);

  // Yıllık yoksa listenin ilki önerilen olur — hiçbir planın ön seçili
  // olmadığı bir seçici, kullanıcıyı gereksiz bir karara zorlar.
  const recommendedPkg = annual ?? sorted[0] ?? null;

  return sorted.map((pkg) => {
    const kind = classify(pkg);
    return {
      pkg,
      kind,
      isRecommended: recommendedPkg !== null && pkg.identifier === recommendedPkg.identifier,
      savingsPercent: kind === "annual" ? savings : null,
      monthlyEquivalent: kind === "monthly" ? null : (pkg.product.pricePerMonthString ?? null),
      trial: readTrial(pkg),
    };
  });
}
