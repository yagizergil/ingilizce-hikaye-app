import {
  displayName,
  hasHighQualityVoice,
  rankVoices,
  resolveVoice,
  voiceTier,
} from "@/features/reader/tts/voiceCatalog";

/**
 * Ses sıralamasının testleri.
 *
 * NEDEN BU TESTLER VAR: `expo-speech` iOS'un ÜÇ kalite kademesini İKİYE
 * indiriyor (`voice.quality == .enhanced ? "Enhanced" : "Default"`), yani
 * en iyi kademe olan `premium` "Default" olarak geliyor. Yalnızca o alana
 * bakan bir sıralama, cihazdaki EN İYİ sesi en kötüsüyle aynı kovaya
 * koyar — kullanıcı iyi bir ses indirmiş olmasına rağmen robotik ses
 * duyar. Kimlik tabanlı kademe tespiti bu yüzden var ve bu yüzden test
 * ediliyor.
 */

// `Speech.VoiceQuality` bir enum; testte string değerleri yeterli.
const DEFAULT = "Default" as never;
const ENHANCED = "Enhanced" as never;

function voice(identifier: string, language = "en-US", quality = DEFAULT, name = "") {
  return { identifier, language, quality, name } as never;
}

describe("voiceTier", () => {
  it("premium sesi kimliğinden tanır — quality alanı 'Default' dese bile", () => {
    // Tam olarak kaçırılan durum: iOS premium sesi expo-speech "Default"
    // olarak raporluyor.
    expect(voiceTier(voice("com.apple.voice.premium.en-US.Ava", "en-US", DEFAULT))).toBe("premium");
  });

  it("gelişmiş sesi hem kimlikten hem quality alanından tanır", () => {
    expect(voiceTier(voice("com.apple.voice.enhanced.en-US.Ava", "en-US", DEFAULT))).toBe(
      "enhanced",
    );
    expect(voiceTier(voice("com.apple.ttsbundle.Samantha", "en-US", ENHANCED))).toBe("enhanced");
  });

  it("compact sesi standart sayar", () => {
    expect(voiceTier(voice("com.apple.voice.compact.en-US.Samantha"))).toBe("standard");
  });
});

describe("rankVoices", () => {
  const catalog = [
    voice("com.apple.voice.compact.en-US.Samantha"),
    voice("com.apple.voice.premium.en-US.Ava"),
    voice("com.apple.voice.enhanced.en-GB.Daniel", "en-GB"),
    voice("com.apple.voice.enhanced.en-AU.Karen", "en-AU"),
    voice("com.apple.voice.compact.tr-TR.Yelda", "tr-TR"),
  ];

  it("en iyi kaliteyi başa alır", () => {
    expect(rankVoices(catalog)[0]?.tier).toBe("premium");
  });

  it("aynı kalite ve cinsiyette tanıdık aksanı öne alır", () => {
    // İkisi de kadın: cinsiyet kuralı devre dışı kalıyor, sıralamayı
    // aksak belirliyor.
    const sameTierSameGender = [
      voice("com.apple.voice.enhanced.en-AU.Karen", "en-AU"),
      voice("com.apple.voice.enhanced.en-GB.Serena", "en-GB"),
      voice("com.apple.voice.enhanced.en-US.Ava", "en-US"),
    ];
    expect(rankVoices(sameTierSameGender).map((entry) => entry.language)).toEqual([
      "en-US",
      "en-GB",
      "en-AU",
    ]);
  });

  it("aynı kalitede kadın sesini öne alır", () => {
    // Ürün kararı: anlatıcı kadın sesi. Kilit değil, varsayılan —
    // kullanıcı ayarlardan değiştirebiliyor.
    const sameTier = [
      voice("com.apple.voice.enhanced.en-US.Tom"),
      voice("com.apple.voice.enhanced.en-US.Ava"),
    ];
    expect(rankVoices(sameTier)[0]?.name).toBe("Ava");
  });

  it("kaliteyi cinsiyetin ÖNÜNDE tutar", () => {
    // Gelişmiş bir erkek sesi, robotik bir kadın sesinden iyidir.
    const mixed = [
      voice("com.apple.voice.compact.en-US.Ava"),
      voice("com.apple.voice.premium.en-US.Tom"),
    ];
    expect(rankVoices(mixed)[0]?.name).toBe("Tom");
  });

  it("İngilizce olmayan sesleri eler", () => {
    expect(rankVoices(catalog).some((entry) => entry.language.startsWith("tr"))).toBe(false);
  });

  it("şaka seslerini eler", () => {
    // Eski iOS'un "Bad News"/"Bells" sesleri hikâye okumak için
    // kullanılamaz; listede görünmeleri kullanıcıyı yanıltır.
    const withNovelty = [...catalog, voice("com.apple.speech.synthesis.voice.Bells")];
    expect(rankVoices(withNovelty).some((entry) => entry.identifier.includes("Bells"))).toBe(false);
  });

  it("boş listede çökmez", () => {
    expect(rankVoices([])).toEqual([]);
  });
});

describe("displayName", () => {
  it("kimliğin son parçasını ad olarak kullanır", () => {
    expect(displayName(voice("com.apple.voice.premium.en-US.Ava"))).toBe("Ava");
  });

  it("kullanıcıya ham kimlik göstermez", () => {
    // Bazı cihazlarda `name` kimliğin tamamını döndürüyor.
    const raw = "com.apple.ttsbundle.siri_female_en-US_compact";
    const result = displayName(voice(raw, "en-US", DEFAULT, raw));
    expect(result).not.toContain("com.apple");
  });
});

describe("resolveVoice", () => {
  const voices = rankVoices([
    voice("com.apple.voice.compact.en-US.Samantha"),
    voice("com.apple.voice.premium.en-US.Ava"),
  ]);

  it("kullanıcının seçtiği sesi döndürür", () => {
    const chosen = resolveVoice(voices, "com.apple.voice.compact.en-US.Samantha");
    expect(chosen?.identifier).toBe("com.apple.voice.compact.en-US.Samantha");
  });

  it("seçim yoksa en iyisini döndürür", () => {
    expect(resolveVoice(voices, null)?.tier).toBe("premium");
  });

  it("seçilen ses artık yoksa sessizce en iyisine düşer", () => {
    // Kullanıcı sesi silmiş olabilir; konuşmanın hiç çalışmaması yerine.
    expect(resolveVoice(voices, "silinmis.ses")?.tier).toBe("premium");
  });

  it("hiç ses yoksa null döner", () => {
    expect(resolveVoice([], null)).toBeNull();
  });
});

describe("hasHighQualityVoice", () => {
  it("yalnızca compact ses varken false döner", () => {
    // Bu durumda kullanıcıya indirme ipucu gösteriliyor.
    const voices = rankVoices([voice("com.apple.voice.compact.en-US.Samantha")]);
    expect(hasHighQualityVoice(voices)).toBe(false);
  });

  it("gelişmiş ya da premium ses varken true döner", () => {
    const voices = rankVoices([voice("com.apple.voice.enhanced.en-US.Ava")]);
    expect(hasHighQualityVoice(voices)).toBe(true);
  });
});
