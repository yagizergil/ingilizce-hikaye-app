import { useMemo } from "react";

import { colors } from "@/theme/colors";
import { detailColors } from "@/theme/tokens/home";
import { useReaderModeStore } from "@/features/reader/hooks/useReaderModeStore";
import { useReadingTheme } from "@/theme/useTheme";

export interface ReaderThemeColors {
  background: string;
  text: string;
  textMuted: string;
  highlight: string;
  /** Sesli okumada o an okunan kelimenin zemini (sarı, saydam). */
  spokenHighlight: string;
  /** Okuma yüzeyi DIŞINDAKİ accent kullanımları (ilerleme, tamamlama). */
  accent: string;
  savedUnderline: string;
  border: string;
}

/** Derives the reader-surface palette from the shared design-token themes
 * (src/theme/colors.ts) rather than keeping a second, independently
 * hardcoded hex palette in sync by hand. Theme preference itself now lives
 * in the global `useTheme` store (src/theme/useTheme.ts) — the reader no
 * longer keeps its own independent light/sepia/dark/system field.
 *
 * Memoized on `themeName`: `ReaderWebView`'s HTML-rebuild `useMemo` depends
 * on this hook's return value, so returning a fresh object literal on every
 * render (the previous implementation) forced a full WebView reload on
 * every re-render of the reader screen — including ordinary page turns and
 * position updates, which re-render ReaderScreen constantly. That was the
 * actual cause of the "loads, glitches, goes blank" bug reports, not the
 * CSS pagination math (which was a separate, real, but secondary bug). */
export function useReaderThemeColors(): ReaderThemeColors {
  const { themeName } = useReadingTheme();
  const listening = useReaderModeStore((state) => state.mode === "listen");

  return useMemo(() => {
    const theme = colors[themeName];
    if (listening) {
      // Dinleme modu: kahverengi zemin, krem metin (referans ekranı).
      return {
        background: detailColors.listenBg,
        text: detailColors.listenText,
        textMuted: detailColors.listenDim,
        highlight: "rgba(255, 241, 227, 0.16)",
        // Eskiden krem %22: kahverengi zeminde okunan kelime neredeyse
        // seçilmiyordu ("vurgu düzgün değil"). Amber %45 belirgin, krem
        // metin üstünde hâlâ okunur.
        spokenHighlight: "rgba(245, 181, 49, 0.45)",
        accent: detailColors.amber,
        savedUnderline: detailColors.amber,
        border: "rgba(255, 241, 227, 0.2)",
      };
    }
    return {
      background: theme.bg.reading,
      text: theme.text.reading,
      textMuted: theme.text.secondary,
      highlight: theme.secondaryMuted,
      spokenHighlight: theme.spokenHighlight,
      /**
       * Okuma ekranındaki accent kullanımları.
       *
       * colors.ts kuralı "okuma YÜZEYİNDE accent kullanılmaz" diyor —
       * metnin kendisi, sayfa zemini ve kelime vurguları accent almaz.
       * İlerleme çizgisi, yükleniyor göstergesi ve bölüm tamamlama
       * ekranındaki işaret bu yüzeyin parçası değil; kural onları
       * dışlamıyor (colors.ts `accent` alanının yorumu bunu açıkça
       * söylüyor).
       */
      accent: theme.accent,
      // Kaydedilen kelimenin altı çizgisi. `accent` ile aynı değer ama
      // ayrı bir rol: ikisinden biri değişirse diğeri etkilenmesin.
      savedUnderline: theme.accent,
      border: theme.border.hairline,
    };
  }, [themeName, listening]);
}
