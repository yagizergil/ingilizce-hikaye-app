export { ReaderScreen } from "@/features/reader/components/ReaderScreen";
/** Profil ekranı da açıyor: yazı tipi/boyutu ve tema ayarı TEK bir yerde
 * yaşıyor, ikinci bir kopya yazılmadı (bkz. ProfileScreen'deki not). */
export { ReaderSettingsSheet } from "@/features/reader/components/ReaderSettingsSheet";
export { useReaderSettings } from "@/features/reader/hooks/useReaderSettings";
// Kelime defteri ekranı kelimeyi buradan çıkarıyor (bkz. o hook'un notu).
export { useRemoveSavedWordMutation } from "@/features/reader/api/useSavedWordsQuery";
export type { ReaderChapter, ReaderParagraph, ReaderSettings } from "@/features/reader/types";
