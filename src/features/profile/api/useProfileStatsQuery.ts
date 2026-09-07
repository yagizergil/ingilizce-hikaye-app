import { useQuery } from "@tanstack/react-query";

import { supabase } from "@/lib/supabase";

import { profileQueryKeys } from "@/features/profile/api/queryKeys";

import type { ProfileDailyMinutes, ProfileStats } from "@/features/profile/types";

interface ReadingStatsRow {
  date: string;
  minutes: number;
}

/** `Date` -> YYYY-MM-DD (yerel gün, UTC kaymasi olmadan). */
function toDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/** Bugünden `offset` gün önceki günün anahtarı. */
function dateKeyDaysAgo(offset: number): string {
  const date = new Date();
  date.setHours(12, 0, 0, 0); // yaz saati geçişlerinde gün kaymasını önler
  date.setDate(date.getDate() - offset);
  return toDateKey(date);
}

/** Bu ISO haftasının (Pazartesi başlangıçlı) Pazartesi günü. */
function currentWeekMonday(): Date {
  const now = new Date();
  now.setHours(12, 0, 0, 0);
  const daysSinceMonday = (now.getDay() + 6) % 7; // 0 = Pazar
  now.setDate(now.getDate() - daysSinceMonday);
  return now;
}

/**
 * Kesintisiz okuma serisi.
 *
 * Seri BUGÜN veya DÜN bitmiş olabilir: kullanıcı henüz bugün okumadıysa
 * serisi "kırıldı" sayılmaz — gün bitmedi. Dünden önce biten bir seri ise
 * artık geçerli değil. Duolingo dahil bütün seri mekanikleri bu kuralı
 * kullanıyor; aksi hâlde sabah uygulamayı açan kullanıcı serisini sıfır
 * görür ve motivasyonu kırılır.
 */
function computeCurrentStreak(activeDays: Set<string>): number {
  const today = dateKeyDaysAgo(0);
  const yesterday = dateKeyDaysAgo(1);

  let offset: number;
  if (activeDays.has(today)) offset = 0;
  else if (activeDays.has(yesterday)) offset = 1;
  else return 0;

  let streak = 0;
  while (activeDays.has(dateKeyDaysAgo(offset))) {
    streak += 1;
    offset += 1;
  }
  return streak;
}

/** Tüm zamanların en uzun kesintisiz serisi. */
function computeLongestStreak(sortedDateKeys: string[]): number {
  let longest = 0;
  let run = 0;
  let previous: number | null = null;

  for (const key of sortedDateKeys) {
    const time = new Date(`${key}T12:00:00`).getTime();
    const isNextDay = previous !== null && Math.round((time - previous) / 86_400_000) === 1;
    run = isNextDay ? run + 1 : 1;
    if (run > longest) longest = run;
    previous = time;
  }

  return longest;
}

/** Pazartesi'den Pazar'a 7 gün; okunmayan günler 0 dakika. */
function buildWeekDays(minutesByDate: Map<string, number>): ProfileDailyMinutes[] {
  const monday = currentWeekMonday();
  const days: ProfileDailyMinutes[] = [];

  for (let index = 0; index < 7; index++) {
    const day = new Date(monday);
    day.setDate(monday.getDate() + index);
    const key = toDateKey(day);
    days.push({ date: key, minutes: Math.round(minutesByDate.get(key) ?? 0) });
  }

  return days;
}

/**
 * Profil ekranının tüm istatistikleri.
 *
 * KAYNAK: `user_reading_stats` — kullanıcı başına gün başına tek satır,
 * `minutes` sütunuyla (bkz. migration 004). Bu tabloya yazan taraf
 * uzun süre eksikti; `record_reading_session` (migration 026) ve
 * `useReadingSession` ile dolduruluyor.
 *
 * NEDEN TÜM SATIRLAR ÇEKİLİYOR: seri (streak) hesabı yalnızca bu haftaya
 * bakarak yapılamaz — 40 günlük bir seri de doğru sayılmalı. Satır sayısı
 * "kullanıcının okuduğu gün sayısı" kadar; en aktif kullanıcıda bile
 * yılda 365 satır, tek istekte rahatça geliyor. Sunucuda toplamak için
 * ayrı bir fonksiyon yazmak bu boyutta erken optimizasyon olurdu.
 *
 * Kaydedilen kelime sayısı bilerek BURADA yok — `useVocabularyQuery`
 * (features/vocabulary) onun sahibi ve ekran oradan okuyor.
 */
export async function fetchProfileStats(): Promise<ProfileStats> {
  const [statsResult, completedResult] = await Promise.all([
    supabase
      .from("user_reading_stats")
      .select("date, minutes")
      .order("date", { ascending: true })
      .returns<ReadingStatsRow[]>(),
    supabase
      .from("user_book_progress")
      .select("book_id", { count: "exact", head: true })
      .not("finished_at", "is", null),
  ]);

  if (statsResult.error) throw statsResult.error;
  if (completedResult.error) throw completedResult.error;

  const rows = statsResult.data ?? [];
  const minutesByDate = new Map<string, number>();
  for (const row of rows) {
    minutesByDate.set(row.date, (minutesByDate.get(row.date) ?? 0) + row.minutes);
  }

  const activeDays = new Set(minutesByDate.keys());
  const sortedDateKeys = [...activeDays].sort();
  const weekDays = buildWeekDays(minutesByDate);

  const totalMinutes = [...minutesByDate.values()].reduce((sum, minutes) => sum + minutes, 0);
  const readingMinutesThisWeek = weekDays.reduce((sum, day) => sum + day.minutes, 0);

  return {
    daysActiveThisWeek: weekDays.filter((day) => day.minutes > 0).length,
    readingMinutesThisWeek,
    weekDays,
    currentStreak: computeCurrentStreak(activeDays),
    longestStreak: computeLongestStreak(sortedDateKeys),
    readToday: activeDays.has(dateKeyDaysAgo(0)),
    totalMinutes: Math.round(totalMinutes),
    totalActiveDays: activeDays.size,
    completedBookCount: completedResult.count ?? 0,
  };
}

export function useProfileStatsQuery() {
  return useQuery({
    queryKey: profileQueryKeys.stats(),
    queryFn: fetchProfileStats,
  });
}
