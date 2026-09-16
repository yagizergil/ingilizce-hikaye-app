import { useEffect, useState } from "react";

/**
 * Bir değerin GEÇ gelen kopyasını döner -- `value` art arda hızlı değişse
 * bile, döndürülen kopya yalnızca `delayMs` boyunca değişiklik olmadığında
 * güncellenir.
 *
 * NEDEN VAR (performans denetimi, 2026-09-16): kütüphane arama kutusu
 * `useFilteredBooks` içindeki `useMemo`'yu HER tuş vuruşunda tetikliyordu --
 * 356 kitaplık katalog her karakterde baştan filtrelenip sıralanıyordu.
 * Düşük uçlu bir cihazda hızlı yazarken bu gözle görülür bir kekemelik
 * yaratıyordu. Debounce, ara karelerdeki gereksiz hesaplamaları atlıyor.
 */
export function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);

  return debounced;
}
