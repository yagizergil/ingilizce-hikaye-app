/**
 * Hangi hatırlatmanın ne zaman gönderileceğinin SAF mantığı.
 *
 * NEDEN AYRI VE SAF: bildirim, kullanıcının uygulamayı silme sebeplerinin
 * başında gelir. Yanlış zamanlanan ya da artık doğru olmayan bir hatırlatma
 * ("bitirdiğin kitaba devam et") tek başına zarar verir. Bu yüzden karar
 * mantığı cihaz API'sinden ayrı, tarih verilerek test edilebilir bir
 * fonksiyonda duruyor.
 *
 * ÇEVİRİ BURADA YAPILMIYOR: fonksiyon çeviri ANAHTARI ve parametreleri
 * döndürüyor, metni çağıran `t()` ile üretiyor. Böylece hem saf kalıyor hem
 * de i18n kuralı (CLAUDE.md) korunuyor.
 */

/** Bildirimlerin gönderileceği saatler. Hepsi akşam: gün içi rahatsız etmez. */
const HOUR = {
  /** Seri kurtarma — günün bitmesine yakın ama uyku saatinden önce. */
  streakRescue: 21,
  /** Tekrar hatırlatması. */
  review: 20,
  /** Yarım kalan kitap. */
  continueReading: 19,
} as const;

/**
 * "Kitabına devam et" hatırlatmasının kaç gün sonra gönderileceği.
 *
 * 1 gün çok erken (kullanıcı daha dün okudu), 7 gün çok geç (alışkanlık
 * çoktan kırıldı). 3 gün, unutulmaya başlandığı ama henüz vazgeçilmediği
 * aralık.
 */
const CONTINUE_READING_DELAY_DAYS = 3;

/** Bir hatırlatmayı planlamak için son an — buna daha az kalmışsa atlanır. */
const MIN_LEAD_MINUTES = 15;

export type ReminderId = "streakRescue" | "reviewDue" | "continueReading";

export interface PlannedReminder {
  id: ReminderId;
  /** i18n anahtarı — metin çağıran tarafta üretiliyor. */
  titleKey: string;
  bodyKey: string;
  /** `t()` interpolasyon parametreleri. */
  params: Record<string, string | number>;
  fireAt: Date;
}

export interface ReminderInput {
  /** Vadesi gelmiş tekrar kartı sayısı. */
  dueCount: number;
  /** Yarım kalan kitabın adı; yoksa null. */
  unfinishedBookTitle: string | null;
  /** Mevcut okuma serisi (gün). */
  streakDays: number;
  /** Kullanıcı bugün okudu mu. */
  readToday: boolean;
}

/** Verilen günün belirtilen saatine ayarlanmış yeni bir tarih. */
function atHour(base: Date, dayOffset: number, hour: number): Date {
  const date = new Date(base);
  date.setDate(date.getDate() + dayOffset);
  date.setHours(hour, 0, 0, 0);
  return date;
}

function isFarEnoughAhead(fireAt: Date, now: Date): boolean {
  return fireAt.getTime() - now.getTime() >= MIN_LEAD_MINUTES * 60 * 1000;
}

/**
 * Kullanıcının durumuna göre planlanacak hatırlatmaları üretir.
 *
 * TASARIM KURALI — GÜN BAŞINA EN FAZLA BİR BİLDİRİM: üç hatırlatma da
 * uygunsa aynı akşam üst üste üç bildirim gitmez; her biri farklı bir güne
 * düşer. Arka arkaya bildirim, bildirimlerin tamamının kapatılmasına yol
 * açan tek en yaygın sebep.
 *
 * HER HATIRLATMA BİR EYLEME KARŞILIK GELİR: yapılacak bir şey yoksa
 * (tekrar bekleyen kart yok, yarım kitap yok, seri yok) hiçbir şey
 * planlanmaz. "Seni özledik" türü içeriksiz bildirim bilerek yok.
 */
export function buildReminderPlan(input: ReminderInput, now: Date): PlannedReminder[] {
  const plan: PlannedReminder[] = [];

  // 1) Seri kurtarma — BUGÜN. Yalnızca kaybedilecek bir seri varken ve
  //    kullanıcı bugün henüz okumamışken anlamlı.
  if (input.streakDays >= 2 && !input.readToday) {
    const fireAt = atHour(now, 0, HOUR.streakRescue);
    if (isFarEnoughAhead(fireAt, now)) {
      plan.push({
        id: "streakRescue",
        titleKey: "reminders.streakRescue.title",
        bodyKey: "reminders.streakRescue.body",
        params: { count: input.streakDays },
        fireAt,
      });
    }
  }

  // 2) Tekrar hatırlatması — YARIN. Bugüne koymuyoruz: kullanıcı
  //    uygulamayı az önce açtı, kartlar zaten önündeydi.
  if (input.dueCount > 0) {
    plan.push({
      id: "reviewDue",
      titleKey: "reminders.reviewDue.title",
      bodyKey: "reminders.reviewDue.body",
      params: { count: input.dueCount },
      fireAt: atHour(now, 1, HOUR.review),
    });
  }

  // 3) Yarım kalan kitap — birkaç gün sonra. Bugün okuduysa hiç
  //    planlanmaz; okuyan bir kullanıcıya "devam et" demek gereksiz.
  if (input.unfinishedBookTitle && !input.readToday) {
    plan.push({
      id: "continueReading",
      titleKey: "reminders.continueReading.title",
      bodyKey: "reminders.continueReading.body",
      params: { title: input.unfinishedBookTitle },
      fireAt: atHour(now, CONTINUE_READING_DELAY_DAYS, HOUR.continueReading),
    });
  }

  return plan;
}
