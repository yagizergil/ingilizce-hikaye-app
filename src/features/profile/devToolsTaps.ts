/** Kaç ardışık dokunuş geliştirici araçlarını açıyor. */
export const DEVTOOLS_TAP_COUNT = 7;
/** İki dokunuş arası bu süreyi aşarsa sayaç baştan başlıyor (ms). */
export const DEVTOOLS_TAP_WINDOW = 1500;

export interface TapState {
  count: number;
  last: number;
}

/**
 * Saf sayaç: dokunuş serisini ilerletir; pencere aşıldıysa 1'den başlar.
 * Bağımlılığı olmayan ayrı dosyada: test, `analytics` -> `supabase` zincirini
 * (ve onun ortam değişkenlerini) çekmeden çalışabilsin.
 */
export function nextTapState(previous: TapState, now: number): TapState {
  const withinWindow = previous.count > 0 && now - previous.last <= DEVTOOLS_TAP_WINDOW;
  return { count: withinWindow ? previous.count + 1 : 1, last: now };
}
