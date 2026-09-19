import { act, create } from "react-test-renderer";
import { View } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { ReaderFooter } from "@/features/reader/components/ReaderFooter";

/**
 * ÇÖZÜLEN HATA (iki tur).
 *
 * TUR 1 (2026-09-18): bölümün son sayfasında footer "%99 -> düğme -> %99"
 * diye git-gel yapıyordu. Footer okuma ekranının flex sütununda bir kardeş
 * olduğu için boyundaki her fark üstteki okuma alanının yüksekliğini
 * değiştiriyor, bu da bütün bölümü yeniden sayfalayıp toplam sayfa sayısını
 * oynatıyordu: kullanıcı artık son sayfada değil -> düğme kayboluyor ->
 * alan büyüyor -> kullanıcı yine son sayfada... sonsuz döngü. O turda
 * kaba `minHeight: 52` konuldu.
 *
 * TUR 2 (2026-09-19): hata DEVAM ediyordu ve bu test onu göremiyordu --
 * çünkü `insets.bottom: 0` ile çalışıyordu, yani farkın kaybolduğu TEK
 * koşulla. `minHeight` bir taban; kabın alt dolgusu `insets.bottom`
 * olduğu için ana ekran çubuğu olan bir iPhone'da (inset ~34) iki dal da
 * tabanı aşıyor ve aralarındaki 23 px geri geliyordu:
 *
 *   yüzde dalı : 8 + 13 + 34 = 55
 *   düğme dalı : 8 + 36 + 34 = 78
 *
 * Bu yüzden test artık (a) GERÇEKÇİ bir alt inset kullanıyor ve (b)
 * `minHeight` tabanını değil, RENDER EDİLEN sabit yüksekliği ölçüyor.
 */

function renderFooter(onLastPage: boolean, bottomInset: number) {
  let tree!: ReturnType<typeof create>;
  act(() => {
    tree = create(
      <SafeAreaProvider
        initialMetrics={{
          frame: { x: 0, y: 0, width: 390, height: 844 },
          insets: { top: 47, left: 0, right: 0, bottom: bottomInset },
        }}
      >
        <ReaderFooter
          progress={0.5}
          onLastPage={onLastPage}
          hasNextChapter
          onFinishChapter={() => {}}
        />
      </SafeAreaProvider>,
    );
  });
  return tree;
}

function mergedStyle(node: { props: { style?: unknown } }): Record<string, number | undefined> {
  const style = Array.isArray(node.props.style) ? node.props.style : [node.props.style];
  return Object.assign({}, ...style.filter(Boolean)) as Record<string, number | undefined>;
}

/**
 * Footer'ın dış kabının TOPLAM yüksekliği. `minHeight` bir taban olduğu
 * için ölçüt olamaz (tur 2'nin dersi): gerçek yükseklik sabit içerik
 * yüksekliği + dikey dolgular.
 */
function totalHeight(onLastPage: boolean, bottomInset: number): number {
  const tree = renderFooter(onLastPage, bottomInset);
  const views = tree.root.findByType(ReaderFooter).findAllByType(View);
  const outer = mergedStyle(views[0] as (typeof views)[number]);
  const content = mergedStyle(views[1] as (typeof views)[number]);

  const contentHeight = content.height;
  if (typeof contentHeight !== "number") {
    throw new Error("footer içerik kabının SABİT bir `height`'ı olmalı");
  }
  return (outer.paddingTop ?? 0) + contentHeight + (outer.paddingBottom ?? 0);
}

describe("ReaderFooter", () => {
  // Ana ekran çubuğu olan/olmayan cihazlar. Hatanın geri gelmesi için
  // 0'dan farklı bir alt inset yetiyordu -- o yüzden her ikisi de test
  // ediliyor, yalnızca biri değil.
  it.each([
    ["alt inset yok (eski iPhone / Android)", 0],
    ["ana ekran çubuğu var (modern iPhone)", 34],
  ])("%s: son sayfada ve değilken yükseklik aynı", (_label, bottomInset) => {
    expect(totalHeight(true, bottomInset)).toBe(totalHeight(false, bottomInset));
  });

  it("içerik kabı, düğmenin doğal boyutunu (minHeight 36) kırpmadan barındırır", () => {
    const tree = renderFooter(true, 34);
    const views = tree.root.findByType(ReaderFooter).findAllByType(View);
    const content = mergedStyle(views[1] as (typeof views)[number]);
    expect(content.height).toBeGreaterThanOrEqual(36);
  });

  it("yükseklik yalnızca alt inset kadar değişir -- içerik dalına göre DEĞİL", () => {
    // Cihazdan cihaza değişmesi MEŞRU olan tek şey güvenli alan.
    expect(totalHeight(true, 34) - totalHeight(true, 0)).toBe(34);
  });
});
