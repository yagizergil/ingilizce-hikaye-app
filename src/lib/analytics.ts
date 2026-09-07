import { AppState, Platform } from "react-native";

import Constants from "expo-constants";
import { randomUUID } from "expo-crypto";

import { supabase } from "@/lib/supabase";
import storage from "@/lib/storage";

/**
 * Ürün telemetrisi.
 *
 * `trackEvent` çağrıları uygulamanın her yerinden geliyor ve HİÇBİR ZAMAN
 * hata fırlatmamalı, kullanıcı arayüzünü bloke etmemeli. Bu yüzden burada
 * her şey "en iyi çaba" prensibiyle çalışır: olay bir kuyruğa yazılır,
 * kuyruk arka planda toplu olarak Supabase'e gönderilir, gönderim
 * başarısız olursa olaylar kuyrukta kalır ve bir sonraki denemede tekrar
 * gönderilir.
 *
 * Kuyruk diske de yazılıyor: kullanıcı uygulamayı gönderim olmadan
 * kapatırsa olaylar kaybolmaz. Çevrimdışı okuma bu uygulamanın premium
 * vaadi olduğu için bu önemli — uçakta okunan bir bölüm de ölçülmeli.
 *
 * NEDEN ÜÇÜNCÜ PARTİ SDK DEĞİL: bkz. migration 020'nin başlığı.
 */

/** Olay parametreleri düz kalır — iç içe nesne göndermeyin. */
export type AnalyticsParams = Record<string, string | number | boolean>;

interface QueuedEvent {
  session_id: string;
  name: string;
  params: AnalyticsParams;
  occurred_at: string;
  app_version: string;
  platform: string;
}

const QUEUE_STORAGE_KEY = "analytics.queue.v1";

/** Bu sayıya ulaşınca kuyruk hemen gönderilir. */
const FLUSH_AT_COUNT = 20;

/** Kuyruk bu süre boyunca dolmazsa yine de gönderilir. */
const FLUSH_INTERVAL_MS = 30_000;

/**
 * Kuyruğun üst sınırı. Uzun bir çevrimdışı oturumda ya da sunucu sürekli
 * hata verirken kuyruğun sınırsız büyümesini engeller; sınır aşılırsa EN
 * ESKİ olaylar atılır (yeni olaylar hata teşhisi için daha değerli).
 */
const MAX_QUEUE = 500;

/**
 * Geliştirme derlemelerinde de gerçekten gönderiyoruz — aksi halde
 * telemetri hattı ancak üretimde ilk kez denenmiş olurdu. Ayırt edilebilir
 * kalması için sürüm etiketine `-dev` ekleniyor; analizde bu satırlar
 * filtrelenmeli.
 */
const APP_VERSION = `${Constants.expoConfig?.version ?? "0.0.0"}${__DEV__ ? "-dev" : ""}`;

const SESSION_ID = randomUUID();

let queue: QueuedEvent[] = [];
let flushTimer: ReturnType<typeof setTimeout> | null = null;
let flushInFlight = false;
let restored = false;

function log(...args: unknown[]): void {
  if (__DEV__) {
    console.warn("[analytics]", ...args);
  }
}

async function persistQueue(): Promise<void> {
  try {
    await storage.setItem(QUEUE_STORAGE_KEY, JSON.stringify(queue));
  } catch (error) {
    // Diske yazamamak telemetriyi kaybettirir ama uygulamayı etkilemez.
    log("kuyruk diske yazılamadı", error);
  }
}

/**
 * Uygulama açılışında, önceki oturumdan kalan olayları geri yükler.
 * `initAnalytics` tarafından bir kez çağrılır.
 */
async function restoreQueue(): Promise<void> {
  if (restored) return;
  restored = true;
  try {
    const raw = await storage.getItem(QUEUE_STORAGE_KEY);
    if (!raw) return;
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return;
    // Eski sürümden kalmış bozuk satırlar olabilir; şekli tutmayanları at.
    const valid = parsed.filter(
      (item): item is QueuedEvent =>
        typeof item === "object" &&
        item !== null &&
        typeof (item as QueuedEvent).name === "string" &&
        typeof (item as QueuedEvent).occurred_at === "string",
    );
    queue = [...valid, ...queue].slice(-MAX_QUEUE);
  } catch (error) {
    log("kuyruk geri yüklenemedi", error);
  }
}

function scheduleFlush(): void {
  if (flushTimer !== null) return;
  flushTimer = setTimeout(() => {
    flushTimer = null;
    void flushEvents();
  }, FLUSH_INTERVAL_MS);
}

/**
 * Kuyruktaki olayları Supabase'e gönderir. Hiçbir zaman hata fırlatmaz.
 *
 * Gönderim başarısız olursa olaylar kuyruğa geri konur — ağ yokken ya da
 * sunucu hata verirken veri kaybolmasın diye. Oturum yoksa (auth henüz
 * hazır değil) gönderim ertelenir; anonim giriş açılışta otomatik
 * yapıldığı için bu genelde yalnızca ilk saniyelerde olur.
 */
export async function flushEvents(): Promise<void> {
  if (flushInFlight || queue.length === 0) return;
  flushInFlight = true;

  const batch = queue;
  queue = [];

  try {
    const { data: userData } = await supabase.auth.getUser();
    const userId = userData.user?.id;

    if (!userId) {
      // Henüz oturum yok: olayları geri koy, sonraki denemede gönderilir.
      queue = [...batch, ...queue].slice(-MAX_QUEUE);
      return;
    }

    const rows = batch.map((event) => ({ ...event, user_id: userId }));
    const { error } = await supabase.from("analytics_events").insert(rows);

    if (error) {
      queue = [...batch, ...queue].slice(-MAX_QUEUE);
      log("gönderilemedi, kuyrukta kaldı", error.message);
      return;
    }

    log(`${rows.length} olay gönderildi`);
  } catch (error) {
    queue = [...batch, ...queue].slice(-MAX_QUEUE);
    log("gönderim sırasında beklenmeyen hata", error);
  } finally {
    flushInFlight = false;
    void persistQueue();
  }
}

/**
 * Bir ürün olayını kaydeder. Senkron, hiçbir zaman hata fırlatmaz.
 *
 * @param name  Kısa, snake_case olay adı (örn. `reader_chapter_opened`).
 * @param params Düz anahtar/değer çiftleri; iç içe nesne göndermeyin.
 */
export function trackEvent(name: string, params?: AnalyticsParams): void {
  try {
    queue.push({
      session_id: SESSION_ID,
      name,
      params: params ?? {},
      occurred_at: new Date().toISOString(),
      app_version: APP_VERSION,
      platform: Platform.OS,
    });

    if (queue.length > MAX_QUEUE) {
      queue = queue.slice(-MAX_QUEUE);
    }

    log(name, params ?? {});

    if (queue.length >= FLUSH_AT_COUNT) {
      void flushEvents();
    } else {
      scheduleFlush();
      void persistQueue();
    }
  } catch (error) {
    // Telemetri hiçbir koşulda çağıranı etkilememeli.
    log("olay kaydedilemedi", error);
  }
}

/**
 * Beklenmeyen bir istemci hatasını telemetriye yazar. `ErrorBoundary` ve
 * yakalanan kritik hatalar için.
 *
 * Hata mesajı ve yığın izi kısaltılıyor: migration 020'deki
 * `analytics_events_params_size` kısıtı satır başına 4 KB'lık bir üst sınır
 * koyuyor.
 */
export function trackError(
  source: string,
  error: unknown,
  extra?: AnalyticsParams,
): void {
  const message = error instanceof Error ? error.message : String(error);
  const stack = error instanceof Error ? (error.stack ?? "") : "";
  trackEvent("client_error", {
    source,
    message: message.slice(0, 300),
    stack: stack.slice(0, 1200),
    ...extra,
  });
  // Hata olayları beklemesin — uygulama çökmek üzere olabilir.
  void flushEvents();
}

/**
 * Uygulama açılışında bir kez çağrılır (kök layout). Diskteki kuyruğu geri
 * yükler ve uygulama arka plana alındığında kuyruğu boşaltmayı ayarlar.
 *
 * @returns Aboneliği kaldıran fonksiyon.
 */
export function initAnalytics(): () => void {
  void restoreQueue().then(() => flushEvents());

  const subscription = AppState.addEventListener("change", (state) => {
    if (state === "background" || state === "inactive") {
      void flushEvents();
    }
  });

  return () => {
    subscription.remove();
    if (flushTimer !== null) {
      clearTimeout(flushTimer);
      flushTimer = null;
    }
  };
}
