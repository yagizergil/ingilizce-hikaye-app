import { Component, type ErrorInfo, type ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";
import { useTranslation } from "react-i18next";

import { monoType, spacing, type } from "@/theme";
import { useTheme } from "@/theme/useTheme";

import { Button } from "@/components/ui/Button";
import { trackError } from "@/lib/analytics";

interface ErrorBoundaryProps {
  /**
   * Hatanın nereden geldiğini telemetride ayırt etmek için. Örn. "reader",
   * "root". Aynı isim `client_error` olayının `source` parametresine gider.
   */
  source: string;
  children: ReactNode;
}

interface ErrorBoundaryState {
  error: Error | null;
}

/**
 * Render sırasında oluşan beklenmeyen hataları yakalar.
 *
 * Bu olmadan reader'daki tek bir render hatası tüm uygulamayı beyaz ekrana
 * düşürür ve — telemetri de yoksa — bunu yalnızca App Store yorumlarından
 * öğrenirsiniz. Sınır hem kullanıcıya toparlanabilir bir ekran gösteriyor
 * hem de hatayı `client_error` olayı olarak hemen gönderiyor.
 *
 * React'te hata yakalama yalnızca sınıf bileşenlerinde mümkün; tema ve
 * çeviri hook'ları gerektirdiği için görünen kısım ayrı bir fonksiyon
 * bileşenine (`ErrorBoundaryFallback`) bırakıldı.
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    trackError(this.props.source, error, {
      component_stack: (info.componentStack ?? "").slice(0, 800),
    });
  }

  handleReset = (): void => {
    this.setState({ error: null });
  };

  render(): ReactNode {
    if (this.state.error !== null) {
      return <ErrorBoundaryFallback error={this.state.error} onReset={this.handleReset} />;
    }
    return this.props.children;
  }
}

interface ErrorBoundaryFallbackProps {
  error: Error;
  onReset: () => void;
}

function ErrorBoundaryFallback({ error, onReset }: ErrorBoundaryFallbackProps) {
  const { t } = useTranslation();
  const { theme } = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: theme.bg.primary }]}>
      <Text style={[type.sectionHeading, { color: theme.danger }]}>{t("common.crashTitle")}</Text>
      <Text style={[monoType.rowText, styles.message, { color: theme.text.secondary }]}>
        {t("common.crashMessage")}
      </Text>
      {__DEV__ ? (
        <Text style={[monoType.rowText, styles.detail, { color: theme.text.secondary }]}>
          {error.message}
        </Text>
      ) : null}
      <Button label={t("common.retry")} onPress={onReset} variant="secondary" size="sm" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.xxl,
  },
  message: {
    textAlign: "center",
  },
  detail: {
    textAlign: "center",
    opacity: 0.7,
  },
});
