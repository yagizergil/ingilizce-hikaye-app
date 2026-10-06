"""Maskot animasyon videolarını (yeşil perde, 24 fps) sprite sayfalarına çevirir.

Kaynak: Higgsfield Kling 3.0 Pro, 1440x1440, 4 sn, ilk kare = son kare.
Her animasyon için ilk FRAMES kare (24 fps gerçek hareket) tek bir WebP
ızgarasına dizilir; uygulama kareleri ileri-geri oynatır
(src/components/ui/MascotAnim.tsx). Ölçüler assets/anim/_meta.json'a yazılır
ve bileşen oradan okur -- elle sayı kopyalamak yok.

CELL: bir karenin uzun kenarı (bkz. CELL_OVERRIDE). Bellek: 448 px'lik bir
sayfa ~3700x2800 RGBA (~41 MB çözülmüş); MascotAnim görseli yalnızca ekran
odaktayken bağlı tutar, yani aynı anda tek sayfa bellekte.

KULLANIM
    pipeline/.venv/Scripts/python.exe scripts/build-mascot-sprites.py <mp4_klasoru>
"""

from __future__ import annotations

import json
import os
import sys

import cv2
import numpy as np
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "assets", "anim")
FRAMES = 48
CELL = 448
# Büyük gösterilenler (paywall tacı ~200 pt, bölüm/kitap sonu kutlaması
# ~200 pt) daha yüksek çözünürlükte.
CELL_OVERRIDE = {"crown": 576, "party": 576}
COLS = 8
GUTTER = 8


def key(rgb: np.ndarray) -> np.ndarray:
    """Yeşil perdeyi şeffaflığa çevirir; kenardaki yeşil yansımayı bastırır."""
    a = rgb.astype(np.float32)
    r, g, b = a[..., 0], a[..., 1], a[..., 2]
    dominance = g - np.maximum(r, b)
    alpha = np.clip((90 - dominance) / 50.0, 0, 1)
    alpha = cv2.erode(alpha, np.ones((3, 3), np.uint8), iterations=1)
    alpha = cv2.GaussianBlur(alpha, (0, 0), 0.7)
    g2 = np.minimum(g, np.maximum(r, b) + 4)  # yeşil saçak (spill) bastırma
    return np.dstack([r, g2, b, alpha * 255]).clip(0, 255).astype(np.uint8)


def main(src: str) -> None:
    meta = {}
    for name in sorted(f[:-4] for f in os.listdir(src) if f.endswith(".mp4")):
        cap = cv2.VideoCapture(os.path.join(src, name + ".mp4"))
        frames = []
        while len(frames) < FRAMES:
            ok, bgr = cap.read()
            if not ok:
                break
            frames.append(key(cv2.cvtColor(bgr, cv2.COLOR_BGR2RGB)))
        union = None
        for k in frames:
            ys, xs = np.where(k[..., 3] > 20)
            box = (xs.min(), ys.min(), xs.max() + 1, ys.max() + 1)
            union = box if union is None else (
                min(union[0], box[0]), min(union[1], box[1]), max(union[2], box[2]), max(union[3], box[3])
            )
        pad = 8
        h0, w0 = frames[0].shape[:2]
        x0, y0 = max(0, union[0] - pad), max(0, union[1] - pad)
        x1, y1 = min(w0, union[2] + pad), min(h0, union[3] + pad)
        scale = CELL_OVERRIDE.get(name, CELL) / max(x1 - x0, y1 - y0)
        w, h = round((x1 - x0) * scale), round((y1 - y0) * scale)
        rows = (len(frames) + COLS - 1) // COLS
        cw, ch = w + 2 * GUTTER, h + 2 * GUTTER
        sheet = Image.new("RGBA", (COLS * cw, rows * ch), (0, 0, 0, 0))
        for i, k in enumerate(frames):
            im = Image.fromarray(k[y0:y1, x0:x1], "RGBA").resize((w, h), Image.LANCZOS)
            sheet.paste(im, ((i % COLS) * cw + GUTTER, (i // COLS) * ch + GUTTER))
        dst = os.path.join(OUT, f"mascot-{name}.webp")
        sheet.save(dst, format="WEBP", quality=88, method=6, exact=True)
        meta[name] = {"w": cw, "h": ch, "cols": COLS, "rows": rows, "frames": len(frames)}
        print(f"{name}: {sheet.size} {len(frames)} kare {os.path.getsize(dst) // 1024} KB")
    with open(os.path.join(OUT, "_meta.json"), "w", encoding="utf-8") as f:
        json.dump(meta, f, indent=1)


if __name__ == "__main__":
    main(sys.argv[1])
