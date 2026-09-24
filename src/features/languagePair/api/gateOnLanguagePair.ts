import type { UseQueryResult } from "@tanstack/react-query";

/**
 * Dil çiftine bağlı (aktif çift gelene kadar `enabled: false`) bir sorgunun
 * durumunu ekranların beklediği şekle çeviriyor.
 *
 * NEDEN: TanStack Query v5'te devre dışı bir sorgu `isLoading: false` ve
 * `data: undefined` döndürüyor. Ekranlar "yüklenmiyor ve veri yok" durumunu
 * hata sayıyor (`isError || !data`), yani uygulama her açılışta, aktif dil
 * çifti gelene kadar bir an "Bir şeyler ters gitti" gösteriyordu (kullanıcı
 * bulgusu, 2026-09-24). Çift beklenirken sorgu artık "yükleniyor" diyor;
 * gerçek hata yalnızca çiftin kendisi alınamazsa bildiriliyor.
 */
export function gateOnLanguagePair<TQuery extends UseQueryResult<unknown, Error>>(
  query: TQuery,
  pairQuery: UseQueryResult<unknown, Error>,
): TQuery {
  const waitingForPair = query.status === "pending" && query.fetchStatus === "idle";
  if (!waitingForPair) return query;

  return {
    ...query,
    isLoading: !pairQuery.isError,
    isError: pairQuery.isError,
    error: pairQuery.error,
    refetch: pairQuery.refetch as TQuery["refetch"],
  };
}
