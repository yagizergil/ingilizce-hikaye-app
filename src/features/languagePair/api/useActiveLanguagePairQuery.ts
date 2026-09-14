import { useQuery } from "@tanstack/react-query";

import { getLocales } from "expo-localization";

import { supabase } from "@/lib/supabase";
import { UI_LANGUAGE_CODES } from "@/lib/languages";

export interface LanguagePair {
  nativeLanguage: string;
  targetLanguage: string;
}

export interface OwnedLanguagePair extends LanguagePair {
  isActive: boolean;
}

export const languagePairQueryKeys = {
  all: ["languagePair"] as const,
  active: () => [...languagePairQueryKeys.all, "active"] as const,
  owned: () => [...languagePairQueryKeys.all, "owned"] as const,
};

interface LanguagePairRow {
  native_language: string;
  target_language: string;
  is_active: boolean;
}

/**
 * Kullanıcının şu an okuduğu (ana dil, hedef dil) çifti.
 *
 * NEDEN GERİYE DÖNÜK VARSAYILAN VAR: bu sorgu, henüz `set_language_pair()`
 * hiç çağrılmamış (migration 033 öncesi hesaplar, ya da onboarding'i henüz
 * tamamlamamış kullanıcılar) için de çalışmalı. Satır yoksa uygulamanın
 * bugüne kadarki TEK davranışına (tr okuyucu, İngilizce içerik) düşülüyor
 * -- reader ve sözlük bu varsayılanla AYNEN eskisi gibi çalışmaya devam
 * eder, kimse aniden "dil seç" ekranına kilitlenmez.
 */
/**
 * Satır yoksa CİHAZIN dili ana dil, İngilizce hedef dil sayılıyor.
 *
 * Eskiden burada sabit `tr` yazıyordu -- uygulamanın tek çiftle (Türkçe
 * okuyucu / İngilizce içerik) başladığı dönemden kalma. Türkçe telefonda
 * sonuç birebir aynı; Almanca telefonda ise kullanıcı, çifti henüz
 * yazılmadan bir kelimeye dokunduğunda TÜRKÇE karşılık alıyordu.
 */
const FALLBACK_PAIR: LanguagePair = {
  nativeLanguage: (UI_LANGUAGE_CODES as readonly string[]).includes(getLocales()[0]?.languageCode ?? "")
    ? (getLocales()[0]?.languageCode as string)
    : "en",
  targetLanguage: "en",
};

export async function fetchActiveLanguagePair(): Promise<LanguagePair> {
  const { data, error } = await supabase
    .from("user_language_pairs")
    .select("native_language, target_language")
    .eq("is_active", true)
    .maybeSingle<Pick<LanguagePairRow, "native_language" | "target_language">>();

  if (error) throw error;
  if (!data) return FALLBACK_PAIR;

  return { nativeLanguage: data.native_language, targetLanguage: data.target_language };
}

export function useActiveLanguagePairQuery() {
  return useQuery({
    queryKey: languagePairQueryKeys.active(),
    queryFn: fetchActiveLanguagePair,
    staleTime: 5 * 60 * 1000,
  });
}

/** Kullanıcının açtığı TÜM çiftler (premium kullanıcıda birden fazla olabilir). */
export function useOwnedLanguagePairsQuery() {
  return useQuery({
    queryKey: languagePairQueryKeys.owned(),
    queryFn: async (): Promise<OwnedLanguagePair[]> => {
      const { data, error } = await supabase
        .from("user_language_pairs")
        .select("native_language, target_language, is_active")
        .order("created_at", { ascending: true });

      if (error) throw error;
      return (data ?? []).map((row: LanguagePairRow) => ({
        nativeLanguage: row.native_language,
        targetLanguage: row.target_language,
        isActive: row.is_active,
      }));
    },
    staleTime: 60 * 1000,
  });
}
