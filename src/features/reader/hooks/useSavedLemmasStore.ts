import { create } from "zustand";

interface SavedLemmasState {
  savedLemmas: Set<string>;
  setSavedLemmas: (savedLemmas: Set<string>) => void;
}

/**
 * Kaydedilen kelimelerin (kelime defteri) kümesi -- `useTtsStore` ile AYNI
 * gerekçe (bkz. o dosyanın doc comment'i): bir sayfada ~300 kelime `<Text>`
 * düğümü var. `savedLemmas` eskiden `ReaderPage`'e prop olarak geçiyordu ve
 * sayfanın TÜM tokenize/render işini (~300 elemanın tamamı) yeniden
 * hesaplatan bir `useMemo` bağımlılığıydı -- kullanıcı OKURKEN tek bir
 * kelime kaydettiğinde, ekrandaki 2-3 sayfanın HER BİRİ sıfırdan
 * tokenize ediliyordu (performans denetimi, 2026-09-16).
 *
 * Zustand seçicisiyle (`s => s.savedLemmas.has(lemma)`) yalnızca ait
 * olduğu durumu DEĞİŞEN kelimeler render ediliyor -- kaydedilen/kaydı
 * kaldırılan kelime başına iki bileşen, sayfanın geri kalanı hiç
 * dokunulmadan kalıyor.
 */
export const useSavedLemmasStore = create<SavedLemmasState>()((set) => ({
  savedLemmas: new Set(),
  setSavedLemmas: (savedLemmas) => set({ savedLemmas }),
}));

/**
 * `useIsLemmaSaved` DEĞİL: `useSavedWordsQuery.ts`'te zaten farklı bir
 * imzayla (`() => (lemma) => boolean`, curried) o isimde bir export var --
 * aynı adı burada da kullanmak, hangisinin hangi dosyadan geldiğini
 * karıştırmayı kolaylaştırırdı.
 */
export function useIsWordSaved(lemma: string): boolean {
  return useSavedLemmasStore((state) => state.savedLemmas.has(lemma));
}
