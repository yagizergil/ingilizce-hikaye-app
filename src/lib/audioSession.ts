import { setAudioModeAsync } from "expo-audio";

import { trackError } from "@/lib/analytics";

/**
 * Ses oturumunu (AVAudioSession / AudioManager) uygulama açılışında bir
 * kez yapılandırır.
 *
 * ÇÖZÜLEN HATA (2026-09-07): kullanıcı, telefon sessizdeyken kelime
 * telaffuzunun hiç çalmadığını bildirdi.
 *
 * Sebep: telaffuz `expo-speech` ile yapılıyor, o da iOS'ta
 * `AVSpeechSynthesizer` üzerinden çalışıyor. Uygulama ses oturumu
 * kategorisini hiç ayarlamadığı için iOS varsayılan olarak "ambient"
 * kategorisini kullanıyordu — bu kategori yan taraftaki sessiz anahtarına
 * uyar ve sesi tamamen keser. Kullanıcı hiçbir hata görmüyor, ses
 * yalnızca çalmıyordu.
 *
 * `playsInSilentMode: true` oturumu "playback" kategorisine geçiriyor;
 * telaffuz, tıpkı bir müzik/podcast uygulamasında olduğu gibi sessiz
 * anahtarından bağımsız çalıyor. Bu doğru davranış: kullanıcı sesi
 * kendisi, telaffuz düğmesine basarak istiyor — kendiliğinden çalan bir
 * ses değil.
 *
 * Diğer seçimler:
 * - `interruptionMode: "duckOthers"`: arka planda müzik/podcast dinleyerek
 *   okuyan kullanıcının sesi tamamen kesilmesin, telaffuz süresince
 *   kısılsın. `doNotMix` diğer uygulamayı durdurur ve kullanıcı bunu elle
 *   yeniden başlatmak zorunda kalır — tek kelimelik bir telaffuz için
 *   fazla saldırgan.
 * - `shouldPlayInBackground: false`: telaffuz kısa ve ekrana bağlı;
 *   arka plan sesi hem gereksiz hem de App Store incelemesinde
 *   gerekçelendirilmesi gereken bir yetki.
 * - `allowsRecording: false`: uygulama mikrofon kullanmıyor. `true`
 *   olsaydı iOS oturumu kayıt kategorisine alır ve çıkış sesini
 *   kısardı.
 */
export async function configureAudioSession(): Promise<void> {
  try {
    await setAudioModeAsync({
      playsInSilentMode: true,
      interruptionMode: "duckOthers",
      shouldPlayInBackground: false,
      allowsRecording: false,
    });
  } catch (error) {
    // Ses oturumu ayarlanamazsa uygulama çalışmaya devam etmeli:
    // telaffuz yine denenir, yalnızca sessiz modda duyulmaz. Sessizce
    // yutulmuyor ki bu durum telemetride görünsün.
    trackError("audioSession.configure", error);
  }
}
