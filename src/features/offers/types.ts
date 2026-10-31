/**
 * Kesinti/teklif kural motorunun tipleri (rapor §6 C6).
 *
 * Kural satırları sunucuda (`paywall_rules`, migration 090/093) ve
 * uygulama paketinde (`rules/defaultRules.json`); değerlendirme istemcide.
 */

/**
 * Kural tetikleyicileri -- BEYAZ LİSTE (rapor §5.3).
 *
 * Okuyucu ekranına ait bir tetikleyici YOK ve olamaz (Ürün İlkesi #1).
 * Sunucudan bu listede olmayan bir tetikleyiciyle gelen kural istemcide
 * atılıyor (`parseRules`); veritabanında da aynı liste bir CHECK kısıtı.
 */
export const RULE_TRIGGERS = [
  "app_open",
  "home_focus",
  "book_finished",
  "quota_hit",
  "notebook_full",
  "paywall_closed",
] as const;
export type RuleTrigger = (typeof RULE_TRIGGERS)[number];

export type Presentation = "fullscreen" | "sheet" | "card" | "banner";

export type ConditionOp = "=" | "!=" | "<" | "<=" | ">" | ">=" | "in" | "not_in";
export type ConditionValue = number | boolean | string | (number | string)[];

export interface Condition {
  field: string;
  op: ConditionOp;
  value: ConditionValue;
}

/** Kural seçildiğinde ne gösterileceği. Bilinmeyen alanlar korunur. */
export interface RuleAction {
  /** "sale" | "downsell" | "trial_card" ... */
  kind: string;
  /** RevenueCat offering adı (ürün kimliği DEĞİL). */
  offering_id?: string;
  /** Downsell'de gösterilecek paket türü (RevenueCat `packageType`). */
  package_type?: string;
  /** Sunucu süreli teklifin süresi (saat). */
  offer_hours?: number;
  /** Teklif bitişinden kaç saat önce yerel bildirim. */
  notify_before_hours?: number;
  placement?: string;
  source?: string;
  experiment?: string;
}

export interface Rule {
  id: string;
  trigger: RuleTrigger;
  presentation: Presentation;
  rank: number;
  conditions: Condition[];
  action: RuleAction;
  cooldownHours: number | null;
  maxShows: number | null;
  exemptGlobalCooldown: boolean;
  minAppVersion: string | null;
}

/** Kural başına gösterim özeti (sunucu + yerel birleşik). */
export interface RuleHistory {
  shows: number;
  /** ms; hiç gösterilmediyse null. */
  lastShownAt: number | null;
}

/**
 * Koşulların okuyabildiği alanlar. Bir koşul burada OLMAYAN (ya da null)
 * bir alana bakarsa kural seçilmez -- "bilinmiyor" hiçbir zaman "uygun"
 * sayılmaz.
 */
export interface RuleContext {
  isPremium: boolean;
  /** Önerilen planda ücretsiz denemeye uygun mu (RevenueCat). */
  trialEligible: boolean;
  /** Sunucu: RevenueCat bu kullanıcı için hiç olay yazmış mı. */
  everSubscribed: boolean | null;
  billingIssue: boolean;
  /** Kurulumdan (profil oluşturma) bu yana tam gün; bilinmiyorsa null. */
  daysSinceInstall: number | null;
  readSessions24h: number | null;
  userBucket: number | null;
  /**
   * Kalıcı holdout (%10, IZLENECEK-YOL U4): zamanlanmış teklif yok.
   * Kova bilinmiyorsa null -> motor holdout'taymış gibi davranıp teklif
   * GÖSTERMEZ; atama bilinmeden teklif göstermek ölçümü kirletirdi.
   */
  inHoldout: boolean | null;
  firstChapterFinished: boolean;
  hoursSinceLastFullscreen: number;
  hoursSinceLastSale: number;
  hoursToNextCalendarSale: number;
  /** `paywall_closed` için kapanan paywall'un kaynağı. */
  source: string | null;
}

export type ConfigFetchState = "backend" | "cache" | "fallback";
