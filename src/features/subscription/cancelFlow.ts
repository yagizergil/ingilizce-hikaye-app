/**
 * İptal akışının SAF mantığı (C11): kaybedilecekler -> neden -> nedene
 * göre teklif -> "yine de iptal et".
 *
 * KURAL (App Review): iptal ZORLAŞTIRILMAZ. Her adımda "Yine de iptal et"
 * görünür ve App Store'un abonelik ekranını açar; teklif bir engel değil,
 * bir seçenek. iOS'ta iptal uygulama içinden yapılamaz, yalnızca oraya
 * yönlendirilir.
 *
 * DÜRÜSTLÜK: kaybedilecekler listesi yalnızca premium'un GERÇEKTEN verdiği
 * şeyleri yazar (CLAUDE.md "Premium bugün ne sunuyor"). Kayıtlı kelimeler
 * SİLİNMEZ; yalnızca yeni ekleme ücretsiz sınıra bağlanır -- öyle yazılır.
 */

export const CANCEL_REASONS = [
  "too_expensive",
  "not_using",
  "missing_content",
  "technical",
  "other",
] as const;

export type CancelReason = (typeof CANCEL_REASONS)[number];

/** Nedene göre gösterilen elde tutma seçeneği (cancel_feedback.offer_shown). */
export type RetentionChoice =
  /** App Store promotional offer (RevenueCat imzalı). */
  | "promotional"
  /**
   * Yıllık aboneye aylık plana geçiş (IZLENECEK-YOL §3.2: "pahalı" ->
   * aylığa geçiş). App Store aynı gruptaki düşük plana geçişi yenileme
   * tarihinde uygular; peşin ödenen yıl yanmaz.
   */
  | "monthly_switch"
  /** Günlük hedef ve hatırlatma ayarı (iOS'ta duraklatma yok). */
  | "goal"
  /** Destek sayfası. */
  | "support"
  | "none";

export interface RetentionContext {
  hasPromotionalOffer: boolean;
  /** Kullanıcı yıllık planda ve satın alınabilir bir aylık paket var. */
  canSwitchToMonthly: boolean;
  hasSupportUrl: boolean;
}

export function retentionChoiceFor(reason: CancelReason, ctx: RetentionContext): RetentionChoice {
  switch (reason) {
    case "too_expensive":
      if (ctx.hasPromotionalOffer) return "promotional";
      if (ctx.canSwitchToMonthly) return "monthly_switch";
      return "none";
    case "not_using":
      return "goal";
    case "missing_content":
    case "technical":
      return ctx.hasSupportUrl ? "support" : "none";
    case "other":
      return "none";
  }
}

export interface LossItem {
  key: "audio" | "lookups" | "savedWords" | "smartPractice" | "quiz";
  params?: Record<string, number>;
}

/** Premium bitince değişenler -- yalnızca gerçek premium faydaları. */
export function cancelLossItems(input: {
  savedWordCount: number;
  savedWordLimit: number;
  freeWordLookups: number;
}): LossItem[] {
  const items: LossItem[] = [{ key: "audio" }];
  items.push({ key: "lookups", params: { count: Math.max(0, input.freeWordLookups) } });
  if (input.savedWordCount > 0) {
    items.push({
      key: "savedWords",
      params: { count: input.savedWordCount, limit: input.savedWordLimit },
    });
  }
  items.push({ key: "smartPractice" }, { key: "quiz" });
  return items;
}

/** Serbest metin notunun sunucu sınırı (migration 101). */
export const CANCEL_NOTE_MAX = 1000;

export function normalizeCancelNote(note: string): string | null {
  const trimmed = note.trim();
  if (trimmed.length === 0) return null;
  return trimmed.slice(0, CANCEL_NOTE_MAX);
}

/**
 * Destek sayfası adresi. Ayrı bir ortam değişkeni yok: gizlilik sayfasıyla
 * aynı yerde barındırılan `support.html` (docs/support.html). Gizlilik
 * adresi yoksa ya da kalıba uymuyorsa null -- düğme gösterilmez.
 */
export function supportUrlFrom(privacyUrl: string): string | null {
  if (!/^https:\/\/.+\/privacy\.html(?:[?#].*)?$/.test(privacyUrl)) return null;
  return privacyUrl.replace(/privacy\.html(?:[?#].*)?$/, "support.html");
}
