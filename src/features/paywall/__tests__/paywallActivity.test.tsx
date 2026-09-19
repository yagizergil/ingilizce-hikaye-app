import { act, create } from "react-test-renderer";
import { Text } from "react-native";

import { PaywallActivity } from "@/features/paywall/components/PaywallActivity";

import type { ReactElement } from "react";
import type { PaywallActivityFacts } from "@/features/paywall/api/usePaywallFactsQuery";

/**
 * DÜRÜSTLÜK KURALI: paywall kullanıcının kendi rakamlarıyla açılıyor, ama
 * SIFIR GÖSTERMİYOR.
 *
 * Gerekçe `PaywallActivity`nin doc comment'inde: geçmişi olmayan bir
 * kullanıcıya "0 gün okudun, 0 kelime çevirdin" diye bir "başarı" bloğu
 * göstermek, satmak istediğin şeyin değersiz olduğunu söylemek olur.
 * Karar iki yerde veriliyor -- `usePaywallFactsQuery` hiç geçmiş yoksa
 * `activity: null` döndürüyor, bileşen de tek tek sıfır alanları eliyor.
 * Bu test ikincisini kilitliyor.
 */

/**
 * Testte gerçek bir i18next örneği yok, yani `t()` ham anahtarı döndürüyor.
 * Bu yüzden iddialar ÇEVRİLMİŞ METNE değil, YAPIYA dayanıyor: hangi sayılar
 * çizildi ve kaç metin düğümü var. Çeviri içeriğini zaten `localeParity` ve
 * `bootstrap` testleri koruyor.
 */
function childrenOf(element: ReactElement): (string | number)[] {
  let tree!: ReturnType<typeof create>;
  act(() => {
    tree = create(element);
  });
  return tree.root
    .findAllByType(Text)
    .flatMap((node) => node.props.children)
    .filter(
      (child): child is string | number => typeof child === "string" || typeof child === "number",
    );
}

function facts(overrides: Partial<PaywallActivityFacts>): PaywallActivityFacts {
  return { daysRead: 0, wordsLookedUp: 0, wordsSaved: 0, ...overrides };
}

describe("PaywallActivity", () => {
  it("her sayı sıfırken hiçbir şey çizmiyor", () => {
    let tree!: ReturnType<typeof create>;
    act(() => {
      tree = create(<PaywallActivity activity={facts({})} />);
    });
    expect(tree.toJSON()).toBeNull();
  });

  it("sıfır olan tek tek alanları da gizliyor", () => {
    const children = childrenOf(<PaywallActivity activity={facts({ wordsSaved: 12 })} />);
    // Yalnızca gerçekten yapılmış olan sayı çiziliyor.
    expect(children).toContain(12);
    expect(children).not.toContain(0);
  });

  it("üç sayının üçü de doluysa üçünü birden çiziyor", () => {
    const children = childrenOf(
      <PaywallActivity activity={facts({ daysRead: 4, wordsLookedUp: 63, wordsSaved: 12 })} />,
    );
    expect(children).toEqual(expect.arrayContaining([4, 63, 12]));
  });

  it("kota bittiği için gelindiyse fazladan bir satır çiziyor", () => {
    const withWord = childrenOf(
      <PaywallActivity activity={facts({ wordsLookedUp: 15 })} blockedWord="reluctant" />,
    );
    const withoutWord = childrenOf(<PaywallActivity activity={facts({ wordsLookedUp: 15 })} />);
    expect(withWord.length).toBe(withoutWord.length + 1);
  });
});
