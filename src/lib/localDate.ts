/**
 * Kullanıcının CİHAZ takvimine göre gün anahtarı (YYYY-MM-DD).
 *
 * NEDEN TEK YERDE (2026-09-19, migration 044): "bugün" sorusuna üç ayrı
 * yerde üç farklı cevap veriliyordu -- okuma süresi UTC gününe yazılıyor,
 * seri Europe/Istanbul'a göre sayılıyor, profil grafiği cihazın yerel
 * gününü çiziyordu. Türkiye UTC+3 olduğu için gece okuyan kullanıcının
 * dakikaları düne düşüyor, "bugün okudun" rozeti yanlış söylüyor ve seri
 * hiç birikmiyordu.
 *
 * Doğru takvim kullanıcının kendi günü: "bugün okudum" bir takvim günü
 * ifadesi ve hangi sunucuda saklandığı kullanıcıyı ilgilendirmiyor.
 *
 * NEDEN `toISOString()` DEĞİL: o UTC'ye çevirir -- düzeltilmek istenen
 * hatanın ta kendisi.
 */
export function localDateKey(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * Bugünden `offset` gün önceki yerel gün anahtarı.
 *
 * Gün ortasına sabitlenerek ilerletiliyor: yaz saati geçişlerinde 23 ya da
 * 25 saatlik günler oluyor ve gece yarısından gün çıkarmak o günlerde bir
 * gün kaydırabiliyor.
 */
export function localDateKeyDaysAgo(offset: number, now: Date = new Date()): string {
  const date = new Date(now);
  date.setHours(12, 0, 0, 0);
  date.setDate(date.getDate() - offset);
  return localDateKey(date);
}
