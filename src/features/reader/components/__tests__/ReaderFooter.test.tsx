import { act, create } from "react-test-renderer";
import { View } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { ReaderFooter } from "@/features/reader/components/ReaderFooter";

const testInitialMetrics = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 0, left: 0, right: 0, bottom: 0 },
};

/**
 * ÇÖZÜLEN HATA (2026-09-18, kullanıcı videosu): bölümün son sayfasında
 * footer "%99 -> düğme -> %99 -> düğme" diye sürekli git-gel yapıyordu
 * ("sayfa nefes alıyormuş gibi"). Kök sebep: bu bileşenin dış kabı, yüzde
 * metnini gösterirken 44px'e (minHeight tabanı), "sonraki bölüm" düğmesini
 * gösterirken doğal olarak 52px'e render ediyordu. Footer, okuma
 * ekranının flex sütununda bir kardeş olduğu için bu 8px'lik fark üstteki
 * okuma alanının ölçülen yüksekliğini değiştiriyor, bu da sayfalamayı
 * yeniden tetikleyip toplam sayfa sayısını değiştirebiliyordu -- kullanıcı
 * artık "son sayfada" olmayabiliyor, düğme kayboluyor, alan büyüyor,
 * sayfalama eski boyutla yeniden tetikleniyor, kullanıcı yeniden son
 * sayfaya dönüyordu. Sonsuz döngü.
 *
 * Bu test, iki durumun (yüzde metni / düğme) dış kabının AYNI yükseklikte
 * render ettiğini doğruluyor -- gelecekte biri bu ikisinden birinin
 * boyutunu bağımsız değiştirirse (örn. padding/font-size ayarı) bu test
 * kırmızıya döner.
 */

function outerHeight(onLastPage: boolean): number | string | undefined {
  let tree!: ReturnType<typeof create>;
  act(() => {
    tree = create(
      <SafeAreaProvider initialMetrics={testInitialMetrics}>
        <ReaderFooter
          progress={0.5}
          onLastPage={onLastPage}
          hasNextChapter
          onFinishChapter={() => {}}
        />
      </SafeAreaProvider>,
    );
  });
  const outer = tree.root.findByType(ReaderFooter).findByType(View);
  const style = Array.isArray(outer?.props.style) ? outer.props.style : [outer?.props.style];
  const merged = Object.assign({}, ...style.filter(Boolean));
  return merged.minHeight ?? merged.height;
}

describe("ReaderFooter", () => {
  it("son sayfada ve değilken dış kabın yüksekliği aynı kalır", () => {
    const normalHeight = outerHeight(false);
    const lastPageHeight = outerHeight(true);

    expect(normalHeight).toBeDefined();
    expect(normalHeight).toBe(lastPageHeight);
  });

  it("son sayfa yüksekliği, düğmenin doğal boyutunu (36 + dolgu) karşılayacak kadar büyük", () => {
    // Düğmenin kendi minHeight'ı (36) + bu container'ın üstte/altta 8'er
    // piksellik dolgusu = 52 -- container bundan küçük olursa düğme
    // durumu container'ı yine BÜYÜTÜR ve hata geri gelir.
    expect(outerHeight(true)).toBeGreaterThanOrEqual(52);
  });
});
