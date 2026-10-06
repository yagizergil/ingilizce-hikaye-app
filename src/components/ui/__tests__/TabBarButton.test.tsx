import { act, create } from "react-test-renderer";

import { Image } from "expo-image";

import { TabBarButton } from "@/components/ui/TabBarButton";

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
