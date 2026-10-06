import { homeColors } from "@/theme";
import { useTheme } from "@/theme/useTheme";

/**
 * Ana sayfanın metin ve yüzey renkleri.
 *
 * Açık temada referanstan örneklenen sabit renkler (yumuşak açık griler);
 * diğer temalarda (sepya, koyu) tema renkleri -- sabit açık gri koyu zeminde
 * ya da koyu mürekkep koyu zeminde okunmaz.
 */
export function useHomePalette() {
  const { theme, themeName } = useTheme();
  const isLight = themeName === "light";

  return {
    page: isLight ? homeColors.card : theme.bg.surface,
    card: isLight ? homeColors.card : theme.bg.surface,
    ink: isLight ? homeColors.ink : theme.text.primary,
    valueInk: isLight ? homeColors.valueInk : theme.text.primary,
    muted: isLight ? homeColors.muted : theme.text.secondary,
    categoryLabel: isLight ? homeColors.categoryLabel : theme.text.secondary,
  };
}
