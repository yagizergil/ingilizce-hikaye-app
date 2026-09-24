import { toLocaleUpper } from "@/components/ui/UpperText";

describe("toLocaleUpper", () => {
  it("Türkçede noktalı i'yi İ yapıyor (iOS textTransform bunu I yapıyordu)", () => {
    expect(toLocaleUpper("şimdi değil", "tr")).toBe("ŞİMDİ DEĞİL");
  });

  it("Türkçede noktasız ı, I oluyor", () => {
    expect(toLocaleUpper("kapı ışık", "tr")).toBe("KAPI IŞIK");
  });

  it("bölge ekli dil kodunu da tanıyor", () => {
    expect(toLocaleUpper("bilgi", "tr-TR")).toBe("BİLGİ");
  });

  it("diğer dillerde standart büyük harf", () => {
    expect(toLocaleUpper("minutes", "en")).toBe("MINUTES");
    expect(toLocaleUpper("einstellungen", "de")).toBe("EINSTELLUNGEN");
  });
});
