export { ReaderScreen } from "@/features/reader/components/ReaderScreen";
export { useReaderSettings } from "@/features/reader/hooks/useReaderSettings";
// Kelime defteri ekranı kelimeyi buradan çıkarıyor (bkz. o hook'un notu).
export { useRemoveSavedWordMutation } from "@/features/reader/api/useSavedWordsQuery";
export type { ReaderChapter, ReaderParagraph, ReaderSettings } from "@/features/reader/types";
