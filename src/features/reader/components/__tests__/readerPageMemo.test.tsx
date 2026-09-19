import { act, create } from "react-test-renderer";

import { ReaderPage } from "@/features/reader/components/ReaderPage";
import { tokenize } from "@/features/reader/text/tokenizer";

import type { ReactElement } from "react";
import type { Page } from "@/features/reader/pagination/types";
import type { ReaderChapter } from "@/features/reader/types";
import type { TypeStyle } from "@/theme";

/**
 * Tokenizer CommonJS bir modül ve `ReaderPage` bağlantıyı import anında
 * yakalıyor; `jest.spyOn(namespace, ...)` bu yüzden araya giremiyor. Modül
 * kaydını baştan sarmalıyoruz -- gerçek uygulama aynen çalışıyor, yalnızca
 * kaç kez çağrıldığı sayılıyor.
 */
jest.mock("@/features/reader/text/tokenizer", () => {
  const actual = jest.requireActual("@/features/reader/text/tokenizer");
  return { ...actual, tokenize: jest.fn(actual.tokenize) };
});

const tokenizeMock = tokenize as unknown as jest.Mock;

/**
 * ÇÖZÜLEN PERFORMANS HATASI (2026-09-19): ses çalarken okuma sayfaları
 * SANİYEDE İKİ KEZ baştan tokenize ediliyordu.
 *
 * Zincir: expo-audio 500 ms'de bir durum yayıyor -> `ReaderScreen` yeniden
 * render oluyor -> `handleWordTap` bağımlılığında TanStack Query v5'in her
 * render'da yeni döndürdüğü mutation NESNESİ olduğu için kimliğini
 * değiştiriyor -> `renderItem` değişiyor -> RN'in `CellRenderer`'ı (bir
 * PureComponent) mount edilmiş HER sayfayı yeniden render ediyor ->
 * `ReaderPage`in tokenizasyon memo'su bozuluyor ve sayfa başına ~600
 * kelime yeniden tokenize + lemmatize ediliyor.
 *
 * BU TESTİN TAM OLARAK NEYİ KORUDUĞU (fazlasını iddia etmemek için):
 * `ReaderPage` aynı proplarla yeniden render edildiğinde tokenizasyon
 * memo'sunun BOZULMADIĞINI. Yani memo'nun bağımlılık listesine ileride her
 * render'da tazelenen bir değer (bir nesne literali, memo'suz bir geri
 * çağırma) eklenirse bu test kırmızıya döner.
 *
 * KORUMADIĞI şey: `handleWordTap`in `ReaderScreen` tarafında kararlı
 * kalması. Asıl düzeltme oydu ve buradan görünmüyor -- o bağımlılık
 * bilerek memo'nun içinde (kelime kapanışları onu taşıyor), doğru yer onu
 * KAYNAĞINDA sabit tutmak. Gerekçesi `ReaderScreen`de
 * `consumeWordLookupAsync`in yanında yazılı.
 *
 * `memo()` sarmalayıcısı da testin geçmesi için gerekli DEĞİL (içerideki
 * `useMemo` zaten yetiyor); o, proplar aynıyken render fonksiyonunun
 * gövdesini -- ~600 elemanlık ağacın yeniden kurulmasını -- atlatmak için
 * duruyor.
 */

const PARAGRAPH_TEXT = "The bus stopped and Adem got off into a wide grey street.";

const PARAGRAPHS: ReaderChapter["paragraphs"] = [
  { id: "p1", paragraphIndex: 0, text: PARAGRAPH_TEXT },
];

const PAGE: Page = {
  segments: [
    { paragraphId: "p1", paragraphIndex: 0, charStart: 0, charEnd: PARAGRAPH_TEXT.length },
  ],
};

const TEXT_STYLE: TypeStyle = {
  fontFamily: undefined,
  fontSize: 18,
  lineHeight: 31,
  fontWeight: "400",
  letterSpacing: 0,
};

function renderPage(props: { paragraphGap: number }) {
  const onWordTap = jest.fn();
  const onSentenceLongPress = jest.fn();

  const element = (gap: number): ReactElement => (
    <ReaderPage
      page={PAGE}
      paragraphs={PARAGRAPHS}
      textStyle={TEXT_STYLE}
      paragraphGap={gap}
      onWordTap={onWordTap}
      onSentenceLongPress={onSentenceLongPress}
    />
  );

  let tree!: ReturnType<typeof create>;
  act(() => {
    tree = create(element(props.paragraphGap));
  });

  return {
    rerender(gap: number) {
      act(() => {
        tree.update(element(gap));
      });
    },
    /** Gerçekten farklı bir sayfa ver -- memo bunu geçirmeli. */
    rerenderWithPage() {
      const otherPage: Page = {
        segments: [{ paragraphId: "p1", paragraphIndex: 0, charStart: 0, charEnd: 12 }],
      };
      act(() => {
        tree.update(
          <ReaderPage
            page={otherPage}
            paragraphs={PARAGRAPHS}
            textStyle={TEXT_STYLE}
            paragraphGap={props.paragraphGap}
            onWordTap={onWordTap}
            onSentenceLongPress={onSentenceLongPress}
          />,
        );
      });
    },
  };
}

describe("ReaderPage tokenizasyonu", () => {
  beforeEach(() => {
    tokenizeMock.mockClear();
  });

  it("proplar aynıyken yeniden render edilse bile metni bir daha tokenize etmez", () => {
    const harness = renderPage({ paragraphGap: 20 });

    const afterFirstRender = tokenizeMock.mock.calls.length;
    expect(afterFirstRender).toBeGreaterThan(0);

    // Aynı proplarla üç kez daha render -- ses çalarken olan tam olarak bu.
    harness.rerender(20);
    harness.rerender(20);
    harness.rerender(20);

    expect(tokenizeMock.mock.calls.length).toBe(afterFirstRender);
  });

  it("sayfanın içeriği değişince yeniden tokenize eder", () => {
    const harness = renderPage({ paragraphGap: 20 });
    const afterFirstRender = tokenizeMock.mock.calls.length;

    // Memo'nun körü körüne her şeyi dondurmadığını da doğrulamak gerekiyor:
    // gerçekten YENİ bir sayfa geldiğinde iş tekrar yapılmalı.
    harness.rerenderWithPage();

    expect(tokenizeMock.mock.calls.length).toBeGreaterThan(afterFirstRender);
  });
});
