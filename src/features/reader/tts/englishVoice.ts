import { getVoiceCatalog, resolveVoice } from "@/features/reader/tts/voiceCatalog";

/**
 * Konuşma için kullanılacak sesin kimliği.
 *
 * Kelime telaffuzu (`WordSheet`) ve bölüm seslendirmesi (`useReaderTts`)
 * aynı sesi kullanıyor — iki farklı ses duymak tutarsız olurdu.
 *
 * Sıralama ve kalite kademesi mantığı `voiceCatalog.ts` içinde; burası
 * yalnızca "kullanıcı bir ses seçtiyse onu, seçmediyse en iyisini ver"
 * sorusunu cevaplıyor.
 */
export async function getVoiceIdentifier(preferred: string | null): Promise<string | null> {
  const catalog = await getVoiceCatalog();
  return resolveVoice(catalog, preferred)?.identifier ?? null;
}
