import { buildPageSpeech, findWordStart, wordKey } from "@/features/reader/tts/ttsPlan";

import type { Page } from "@/features/reader/pagination/types";
import type { ReaderChapter } from "@/features/reader/types";

/**
 * Sesli okuma eşlemesinin testleri.
 *
 * NEDEN BU TESTLER VAR: seslendirici bir karakter konumu bildiriyor, biz onu
 * ekrandaki kelimeye çeviriyoruz. Bu çeviri bir kelime kayarsa vurgu sesin
 * gerisinde ya da ilerisinde kalır — özelliği kullanılamaz yapan tam olarak
 * budur ve gözle fark etmek zordur, çünkü çoğu kelimede "yakın" durur.
 */

function paragraph(id: string, text: string): ReaderChapter["paragraphs"][number] {
  return { id, text } as ReaderChapter["paragraphs"][number];
}

describe("wordKey", () => {
  it("aynı paragrafın iki farklı sayfadaki parçasını ayırt eder", () => {
    // Bir paragraf iki sayfaya bölündüğünde her parçanın token konumları
    // kendi içinde 0'dan başlıyor. Parça başlangıcı anahtara girmeseydi iki
    // farklı kelime aynı anahtarı üretir, yanlış kelime vurgulanırdı.
    expect(wordKey("p1", 0, 12)).not.toBe(wordKey("p1", 300, 12));
  });

  it("aynı kelime için kararlı bir anahtar üretir", () => {
    expect(wordKey("p1", 0, 12)).toBe(wordKey("p1", 0, 12));
  });
});

describe("buildPageSpeech", () => {
  const paragraphs = [
    paragraph("p1", "The old man walked to the harbour before sunrise."),
    paragraph("p2", "   "),
    paragraph("p3", "Boats slept on black water."),
  ];

  it("her parça için ekranda duran metnin AYNISINI konuşur", () => {
    // Paragrafın tamamı konuşulsaydı ses görünmeyen metne devam eder,
    // vurgu sayfanın dışına taşardı.
    const page: Page = {
      segments: [{ paragraphId: "p1", paragraphIndex: 0, charStart: 4, charEnd: 20 }],
    };
    const segments = buildPageSpeech(page, paragraphs);

    expect(segments).toHaveLength(1);
    expect(segments[0]?.text).toBe("old man walked t");
    expect(segments[0]?.segmentCharStart).toBe(4);
  });

  it("kelime aralıklarını konuşulan metne göre verir", () => {
    const page: Page = {
      segments: [{ paragraphId: "p3", paragraphIndex: 0, charStart: 0, charEnd: 27 }],
    };
    const [segment] = buildPageSpeech(page, paragraphs);

    expect(segment?.words).toEqual([
      { start: 0, end: 5 }, // Boats
      { start: 6, end: 11 }, // slept
      { start: 12, end: 14 }, // on
      { start: 15, end: 20 }, // black
      { start: 21, end: 26 }, // water
    ]);
  });

  it("kelime içermeyen parçayı atlar", () => {
    // Boş/boşluk metni bazı platformlarda hiç `onDone` üretmiyor; zincir
    // orada sessizce dururdu.
    const page: Page = {
      segments: [
        { paragraphId: "p2", paragraphIndex: 1, charStart: 0, charEnd: 3 },
        { paragraphId: "p3", paragraphIndex: 2, charStart: 0, charEnd: 27 },
      ],
    };
    const segments = buildPageSpeech(page, paragraphs);

    expect(segments).toHaveLength(1);
    expect(segments[0]?.paragraphId).toBe("p3");
  });

  it("bilinmeyen paragraf kimliğinde çökmez", () => {
    const page: Page = {
      segments: [{ paragraphId: "yok", paragraphIndex: 0, charStart: 0, charEnd: 5 }],
    };
    expect(buildPageSpeech(page, paragraphs)).toEqual([]);
  });

  it("sayfadaki parçaların sırasını korur", () => {
    const page: Page = {
      segments: [
        { paragraphId: "p3", paragraphIndex: 2, charStart: 0, charEnd: 27 },
        { paragraphId: "p1", paragraphIndex: 0, charStart: 0, charEnd: 10 },
      ],
    };
    expect(buildPageSpeech(page, paragraphs).map((s) => s.paragraphId)).toEqual(["p3", "p1"]);
  });
});

describe("findWordStart", () => {
  // "Boats slept on black water."
  const words = [
    { start: 0, end: 5 },
    { start: 6, end: 11 },
    { start: 12, end: 14 },
    { start: 15, end: 20 },
    { start: 21, end: 26 },
  ];

  it("kelime başlangıcını bulur", () => {
    expect(findWordStart(words, 0)).toBe(0);
    expect(findWordStart(words, 6)).toBe(6);
    expect(findWordStart(words, 21)).toBe(21);
  });

  it("kelimenin ortasındaki konumu o kelimeye eşler", () => {
    expect(findWordStart(words, 3)).toBe(0);
    expect(findWordStart(words, 18)).toBe(15);
  });

  it("kelime SONUNU bir sonrakine kaydırmaz", () => {
    // `end` hariç: 5. karakter "Boats"un sonrası, yani boşluk.
    expect(findWordStart(words, 5)).toBeNull();
  });

  it("boşluk ve noktalamada null döner — vurgu olduğu yerde kalır", () => {
    // Yanlış kelimeyi yakıp söndürmektense bir olayı atlamak daha az
    // rahatsız edici; çağıran null'da vurguyu değiştirmiyor.
    expect(findWordStart(words, 11)).toBeNull();
    expect(findWordStart(words, 26)).toBeNull();
  });

  it("metnin dışındaki konumlarda null döner", () => {
    expect(findWordStart(words, -1)).toBeNull();
    expect(findWordStart(words, 999)).toBeNull();
  });

  it("boş kelime listesinde çökmez", () => {
    expect(findWordStart([], 0)).toBeNull();
  });

  it("her kelimenin her karakteri doğru kelimeye eşleniyor", () => {
    // İkili aramanın sınırlarını tek tek doğrular: bir kelime kayması bu
    // testte kesin olarak görünür.
    for (const word of words) {
      for (let index = word.start; index < word.end; index += 1) {
        expect(findWordStart(words, index)).toBe(word.start);
      }
    }
  });
});
