import {
  noTrialNoticeKey,
  trialAwareHeadlineKey,
  trialStateFor,
} from "@/features/paywall/paywallHeadlines";

/**
 * H2: deneme vaadi yalnızca kullanıcıya GERÇEKTEN sunulabilen bir deneme
 * varken yazılır (Guideline 2.3.1). Uygunluk bilinmiyorken de denemesiz.
 */
describe("trialStateFor", () => {
  it("seçili planda deneme / başka planda deneme / hiç deneme yok", () => {
    expect(
      trialStateFor([
        { trial: { days: 7 }, isSelected: true },
        { trial: null, isSelected: false },
      ]),
    ).toBe("eligible_with_trial");
    expect(
      trialStateFor([
        { trial: { days: 7 }, isSelected: false },
        { trial: null, isSelected: true },
      ]),
    ).toBe("eligible_no_trial_on_plan");
    expect(trialStateFor([{ trial: null, isSelected: true }])).toBe("not_eligible");
    expect(trialStateFor([])).toBe("not_eligible");
  });
});

describe("trialAwareHeadlineKey", () => {
  it("deneme vaat eden başlıklar deneme yoksa NoTrial varyantına düşer", () => {
    expect(trialAwareHeadlineKey("onboarding", false)).toBe("onboardingNoTrial");
    expect(trialAwareHeadlineKey("homeOffer", false)).toBe("homeOfferNoTrial");
    expect(trialAwareHeadlineKey("onboarding", true)).toBe("onboarding");
  });

  it("deneme vaat etmeyen başlıklar değişmez", () => {
    expect(trialAwareHeadlineKey("listen", false)).toBe("listen");
    expect(trialAwareHeadlineKey(null, false)).toBeNull();
  });
});

describe("noTrialNoticeKey", () => {
  it("uyarı denemenin GERÇEKTEN hangi planda olduğunu söyler", () => {
    expect(noTrialNoticeKey("monthly", "annual")).toBe("paywall.noTrialOnPlan");
    expect(noTrialNoticeKey("annual", "monthly")).toBe("paywall.noTrialOnPlanAnnual");
    expect(noTrialNoticeKey("other", "annual")).toBe("paywall.noTrialOnPlanOther");
    expect(noTrialNoticeKey("annual", "annual")).toBeNull();
    expect(noTrialNoticeKey("monthly", null)).toBeNull();
  });
});
