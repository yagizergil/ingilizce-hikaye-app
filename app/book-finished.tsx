import { router, useLocalSearchParams } from "expo-router";

import { BookFinishedScreen } from "@/features/completion";

/**
 * Kitap bitirme kutlaması.
 *
 * NEDEN AYRI BİR ROUTE: reader'ın içinde premium teklifi gösterilemez
 * (ürün ilkesi #1) ama kitabı bitirmek teklifi göstermek için en doğru an.
 * Bitişte reader'dan bu ekrana geçiliyor — kullanıcı artık okumuyor.
 *
 * `replace` ile açılıyor (bkz. ReaderScreen): geri tuşu kullanıcıyı az önce
 * bitirdiği bölümün son sayfasına geri götürmemeli.
 */
export default function BookFinishedRoute() {
  const { bookId } = useLocalSearchParams<{ bookId?: string }>();

  return (
    <BookFinishedScreen
      bookId={bookId ?? null}
      onClose={() => router.replace("/(tabs)")}
      onOpenPaywall={() => router.push("/paywall?source=book_finished")}
      onOpenReview={() => router.replace("/review")}
    />
  );
}
