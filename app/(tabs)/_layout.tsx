import { Tabs } from "expo-router";
import { useTranslation } from "react-i18next";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { TabBarButton } from "@/components/ui/TabBarButton";
import { spacing } from "@/theme/tokens/spacing";
import { tabBarContentHeight } from "@/theme/tokens/layout";
import { useTheme } from "@/theme/useTheme";

/**
 * mockups/tab-bar.html "Durum 1/2" — mono nav labels, accent underline on
 * the active item (rendered by `TabBarButton`, since Expo Router's default
 * tab button can't draw the mockup's `::after` underline), hairline top
 * border. An icon above each label was added after the mockup round
 * (product owner request), and later given a distinct filled/outline pair
 * per active state (see `TabBarButton`'s own doc comment — the underline
 * alone wasn't a clear enough "which tab am I on" signal).
 *
 * IMPORTANT: setting a custom `tabBarStyle` disables React Navigation's
 * automatic safe-area bottom padding, so this file must add it back
 * manually via `useSafeAreaInsets()` — omitting this was the earlier bug
 * that made the bar's content sit flush against the home-indicator edge.
 *
 * "Durum 3 — Reader ekranında": the tab bar is fully hidden. The reader
 * screen isn't built this round; when it ships, hide this bar by setting
 * `tabBarStyle: { display: "none" }` on that route's screen options (Expo
 * Router convention), not by editing this shared layout.
 *
 * REVISED (post-launch, product-owner design pass, twice): a colorful
 * left→right gradient background was tried here to match a reference app,
 * then explicitly rejected on-device ("gradiant saçma sapan bir şey,
 * saydam yap"). A literal `backgroundColor: "transparent"` was tried next
 * -- on iOS this does NOT make the bar see-through, the native tab bar's
 * own default chrome shows through as solid white regardless, which was
 * also rejected ("şimdi de beyaz oldu nötr olmadı"). Settled on an
 * explicit `theme.bg.primary` fill instead -- a real neutral color that
 * matches whatever's scrolled underneath in every theme, no border.
 */
export default function TabsLayout() {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: theme.bg.primary,
          borderTopWidth: 0,
          height: tabBarContentHeight + insets.bottom,
          paddingTop: spacing.sm,
          paddingBottom: insets.bottom,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: t("tabs.home"),
          tabBarButton: (props) => (
            <TabBarButton
              {...props}
              iconOutline="home-outline"
              iconActive="home"
              label={t("tabs.home").toUpperCase()}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="library"
        options={{
          title: t("tabs.library"),
          tabBarButton: (props) => (
            <TabBarButton
              {...props}
              iconOutline="book-outline"
              iconActive="book"
              label={t("tabs.library").toUpperCase()}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="vocabulary"
        options={{
          title: t("tabs.vocabulary"),
          tabBarButton: (props) => (
            <TabBarButton
              {...props}
              iconOutline="bookmark-outline"
              iconActive="bookmark"
              label={t("tabs.vocabulary").toUpperCase()}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: t("tabs.profile"),
          tabBarButton: (props) => (
            <TabBarButton
              {...props}
              iconOutline="person-outline"
              iconActive="person"
              label={t("tabs.profile").toUpperCase()}
            />
          ),
        }}
      />
    </Tabs>
  );
}
