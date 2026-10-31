import { ScrollView, StyleSheet, View } from "react-native";

import { homeMetrics, homeSpace } from "@/theme";
import { useTheme } from "@/theme/useTheme";
import { SkyHeader } from "@/components/ui";

import type { ReactNode } from "react";

interface LifecycleScaffoldProps {
  title: string;
  subtitle?: string;
  onBack: () => void;
  children: ReactNode;
}

/** Abonelik ekranlarının ortak iskeleti: gökyüzü başlık + kaydırılan içerik. */
export function LifecycleScaffold({ title, subtitle, onBack, children }: LifecycleScaffoldProps) {
  const { theme } = useTheme();
  return (
    <View style={[styles.container, { backgroundColor: theme.bg.primary }]}>
      <SkyHeader title={title} subtitle={subtitle} onBack={onBack} />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {children}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    paddingHorizontal: homeMetrics.gutter,
    paddingBottom: homeSpace.xl * 2,
    gap: homeSpace.lg,
  },
});
