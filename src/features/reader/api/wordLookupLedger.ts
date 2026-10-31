import AsyncStorage from "@/lib/storage";
import { isLikelyOfflineError } from "@/features/reader/api/offlineWordActionsQueue";

import type { WordLookupQuota } from "@/features/reader/api/useWordLookupQuota";

/**
 * KELİME KARTI KOTASI: SUNUCUYA ULAŞILAMADIĞINDA NE OLACAĞI (C4, G1).
 *
 * ESKİ DAVRANIŞ (fail-open): `consume_word_lookup()` başarısız olursa kart
 * koşulsuz açılıyor, hak düşmüyordu. Uçak modunu açıp kapatmak ya da isteği
 * engellemek, ücretsiz katmanın günlük 10 çeviri sınırını tamamen
 * kaldırıyordu: kitap sözlüğü cihazda (useBookLemmaDictionary), karar
 * yalnızca o RPC'nin cevabına bağlıydı.
 *
 * YENİ DAVRANIŞ (fail-closed ama okumayı gereksiz kesmeden):
 *
 *  1. Son 24 saatte açılmış bir kelime yine açılır, hak düşmez: hakkı zaten
 *     ödenmiş bir anlamı bağlantı yok diye saklamak anlamsız.
 *  2. Sunucudan alınmış SON kota bilgisi kullanılır:
 *     - premium (ve bilgi en fazla 72 saatlik) -> açılır;
 *     - ücretsiz ve `kalan - çevrimdışı açılanlar > 0` -> açılır ve bu
 *       açılış "borç" olarak kaydedilir;
 *     - ücretsiz ve hak bitmiş -> sunucunun "hakkın bitti" cevabıyla aynı
 *       yol (paywall).
 *  3. Kota hiç bilinmiyorsa kart AÇILMAZ, "bağlantı yok" denir.
 *
 *  Borçlar bağlantı gelince `consume_word_lookup()` ile sunucuya yazılır
 *  (`flushOfflineWordLookups`): böylece çevrimdışı açılışlar sunucu sayacına
 *  da girer ve uçak modu döngüsü sınırı sıfırlayamaz. Ücretsiz kotada son
 *  kota bilgisinin "kalan"ı ancak ARTABİLİR (kayan 24 saat penceresi), yani
 *  eski bir bilgiyle karar vermek her zaman güvenli tarafta kalır.
 *
 * NEDEN SUNUCUDA YENİ BİR `lookup_word()` RPC'si DEĞİL (belgedeki adım 1-2):
 * anlamlar `lemma_canonical` üzerinden kitap başına toplu indiriliyor ve
 * çevrimdışı okumanın temeli bu (ADR-004). Sözlük sütununu istemciye kapatmak
 * çevrimdışı sözlüğü, onboarding'i ve kelime defterini birlikte yeniden
 * tasarlamak demek -- ayrı bir ürün kararı. Bu katman, o karar verilene kadar
 * istemci tarafındaki tek açığı (ağ hatasında koşulsuz açılma) kapatıyor.
 */

/** Sunucu penceresiyle aynı: `now() - interval '24 hours'` (migration 057). */
export const LOOKUP_WINDOW_MS = 24 * 60 * 60 * 1000;

/** Premium bilgisine çevrimdışıyken en fazla bu kadar güvenilir (C1 adım 4). */
export const PREMIUM_SNAPSHOT_MAX_AGE_MS = 72 * 60 * 60 * 1000;

/** Hatırlanan kelime sayısının üst sınırı (depo şişmesin). */
const MAX_RECENT = 200;

const LEDGER_KEY = "reader.wordLookupLedger.v1";

export interface WordLookupLedger {
  /** Son açılan kelimeler (lemma) ve açılış anı. */
  recent: { lemma: string; at: number }[];
  /** Sunucuya henüz yazılmamış çevrimdışı açılışlar. */
  pending: { id: string; at: number }[];
  /** Sunucudan alınan son kota ve alındığı an. */
  quota: { value: WordLookupQuota; at: number } | null;
}

export type UnverifiedLookupDecision =
  "open_recent" | "open_premium" | "open_offline" | "paywall" | "unavailable";

export function emptyLedger(): WordLookupLedger {
  return { recent: [], pending: [], quota: null };
}

/** Pencere dışına düşen kayıtları atar. Bekleyen borçlar ATILMAZ. */
export function pruneLedger(ledger: WordLookupLedger, nowMs: number): WordLookupLedger {
  const recent = ledger.recent
    .filter((entry) => nowMs - entry.at < LOOKUP_WINDOW_MS)
    .slice(-MAX_RECENT);
  return { ...ledger, recent };
}

/**
 * Sunucu cevap veremediğinde kelime kartı açılsın mı? (saf, testli)
 */
export function decideUnverifiedWordLookup(
  ledger: WordLookupLedger,
  lemma: string,
  nowMs: number,
): UnverifiedLookupDecision {
  const fresh = pruneLedger(ledger, nowMs);
  if (fresh.recent.some((entry) => entry.lemma === lemma)) return "open_recent";

  const snapshot = fresh.quota;
  if (!snapshot) return "unavailable";

  if (snapshot.value.isPremium) {
    return nowMs - snapshot.at <= PREMIUM_SNAPSHOT_MAX_AGE_MS ? "open_premium" : "unavailable";
  }

  const remaining = snapshot.value.remaining ?? 0;
  return remaining - fresh.pending.length > 0 ? "open_offline" : "paywall";
}

async function readLedger(): Promise<WordLookupLedger> {
  const raw = await AsyncStorage.getItem(LEDGER_KEY);
  if (!raw) return emptyLedger();
  try {
    const parsed = JSON.parse(raw) as Partial<WordLookupLedger>;
    return {
      recent: Array.isArray(parsed.recent) ? parsed.recent : [],
      pending: Array.isArray(parsed.pending) ? parsed.pending : [],
      quota: parsed.quota ?? null,
    };
  } catch (error) {
    // Bozuk kayıt: boş defterle devam, ama sessizce değil. Boş defter
    // "kota bilinmiyor" demek, yani güvenli taraf (kart açılmaz).
    // eslint-disable-next-line no-console
    console.warn("[wordLookupLedger] kayıt okunamadı", error);
    return emptyLedger();
  }
}

async function writeLedger(ledger: WordLookupLedger): Promise<void> {
  await AsyncStorage.setItem(LEDGER_KEY, JSON.stringify(ledger));
}

/**
 * Defteri okuyup tek adımda değiştirir. Ardışık çağrılar sıraya girer;
 * aksi hâlde aynı anda gelen iki dokunuş birbirinin yazdığını ezerdi.
 */
let chain: Promise<unknown> = Promise.resolve();
function updateLedger<T>(
  mutate: (ledger: WordLookupLedger) => { next: WordLookupLedger; result: T },
): Promise<T> {
  const run = chain.then(async () => {
    const { next, result } = mutate(pruneLedger(await readLedger(), Date.now()));
    await writeLedger(next);
    return result;
  });
  chain = run.catch(() => undefined);
  return run;
}

/** Sunucudan gelen kota bilgisini saklar (sorgu ve tüketim başarısında). */
export function saveQuotaSnapshot(quota: WordLookupQuota): Promise<void> {
  return updateLedger((ledger) => ({
    next: { ...ledger, quota: { value: quota, at: Date.now() } },
    result: undefined,
  }));
}

/** Sunucunun onayladığı (ya da premium) bir açılışı hatırlar. */
export function noteWordLookup(lemma: string): Promise<void> {
  return updateLedger((ledger) => ({
    next: { ...ledger, recent: [...ledger.recent, { lemma, at: Date.now() }] },
    result: undefined,
  }));
}

/**
 * Sunucuya ulaşılamadığında kararı verir; "open_offline" ise borcu ve
 * kelimeyi aynı adımda kaydeder (iki hızlı dokunuş aynı son hakkı
 * kullanamaz).
 */
export function resolveUnverifiedWordLookup(lemma: string): Promise<UnverifiedLookupDecision> {
  return updateLedger((ledger) => {
    const now = Date.now();
    const decision = decideUnverifiedWordLookup(ledger, lemma, now);
    if (decision !== "open_offline" && decision !== "open_premium") {
      return { next: ledger, result: decision };
    }
    const recent = [...ledger.recent, { lemma, at: now }];
    const pending =
      decision === "open_offline"
        ? [...ledger.pending, { id: `${now}-${ledger.pending.length}`, at: now }]
        : ledger.pending;
    return { next: { ...ledger, recent, pending }, result: decision };
  });
}

/**
 * Hesap değişince (hesap silme, "baştan başla") defter silinir: eski hesabın
 * kotası ya da borcu yeni anonim hesaba taşınmasın.
 */
export function clearWordLookupLedger(): Promise<void> {
  return updateLedger(() => ({ next: emptyLedger(), result: undefined }));
}

let flushInFlight: Promise<void> | null = null;

/**
 * Çevrimdışı açılışları sunucu sayacına yazar (her biri bir
 * `consume_word_lookup()`). Sunucu "hak yok" dese de borç düşülür: anlam
 * zaten gösterildi, geri alınamaz; amaç sayacı doğru tutmak.
 *
 * Çevrimdışı hata -> durur, kalanlar sonraki denemeye. Kalıcı ret -> o borç
 * düşülür (offlineWordActionsQueue ile aynı ayrım).
 */
export function flushOfflineWordLookups(consume: () => Promise<unknown>): Promise<void> {
  if (flushInFlight) return flushInFlight;

  flushInFlight = (async () => {
    const { pending } = await readLedger();
    if (pending.length === 0) return;

    const settled = new Set<string>();
    for (const item of pending) {
      try {
        await consume();
        settled.add(item.id);
      } catch (error) {
        if (isLikelyOfflineError(error)) break;
        // eslint-disable-next-line no-console
        console.warn("[wordLookupLedger] borç sunucuya yazılamadı, düşüldü", error);
        settled.add(item.id);
      }
    }

    if (settled.size === 0) return;
    await updateLedger((ledger) => ({
      next: { ...ledger, pending: ledger.pending.filter((item) => !settled.has(item.id)) },
      result: undefined,
    }));
  })().finally(() => {
    flushInFlight = null;
  });

  return flushInFlight;
}
