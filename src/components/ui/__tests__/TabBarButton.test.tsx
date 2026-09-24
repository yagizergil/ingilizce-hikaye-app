import { act, create } from "react-test-renderer";

import { Ionicons } from "@expo/vector-icons";

import { TabBarButton } from "@/components/ui/TabBarButton";

/**
 * Aktif sekme iki sürüm boyunca hiç vurgulanmadı: bileşen yalnızca
 * `accessibilityState.selected`i okuyordu, Expo Router 57 ise seçili sekmeyi
 * `aria-selected` ile bildiriyor. Bu test gerçek prop şekliyle render ediyor.
 */
function iconName(selected: boolean): string {
  let tree!: ReturnType<typeof create>;
  act(() => {
    tree = create(
      <TabBarButton
        aria-selected={selected}
        label="Ana sayfa"
        iconOutline="library-outline"
        iconActive="library"
      />,
    );
  });
  return tree.root.findByType(Ionicons).props.name as string;
}

describe("TabBarButton", () => {
  it("aria-selected true iken dolu ikon gösteriyor", () => {
    expect(iconName(true)).toBe("library");
  });

  it("seçili değilken outline ikon gösteriyor", () => {
    expect(iconName(false)).toBe("library-outline");
  });
});
