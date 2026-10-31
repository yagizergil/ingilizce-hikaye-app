import { NEVER_HOURS } from "@/features/offers/rules/engine";

import type { RuleContext, RuleHistory } from "@/features/offers/types";

/** Kalıcı holdout oranı (yüzde). Kova < bu sayı -> holdout. */
export const HOLDOUT_PERCENT = 10;

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;

/** `paywall_context()` RPC'sinin (migration 092) istemci hâli. */
export interface OfferServerContext {
  /** ms; profil satırı yoksa null. */
  installAt: number | null;
  everSubscribed: boolean;
  readSessions24h: number;
  userBucket: number | null;
  holdoutBucket: number | null;
  history: Record<string, RuleHistory>;
  lastFullscreenAt: number | null;
  lastSaleAt: number | null;
}

/** Bu cihazda tutulan gösterim geçmişi (çevrimdışı gösterimler dahil). */
export interface LocalOfferHistory {
  history: Record<string, RuleHistory>;
  lastFullscreenAt: number | null;
  lastSaleAt: number | null;
}

export interface ContextInput {
  now: number;
  isPremium: boolean;
  trialEligible: boolean;
  billingIssue?: boolean;
  firstChapterFinished: boolean;
  server: OfferServerContext | null;
  local: LocalOfferHistory;
  source?: string | null;
}

function latest(a: number | null, b: number | null): number | null {
  if (a === null) return b;
  if (b === null) return a;
  return Math.max(a, b);
}

/**
 * Sunucu ve yerel geçmişi birleştirir: gösterim sayısı ikisinin büyüğü,
 * son gösterim ikisinin sonuncusu. Sunucuya henüz yazılamamış (çevrimdışı)
 * bir gösterim de sıklık sınırına sayılsın, sunucuya yazılmış ama bu cihazda
 * olmayan (yeniden kurulum) da.
 */
export function mergeHistory(
  server: Record<string, RuleHistory> | undefined,
  local: Record<string, RuleHistory>,
): Record<string, RuleHistory> {
  const merged: Record<string, RuleHistory> = {};
  for (const id of new Set([...Object.keys(server ?? {}), ...Object.keys(local)])) {
    const a = server?.[id];
    const b = local[id];
    merged[id] = {
      shows: Math.max(a?.shows ?? 0, b?.shows ?? 0),
      lastShownAt: latest(a?.lastShownAt ?? null, b?.lastShownAt ?? null),
    };
  }
  return merged;
}

/**
 * 2. gün indiriminin (`sale_d2`) başlamasına kalan saat. Yalnızca kurulumun
 * ilk iki gününde anlamlı; sonrasında "uzak" (kaskad engellenmez).
 *
 * NEDEN YALNIZCA D2: kaskad kuralı "sıradaki takvim indirimine 24 saatten
 * az kaldıysa atla" diyor (Vocabulary). 3. günden sonra takvim indirimleri
 * zaten "son indirimden >= 7 gün" ile kaskadla aynı sıklık bütçesini
 * paylaşıyor (`hoursSinceLastSale`), ayrıca hesaplamaya gerek yok.
 */
export function hoursToNextCalendarSale(installAt: number | null, now: number): number {
  if (installAt === null) return NEVER_HOURS;
  const d2Start = installAt + 2 * DAY_MS;
  if (now >= d2Start) return NEVER_HOURS;
  return (d2Start - now) / HOUR_MS;
}

export function isInHoldout(holdoutBucket: number | null): boolean | null {
  return holdoutBucket === null ? null : holdoutBucket < HOLDOUT_PERCENT;
}

export function daysSince(at: number | null, now: number): number | null {
  if (at === null) return null;
  return Math.max(0, Math.floor((now - at) / DAY_MS));
}

function hoursSince(at: number | null, now: number): number {
  return at === null ? NEVER_HOURS : (now - at) / HOUR_MS;
}

export function buildRuleContext(input: ContextInput): {
  context: RuleContext;
  history: Record<string, RuleHistory>;
} {
  const { now, server, local } = input;
  const installAt = server?.installAt ?? null;
  return {
    history: mergeHistory(server?.history, local.history),
    context: {
      isPremium: input.isPremium,
      trialEligible: input.trialEligible,
      everSubscribed: server ? server.everSubscribed : null,
      billingIssue: input.billingIssue ?? false,
      daysSinceInstall: daysSince(installAt, now),
      readSessions24h: server ? server.readSessions24h : null,
      userBucket: server?.userBucket ?? null,
      inHoldout: isInHoldout(server?.holdoutBucket ?? null),
      firstChapterFinished: input.firstChapterFinished,
      hoursSinceLastFullscreen: hoursSince(
        latest(server?.lastFullscreenAt ?? null, local.lastFullscreenAt),
        now,
      ),
      hoursSinceLastSale: hoursSince(latest(server?.lastSaleAt ?? null, local.lastSaleAt), now),
      hoursToNextCalendarSale: hoursToNextCalendarSale(installAt, now),
      source: input.source ?? null,
    },
  };
}

function toMs(value: unknown): number | null {
  if (typeof value !== "string") return null;
  const ms = Date.parse(value);
  return Number.isNaN(ms) ? null : ms;
}

/** RPC'nin jsonb yanıtını doğrular; şekli tutmuyorsa null. */
export function parseServerContext(raw: unknown): OfferServerContext | null {
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) return null;
  const row = raw as Record<string, unknown>;
  const history: Record<string, RuleHistory> = {};
  if (Array.isArray(row.impressions)) {
    for (const item of row.impressions) {
      if (typeof item !== "object" || item === null) continue;
      const entry = item as Record<string, unknown>;
      if (typeof entry.rule_id !== "string") continue;
      history[entry.rule_id] = {
        shows: typeof entry.shows === "number" ? entry.shows : 0,
        lastShownAt: toMs(entry.last_shown_at),
      };
    }
  }
  return {
    installAt: toMs(row.install_at),
    everSubscribed: row.ever_subscribed === true,
    readSessions24h: typeof row.read_sessions_24h === "number" ? row.read_sessions_24h : 0,
    userBucket: typeof row.user_bucket === "number" ? row.user_bucket : null,
    holdoutBucket: typeof row.holdout_bucket === "number" ? row.holdout_bucket : null,
    history,
    lastFullscreenAt: toMs(row.last_fullscreen_at),
    lastSaleAt: toMs(row.last_sale_at),
  };
}
