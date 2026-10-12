import {
  computePaywallLayout,
  estimatePlansBottom,
  estimateTimelineBottom,
  PLANS_HEIGHT,
  scrollViewportBottom,
} from "@/features/paywall/paywallLayout";

/**
 * İki plan kartı (yıllık + aylık) kaydırmadan görünmeli; CTA zaten kaydırma
 * dışındaki sabit alt bölümde. Ölçüler token'lardan -- PaywallScreen aynı
 * `computePaywallLayout`'u kullanıyor.
 */
const DEVICES = [
  { name: "iPhone SE (375x667)", windowHeight: 667, safeTop: 20 },
  { name: "iPhone 13 mini (375x812)", windowHeight: 812, safeTop: 50 },
  { name: "iPhone 13/14 (390x844)", windowHeight: 844, safeTop: 47 },
  { name: "iPhone 15 Pro Max (430x932)", windowHeight: 932, safeTop: 59 },
];

describe("paywall first-viewport layout", () => {
  for (const device of DEVICES) {
    for (const hasIntroRibbon of [false, true]) {
      it(`${device.name}${hasIntroRibbon ? " + intro ribbon" : ""}: both plans fit`, () => {
        const input = { ...device, hasIntroRibbon };
        const layout = computePaywallLayout(input);
        expect(estimatePlansBottom(input, layout)).toBeLessThanOrEqual(scrollViewportBottom(input));
      });
    }
  }

  for (const device of DEVICES) {
    it(`${device.name} + trial timeline: plans still fit, timeline fits when claimed`, () => {
      const input = { ...device, hasIntroRibbon: false, hasTimeline: true };
      const layout = computePaywallLayout(input);
      expect(estimatePlansBottom(input, layout)).toBeLessThanOrEqual(scrollViewportBottom(input));
      if (layout.timelineVisible) {
        expect(estimateTimelineBottom(input, layout)).toBeLessThanOrEqual(
          scrollViewportBottom(input),
        );
      }
    });
  }

  it("shows the timeline in the first viewport on a 390x844 phone", () => {
    const layout = computePaywallLayout({
      windowHeight: 844,
      safeTop: 47,
      hasIntroRibbon: false,
      hasTimeline: true,
    });
    expect(layout.timelineVisible).toBe(true);
  });

  it("on iPhone SE the timeline never pushes the plans off screen", () => {
    const input = { windowHeight: 667, safeTop: 20, hasIntroRibbon: false, hasTimeline: true };
    const layout = computePaywallLayout(input);
    expect(estimatePlansBottom(input, layout)).toBeLessThanOrEqual(scrollViewportBottom(input));
  });

  it("keeps the full hero on tall phones and shrinks it on short ones", () => {
    const tall = computePaywallLayout({ windowHeight: 932, safeTop: 59, hasIntroRibbon: false });
    const se = computePaywallLayout({ windowHeight: 667, safeTop: 20, hasIntroRibbon: false });
    expect(tall.compact).toBe(false);
    expect(se.compact).toBe(true);
    expect(se.mascotHeight).toBeLessThan(tall.mascotHeight);
  });

  it("never shrinks the plans themselves", () => {
    expect(PLANS_HEIGHT).toBeGreaterThanOrEqual(190);
  });

  it("reproduces the old bug: the old fixed hero pushed the monthly plan off a 390x844 screen", () => {
    // Eski yerleşim: kapat satırı 44 + 16, maskot 190 + 16, başlık 68 + 16,
    // alt başlık 48 + 16, planlar.
    const oldPlansBottom = 47 + 44 + 16 + 190 + 16 + 68 + 16 + 48 + 16 + PLANS_HEIGHT;
    expect(oldPlansBottom).toBeGreaterThan(
      scrollViewportBottom({ windowHeight: 844, safeTop: 47, hasIntroRibbon: false }),
    );
  });
});
