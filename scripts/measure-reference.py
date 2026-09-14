"""Referans ekran görüntülerinden piksel ölçüsü çıkarır.

NEDEN VAR: tasarım hedefi "ölçüler bile birebir". Gözle bakarak 16pt ile
20pt, 12px yarıçap ile 14px ayırt edilemiyor -- daha önce tam olarak bu
yüzden tahmin edilip düzeltilen ölçüler oldu (bkz. WordSheet.tsx'teki
"FAZ 5/9 DÜZELTMESİ" yorumları). Bu betik tahmini ortadan kaldırıyor.

KULLANIM
    python scripts/measure-reference.py <dosya> scan-x <y>     # yatay tarama
    python scripts/measure-reference.py <dosya> scan-y <x>     # dikey tarama
    python scripts/measure-reference.py <dosya> color <x> <y>  # nokta rengi
    python scripts/measure-reference.py <dosya> palette        # baskın renkler

ÖLÇEK: görüntüler WhatsApp tarafından 945 px genişliğe küçültülmüş.
`--pt-width` ile cihazın pt genişliği verilirse px -> pt dönüşümü de
yazdırılıyor (varsayılan 393 = iPhone 15/16 Pro).

JPEG UYARISI: kaynak JPEG, yani kenarlarda sıkıştırma bulanıklığı var.
Renk okumaları bir bölgenin ORTASINDAN alınmalı, kenarından değil; bu
yüzden `color` komutu tek piksel değil 5x5 medyan döndürüyor ve tarama
komutları eşikli çalışıyor.
"""

from __future__ import annotations

import sys
from collections import Counter

from PIL import Image

# Aynı renk sayılmak için kanal başına izin verilen en büyük fark.
# JPEG gürültüsü düz bir yüzeyde tipik olarak +-2; 6 güvenli bir tavan.
TOLERANCE = 6

# Bir renk kuşağının "gerçek" sayılması için gereken en az piksel sayısı.
# Daha kısa kuşaklar kenar yumuşatmasıdır (antialiasing), sınır değildir.
MIN_RUN = 3


def close(a: tuple[int, int, int], b: tuple[int, int, int]) -> bool:
    return all(abs(x - y) <= TOLERANCE for x, y in zip(a, b))


def hexof(c: tuple[int, int, int]) -> str:
    return "#{:02X}{:02X}{:02X}".format(*c)


def median_color(im: Image.Image, x: int, y: int, box: int = 2) -> tuple[int, int, int]:
    """5x5 medyan: tek piksel JPEG gürültüsüne açık."""
    px = im.load()
    vals: list[tuple[int, int, int]] = []
    for dy in range(-box, box + 1):
        for dx in range(-box, box + 1):
            xx, yy = min(max(x + dx, 0), im.width - 1), min(max(y + dy, 0), im.height - 1)
            vals.append(px[xx, yy])
    vals.sort()
    return vals[len(vals) // 2]


def runs(im: Image.Image, fixed: int, axis: str) -> list[tuple[int, int, tuple[int, int, int]]]:
    """Bir tarama hattı boyunca ardışık renk kuşaklarını döndürür."""
    px = im.load()
    length = im.width if axis == "x" else im.height
    out: list[tuple[int, int, tuple[int, int, int]]] = []
    start = 0
    cur = px[0, fixed] if axis == "x" else px[fixed, 0]
    for i in range(1, length):
        c = px[i, fixed] if axis == "x" else px[fixed, i]
        if not close(c, cur):
            if i - start >= MIN_RUN:
                out.append((start, i - 1, cur))
            start, cur = i, c
    if length - start >= MIN_RUN:
        out.append((start, length - 1, cur))
    return out


def main() -> int:
    if len(sys.argv) < 3:
        print(__doc__)
        return 1

    path, cmd = sys.argv[1], sys.argv[2]
    pt_width = 393.0
    args = [a for a in sys.argv[3:] if not a.startswith("--")]
    for a in sys.argv[3:]:
        if a.startswith("--pt-width="):
            pt_width = float(a.split("=", 1)[1])

    im = Image.open(path).convert("RGB")
    px_per_pt = im.width / pt_width

    def to_pt(v: float) -> str:
        return f"{v / px_per_pt:.1f}pt"

    print(f"{path}  {im.width}x{im.height}px   1pt = {px_per_pt:.4f}px  (ekran {pt_width:.0f}pt)")

    if cmd == "color":
        x, y = int(args[0]), int(args[1])
        c = median_color(im, x, y)
        print(f"({x},{y}) = {hexof(c)}  rgb{c}")
        return 0

    if cmd == "palette":
        small = im.resize((im.width // 4, im.height // 4), Image.NEAREST)
        counts = Counter(small.getdata())
        total = sum(counts.values())
        for c, n in counts.most_common(12):
            print(f"{hexof(c)}  rgb{str(c):18} %{100 * n / total:5.2f}")
        return 0

    if cmd in ("scan-x", "scan-y"):
        fixed = int(args[0])
        axis = "x" if cmd == "scan-x" else "y"
        for a, b, c in runs(im, fixed, axis):
            span = b - a + 1
            print(f"{a:5}..{b:5}  {span:5}px  {to_pt(span):>8}  {hexof(c)}")
        return 0

    print(__doc__)
    return 1


if __name__ == "__main__":
    raise SystemExit(main())
