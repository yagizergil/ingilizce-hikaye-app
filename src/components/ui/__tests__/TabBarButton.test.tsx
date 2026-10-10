import { act, create } from "react-test-renderer";

import { Image } from "expo-image";

import { TabBarButton } from "@/components/ui/TabBarButton";

/**
 * Aktif sekme ikonu Reanimated ile büyüyor; gerçek paket test ortamında
 * `react-native-worklets` yüzünden import anında patlıyor. Testin iddiası
 * animasyon değil, doğru ikonun seçilmesi -- bu yüzden en küçük taklit yeterli.
 */
jest.mock("react-native-reanimated", () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { View } = require("react-native");
  return {
    __esModule: true,
    default: { View },
    useSharedValue: (value: number) => ({ value }),
    useAnimatedStyle: (factory: () => object) => factory(),
    useReducedMotion: () => false,
    withSpring: (value: number) => value,
  };
});

/**
 * Aktif sekme iki sürüm boyunca hiç vurgulanmadı: bileşen yalnızca
 * `accessibilityState.selected`i okuyordu, Expo Router 57 ise seçili sekmeyi
 * `aria-selected` ile bildiriyor. Bu test gerçek prop şekliyle render ediyor.
 */
function iconSource(selected: boolean): number {
  let tree!: ReturnType<typeof create>;
  act(() => {
    tree = create(
      <TabBarButton aria-selected={selected} label="Ana sayfa" icon={1} iconActive={2} />,
    );
  });
  return tree.root.findByType(Image).props.source as number;
}

describe("TabBarButton", () => {
  it("aria-selected true iken dolu ikon gösteriyor", () => {
    expect(iconSource(true)).toBe(2);
  });

  it("seçili değilken outline ikon gösteriyor", () => {
    expect(iconSource(false)).toBe(1);
  });
});
