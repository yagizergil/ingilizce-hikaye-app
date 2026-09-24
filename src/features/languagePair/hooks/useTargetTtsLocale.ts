import { getLanguage } from "@/lib/languages";

import { useActiveLanguagePairQuery } from "@/features/languagePair/api/useActiveLanguagePairQuery";

/**
 * Öğrenilen dilin (aktif çiftin hedef dili) konuşma sentezi locale'i.
 * Kelimeler her zaman öğrenilen dilde seslendirilmeli; arayüz dilinde ya da
 * sabit "en-US" ile DEĞİL.
 */
export function useTargetTtsLocale(): string {
  const { data } = useActiveLanguagePairQuery();
  return getLanguage(data?.targetLanguage ?? "en")?.ttsLocale ?? "en-US";
}
