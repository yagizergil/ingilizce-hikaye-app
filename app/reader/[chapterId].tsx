import { router, useLocalSearchParams } from "expo-router";
import { ReaderScreen } from "@/features/reader";
import { ErrorBoundary } from "@/components/ui";

export default function ReaderRoute() {
  const { chapterId } = useLocalSearchParams<{ chapterId: string }>();

  if (!chapterId) return null;

  // Reader uygulamanın en karmaşık ekranı; kendi hata sınırı var ki
  // buradaki bir render hatası tüm uygulamayı değil yalnızca bu ekranı
  // düşürsün. Sınır `chapterId`'ye anahtarlı: başka bir bölüme geçince
  // önceki bölümün hata durumu sıfırlanır.
  return (
    <ErrorBoundary key={chapterId} source="reader">
      <ReaderScreen
        chapterId={chapterId}
        onBack={() => router.back()}
        onOpenChapter={(nextChapterId) => router.replace(`/reader/${nextChapterId}`)}
        // `replace`: geri tuşu kullanıcıyı az önce bitirdiği bölümün son
        // sayfasına geri götürmesin.
        onFinishBook={(bookId) => router.replace(`/book-finished?bookId=${bookId}`)}
      />
    </ErrorBoundary>
  );
}
