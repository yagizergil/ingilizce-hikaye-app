import { useQuery } from "@tanstack/react-query";

import { localDateKey } from "@/lib/localDate";
import { supabase } from "@/lib/supabase";

export interface ReminderData {
  /** Vadesi gelmiş tekrar kartı sayısı. */
  dueCount: number;
  /** Yarım kalan kitabın adı; yoksa null. */
  unfinishedBookTitle: string | null;
  /** Mevcut kesintisiz okuma günü sayısı. */
  streakDays: number;
  /** Kullanıcı bugün okudu mu. */
  readToday: boolean;
}

/**
 * Hatırlatma planı için gereken DÖRT değer, tek sorguda.
 *
 * NEDEN AYRI BİR SORGU, MEVCUT FEATURE HOOK'LARI DEĞİL
 * ----------------------------------------------------
 * İlk hâlde bu veriler üç ayrı feature'ın barrel'ından çekiliyordu
 * (`useDueCardsQuery`, `useCurrentlyReadingQuery`, `useProfileStatsQuery`).
 * İki somut sorun çıkardı:
 *
 *  1. **Require cycle.** `reminders` → `profile` → `ProfileScreen` →
 *     `reminders` (ProfileScreen hatırlatma ayarı satırını kullanıyor).
 *     Metro bunu uyarıyla geçiyor ama modüllerden biri ilklenmemiş
 *     değerle gelebiliyor — sessiz ve teşhisi zor bir hata sınıfı.
 *
 *  2. **Gereksiz ağır.** Üç hook uygulama açılışında çalışıyordu ve
 *     ihtiyaç duyulandan çok fazlasını çekiyorlardı: `useDueCardsQuery`
 *     yalnızca bir SAYI için 20 kartı bağlam metniyle birlikte,
 *     `useProfileStatsQuery` yalnızca seri için tüm haftanın satırlarını
 *     getiriyordu.
 *
 * Hatırlatma özelliğinin ihtiyacı dar ve kendine ait; o yüzden kendi dar
 * sorgusu var. Böylece `features/reminders` başka HİÇBİR feature'a
 * bağımlı değil.
 *
 * NEDEN CİHAZIN GÜNÜ: "bugün okudu mu" bir takvim günü sorusu ve doğru
 * takvim kullanıcının kendi takvimi. Önceden burası Europe/Istanbul'u
 * kullanıyordu çünkü sunucudaki `get_user_streak()` öyle sayıyordu; oysa
 * okuma süresi UTC gününe YAZILIYORDU, yani üç taraf üç ayrı günden
 * bahsediyordu. Artık üçü de istemcinin yerel gününü kullanıyor
 * (migration 044).
 */

async function fetchReminderData(): Promise<ReminderData> {
  const { data: userData } = await supabase.auth.getUser();
  const userId = userData.user?.id;
  if (!userId) {
    return { dueCount: 0, unfinishedBookTitle: null, streakDays: 0, readToday: false };
  }

  const nowIso = new Date().toISOString();
  const today = localDateKey();

  const [due, progress, streak, todayStat] = await Promise.all([
    supabase
      .from("srs_cards")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("card_type", "recognition")
      .lte("due_at", nowIso),
    supabase
      .from("user_book_progress")
      .select("book_id")
      .eq("user_id", userId)
      .is("finished_at", null)
      .order("last_read_at", { ascending: false })
      .limit(1)
      .maybeSingle<{ book_id: string }>(),
    supabase.rpc("get_user_streak", { p_today: today }),
    // `minutes`, `words_read` DEĞİL: `words_read` sütununa hiçbir kod yazı
    // yazmıyor (migration 041'de seri için de aynı sebeple değiştirildi).
    // Okuyan tarafta kalan son kullanımı buydu: `readToday` HER GÜN false
    // dönüyor, yani seri-kurtarma bildirimi kullanıcı o gün okusa bile
    // gönderiliyordu.
    supabase
      .from("user_reading_stats")
      .select("minutes")
      .eq("user_id", userId)
      .eq("date", today)
      .maybeSingle<{ minutes: number }>(),
  ]);

  let unfinishedBookTitle: string | null = null;
  if (progress.data?.book_id) {
    // Kitap adı ayrı çekiliyor: gömülü join için `books` üzerinde bir
    // ilişki adı varsaymak yerine iki basit sorgu daha dayanıklı.
    const { data: book } = await supabase
      .from("books")
      .select("title")
      .eq("id", progress.data.book_id)
      .maybeSingle<{ title: string }>();
    unfinishedBookTitle = book?.title ?? null;
  }

  return {
    dueCount: due.count ?? 0,
    unfinishedBookTitle,
    streakDays: typeof streak.data === "number" ? streak.data : 0,
    readToday: (todayStat.data?.minutes ?? 0) > 0,
  };
}

/**
 * Sorgu yalnızca kullanıcı hatırlatmaları AÇTIYSA çalışıyor (`enabled`).
 * Kapalıyken uygulama açılışında dört ağ çağrısı yapmanın hiçbir karşılığı
 * yok — varsayılan kapalı olduğu için bu kullanıcıların çoğu demek.
 */
export function useReminderDataQuery(enabled: boolean) {
  return useQuery({
    queryKey: ["reminders", "data"],
    queryFn: fetchReminderData,
    enabled,
    // Plan uygulama arka plana alınırken kuruluyor; o an birkaç dakikalık
    // bayat veri kabul edilebilir, ama bir oturum boyunca taze kalmalı.
    staleTime: 2 * 60 * 1000,
  });
}
