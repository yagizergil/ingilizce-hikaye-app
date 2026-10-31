import { router } from "expo-router";

import { trackEvent } from "@/lib/analytics";
import { placementFor, type PaywallSource } from "@/features/paywall/paywallSources";

interface OpenPaywallOptions {
  /** Günlük kelime hakkı bittiyse kullanıcının takıldığı kelime. */
  word?: string;
  /** Geçerli ekranın YERİNE aç (oturum ekranları: Akıllı Tekrar, quiz). */
  replace?: boolean;
}

/** Son tetikleme; `paywall_viewed.load_ms` için (ekran açılınca okunur). */
let lastTrigger: { source: string; at: number } | null = null;

/** Tetiklemeden bu kadar sonra açılan ekran aynı tetiklemeye sayılmaz. */
const TRIGGER_MATCH_WINDOW_MS = 60_000;

/**
 * Paywall'ı aç (C14 `paywall_triggered`, C15 tipli kaynak).
 *
 * NEDEN TEK GİRİŞ: tetikleyiciler eskiden `router.push("/paywall?source=…")`
 * yazıyordu; kaynak serbest metindi (yazım hatası derlemede yakalanmıyordu)
 * ve tetiklenme anı ölçülmüyordu, yani "dokundu ama ekran açılmadı/
 * yüklenmedi" kaybı görünmüyordu. Burada `source` derleyici tarafından
 * denetlenen bir birlik ve `paywall_triggered` her açılışta atılıyor.
 *
 * Eski `paywall_opened` olayları çağıran taraflarda DURUYOR (geriye dönük
 * uyumluluk); yeni panolar `paywall_triggered`'ı okumalı.
 */
export function openPaywall(source: PaywallSource, options: OpenPaywallOptions = {}): void {
  const placement = placementFor(source);
  lastTrigger = { source, at: Date.now() };
  trackEvent("paywall_triggered", { source, placement });

  const word = options.word ? `&word=${encodeURIComponent(options.word)}` : "";
  const href = `/paywall?source=${source}${word}` as const;
  if (options.replace) router.replace(href);
  else router.push(href);
}

/**
 * Bu kaynağın son tetiklemesinden ekranın açılmasına geçen süre (ms).
 * Tetikleme yoksa (onboarding'e gömülü paywall, derin bağlantı) null.
 * Bir kez okunur: aynı tetikleme iki ekrana sayılmasın.
 */
export function takeTriggerLatencyMs(source: string, nowMs: number = Date.now()): number | null {
  const trigger = lastTrigger;
  if (!trigger || trigger.source !== source) return null;
  lastTrigger = null;
  const elapsed = nowMs - trigger.at;
  return elapsed >= 0 && elapsed <= TRIGGER_MATCH_WINDOW_MS ? elapsed : null;
}
