/**
 * Okur seviyesi (2026-10-06). XP sunucuda türetiliyor (`get_user_xp`,
 * migration 053); burada yalnızca XP -> seviye eğrisi var.
 *
 * EĞRİ: L. seviyeden L+1'e geçmek `100 + 50 * (L - 1)` XP ister (100, 150,
 * 200...). Günde ~20 dk okuyan biri (~70 XP/gün) ilk haftada Seviye 5'e,
 * bir ayda ~Seviye 9'a çıkar: başta hızlı ödül, sonra anlamlı ilerleme.
 */
export const MAX_LEVEL = 99;

export function xpForNextLevel(level: number): number {
  return 100 + 50 * (level - 1);
}

export interface LevelProgress {
  level: number;
  /** Bu seviyede toplanan XP. */
  intoLevel: number;
  /** Bu seviyeyi bitirmek için gereken toplam XP. */
  needed: number;
  /** 0..1 */
  fraction: number;
}

export function levelFromXp(totalXp: number): LevelProgress {
  let level = 1;
  let remaining = Math.max(0, Math.floor(totalXp));
  while (level < MAX_LEVEL && remaining >= xpForNextLevel(level)) {
    remaining -= xpForNextLevel(level);
    level += 1;
  }
  const needed = xpForNextLevel(level);
  return { level, intoLevel: remaining, needed, fraction: Math.min(1, remaining / needed) };
}

/** Unvan basamakları: seviye aralığının alt sınırı -> çeviri anahtarı. */
const RANKS = [
  { from: 1, key: "newcomer" },
  { from: 5, key: "curious" },
  { from: 10, key: "bookworm" },
  { from: 15, key: "storyHunter" },
  { from: 20, key: "explorer" },
  { from: 30, key: "master" },
  { from: 40, key: "legend" },
] as const;

export type RankKey = (typeof RANKS)[number]["key"];

export function rankForLevel(level: number): RankKey {
  let rank: RankKey = "newcomer";
  for (const r of RANKS) if (level >= r.from) rank = r.key;
  return rank;
}

export interface XpBreakdown {
  reading: number;
  words: number;
  reviews: number;
  quiz: number;
  books: number;
  today: number;
}

export function totalXp(xp: XpBreakdown): number {
  return xp.reading + xp.words + xp.reviews + xp.quiz + xp.books;
}
