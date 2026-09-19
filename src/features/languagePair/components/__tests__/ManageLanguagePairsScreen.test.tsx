import { act, create } from "react-test-renderer";
import type { ReactTestRenderer } from "react-test-renderer";

import { ManageLanguagePairsScreen } from "@/features/languagePair/components/ManageLanguagePairsScreen";

/**
 * KULLANICI BULGUSU (2026-09-19): "dil çiftine tıkladım, şu an burası
 * bomboş, hiçbir şey yok."
 *
 * Ekranın İKİ durumu hiç ele alınmamıştı: sorgu hata verdiğinde ve
 * kullanıcının hiç çifti olmadığında. İkisinde de `isLoading` false'a
 * düşüyor, `activePair` null kalıyor ve gövdenin TÜM blokları
 * (`activePair ? ...`, `addableTargets.length > 0 ? ...`,
 * `historyPairs.length > 0 ? ...`) eleniyordu -- geriye başlık ve tek bir
 * ölü bölüm etiketi kalıyordu.
 *
 * Sıfır çift ULAŞILABİLİR bir durum, kaza değil: `useActiveLanguagePairQuery`
 * satır yokken bilerek bir varsayılana düşüyor, yani kullanıcı hiç satırı
 * olmadan uygulamanın içinde gezinip buraya gelebiliyor. Canlı veride
 * doğrulandı: çifti olan her kullanıcıda tam olarak bir aktif satır var,
 * dolayısıyla `activePair === null` yalnızca "hiç satır yok" demek.
 *
 * Bu testler her iki durumda da ekranda EYLEME DÖNÜK bir şey bulunduğunu
 * kilitliyor.
 */

let mockOwned: { nativeLanguage: string; targetLanguage: string; isActive: boolean }[] | undefined;
let mockIsLoading = false;
let mockIsError = false;
const mockRefetch = jest.fn();

jest.mock("@/features/languagePair/api/useActiveLanguagePairQuery", () => ({
  useOwnedLanguagePairsQuery: () => ({
    data: mockOwned,
    isLoading: mockIsLoading,
    isError: mockIsError,
    refetch: mockRefetch,
  }),
}));

jest.mock("@/features/languagePair/api/useSetLanguagePairMutation", () => ({
  useSetLanguagePairMutation: () => ({ mutate: jest.fn(), isPending: false }),
}));

/**
 * `@/components/ui` barrel'i toptan taklit ediliyor. Sebebi teknik:
 * barrel `Skeleton` -> `react-native-reanimated` -> `react-native-worklets`
 * zincirini ve `ErrorBoundary` -> `analytics` -> `supabase` zincirini
 * cekiyor; ikisi de test ortaminda import aninda patliyor.
 *
 * BUNUN TESTE MALIYETI: gercek `EmptyState`/`ErrorState` bilesenlerinin
 * kendi cizimi DOGRULANMIYOR. Testin iddiasi da o degil -- ekranin dogru
 * DALA girip o bilesenleri dogru metinlerle CAGIRDIGI. Taklitler aldiklari
 * metni oldugu gibi basiyor, yani iddia edilen sey olculuyor.
 */
jest.mock("@/components/ui", () => {
  // jest.mock fabrikasi hoisting yuzunden dosya ustundeki import'lari
  // goremiyor; icerideki bagimlilik require ile alinmak zorunda.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { Text } = require("react-native");
  return {
    EmptyState: ({ title, description }: { title: string; description?: string }) => (
      <Text>{`${title} ${description ?? ""}`}</Text>
    ),
    ErrorState: ({ message, onRetry }: { message: string; onRetry?: () => void }) => (
      <Text onPress={onRetry}>{`${message} ${onRetry ? "common.retry" : ""}`}</Text>
    ),
    Button: ({ label }: { label: string }) => <Text>{label}</Text>,
    LoadingState: () => <Text>loading</Text>,
    LanguageFlag: () => null,
  };
});

jest.mock("@/i18n", () => ({
  __esModule: true,
  default: { language: "tr", changeLanguage: jest.fn() },
}));

jest.mock("@/i18n/uiLanguage", () => ({ storeUiLanguage: jest.fn() }));

// Çeviri anahtarının kendisini döndürmek yeterli: testin iddiası metnin
// içeriği değil, eyleme dönük bir öğenin VAR OLMASI.
jest.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

function render(): ReactTestRenderer {
  let tree!: ReactTestRenderer;
  act(() => {
    tree = create(<ManageLanguagePairsScreen onClose={jest.fn()} onNeedsPremium={jest.fn()} />);
  });
  return tree;
}

/** Ağaçtaki tüm metinleri düz bir dizi olarak toplar. */
function texts(tree: ReactTestRenderer): string[] {
  return JSON.stringify(tree.toJSON() ?? {}).match(/"[^"]*"/g) ?? [];
}

function contains(tree: ReactTestRenderer, needle: string): boolean {
  return texts(tree).some((chunk) => chunk.includes(needle));
}

describe("ManageLanguagePairsScreen", () => {
  beforeEach(() => {
    mockOwned = undefined;
    mockIsLoading = false;
    mockIsError = false;
    mockRefetch.mockClear();
  });

  it("hiç çift yokken boş ekran DEĞİL, çift seçme daveti gösteriyor", () => {
    mockOwned = [];
    const tree = render();

    expect(contains(tree, "languagePair.noPairTitle")).toBe(true);
    expect(contains(tree, "languagePair.choosePairCta")).toBe(true);
  });

  it("sorgu hata verdiğinde hata durumu ve yeniden deneme gösteriyor", () => {
    mockIsError = true;
    const tree = render();

    expect(contains(tree, "languagePair.loadError")).toBe(true);
    expect(contains(tree, "common.retry")).toBe(true);
  });

  it("çift varken normal yönetim gövdesini gösteriyor", () => {
    mockOwned = [{ nativeLanguage: "tr", targetLanguage: "en", isActive: true }];
    const tree = render();

    expect(contains(tree, "languagePair.yourPairs")).toBe(true);
    expect(contains(tree, "languagePair.noPairTitle")).toBe(false);
  });

  it("yükleniyorken ne boş durumu ne hatayı gösteriyor", () => {
    mockIsLoading = true;
    const tree = render();

    expect(contains(tree, "languagePair.noPairTitle")).toBe(false);
    expect(contains(tree, "languagePair.loadError")).toBe(false);
  });
});
