// chapter-audio erişim kararı (migration 110).
//
// SAF MODÜL: Deno ya da Supabase importu YOK, Jest de import edebiliyor
// (src/features/reader/tts/__tests__/chapterAudioAccess.test.ts).
//
// KURAL BURADA YAZILMIYOR: karar `can_play_section_audio()` içinde (premium
// ya da kitabın ilk seslendirilmiş bölümü). Burası yalnızca hangi
// fonksiyonun çağrılacağını ve deploy sırasına dayanıklı geri düşmeyi
// yönetiyor.

export interface RpcError {
  code?: string | null;
  message: string;
}

export interface RpcResult {
  data: unknown;
  error: RpcError | null;
}

export type RpcCaller = (fn: string, args: Record<string, unknown>) => PromiseLike<RpcResult>;

export type AudioAccessDecision =
  | { kind: "allowed"; via: "section" | "book_fallback" }
  | { kind: "locked"; via: "section" | "book_fallback" }
  | { kind: "error"; message: string };

/**
 * Fonksiyon veritabanında henüz yok mu.
 *
 * PostgREST şema önbelleğinde bulamazsa `PGRST202`, Postgres'in kendisi
 * bulamazsa `42883` (undefined_function) döner. İkisi de "migration 110
 * canlıda değil" demek; başka her hata gerçek bir arıza.
 */
export function isMissingFunctionError(error: RpcError | null | undefined): boolean {
  return error?.code === "PGRST202" || error?.code === "42883";
}

/**
 * Bölüm bazlı erişimi sorar; yeni fonksiyon yoksa eski kitap bazlı (yalnızca
 * premium) kurala geri düşer. Böylece Edge Function migration'dan önce
 * deploy edilse de premium kullanıcı dinlemeye devam eder, ücretsiz bölüm 1
 * ise migration uygulanınca kendiliğinden açılır.
 */
export async function resolveChapterAudioAccess(
  rpc: RpcCaller,
  section: { id: string; book_id: string },
): Promise<AudioAccessDecision> {
  const primary = await rpc("can_play_section_audio", { p_section_id: section.id });
  if (!primary.error) {
    return { kind: primary.data === true ? "allowed" : "locked", via: "section" };
  }
  if (!isMissingFunctionError(primary.error)) {
    return { kind: "error", message: primary.error.message };
  }

  const fallback = await rpc("can_play_book_audio", { p_book_id: section.book_id });
  if (fallback.error) {
    return { kind: "error", message: fallback.error.message };
  }
  return { kind: fallback.data === true ? "allowed" : "locked", via: "book_fallback" };
}
