import type { LifecycleStatus, SubscriptionLifecycle } from "@/features/subscription/lifecycle";

export type ManageAction =
  "fixPayment" | "cancel" | "turnOnRenewal" | "winback" | "goPremium" | "manageInStore";

export interface ManageCopy {
  /** `subscription.manage.status.<status>` */
  status: LifecycleStatus;
  /** `subscription.manage.detail.<detail>` */
  detail: string;
  /** Metindeki {{date}} (yoksa null ve "NoDate" varyantı seçili). */
  date: Date | null;
  actions: ManageAction[];
}

/**
 * Abonelik yönetimi ekranının durum başına içeriği (Vocabulary §11.2:
 * Renewal / Ends / Expired / Payment issue). Saf; ekran yalnızca çeviriyor.
 */
export function manageCopyFor(lifecycle: SubscriptionLifecycle): ManageCopy {
  const { status } = lifecycle;
  switch (status) {
    case "trial":
      return {
        status,
        detail: "trial",
        date: lifecycle.expiresAt,
        actions: ["cancel", "manageInStore"],
      };
    case "active":
      return {
        status,
        detail: lifecycle.expiresAt ? "active" : "activeNoDate",
        date: lifecycle.expiresAt,
        actions: ["cancel", "manageInStore"],
      };
    case "cancelled":
      return {
        status,
        detail: lifecycle.expiresAt ? "cancelled" : "cancelledNoDate",
        date: lifecycle.expiresAt,
        actions: ["turnOnRenewal"],
      };
    case "grace":
      return {
        status,
        detail: lifecycle.graceEndsAt ? "grace" : "graceNoDate",
        date: lifecycle.graceEndsAt,
        actions: ["fixPayment", "manageInStore"],
      };
    case "billing_retry":
      return {
        status,
        detail: "billing_retry",
        date: null,
        actions: ["fixPayment", "manageInStore"],
      };
    case "lapsed_paid":
    case "lapsed_trial":
      return {
        status,
        detail: lifecycle.expiredAt ? "lapsed" : "lapsedNoDate",
        date: lifecycle.expiredAt,
        actions: ["winback", "manageInStore"],
      };
    case "none":
      return { status, detail: "none", date: null, actions: ["goPremium"] };
  }
}
