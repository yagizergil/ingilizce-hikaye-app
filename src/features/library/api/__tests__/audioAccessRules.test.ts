import {
  bookAudioCardState,
  canListenToSection,
  isMissingFunctionError,
  isReaderListenLocked,
} from "@/features/library/api/audioAccessRules";

/**
 * Bölüm 1 ücretsiz seslendirme (migration 110, ürün sahibi kararı
 * 2026-10-31). Asıl kapı sunucuda; bunlar düğmenin/rozetin doğru görünmesi.
 */
const FREE = "section-first";
const OTHER = "section-third";

describe("canListenToSection", () => {
  it("premium her bölümü dinler", () => {
    expect(canListenToSection({ canPlay: true, freeSectionId: FREE }, OTHER)).toBe(true);
    expect(canListenToSection({ canPlay: true, freeSectionId: null }, OTHER)).toBe(true);
  });

  it("premium olmayan yalnızca ücretsiz bölümü dinler", () => {
    const access = { canPlay: false, freeSectionId: FREE };
    expect(canListenToSection(access, FREE)).toBe(true);
    expect(canListenToSection(access, OTHER)).toBe(false);
  });

  it("sunucu ücretsiz bölüm bildirmezse (migration 110 canlıda değil) eski davranış", () => {
    expect(canListenToSection({ canPlay: false, freeSectionId: null }, FREE)).toBe(false);
  });

  it("erişim ya da bölüm bilinmiyorsa izin yok", () => {
    expect(canListenToSection(undefined, FREE)).toBe(false);
    expect(canListenToSection({ canPlay: false, freeSectionId: FREE }, undefined)).toBe(false);
    expect(canListenToSection({ canPlay: false, freeSectionId: null }, null)).toBe(false);
  });
});

describe("bookAudioCardState", () => {
  it("üç durumu ayırır", () => {
    expect(bookAudioCardState({ canPlay: true, freeSectionId: FREE })).toBe("unlocked");
    expect(bookAudioCardState({ canPlay: false, freeSectionId: FREE })).toBe("firstChapterFree");
    expect(bookAudioCardState({ canPlay: false, freeSectionId: null })).toBe("locked");
  });
});

describe("isReaderListenLocked", () => {
  const access = { canPlay: false, freeSectionId: FREE };

  it("ücretsiz bölümde premium olmayana kilit yok", () => {
    expect(
      isReaderListenLocked({ hasStudioAudio: true, isPremium: false, access, sectionId: FREE }),
    ).toBe(false);
  });

  it("diğer bölümlerde 2026-10-06 davranışı: kilitli", () => {
    expect(
      isReaderListenLocked({ hasStudioAudio: true, isPremium: false, access, sectionId: OTHER }),
    ).toBe(true);
  });

  it("erişim cevabı gelmeden premium olmayana kilitli (eski anında kilit korunur)", () => {
    expect(
      isReaderListenLocked({
        hasStudioAudio: true,
        isPremium: false,
        access: undefined,
        sectionId: OTHER,
      }),
    ).toBe(true);
  });

  it("premium ya da premium durumu bilinmiyorsa kilit yok", () => {
    expect(
      isReaderListenLocked({ hasStudioAudio: true, isPremium: true, access, sectionId: OTHER }),
    ).toBe(false);
    expect(
      isReaderListenLocked({
        hasStudioAudio: true,
        isPremium: undefined,
        access,
        sectionId: OTHER,
      }),
    ).toBe(false);
  });

  it("stüdyo sesi olmayan bölümde kilit yok", () => {
    expect(
      isReaderListenLocked({ hasStudioAudio: false, isPremium: false, access, sectionId: OTHER }),
    ).toBe(false);
  });
});

describe("isMissingFunctionError", () => {
  it("yalnızca 'fonksiyon yok' kodlarını tanır", () => {
    expect(isMissingFunctionError({ code: "PGRST202" })).toBe(true);
    expect(isMissingFunctionError({ code: "42883" })).toBe(true);
    expect(isMissingFunctionError({ code: "42501" })).toBe(false);
    expect(isMissingFunctionError(null)).toBe(false);
  });
});
