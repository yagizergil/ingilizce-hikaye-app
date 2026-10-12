import { shouldOpenSentencePaywall } from "@/features/reader/api/useWordLookupQuota";

jest.mock("@/lib/supabase", () => ({ supabase: {} }));

describe("shouldOpenSentencePaywall (ortak günlük hak, migration 057)", () => {
  it("ücretsiz ve hak sıfırsa kart açılmadan paywall", () => {
    expect(shouldOpenSentencePaywall({ isPremium: false, limit: 10, used: 10, remaining: 0 })).toBe(
      true,
    );
  });

  it("ücretsiz ve hak varsa kart açılır", () => {
    expect(shouldOpenSentencePaywall({ isPremium: false, limit: 10, used: 9, remaining: 1 })).toBe(
      false,
    );
  });

  it("premium hiçbir zaman paywall'a gönderilmez", () => {
    expect(
      shouldOpenSentencePaywall({ isPremium: true, limit: null, used: 50, remaining: null }),
    ).toBe(false);
  });

  it("kota bilinmiyorsa karar sunucuya bırakılır", () => {
    expect(shouldOpenSentencePaywall(undefined)).toBe(false);
  });
});
