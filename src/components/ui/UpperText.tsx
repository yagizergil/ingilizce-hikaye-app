import { Children } from "react";
import { StyleSheet, Text } from "react-native";

import { useTranslation } from "react-i18next";

import type { ReactNode } from "react";
import type { TextProps } from "react-native";

/** Büyük harfte "i"nin noktalı kaldığı diller. */
const DOTTED_I_LANGUAGES = ["tr", "az"];

/**
 * Dile duyarlı büyük harf.
 *
 * `Intl`e dayanmıyor: Türkçenin tek farkı "i" -> "İ" ve bunu elle yapmak
 * Hermes'in yerel ayar desteğine bağlı kalmamak demek. "ı" zaten
 * `toUpperCase()` ile doğru "I"ya dönüyor.
 */
export function toLocaleUpper(text: string, language: string): string {
  const base = language.split("-")[0] ?? language;
  if (DOTTED_I_LANGUAGES.includes(base)) return text.replace(/i/g, "İ").toUpperCase();
  return text.toUpperCase();
}

/**
 * `Text`in yerine geçer; stil `textTransform: "uppercase"` diyorsa metni
 * kendisi büyütür.
 *
 * NEDEN: iOS bu dönüşümü yerel ayardan bağımsız yapıyor, Türkçede "şimdi
 * değil" -> "ŞIMDI DEĞIL" çıkıyordu (doğrusu "ŞİMDİ DEĞİL"). Tasarım token'ları
 * değişmedi; yalnızca büyük harfli token kullanan `Text`ler bu bileşene geçti.
 */
export function UpperText({ style, children, ...rest }: TextProps) {
  const { i18n } = useTranslation();
  const isUpper = StyleSheet.flatten(style)?.textTransform === "uppercase";
  if (!isUpper) {
    return (
      <Text style={style} {...rest}>
        {children}
      </Text>
    );
  }

  const language = i18n?.language ?? "en";
  const transformed = Children.map(children, (child: ReactNode) =>
    typeof child === "string" ? toLocaleUpper(child, language) : child,
  );

  return (
    <Text style={[style, styles.noTransform]} {...rest}>
      {transformed}
    </Text>
  );
}

const styles = StyleSheet.create({
  noTransform: {
    textTransform: "none",
  },
});
