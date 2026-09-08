// Stüdyo seslendirmesi için kısa ömürlü imzalı bağlantı üretir.
//
// NEDEN BU FONKSİYON VAR: `book-audio` deposu migration 031 ile herkese
// açık olmaktan çıktı. Açık kaldığı sürece herhangi bir premium kilidi
// yalnızca GÖRSEL olurdu — dosya adresleri `book_sections.audio_url`
// içinde duruyor ve o satırları her kullanıcı okuyabiliyor. Erişimi
// gerçekten kısıtlamanın tek yolu bağlantıyı sunucunun üretmesi.
//
// KARAR YERİ: erişim kuralı burada YENİDEN YAZILMIYOR; migration 031'deki
// `can_play_book_audio()` çağrılıyor. Aynı kural istemcide de (düğme
// kilitli mi) lazım; iki kopya zamanla ayrışır ve ayrıştığında kullanıcı ya
// ödediğini göremez ya da ödemediğini dinler.
//
// NE KISITLAMIYOR: cihaz üstü sesli okuma (ADR-011) bu yoldan geçmiyor ve
// ücretsiz kalmaya devam ediyor. Buradan dönen 403, kullanıcı için "ses
// yok" demek değil — reader sessizce cihaz sesine düşüyor.
import { createClient } from "jsr:@supabase/supabase-js@2";

const BUCKET = "book-audio";

/**
 * İmzalı bağlantının ömrü.
 *
 * Bir bölüm en fazla ~20 dakika; 2 saat, duraklatıp geri dönen kullanıcıyı
 * da rahatça kapsıyor. Daha uzunu bağlantının paylaşılabilirlik penceresini
 * gereksiz büyütürdü.
 */
const SIGNED_URL_TTL_SECONDS = 2 * 60 * 60;

function jsonResponse(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

/**
 * Depodaki nesne yolunu, satırda kayıtlı genel adresten çıkarır.
 *
 * NEDEN YOLU YENİDEN KURMUYORUZ: yol `{slug}/{order_index}.mp3` şablonundan
 * türetilebilirdi ama o şablon `pipeline/scripts/generate_audio.py` içinde
 * yaşıyor. İki yerde tutulan bir şablon, biri değiştiğinde sessizce bozulur;
 * satırdaki adres tek doğruluk kaynağı.
 */
function objectPath(publicUrl: string | null): string | null {
  if (!publicUrl) return null;
  const marker = `/object/public/${BUCKET}/`;
  const index = publicUrl.indexOf(marker);
  if (index === -1) return null;
  return decodeURIComponent(publicUrl.slice(index + marker.length));
}

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") {
    return jsonResponse({ error: "method_not_allowed" }, 405);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const authHeader = req.headers.get("Authorization") ?? "";

  const callerClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
    global: { headers: { Authorization: authHeader } },
  });

  const { data: userData, error: userError } = await callerClient.auth.getUser();
  if (userError || !userData?.user?.id) {
    return jsonResponse({ error: "not_authorized" }, 401);
  }

  let sectionId: string;
  try {
    const body = (await req.json()) as { sectionId?: unknown };
    if (typeof body.sectionId !== "string" || body.sectionId.length === 0) {
      return jsonResponse({ error: "invalid_body" }, 400);
    }
    sectionId = body.sectionId;
  } catch {
    return jsonResponse({ error: "invalid_body" }, 400);
  }

  // Bölümü ve kitabını ÇAĞIRANIN kimliğiyle okuyoruz: RLS neyi görebildiğine
  // zaten karar veriyor, service_role ile okumak o kontrolü atlatırdı.
  const { data: section, error: sectionError } = await callerClient
    .from("book_sections")
    .select("id, book_id, audio_url, audio_timings_url")
    .eq("id", sectionId)
    .maybeSingle();

  if (sectionError) {
    console.error(
      `chapter-audio: section read failed id=${sectionId} message=${sectionError.message}`,
    );
    return jsonResponse({ error: "lookup_failed" }, 500);
  }
  if (!section) {
    return jsonResponse({ error: "not_found" }, 404);
  }

  const audioPath = objectPath(section.audio_url);
  const timingsPath = objectPath(section.audio_timings_url);
  if (!audioPath || !timingsPath) {
    // Bu bölüm için stüdyo sesi üretilmemiş (klasiklerin tamamı böyle).
    // Hata değil: reader cihaz sesine düşecek.
    return jsonResponse({ error: "no_audio" }, 404);
  }

  const { data: allowed, error: accessError } = await callerClient.rpc("can_play_book_audio", {
    p_book_id: section.book_id,
  });

  if (accessError) {
    console.error(`chapter-audio: access check failed message=${accessError.message}`);
    return jsonResponse({ error: "lookup_failed" }, 500);
  }
  if (allowed !== true) {
    return jsonResponse({ error: "locked" }, 403);
  }

  const adminClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const [audioSigned, timingsSigned] = await Promise.all([
    adminClient.storage.from(BUCKET).createSignedUrl(audioPath, SIGNED_URL_TTL_SECONDS),
    adminClient.storage.from(BUCKET).createSignedUrl(timingsPath, SIGNED_URL_TTL_SECONDS),
  ]);

  if (audioSigned.error || timingsSigned.error) {
    console.error(
      `chapter-audio: sign failed audio=${audioSigned.error?.message ?? "-"} timings=${timingsSigned.error?.message ?? "-"}`,
    );
    return jsonResponse({ error: "sign_failed" }, 500);
  }

  return jsonResponse(
    {
      audioUrl: audioSigned.data.signedUrl,
      timingsUrl: timingsSigned.data.signedUrl,
      expiresInSeconds: SIGNED_URL_TTL_SECONDS,
    },
    200,
  );
});
