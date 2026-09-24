import { useMutation } from "@tanstack/react-query";

import { supabase } from "@/lib/supabase";

/**
 * Görünen adı kullanıcının auth meta verisine (`full_name`) yazar.
 *
 * Anonim hesaplarda da çalışıyor ve yeni tablo/migration gerektirmiyor.
 * `updateUser` bir `USER_UPDATED` olayı yayınlıyor; `useProfileAuthStatus`
 * o olayı dinlediği için başlık kendiliğinden güncelleniyor.
 */
export function useUpdateDisplayNameMutation() {
  return useMutation({
    mutationFn: async (name: string) => {
      const { error } = await supabase.auth.updateUser({ data: { full_name: name } });
      if (error) throw error;
    },
  });
}
