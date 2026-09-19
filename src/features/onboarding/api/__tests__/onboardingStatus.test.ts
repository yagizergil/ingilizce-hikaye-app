import { fetchOnboardingStatus } from "@/features/onboarding/api/useOnboardingStatusQuery";

/**
 * KULLANICI BULGUSU (2026-09-19): "hesabı sıfırla ve onboarding'i baştan
 * oynat çalışmıyor", ve yepyeni bir hesapta onboarding hiç açılmıyor.
 *
 * Sebep: oturum okunamadığında bu fonksiyon `completed: true` DÖNÜYORDU --
 * "bilmiyorum" cevabı, önbelleğe 5 dakika boyunca taze yazılan BAŞARILI bir
 * "onboarding bitti" cevabına çevriliyordu. Üstelik okuma `getUser()` ile
 * yapılıyordu: o bir ağ çağrısı ve başarısız olduğunda fırlatmak yerine
 * sessizce `user: null` dönüyor.
 *
 * Bu testler değişmezi kilitliyor: oturum yoksa cevap ÜRETİLMEZ, fırlatılır.
 */

const mockGetSession = jest.fn();
const mockMaybeSingle = jest.fn();

jest.mock("@/lib/supabase", () => ({
  supabase: {
    auth: {
      getSession: () => mockGetSession(),
    },
    from: () => ({
      select: () => ({
        eq: () => ({
          maybeSingle: () => mockMaybeSingle(),
        }),
      }),
    }),
  },
}));

function withSession(userId: string | null) {
  mockGetSession.mockResolvedValue({
    data: { session: userId ? { user: { id: userId } } : null },
  });
}

describe("fetchOnboardingStatus", () => {
  beforeEach(() => {
    mockGetSession.mockReset();
    mockMaybeSingle.mockReset();
  });

  it("oturum yoksa 'onboarding bitti' DEMİYOR, fırlatıyor", async () => {
    withSession(null);
    await expect(fetchOnboardingStatus()).rejects.toThrow("onboardingStatus.noSession");
  });

  it("profil satırı yoksa onboarding tamamlanmamış sayılıyor", async () => {
    withSession("user-1");
    mockMaybeSingle.mockResolvedValue({ data: null, error: null });

    await expect(fetchOnboardingStatus()).resolves.toEqual({
      completed: false,
      targetLevel: null,
    });
  });

  it("tamamlanma damgası varsa tamamlanmış sayılıyor", async () => {
    withSession("user-1");
    mockMaybeSingle.mockResolvedValue({
      data: { target_level: "B1", onboarding_completed_at: "2026-09-19T10:00:00Z" },
      error: null,
    });

    await expect(fetchOnboardingStatus()).resolves.toEqual({
      completed: true,
      targetLevel: "B1",
    });
  });

  it("profil sorgusu hata verirse yutmuyor", async () => {
    withSession("user-1");
    mockMaybeSingle.mockResolvedValue({ data: null, error: new Error("boom") });

    await expect(fetchOnboardingStatus()).rejects.toThrow("boom");
  });

  it("oturumu YEREL okuyor -- ağ turu yapan getUser'a hiç dokunmuyor", async () => {
    withSession("user-1");
    mockMaybeSingle.mockResolvedValue({ data: null, error: null });

    await fetchOnboardingStatus();

    expect(mockGetSession).toHaveBeenCalledTimes(1);
  });
});
