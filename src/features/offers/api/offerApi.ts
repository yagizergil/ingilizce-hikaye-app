import { supabase } from "@/lib/supabase";
import { trackError } from "@/lib/analytics";

import type { Presentation } from "@/features/offers/types";

export type ImpressionOutcome = "purchased" | "dismissed" | "downsell" | "fallback" | "error";

/**
 * Bir kural gösterimini sunucuya yazar (`paywall_impressions`, migration
 * 090). En iyi çaba: başarısızsa yerel geçmiş (`useOfferHistoryStore`)
 * sıklık sınırını yine de taşıyor. Satırın kimliğini döndürür (sonucu
 * sonradan yazmak için).
 */
export async function recordImpression(input: {
  ruleId: string;
  trigger: string;
  presentation: Presentation;
  actionKind: string;
}): Promise<number | null> {
  try {
    const { data, error } = await supabase
      .from("paywall_impressions")
      .insert({
        app: "lingo",
        rule_id: input.ruleId,
        trigger: input.trigger,
        presentation: input.presentation,
        action_kind: input.actionKind,
      })
      .select("id")
      .single<{ id: number }>();
    if (error) throw error;
    return data?.id ?? null;
  } catch (error) {
    trackError("offers.impression.insert", error, { rule_id: input.ruleId });
    return null;
  }
}

export async function setImpressionOutcome(id: number, outcome: ImpressionOutcome): Promise<void> {
  try {
    const { error } = await supabase.from("paywall_impressions").update({ outcome }).eq("id", id);
    if (error) throw error;
  } catch (error) {
    trackError("offers.impression.outcome", error, { outcome });
  }
}

export interface OfferGrant {
  offerId: string;
  offeringId: string;
  /** ms -- geri sayım YALNIZCA bundan hesaplanır (istemci saati değil). */
  expiresAt: number;
}

/**
 * Sunucu süreli teklif açar ya da aynı offering için geçerli olanı alır
 * (`grant_offer`, migration 091). Başarısızsa null: ekran geri sayımsız
 * açılır -- uydurma bir sayaç göstermek yanıltıcı olurdu.
 */
export async function grantOffer(ruleId: string): Promise<OfferGrant | null> {
  try {
    const { data, error } = await supabase.rpc("grant_offer", { p_rule_id: ruleId });
    if (error) throw error;
    const row: unknown = Array.isArray(data) ? data[0] : data;
    if (typeof row !== "object" || row === null) return null;
    const record = row as Record<string, unknown>;
    const expiresAt =
      typeof record.expires_at === "string" ? Date.parse(record.expires_at) : Number.NaN;
    if (Number.isNaN(expiresAt)) return null;
    return {
      offerId: typeof record.offer_id === "string" ? record.offer_id : ruleId,
      offeringId: typeof record.offering_id === "string" ? record.offering_id : "",
      expiresAt,
    };
  } catch (error) {
    trackError("offers.grant", error, { rule_id: ruleId });
    return null;
  }
}

/** Satın alma sonrası teklifi kullanılmış işaretler (yalnızca ölçüm/gösterim). */
export async function markOfferRedeemed(offeringId: string): Promise<void> {
  try {
    const { error } = await supabase.rpc("mark_offer_redeemed", { p_offering_id: offeringId });
    if (error) throw error;
  } catch (error) {
    trackError("offers.redeem", error, { offering_id: offeringId });
  }
}
