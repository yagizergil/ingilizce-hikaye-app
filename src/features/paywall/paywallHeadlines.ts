import { isPaywallSource } from "@/features/paywall/paywallSources";
import type { PaywallSource } from "@/features/paywall/paywallSources";

/**
 * Paywall başlığı, açıldığı ana göre: kullanıcı o an neyi istiyorsa onu
 * söyle. Anahtar `paywall.headlines.<değer>.{title,subtitle}`.
 *
 * 1.1.0: onboarding, profile, book_finished, vocabulary_strip,
 * language_pair, word_pack ve home_offer eklendi -- denetimde bu altı
 * kaynak genel başlığa düşüyordu (bkz. docs/research/2026-10-12-1.1.0-donusum-denetimi.md).
 * Bilinmeyen kaynakta genel başlık (`paywall.title`).
 *
 * C15: tip `Record<PaywallSource, …>` -- katalogda (paywallSources.ts) olup
 * burada başlığı olmayan bir kaynak DERLEME hatası.
 */
export const HEADLINE_BY_SOURCE: Record<PaywallSource, string> = {
  audio: "listen",
  reader_listen: "listen",
  book_quiz: "quiz",
  quiz_level_passed: "quiz",
  word_quota: "words",
  word_quota_badge: "words",
  sentence_quota: "sentences",
  smart_practice: "practice",
  onboarding: "onboarding",
  profile: "profile",
  book_finished: "bookFinished",
  vocabulary_strip: "notebook",
  language_pair: "languagePair",
  word_pack: "wordPack",
  home_offer: "homeOffer",
};

export function headlineKeyFor(source: string): string | null {
  return isPaywallSource(source) ? HEADLINE_BY_SOURCE[source] : null;
}

/**
 * H2 (deneme vaadi uygunluktan bağımsızdı, Guideline 2.3.1): deneme vaat
 * eden başlıklar. Kullanıcıya gerçekten sunulabilen bir deneme yoksa
 * `<anahtar>NoTrial` varyantı kullanılıyor.
 */
const TRIAL_PROMISING_HEADLINES = new Set(["onboarding", "homeOffer"]);

export function trialAwareHeadlineKey(headline: string | null, hasTrial: boolean): string | null {
  if (headline && !hasTrial && TRIAL_PROMISING_HEADLINES.has(headline)) {
    return `${headline}NoTrial`;
  }
  return headline;
}

/**
 * Deneme anlatımının tek girdisi (C12 `trialState`). Başlık, CTA ve
 * "bu planda deneme yok" uyarısı bundan türetilir.
 */
export type TrialState = "eligible_with_trial" | "eligible_no_trial_on_plan" | "not_eligible";

export function trialStateFor(
  options: readonly { trial: unknown; isSelected: boolean }[],
): TrialState {
  const selected = options.find((option) => option.isSelected);
  if (selected?.trial) return "eligible_with_trial";
  if (options.some((option) => option.trial)) return "eligible_no_trial_on_plan";
  return "not_eligible";
}

/**
 * "Bu planda deneme yok" uyarısının anahtarı. Eski metin sabit olarak
 * "deneme yıllık planda" diyordu; deneme başka bir plandaysa yanlış olurdu.
 */
export function noTrialNoticeKey(
  selectedKind: string | null,
  trialKind: string | null,
): string | null {
  if (!trialKind || selectedKind === trialKind) return null;
  if (selectedKind === "monthly" && trialKind === "annual") return "paywall.noTrialOnPlan";
  if (selectedKind === "annual" && trialKind === "monthly") return "paywall.noTrialOnPlanAnnual";
  return "paywall.noTrialOnPlanOther";
}
