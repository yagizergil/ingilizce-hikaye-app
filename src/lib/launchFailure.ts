/**
 * Açılış yolundaki hata/zaman aşımı kuralları (2026-10-10).
 *
 * KULLANICI BULGUSU: internet yokken açılış splash'i sonsuza dek, hiçbir
 * mesaj olmadan kalıyordu. Açılış yolunda koşulsuz kapı olmaz: her bekleme
 * bir zaman aşımıyla sınırlı ve sonunda ya uygulama açılır ya da splash'in
 * üstünde "tekrar dene" düğmeli bir hata gösterilir.
 */

/** Tek bir ağ adımının (oturum okuma/yenileme, anonim giriş) üst sınırı. */
export const LAUNCH_STEP_TIMEOUT_MS = 7000;
/** Splash'in hazır olmayı bekleyebileceği toplam süre. */
export const LAUNCH_TOTAL_TIMEOUT_MS = 10000;
/** Hata ekranı açıkken kendiliğinden yeniden deneme aralığı. */
export const LAUNCH_AUTO_RETRY_MS = 6000;

export type LaunchFailureKind = "offline" | "server";

export class LaunchTimeoutError extends Error {
  constructor(label: string) {
    super(`launch.timeout:${label}`);
    this.name = "LaunchTimeoutError";
  }
}

/** Bir sözü süre sınırına bağlar; süre dolarsa `LaunchTimeoutError` fırlatır. */
export function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new LaunchTimeoutError(label)), ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error: unknown) => {
        clearTimeout(timer);
        reject(error);
      },
    );
  });
}

function readStatus(error: unknown): number | null {
  if (typeof error !== "object" || error === null) return null;
  const status = (error as { status?: unknown }).status;
  return typeof status === "number" ? status : null;
}

/**
 * Bir açılış hatasını kullanıcıya gösterilecek türe indirger. Sunucunun
 * cevap verdiği (5xx) hatalar "server"; cevap hiç gelmediyse (fetch hatası,
 * zaman aşımı, status 0) "offline". Ayırt edilemeyen durumlar "offline":
 * pratikte açılışta cevapsız kalmanın en sık sebebi bağlantı.
 */
export function classifyLaunchError(error: unknown): LaunchFailureKind {
  const status = readStatus(error);
  if (status !== null && status >= 500) return "server";
  return "offline";
}

/** Tarayıcı/ortam çevrimdışı olduğunu açıkça söylüyorsa true. */
export function isEnvironmentOffline(): boolean {
  const nav = (globalThis as { navigator?: { onLine?: unknown } }).navigator;
  return nav?.onLine === false;
}

export interface LaunchErrorInput {
  ready: boolean;
  elapsedMs: number;
  failure: LaunchFailureKind | null;
}

/**
 * Splash'in hata durumuna geçip geçmeyeceği. Hazırsa asla; bir kapı açıkça
 * başarısızlık bildirdiyse hemen; aksi hâlde toplam süre dolunca.
 */
export function resolveLaunchError({
  ready,
  elapsedMs,
  failure,
}: LaunchErrorInput): LaunchFailureKind | null {
  if (ready) return null;
  if (failure) return failure;
  if (elapsedMs >= LAUNCH_TOTAL_TIMEOUT_MS) return "offline";
  return null;
}
