/**
 * Kullanıcının kendi kelime destelerine seçebileceği renk paleti
 * ("Kelimelerim" > "Destelerim", 1.0.3).
 *
 * Bu dosya `src/theme/tokens/**` altında yaşıyor (ESLint'in
 * `no-restricted-syntax`/noRawHexColor kuralı yalnızca bu klasörü hex
 * literallerine izin veriyor -- bkz. .eslintrc.js) çünkü değerler tema
 * moduna (açık/sepya/koyu) göre DEĞİŞMEYEN, kullanıcının kendi seçtiği bir
 * KİMLİK rengi -- bir metin/yüzey rengi değil. Her iki temada da yeterli
 * kontrastla çalışacak şekilde seçildi; rozetler her zaman kendi arka
 * planı üzerinde sabit bir ikon rengiyle (`theme.text.onAccent`)
 * kullanılıyor, metin zemini olarak KULLANILMIYOR.
 */
export interface DeckColorOption {
  key: string;
  hex: string;
}

export const DECK_COLOR_OPTIONS: DeckColorOption[] = [
  { key: "terracotta", hex: "#C2703D" },
  { key: "teal", hex: "#2F8577" },
  { key: "indigo", hex: "#4C5FD5" },
  { key: "amber", hex: "#D69E2E" },
  { key: "rose", hex: "#C2497A" },
  { key: "sage", hex: "#6B8F5A" },
];

const DEFAULT_COLOR = DECK_COLOR_OPTIONS[0]!.hex;

export function deckColorHex(colorKey: string): string {
  return DECK_COLOR_OPTIONS.find((option) => option.key === colorKey)?.hex ?? DEFAULT_COLOR;
}
