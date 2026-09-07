import type { CefrLevel } from "@/features/onboarding/levelEstimate";

/** Haftalık çubuk grafiğin tek bir günü. */
export interface ProfileDailyMinutes {
  /** YYYY-MM-DD (yerel gün). */
  date: string;
  /** 0 = o gün okunmamış. */
  minutes: number;
}

export interface ProfileStats {
  // --- Bu hafta ---
  daysActiveThisWeek: number;
  readingMinutesThisWeek: number;
  /** Pazartesi'den Pazar'a 7 giriş; okunmayan günler 0 dakika. */
  weekDays: ProfileDailyMinutes[];

  // --- Seri (streak) ---
  /** Bugün veya dün biten kesintisiz okuma günü sayısı. */
  currentStreak: number;
  /** Tüm zamanların en uzun kesintisiz serisi. */
  longestStreak: number;
  /** Bugün okundu mu — seri kartı "bugünü tamamla" uyarısı için. */
  readToday: boolean;

  // --- Tüm zamanlar ---
  totalMinutes: number;
  totalActiveDays: number;
  completedBookCount: number;
}

/** `user_entitlements.tier` — `'free'` is the column default; any other
 * value is whatever string RevenueCat's webhook wrote (e.g. `'premium'`). */
export type SubscriptionTier = string;

/** Profil başlığındaki kimlik bilgisi. */
export interface ProfileIdentity {
  /** Görünen ad; anonim kullanıcıda null. */
  displayName: string | null;
  email: string | null;
  /** Kullanıcının seçtiği okuma seviyesi. */
  targetLevel: CefrLevel | null;
  /** Hesabın açılış tarihi (ISO). */
  memberSince: string | null;
  isAnonymous: boolean;
}
