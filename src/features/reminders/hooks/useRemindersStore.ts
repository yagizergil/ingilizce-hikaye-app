import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

import AsyncStorage from "@/lib/storage";

interface RemindersState {
  /**
   * Kullanıcı hatırlatmaları açtı mı.
   *
   * VARSAYILAN KAPALI. Bildirim izni iOS'ta kullanıcı başına BİR KEZ
   * sorulabilir; varsayılanı açık yapmak, kullanıcı daha neyin
   * hatırlatılacağını bilmeden o tek şansı harcamak olurdu. Ayrıca
   * istenmeden gelen bildirim, uygulamanın silinme sebeplerinin başında
   * geliyor. Kullanıcı bunu Profil > Hatırlatmalar'dan kendi açıyor.
   */
  enabled: boolean;
  setEnabled: (value: boolean) => void;
}

export const useRemindersStore = create<RemindersState>()(
  persist(
    (set) => ({
      enabled: false,
      setEnabled: (enabled) => set({ enabled }),
    }),
    {
      name: "reminders.settings",
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);
