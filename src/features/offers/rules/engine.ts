import { RULE_TRIGGERS } from "@/features/offers/types";

import type {
  Condition,
  ConditionOp,
  ConditionValue,
  Presentation,
  Rule,
  RuleContext,
  RuleHistory,
  RuleTrigger,
} from "@/features/offers/types";

/**
 * Kural motorunun SAF çekirdeği (rapor §6 C6; Vocabulary `interruptions`
 * seçim sırası, PAYWALL-RAPORU §5.3).
 *
 * Seçim sırası:
 *   0. başka bir diyalog/sheet açıksa hiçbir şey seçilmez (T3; çağıran
 *      sonra yeniden dener),
 *   1. tetikleyici eşleşir ve sürüm yeterlidir,
 *   2. okuyucu kaynaklı `paywall_closed` hiçbir kuralı tetiklemez,
 *   3. ödeme sorunu varken indirim (`sale`) kuralı seçilmez; kalıcı
 *      holdout'taki (ya da ataması bilinmeyen) kullanıcıya zamanlanmış
 *      teklif (`sale`, `downsell`) seçilmez,
 *   4. tam ekran: ilk gün koruması (kurulum günü -- ya da kurulum anı
 *      bilinmiyorsa -- yok), oturumda en fazla bir tane ve aralarında 20
 *      saat (`exemptGlobalCooldown` muaf),
 *   5. kuralın kendi ömür boyu sınırı ve cooldown'u,
 *   6. koşulların hepsi (bilinmeyen/null alan -> kural seçilmez),
 *   7. en yüksek `rank`.
 */

/** Tam ekran teklifler arası en kısa süre (saat). */
export const GLOBAL_FULLSCREEN_COOLDOWN_HOURS = 20;

/** "Hiç gösterilmedi" için kullanılan büyük süre (Vocabulary: 9999). */
export const NEVER_HOURS = 9999 * 24;

/**
 * Kalıcı holdout'un göremediği eylem türleri: kural motorunun KENDİLİĞİNDEN
 * gösterdiği teklifler. Bağlamsal paywall'lar (kullanıcının kilitli bir
 * şeye dokunması) motordan geçmediği için onlarda zaten açık kalıyor.
 */
export const HOLDOUT_EXCLUDED_KINDS: ReadonlySet<string> = new Set(["sale", "downsell"]);

/**
 * Okuyucu içinden açılan paywall kaynakları. Bunların kapanışı hiçbir
 * kuralı tetiklemez: okuyucuya dönen kullanıcının önüne indirim ekranı
 * çıkarmak okuma ekranına promosyon sokmak olurdu (Ürün İlkesi #1). Kural
 * tablosunda yanlışlıkla bu kaynaklara bakan bir satır olsa bile.
 */
export const READER_SOURCES: ReadonlySet<string> = new Set([
  "word_quota",
  "word_quota_badge",
  "sentence_quota",
  "reader_listen",
]);

const OPS: ReadonlySet<string> = new Set<ConditionOp>([
  "=",
  "!=",
  "<",
  "<=",
  ">",
  ">=",
  "in",
  "not_in",
]);
const PRESENTATIONS: ReadonlySet<string> = new Set<Presentation>([
  "fullscreen",
  "sheet",
  "card",
  "banner",
]);
const TRIGGERS: ReadonlySet<string> = new Set<string>(RULE_TRIGGERS);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isScalar(value: unknown): value is number | string | boolean {
  return typeof value === "number" || typeof value === "string" || typeof value === "boolean";
}

function parseCondition(raw: unknown): Condition | null {
  if (!isRecord(raw)) return null;
  const { field, op, value } = raw;
  if (typeof field !== "string" || typeof op !== "string" || !OPS.has(op)) return null;
  if (op === "in" || op === "not_in") {
    if (!Array.isArray(value)) return null;
    if (!value.every((item) => typeof item === "string" || typeof item === "number")) return null;
    return { field, op: op as ConditionOp, value: value as (string | number)[] };
  }
  if (!isScalar(value)) return null;
  return { field, op: op as ConditionOp, value };
}

function optionalNumber(value: unknown): number | null | undefined {
  if (value === null || value === undefined) return null;
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

/**
 * Sunucudan (ya da gömülü JSON'dan) gelen ham satırları doğrular.
 *
 * Bozuk satır ATILIR, liste yine çalışır: tek bir yanlış yazılmış kural
 * diğer bütün teklifleri durdurmamalı. Bilinmeyen tetikleyici, koşul ya da
 * operatör taşıyan kural da atılır (eski bir uygulama sürümü yeni bir
 * koşul türünü yanlış yorumlamasın).
 */
export function parseRules(raw: unknown): Rule[] {
  if (!Array.isArray(raw)) return [];
  const rules: Rule[] = [];
  for (const row of raw) {
    if (!isRecord(row)) continue;
    const { id, trigger, presentation, rank, conditions, action } = row;
    if (typeof id !== "string" || id.length === 0) continue;
    if (typeof trigger !== "string" || !TRIGGERS.has(trigger)) continue;
    if (typeof presentation !== "string" || !PRESENTATIONS.has(presentation)) continue;
    if (!isRecord(action) || typeof action.kind !== "string") continue;
    if (!Array.isArray(conditions)) continue;
    const parsed = conditions.map(parseCondition);
    if (parsed.some((condition) => condition === null)) continue;

    const cooldownHours = optionalNumber(row.cooldown_hours);
    const maxShows = optionalNumber(row.max_shows);
    if (cooldownHours === undefined || maxShows === undefined) continue;

    rules.push({
      id,
      trigger: trigger as RuleTrigger,
      presentation: presentation as Presentation,
      rank: typeof rank === "number" && Number.isFinite(rank) ? rank : 0,
      conditions: parsed as Condition[],
      action: action as unknown as Rule["action"],
      cooldownHours,
      maxShows,
      exemptGlobalCooldown: row.exempt_global_cooldown === true,
      minAppVersion: typeof row.min_app_version === "string" ? row.min_app_version : null,
    });
  }
  return rules;
}

/** "1.2.10" >= "1.2.9". Sürüm şartı yoksa her sürüm yeterli. */
export function semverGte(version: string, minimum: string | null): boolean {
  if (!minimum) return true;
  const parse = (value: string) =>
    (value.split("-")[0] ?? "").split(".").map((part) => Number.parseInt(part, 10) || 0);
  const a = parse(version);
  const b = parse(minimum);
  for (let index = 0; index < Math.max(a.length, b.length); index += 1) {
    const left = a[index] ?? 0;
    const right = b[index] ?? 0;
    if (left !== right) return left > right;
  }
  return true;
}

function readField(ctx: RuleContext, field: string): unknown {
  return Object.prototype.hasOwnProperty.call(ctx, field)
    ? (ctx as unknown as Record<string, unknown>)[field]
    : undefined;
}

/** Tek koşul. Alan yoksa, null'sa ya da türü uyuşmuyorsa false. */
export function evalCondition(ctx: RuleContext, condition: Condition): boolean {
  const actual = readField(ctx, condition.field);
  if (actual === undefined || actual === null) return false;
  const expected: ConditionValue = condition.value;

  switch (condition.op) {
    case "in":
    case "not_in": {
      if (!Array.isArray(expected) || !isScalar(actual) || typeof actual === "boolean") {
        return false;
      }
      const hit = (expected as (string | number)[]).includes(actual);
      return condition.op === "in" ? hit : !hit;
    }
    case "=":
    case "!=": {
      if (Array.isArray(expected) || typeof actual !== typeof expected) return false;
      return condition.op === "=" ? actual === expected : actual !== expected;
    }
    default: {
      if (typeof actual !== "number" || typeof expected !== "number") return false;
      if (condition.op === "<") return actual < expected;
      if (condition.op === "<=") return actual <= expected;
      if (condition.op === ">") return actual > expected;
      return actual >= expected;
    }
  }
}

export interface PickOptions {
  appVersion: string;
  /** Kural başına gösterim geçmişi. */
  history: Readonly<Record<string, RuleHistory>>;
  /** Bu oturumda tam ekran bir kural zaten gösterildi mi. */
  fullscreenShownThisSession: boolean;
  /** Ekranda başka bir diyalog/sheet açık mı (`useDialogGuardStore`). */
  dialogOpen?: boolean;
  now: number;
}

const HOUR_MS = 60 * 60 * 1000;

function hoursSince(at: number | null, now: number): number {
  return at === null ? NEVER_HOURS : (now - at) / HOUR_MS;
}

/** Tetikleyici için seçilen kural; hiçbiri uymuyorsa null. */
export function pickRule(
  trigger: RuleTrigger,
  rules: readonly Rule[],
  ctx: RuleContext,
  options: PickOptions,
): Rule | null {
  if (options.dialogOpen) return null;
  if (trigger === "paywall_closed" && ctx.source !== null && READER_SOURCES.has(ctx.source)) {
    return null;
  }

  const candidates = rules.filter((rule) => {
    if (rule.trigger !== trigger) return false;
    if (!semverGte(options.appVersion, rule.minAppVersion)) return false;
    if (ctx.billingIssue && rule.action.kind === "sale") return false;
    if (ctx.inHoldout !== false && HOLDOUT_EXCLUDED_KINDS.has(rule.action.kind)) return false;

    if (rule.presentation === "fullscreen" && !rule.exemptGlobalCooldown) {
      if (ctx.daysSinceInstall === null || ctx.daysSinceInstall < 1) return false;
      if (options.fullscreenShownThisSession) return false;
      if (ctx.hoursSinceLastFullscreen < GLOBAL_FULLSCREEN_COOLDOWN_HOURS) return false;
    }

    const history = options.history[rule.id] ?? { shows: 0, lastShownAt: null };
    if (rule.maxShows !== null && history.shows >= rule.maxShows) return false;
    if (
      rule.cooldownHours !== null &&
      hoursSince(history.lastShownAt, options.now) < rule.cooldownHours
    ) {
      return false;
    }

    return rule.conditions.every((condition) => evalCondition(ctx, condition));
  });

  // Eşit rank'te kimlik sırası: sonuç belirleyici (deterministik) kalsın.
  candidates.sort((a, b) => b.rank - a.rank || a.id.localeCompare(b.id));
  return candidates[0] ?? null;
}
