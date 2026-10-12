/**
 * Hatanın okunur özeti.
 *
 * BULGU (2026-10-12): Supabase/PostgREST hataları `Error` örneği DEĞİL,
 * düz nesne (`{ message, code, details, hint }`). `String(error)` onları
 * "[object Object]" yapıyordu; `reader.wordQuota` ve `srs.reviewHistory`
 * telemetrisi bu yüzden hiçbir şey söylemiyordu (ikincisinin sebebi bir
 * CHECK kısıtıydı -- kod 23514 görünseydi aylarca beklemezdi).
 */
export function describeError(error: unknown): { message: string; code: string; details: string } {
  if (error instanceof Error) {
    const code = (error as { code?: unknown }).code;
    return { message: error.message, code: typeof code === "string" ? code : "", details: "" };
  }
  if (typeof error === "object" && error !== null) {
    const record = error as Record<string, unknown>;
    const pick = (key: string): string =>
      typeof record[key] === "string" || typeof record[key] === "number" ? String(record[key]) : "";
    const message = pick("message") || pick("error_description") || pick("error");
    let fallback = "";
    if (!message) {
      try {
        fallback = JSON.stringify(error);
      } catch (serializeError) {
        fallback = serializeError instanceof Error ? serializeError.message : "unserializable";
      }
    }
    return {
      message: message || fallback,
      code: pick("code") || pick("status"),
      details: [pick("details"), pick("hint")].filter(Boolean).join(" | "),
    };
  }
  return { message: String(error), code: "", details: "" };
}
