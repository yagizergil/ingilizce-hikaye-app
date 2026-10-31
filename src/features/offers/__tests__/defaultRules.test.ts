import fs from "node:fs";
import path from "node:path";

import defaultRules from "@/features/offers/rules/defaultRules.json";
import { buildRuleContext } from "@/features/offers/rules/context";
import { parseRules, pickRule } from "@/features/offers/rules/engine";
import { RULE_TRIGGERS } from "@/features/offers/types";

import type { OfferServerContext } from "@/features/offers/rules/context";
import type { RuleTrigger } from "@/features/offers/types";

/**
 * Gömülü kurallar (sunucuya ulaşılamazsa kullanılan kopya) ile migration
 * 093'ün yazdığı satırlar AYNI kalmalı; ve bu kurallar rapor §5.3'teki
 * Lingo zaman çizelgesini gerçekten üretmeli.
 */

const ROOT = path.resolve(__dirname, "../../../..");
const MIGRATIONS = path.join(ROOT, "supabase/migrations");

function migration(fragment: string): string {
  const file = fs.readdirSync(MIGRATIONS).find((name) => name.includes(fragment));
  if (!file) throw new Error(`migration yok: ${fragment}`);
  return fs.readFileSync(path.join(MIGRATIONS, file), "utf8");
}

const rules = parseRules(defaultRules);
const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;
const NOW = 1_800_000_000_000;

function server(overrides: Partial<OfferServerContext> = {}): OfferServerContext {
  return {
    installAt: NOW - 2.5 * DAY,
    everSubscribed: false,
    readSessions24h: 1,
    userBucket: 10,
    holdoutBucket: 50,
    history: {},
    lastFullscreenAt: null,
    lastSaleAt: null,
    ...overrides,
  };
}

function pick(
  trigger: RuleTrigger,
  serverCtx: OfferServerContext | null,
  extra: { source?: string; isPremium?: boolean } = {},
) {
  const { context, history } = buildRuleContext({
    now: NOW,
    isPremium: extra.isPremium ?? false,
    trialEligible: true,
    firstChapterFinished: true,
    server: serverCtx,
    local: { history: {}, lastFullscreenAt: null, lastSaleAt: null },
    source: extra.source ?? null,
  });
  return pickRule(trigger, rules, context, {
    appVersion: "1.2.0",
    history,
    fullscreenShownThisSession: false,
    now: NOW,
  });
}

describe("gömülü kurallar", () => {
  it("hepsi doğrulayıcıdan geçiyor", () => {
    expect(rules).toHaveLength((defaultRules as unknown[]).length);
  });

  it("migration 093 ile birebir aynı koşul ve eylemleri taşıyor", () => {
    const sql = migration("_093_");
    for (const raw of defaultRules as { id: string; conditions: unknown; action: unknown }[]) {
      const match = new RegExp(
        `\\('${raw.id}', 'lingo', '[a-z_]+', '[a-z]+', \\d+,\\s*'(.*?)'::jsonb,\\s*'(.*?)'::jsonb`,
        "s",
      ).exec(sql);
      expect(match).not.toBeNull();
      expect(JSON.parse(match?.[1] ?? "null")).toEqual(raw.conditions);
      expect(JSON.parse(match?.[2] ?? "null")).toEqual(raw.action);
    }
  });

  it("tetikleyici beyaz listesi istemci ve veritabanında aynı", () => {
    const sql = migration("_090_");
    for (const trigger of RULE_TRIGGERS) expect(sql).toContain(`'${trigger}'`);
  });

  it("hiçbir kural ürün kimliği taşımıyor (yalnızca offering adı)", () => {
    expect(JSON.stringify(defaultRules)).not.toMatch(/product_id|com\.ingilizcehikaye/);
  });
});

describe("Lingo zaman çizelgesi (§5.3)", () => {
  it("gün 0: kural motoru tam ekran teklif göstermez", () => {
    expect(pick("app_open", server({ installAt: NOW - 2 * HOUR }))).toBeNull();
  });

  it("gün 2: okuma yaptıysa ve hiç abonelik başlatmadıysa sale_d2", () => {
    expect(pick("app_open", server())?.id).toBe("sale_d2");
    expect(pick("app_open", server({ readSessions24h: 0 }))).toBeNull();
    expect(pick("app_open", server({ everSubscribed: true }))).toBeNull();
    expect(pick("app_open", server(), { isPremium: true })).toBeNull();
  });

  it("gün 3-30: son indirimden 7 gün sonra; 30+: 14 gün sonra", () => {
    expect(
      pick("app_open", server({ installAt: NOW - 10 * DAY, lastSaleAt: NOW - 3 * DAY })),
    ).toBeNull();
    expect(
      pick("app_open", server({ installAt: NOW - 10 * DAY, lastSaleAt: NOW - 8 * DAY }))?.id,
    ).toBe("sale_d3_d30");
    expect(
      pick("app_open", server({ installAt: NOW - 40 * DAY, lastSaleAt: NOW - 10 * DAY })),
    ).toBeNull();
    expect(
      pick("app_open", server({ installAt: NOW - 40 * DAY, lastSaleAt: NOW - 15 * DAY }))?.id,
    ).toBe("sale_d30_plus");
  });

  it("kalıcı holdout (%10) takvim ve kaskad teklifi görmez", () => {
    const holdout = server({ holdoutBucket: 3 });
    expect(pick("app_open", holdout)).toBeNull();
    expect(
      pick("paywall_closed", { ...holdout, installAt: NOW - 10 * DAY }, { source: "audio" }),
    ).toBeNull();
  });

  it("sunucu bağlamı hiç yoksa zamanlanmış teklif yok", () => {
    expect(pick("app_open", null)).toBeNull();
  });

  it("kaskad: kilitli özellik paywall'u kapanınca, okuyucu kaynaklarında asla", () => {
    const later = server({ installAt: NOW - 10 * DAY });
    expect(pick("paywall_closed", later, { source: "audio" })?.id).toBe("sale_cascade");
    expect(pick("paywall_closed", later, { source: "word_quota" })).toBeNull();
    expect(pick("paywall_closed", later, { source: "reader_listen" })).toBeNull();
    expect(pick("paywall_closed", later, { source: "profile" })).toBeNull();
  });

  it("kaskad, D2 indirimine 24 saatten az kala atlanır", () => {
    expect(
      pick("paywall_closed", server({ installAt: NOW - 1.5 * DAY }), { source: "audio" }),
    ).toBeNull();
  });

  it("onboarding çıkış teklifi deney kolunda (kova < 50), kontrolde yok", () => {
    const fresh = { installAt: NOW - 10 * 60 * 1000 };
    expect(
      pick("paywall_closed", server({ ...fresh, userBucket: 10 }), { source: "onboarding" })?.id,
    ).toBe("onboarding_downsell");
    expect(
      pick("paywall_closed", server({ ...fresh, userBucket: 70 }), { source: "onboarding" }),
    ).toBeNull();
  });
});
