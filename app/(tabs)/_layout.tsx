import { Tabs } from "expo-router";
import { useTranslation } from "react-i18next";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { TabBarButton } from "@/components/ui/TabBarButton";
import { homeColors, homeMetrics } from "@/theme/tokens/home";
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
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        // Arka plandaki sekmeler dondurulur (react-native-screens): görünmeyen
        // ekranlar sorgu güncellemelerinde yeniden render olup sekme
        // geçişini takıltmıyor.
        freezeOnBlur: true,
        // Sekme geçişi BİLEREK animasyonsuz (iOS'un yerel sekme çubuğu da
        // öyle). Bir ara `animation: "fade"` vardı: JS tarafında sahnenin
        // opaklığını sürüyordu ve geçiş yarıda kesilince (sekmeye basılırken
        // bir ekran itilince) sahne opaklık 0'da kalıyor, kullanıcı başka
        // sekmeye gidip dönene kadar BEMBEYAZ ekran görüyordu.
        tabBarShowLabel: false,
        tabBarStyle: {
          // Beyaz, üst köşeleri yuvarlak yüzen çubuk (Funfluent referansı).
          backgroundColor: theme.bg.surface,
          borderTopWidth: 0,
          borderRadius: homeMetrics.tabBarRadius,
          height: homeMetrics.tabBarHeight,
          marginHorizontal: homeMetrics.tabBarMargin,
          marginBottom: Math.max(insets.bottom, homeMetrics.tabBarMargin / 2),
          paddingTop: 0,
          paddingBottom: 0,
          shadowColor: homeColors.shadow,
          shadowOffset: { width: 0, height: -4 },
          shadowOpacity: 0.08,
          shadowRadius: 14,
          elevation: 12,
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
              icon={require("../../assets/home/tab-home.png") as number}
              iconActive={require("../../assets/home/tab-home-active.png") as number}
              label={t("tabs.home")}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="library"
        options={{
          title: t("tabs.search"),
          tabBarButton: (props) => (
            <TabBarButton
              {...props}
              icon={require("../../assets/home/tab-search.png") as number}
              iconActive={require("../../assets/home/tab-search-active.png") as number}
              label={t("tabs.search")}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="mybooks"
        options={{
          title: t("tabs.myBooks"),
          tabBarButton: (props) => (
            <TabBarButton
              {...props}
              icon={require("../../assets/home/tab-mybook.png") as number}
              iconActive={require("../../assets/home/tab-mybook-active.png") as number}
              label={t("tabs.myBooks")}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="quiz"
        options={{
          title: t("tabs.quiz"),
          tabBarButton: (props) => (
            <TabBarButton
              {...props}
              icon={require("../../assets/home/tab-quiz.png") as number}
              iconActive={require("../../assets/home/tab-quiz-active.png") as number}
              label={t("tabs.quiz")}
            />
          ),
        }}
      />
      {/* Kelimelerim (kelime defteri, desteler, Akıllı Tekrar) artık Quiz sekmesinden açılıyor. */}
      <Tabs.Screen name="vocabulary" options={{ href: null }} />
      <Tabs.Screen
        name="profile"
        options={{
          title: t("tabs.profile"),
          tabBarButton: (props) => (
            <TabBarButton
              {...props}
              icon={require("../../assets/home/tab-profile.png") as number}
              iconActive={require("../../assets/home/tab-profile-active.png") as number}
              label={t("tabs.profile")}
            />
          ),
        }}
      />
    </Tabs>
  );
}
