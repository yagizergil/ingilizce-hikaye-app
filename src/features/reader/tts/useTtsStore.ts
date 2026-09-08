import { create } from "zustand";

export type TtsStatus = "idle" | "loading" | "speaking" | "paused";

interface TtsState {
  status: TtsStatus;
  /**
   * Şu an okunan kelimenin anahtarı (`ttsPlan.wordKey`), yoksa null.
   *
   * NEDEN ZUSTAND, NEDEN CONTEXT DEĞİL: bir sayfada ~300 kelime `<Text>`
   * düğümü var ve bu değer saniyede 2-4 kez değişiyor. Context ile her
   * değişimde 300 tüketicinin tamamı yeniden render edilirdi. Zustand
   * seçicisiyle (`s => s.spokenKey === myKey`) yalnızca SEÇİLEN DEĞERİ
   * DEĞİŞEN bileşenler render ediliyor — yani kelime başına iki tane:
   * vurgusu kalkan ve vurgusu gelen. Seçici fonksiyonun 300 kez çalışması
   * (tek string karşılaştırması) ölçülebilir bir maliyet değil.
   */
  spokenKey: string | null;

  setStatus: (status: TtsStatus) => void;
  setSpokenKey: (key: string | null) => void;
  reset: () => void;
}

/**
 * Sesli okumanın geçici oynatma durumu.
 *
 * KALICI DEĞİL (persist yok): oturum arası taşınacak bir şey değil.
 * Kullanıcının hız tercihi kalıcı ama o `useReaderSettings` içinde —
 * burası yalnızca "şu an ne okunuyor" sorusunun cevabı.
 */
export const useTtsStore = create<TtsState>()((set) => ({
  status: "idle",
  spokenKey: null,
  setStatus: (status) => set({ status }),
  setSpokenKey: (spokenKey) => set({ spokenKey }),
  reset: () => set({ status: "idle", spokenKey: null }),
}));
