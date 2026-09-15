import { getVoiceCatalog, resolveVoice } from "@/features/reader/tts/voiceCatalog";

/**
 * KELİME TELAFFUZU için kullanılacak cihaz sesinin kimliği.
 *
 * ADI DEĞİŞTİ (eskiden `englishVoice.ts`, 2026-09-15): dosya yalnızca
 * İngilizce seslerle çalışırken bu ad doğruydu; artık `languagePrefix`
 * parametresiyle HER hedef dilde çalışıyor (bkz. `voiceCatalog.ts`'in
 * güncellenme gerekçesi -- kelimeye dokunan kullanıcı, kitabın dili ne
 * olursa olsun İngilizce aksanla duyuyordu).
 *
 * Tek kullanıcısı `WordSheet`'teki hoparlör. Bölüm seslendirmesi bu yoldan
 * GEÇMİYOR — o stüdyo kaydıyla yapılıyor (ADR-012) ve cihaz sesiyle hiçbir
 * ilgisi yok. Eskiden ikisi aynı sesi paylaşıyordu; cihaz üstü bölüm
 * seslendirmesi kaldırılınca (ADR-011 iptal) geriye yalnızca telaffuz kaldı.
 *
 * Sıralama ve kalite kademesi mantığı `voiceCatalog.ts` içinde; burası
 * yalnızca "kullanıcı bir ses seçtiyse onu, seçmediyse bu dildeki en
 * iyisini ver" sorusunu cevaplıyor.
 */
export async function getVoiceIdentifier(
  preferred: string | null,
  languagePrefix: string,
): Promise<string | null> {
  const catalog = await getVoiceCatalog(languagePrefix);
  return resolveVoice(catalog, preferred)?.identifier ?? null;
}
