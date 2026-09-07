// Hesap silme (App Store 5.1.1(v) zorunluluğu).
// İstemci kendi JWT'siyle çağırır; bu fonksiyon çağıranın kimliğini
// JWT'den doğrular, sonra service_role ile auth.users satırını siler.
// auth.users(id) referanslı tüm public.* tablolar "on delete cascade"
// ile kurulmuş (bkz. 001-004 migration'ları), yani tek silme işlemi
// profiles, user_saved_words, user_lemma_state, user_book_progress,
// srs_cards, srs_reviews, user_reading_sessions, user_reading_stats,
// user_vocabulary_estimate, user_book_coverage_cache, user_entitlements,
// ai_usage satırlarının hepsini otomatik temizler.
import { createClient } from "jsr:@supabase/supabase-js@2";

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return new Response(JSON.stringify({ error: "missing_authorization" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  // Çağıranın kimliğini kendi JWT'siyle doğrula (anon key + Authorization header).
  const callerClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });
  const {
    data: { user },
    error: userError,
  } = await callerClient.auth.getUser();

  if (userError || !user) {
    return new Response(JSON.stringify({ error: "not_authorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Silme işlemini service_role ile yap — sadece doğrulanmış kendi hesabı.
  const adminClient = createClient(supabaseUrl, serviceRoleKey);
  const { error: deleteError } = await adminClient.auth.admin.deleteUser(user.id);

  if (deleteError) {
    return new Response(JSON.stringify({ error: "delete_failed" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  return new Response(JSON.stringify({ success: true }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
});
