import { useReminderScheduler } from "@/features/reminders/hooks/useReminderScheduler";

/**
 * Hatırlatma planlayıcısını çalıştıran, hiçbir şey render etmeyen bileşen.
 *
 * NEDEN BİLEŞEN, DOĞRUDAN HOOK DEĞİL: planlayıcı TanStack Query kullanıyor,
 * yani `QueryClientProvider`'ın ALTINDA çalışmak zorunda. Kök layout
 * provider'ı render eden bileşenin ta kendisi olduğu için hook'u orada
 * çağırmak "No QueryClient set" hatası veriyordu — bir bileşen kendi
 * render ettiği provider'ın kapsamında değildir.
 *
 * Bu bileşen provider ağacının içine yerleştirilerek o sınırı geçiyor.
 * `null` döndürüyor: görevi yan etki, çıktı değil.
 */
export function ReminderScheduler(): null {
  useReminderScheduler();
  return null;
}
