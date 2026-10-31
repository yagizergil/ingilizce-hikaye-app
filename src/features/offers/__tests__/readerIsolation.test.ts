import fs from "node:fs";
import path from "node:path";

/**
 * Okuma ekranı kutsaldır (CLAUDE.md Ürün İlkesi #1, rapor §5.3): okuyucu
 * kural motorunu çağıramaz. ESLint de yasaklıyor; bu test lint
 * çalıştırılmasa bile kırmızıya döner.
 */
const READER = path.resolve(__dirname, "../../reader");

function files(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return files(full);
    return /\.(ts|tsx|js)$/.test(entry.name) ? [full] : [];
  });
}

describe("okuyucu yalıtımı", () => {
  it("features/reader hiçbir yerde features/offers'ı import etmiyor", () => {
    const offenders = files(READER).filter((file) =>
      fs.readFileSync(file, "utf8").includes("features/offers"),
    );
    expect(offenders).toEqual([]);
  });
});
