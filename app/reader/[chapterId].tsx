import { router, useLocalSearchParams } from "expo-router";
import { ReaderScreen } from "@/features/reader";
import { ErrorBoundary } from "@/components/ui";

export default function ReaderRoute() {
  const { chapterId, autoplay, bookId } = useLocalSearchParams<{
    chapterId: string;
    autoplay?: string;
    bookId?: string;
  }>();

  if (!chapterId) return null;

  // Reader uygulamanın en karmaşık ekranı; kendi hata sınırı var ki
  // buradaki bir render hatası tüm uygulamayı değil yalnızca bu ekranı
  // düşürsün. Sınır `chapterId`'ye anahtarlı: başka bir bölüme geçince
  // önceki bölümün hata durumu sıfırlanır.
  return (
    <ErrorBoundary key={chapterId} source="reader">
      <ReaderScreen
        chapterId={chapterId}
        // DENETİM BULGUSU (2026-09-19, performans): `bookId` önceden
        // yalnızca bölüm sorgusu döndükten SONRA `chapter.bookId`'den
        // öğreniliyordu, yani kitap sözlüğü isteği (`useBookLemmaDictionary`)
        // bölüm isteğinin ARDINDAN başlıyordu -- iki ağ gidiş-dönüşü art
        // arda. Çağıran taraf (kitap detayı) `bookId`'yi zaten biliyor;
        // route'a parametre olarak geçiyoruz ki ReaderScreen ikisini
        // AYNI ANDA isteyebilsin. Sonraki/önceki bölüme geçişte de aynı
        // kitaptan çıkılmıyor, o yüzden mevcut `bookId`'yi olduğu gibi
        // ileri taşıyoruz.
        initialBookId={bookId}
        onBack={() => router.back()}
        onOpenChapter={(nextChapterId) =>
          router.replace(`/reader/${nextChapterId}${bookId ? `?bookId=${bookId}` : ""}`)
        }
        // `replace`: geri tuşu kullanıcıyı az önce bitirdiği bölümün son
        // sayfasına geri götürmesin.
        onFinishBook={(finishedBookId) => router.replace(`/book-finished?bookId=${finishedBookId}`)}
        // Kitap detayındaki "Dinle" düğmesi buraya `?autoplay=1` ile geliyor.
        autoStartSpeech={autoplay === "1"}
      />
    </ErrorBoundary>
  );
}
