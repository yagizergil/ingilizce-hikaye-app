import fs from "node:fs";
import path from "node:path";

/**
 * Faz 1 migration'larının sözleşme testleri (057 testlerinin deseni:
 * paywallTriggers.test.ts). SQL burada çalıştırılmıyor; canlıya uygulamadan
 * önce kaybolmaması gereken kurallar metinde duruyor mu diye bakılıyor.
 */
const ROOT = path.resolve(__dirname, "../../../..");
const read = (file: string) =>
  fs.readFileSync(path.join(ROOT, "supabase/migrations", file), "utf8");

describe("060 olay defteri", () => {
  const sql = read("20261031000100_060_entitlement_event_ledger.sql");

  it("eski 8 parametreli imzayı düşürüyor (PostgREST belirsizliği olmasın)", () => {
    expect(sql).toMatch(
      /drop function if exists public\.apply_entitlement_event\(\s*uuid, text, timestamptz, text, text, text, bigint, boolean\s*\)/,
    );
  });

  it("yeni parametreler varsayılanlı (canlıdaki 8 argümanlı çağrılar çalışmaya devam eder)", () => {
    expect(sql).toContain("p_environment text default null");
    expect(sql).toContain("p_event_type text default null");
  });

  it("idempotans defterle, sıra kilitle, sandbox üretimi ezemiyor", () => {
    expect(sql).toContain("on conflict (event_id) do nothing");
    expect(sql).toContain("pg_advisory_xact_lock(hashtext('entitlement:'");
    expect(sql).toContain("'sandbox_ignored'");
  });

  it("yalnızca service_role çağırabilir, tabloda yazma politikası yok", () => {
    expect(sql).toMatch(/from public, anon, authenticated;/);
    expect(sql).not.toMatch(/for (insert|update|delete|all)/i);
    expect(sql).toContain("enable row level security");
  });
});

describe("059 denetçi bulguları", () => {
  const sql = read("20261031000000_059_advisor_anon_execute_and_view_invoker.sql");

  it("lemma_canonical yeniden security_invoker", () => {
    expect(sql).toContain("set (security_invoker = true)");
  });

  it("has_active_premium anon'dan GERİ ALINMIYOR (book_quiz_questions politikası)", () => {
    expect(sql).not.toMatch(/revoke[^;]*has_active_premium/);
  });
});
