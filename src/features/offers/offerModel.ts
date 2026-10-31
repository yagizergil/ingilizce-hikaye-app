import type { PurchasesPackage } from "react-native-purchases";

/**
 * Teklif ekranlarının SAF mantığı (indirim ve çıkış teklifi).
 *
 * BURADA ÜRÜN KİMLİĞİ YOK: hangi paketin indirimli olduğu offering'in
 * içeriğinden çıkarılıyor (kural tablosu yalnızca offering ADINI söylüyor).
 * Yalnızca tip importu: `react-native-purchases` çalışma zamanında Expo
 * Go'da yok (bkz. paywall/planModel.ts).
 */

const ANNUAL = "ANNUAL";
const MONTHLY = "MONTHLY";

export interface SaleOffer {
  /** Satın alınacak indirimli paket. */
  sale: PurchasesPackage;
  /** Üstü çizili gösterilen normal fiyatlı paket (aynı dönem). */
  anchor: PurchasesPackage;
  /** Gerçek fiyatlardan hesaplanan indirim, tam sayı, aşağı yuvarlanmış. */
  percent: number;
}

/** "P1Y" -> "year", "P1M" -> "month"; bilinmiyorsa null. */
export function periodOf(pkg: PurchasesPackage): "year" | "month" | "week" | null {
  const period = pkg.product.subscriptionPeriod ?? "";
  if (/^P1Y$/i.test(period) || /^P12M$/i.test(period)) return "year";
  if (/^P1M$/i.test(period)) return "month";
  if (/^P1W$/i.test(period) || /^P7D$/i.test(period)) return "week";
  if (pkg.packageType === ANNUAL) return "year";
  if (pkg.packageType === MONTHLY) return "month";
  return null;
}

/**
 * İndirim teklifini offering'den çıkarır; kurulamıyorsa null (çağıran
 * normal paywall'a düşer).
 *
 * Çapa: offering içindeki ANNUAL paket (rapor C7: `sale` offering'i
 * `$rc_annual` + `sale_annual`), yoksa güncel teklifin yıllığı. İndirimli
 * paket: offering'de çapadan FARKLI ürüne sahip, aylık olmayan ilk paket.
 *
 * İNDİRİM GERÇEK DEĞİLSE TEKLİF YOK (Guideline 2.3.1): fiyatı çapadan düşük
 * değilse ya da dönemleri farklıysa (yıllığı aylıkla kıyaslamak sahte bir
 * yüzde üretir) null dönüyor. Mağaza yanlış yapılandırılmışsa kullanıcı
 * uydurma bir "%X indirim" görmektense normal paywall'u görür.
 */
export function resolveSaleOffer(
  requested: PurchasesPackage[] | null,
  current: PurchasesPackage[],
): SaleOffer | null {
  if (!requested || requested.length === 0) return null;
  const currentAnnual = current.find((pkg) => pkg.packageType === ANNUAL) ?? null;
  const anchor =
    requested.find(
      (pkg) =>
        pkg.packageType === ANNUAL &&
        (currentAnnual === null || pkg.product.identifier === currentAnnual.product.identifier),
    ) ?? currentAnnual;
  if (!anchor) return null;

  const sale =
    requested.find(
      (pkg) => pkg.product.identifier !== anchor.product.identifier && pkg.packageType !== MONTHLY,
    ) ?? null;
  if (!sale) return null;

  const salePeriod = periodOf(sale);
  if (salePeriod === null || salePeriod !== periodOf(anchor)) return null;

  const anchorPrice = anchor.product.price;
  const salePrice = sale.product.price;
  if (!Number.isFinite(anchorPrice) || !Number.isFinite(salePrice) || anchorPrice <= 0) return null;
  if (salePrice <= 0 || salePrice >= anchorPrice) return null;

  const percent = Math.floor((1 - salePrice / anchorPrice) * 100);
  return percent > 0 ? { sale, anchor, percent } : null;
}

/**
 * Çıkış teklifinin paketi: önce kuralın offering'inde istenen tür (Lingo:
 * aylık), yoksa güncel teklifte aynı tür. İkisi de yoksa null -> sessizce
 * normal akışa devam.
 */
export function resolveDownsellPackage(
  requested: PurchasesPackage[] | null,
  current: PurchasesPackage[],
  packageType: string,
): PurchasesPackage | null {
  return (
    requested?.find((pkg) => pkg.packageType === packageType) ??
    current.find((pkg) => pkg.packageType === packageType) ??
    null
  );
}

export interface Remaining {
  hours: number;
  minutes: number;
  expired: boolean;
}

/** Sunucu bitiş anına kalan süre (saat + dakika, aşağı yuvarlanmış). */
export function remainingUntil(expiresAt: number, now: number): Remaining {
  const ms = Math.max(0, expiresAt - now);
  const totalMinutes = Math.floor(ms / 60_000);
  return {
    hours: Math.floor(totalMinutes / 60),
    minutes: totalMinutes % 60,
    expired: ms === 0,
  };
}

/**
 * Teklif bitmeden yerel bildirimin zamanı (rapor §5.3: bitişten 6 saat
 * önce). Bu an bir saatten yakınsa ya da geçmişteyse null: "son saatler"
 * bildirimi teklifin açıldığı dakikada gelmemeli.
 */
export function offerReminderFireAt(
  expiresAt: number,
  notifyBeforeHours: number | undefined,
  now: number,
): Date | null {
  if (notifyBeforeHours === undefined || notifyBeforeHours <= 0) return null;
  const fireAt = expiresAt - notifyBeforeHours * 60 * 60 * 1000;
  if (fireAt - now < 60 * 60 * 1000) return null;
  return new Date(fireAt);
}
