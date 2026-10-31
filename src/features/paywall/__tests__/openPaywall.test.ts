const mockPush = jest.fn();
const mockReplace = jest.fn();
const mockTrackEvent = jest.fn();

jest.mock("expo-router", () => ({
  router: {
    push: (...args: unknown[]) => mockPush(...args),
    replace: (...args: unknown[]) => mockReplace(...args),
  },
}));
jest.mock("@/lib/analytics", () => ({
  trackEvent: (...args: unknown[]) => mockTrackEvent(...args),
}));

// eslint-disable-next-line import/first
import { openPaywall, takeTriggerLatencyMs } from "@/features/paywall/openPaywall";
// eslint-disable-next-line import/first
import { placementFor } from "@/features/paywall/paywallSources";

describe("openPaywall", () => {
  beforeEach(() => {
    mockPush.mockClear();
    mockReplace.mockClear();
    mockTrackEvent.mockClear();
  });

  it("paywall_triggered'ı kaynak ve yerle atıp ekrana gider", () => {
    openPaywall("word_pack");
    expect(mockTrackEvent).toHaveBeenCalledWith("paywall_triggered", {
      source: "word_pack",
      placement: "feature_gate",
    });
    expect(mockPush).toHaveBeenCalledWith("/paywall?source=word_pack");
  });

  it("takılınan kelimeyi kodlayarak taşır, replace seçeneğine uyar", () => {
    openPaywall("word_quota", { word: "café au lait", replace: true });
    expect(mockReplace).toHaveBeenCalledWith(
      "/paywall?source=word_quota&word=caf%C3%A9%20au%20lait",
    );
    expect(mockPush).not.toHaveBeenCalled();
  });

  it("load_ms tetiklemeyle eşleşir ve bir kez okunur", () => {
    openPaywall("profile");
    const latency = takeTriggerLatencyMs("profile", Date.now() + 120);
    expect(latency).not.toBeNull();
    expect(latency as number).toBeGreaterThanOrEqual(0);
    expect(takeTriggerLatencyMs("profile")).toBeNull();
  });

  it("başka kaynağın ekranı tetiklemeyi tüketmez", () => {
    openPaywall("audio");
    expect(takeTriggerLatencyMs("onboarding")).toBeNull();
    expect(takeTriggerLatencyMs("audio")).not.toBeNull();
  });
});

describe("placementFor", () => {
  it("bilinmeyen kaynak 'unknown'", () => {
    expect(placementFor("word_quota")).toBe("limit");
    expect(placementFor("unknown")).toBe("unknown");
    expect(placementFor("toString")).toBe("unknown");
  });
});
