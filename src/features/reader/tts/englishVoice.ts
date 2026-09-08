import { getVoiceCatalog, resolveVoice } from "@/features/reader/tts/voiceCatalog";

/**
 * KELİME TELAFFUZU için kullanılacak cihaz sesinin kimliği.
 *
 * Tek kullanıcısı `WordSheet`'teki hoparlör. Bölüm seslendirmesi bu yoldan
 * GEÇMİYOR — o stüdyo kaydıyla yapılıyor (ADR-012) ve cihaz sesiyle hiçbir
 * ilgisi yok. Eskiden ikisi aynı sesi paylaşıyordu; cihaz üstü bölüm
 * seslendirmesi kaldırılınca (ADR-011 iptal) geriye yalnızca telaffuz kaldı.
 *
 * Sıralama ve kalite kademesi mantığı `voiceCatalog.ts` içinde; burası
 * yalnızca "kullanıcı bir ses seçtiyse onu, seçmediyse en iyisini ver"
 * sorusunu cevaplıyor.
 */
export async function getVoiceIdentifier(preferred: string | null): Promise<string | null> {
  const catalog = await getVoiceCatalog();
  return resolveVoice(catalog, preferred)?.identifier ?? null;
}
