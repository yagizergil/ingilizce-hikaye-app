"""TikTok video #1 (15 sn, 1080x1920, 30 fps): Lumi + 'kelimeye dokun, Türkçesi gelsin' demosu.
Kare kare PIL ile çizilir, ffmpeg ile MP4'e çevrilir. Müzik TikTok'ta eklenir (dosyada ses yok).
"""
import json
import math
import pathlib
import subprocess

from PIL import Image, ImageDraw, ImageFont

ROOT = pathlib.Path(__file__).resolve().parent
M = ROOT.parent
REPO = M.parent
A = REPO / "assets"
RAW = M / "screenshots" / "raw"
OUT = ROOT / "out" / "video01"
FR = OUT / "frames"
FR.mkdir(parents=True, exist_ok=True)

W, H, FPS, DUR = 1080, 1920, 30, 15.0
NAVY = (20, 36, 79)
AMBER = (255, 201, 74)
FONT = REPO / "node_modules/@expo-google-fonts/gabarito/800ExtraBold/Gabarito_800ExtraBold.ttf"
FONT7 = REPO / "node_modules/@expo-google-fonts/gabarito/700Bold/Gabarito_700Bold.ttf"


def font(size, bold=True):
    return ImageFont.truetype(str(FONT if bold else FONT7), size)


# --- varlıklar ---
bg = Image.open(A / "splash" / "lingo-bg.jpg").convert("RGB")
s = max(W / bg.width, H / bg.height)
bg = bg.resize((int(bg.width * s), int(bg.height * s)), Image.LANCZOS)
bg = bg.crop(((bg.width - W) // 2, (bg.height - H) // 2, (bg.width - W) // 2 + W, (bg.height - H) // 2 + H))

META = json.loads((A / "anim" / "_meta.json").read_text())


class Sprite:
    def __init__(self, name):
        self.sheet = Image.open(A / "anim" / f"mascot-{name}.webp").convert("RGBA")
        m = META[name]
        self.cols, self.rows, self.n = m["cols"], m["rows"], m["frames"]
        self.cw, self.ch = self.sheet.width // self.cols, self.sheet.height // self.rows
        self.cache = {}

    def frame(self, t):
        cyc = self.n * 2 - 2
        step = int(t * 24) % cyc
        i = step if step < self.n else cyc - step
        if i not in self.cache:
            c, r = i % self.cols, i // self.cols
            self.cache[i] = self.sheet.crop((c * self.cw, r * self.ch, (c + 1) * self.cw, (r + 1) * self.ch))
        return self.cache[i]


SP = {k: Sprite(k) for k in ["words", "books", "crown", "party"]}
WORDMARK = Image.open(A / "brand" / "lingo-wordmark.png").convert("RGBA")


def phone_img(src, width=780):
    shot = Image.open(src).convert("RGB")
    h = int(shot.height * width / shot.width)
    shot = shot.resize((width, h), Image.LANCZOS)
    bz = 22
    ph = Image.new("RGBA", (width + 2 * bz, h + 2 * bz), (0, 0, 0, 0))
    d = ImageDraw.Draw(ph)
    d.rounded_rectangle((0, 0, ph.width - 1, ph.height - 1), radius=110, fill=(14, 15, 20, 255))
    mask = Image.new("L", shot.size, 0)
    ImageDraw.Draw(mask).rounded_rectangle((0, 0, width - 1, h - 1), radius=90, fill=255)
    ph.paste(shot, (bz, bz), mask)
    d.rounded_rectangle((ph.width // 2 - 110, bz + 26, ph.width // 2 + 110, bz + 86), radius=30, fill=(0, 0, 0, 255))
    return ph, width / shot.width if False else width / 1170


PH_NO, SC = phone_img(RAW / "reader_nosheet.png")
PH_TAP, _ = phone_img(RAW / "reader_tap.png")
PH_LIB, _ = phone_img(RAW / "library.png")
# okuyucu ölçümleri (3x ekran pikseli): 'flour' kutusu ve kartın üst kenarı
HL = (78, 727, 151, 90)
SHEET_Y = 1599


def ease(x):
    x = max(0.0, min(1.0, x))
    return 1 - (1 - x) ** 3


def back(x):  # hafif taşan "pop"
    x = max(0.0, min(1.0, x))
    c = 1.7
    return 1 + (c + 1) * (x - 1) ** 3 + c * (x - 1) ** 2


def paste_center(img, sprite, cx, cy, scale=1.0, alpha=1.0):
    if scale <= 0.01 or alpha <= 0.01:
        return
    s2 = sprite.resize((max(1, int(sprite.width * scale)), max(1, int(sprite.height * scale))), Image.LANCZOS)
    if alpha < 1:
        a = s2.getchannel("A").point(lambda v: int(v * alpha))
        s2.putalpha(a)
    img.alpha_composite(s2, (int(cx - s2.width / 2), int(cy - s2.height / 2)))


def bubble(img, lines, cy, scale=1.0, hl_index=None, size=76):
    """Beyaz konuşma balonu; hl_index'teki satır amber zeminli."""
    if scale <= 0.01:
        return
    f = font(size)
    pad, gap = 46, 18
    widths = [f.getbbox(t)[2] for t in lines]
    lh = size + 14
    bw = max(widths) + 2 * pad + 40
    bh = len(lines) * lh + (len(lines) - 1) * gap + 2 * pad
    layer = Image.new("RGBA", (bw + 20, bh + 40), (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    d.rounded_rectangle((0, 16, bw, bh + 16), radius=56, fill=(20, 36, 79, 30))
    d.rounded_rectangle((0, 0, bw, bh), radius=56, fill=(255, 255, 255, 255))
    y = pad
    for i, (t, w) in enumerate(zip(lines, widths)):
        x = (bw - w) // 2
        if i == hl_index:
            d.rounded_rectangle((x - 18, y - 4, x + w + 18, y + lh - 2), radius=20, fill=AMBER)
        d.text((x, y), t, font=f, fill=NAVY)
        y += lh + gap
    paste_center(img, layer, W / 2, cy, scale)


def pill(img, text, cy, alpha=1.0):
    f = font(46, bold=False)
    w = f.getbbox(text)[2] + 100
    layer = Image.new("RGBA", (w, 100), (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    d.rounded_rectangle((0, 0, w - 1, 99), radius=50, fill=NAVY)
    d.text((50, 22), text, font=f, fill=(255, 255, 255))
    paste_center(img, layer, W / 2, cy, 1.0, alpha)


def render(t):
    img = bg.convert("RGBA").copy()
    # Sahne A: 0-2.8 sn kanca
    if t < 3.0:
        k = back((t - 0.05) / 0.45)
        bubble(img, ["Kitap okurken", "her kelimede", "sözlük mü açıyorsun?"], 430, k, hl_index=2, size=72)
        out = ease((t - 2.6) / 0.4)
        paste_center(img, SP["words"].frame(t), W / 2 + out * 700, 1280, 1.75 * ease(t / 0.5))
    # Sahne B: 2.8-9 sn okuyucu demosu
    if 2.8 <= t < 9.4:
        u = t - 2.8
        y = 1920 - ease(u / 0.6) * (1920 - 520)
        # kart açılınca telefon yukarı kayar: çeviri ekranın altında tam görünsün
        y -= ease((u - 1.8) / 0.5) * (520 - (H - PH_TAP.height))
        if t > 9.0:
            y += ease((t - 9.0) / 0.4) * 1500
        phone = PH_NO.copy()
        if u > 1.4:  # dokunma: vurgu kutusu
            d = ImageDraw.Draw(phone)
            x0, y0 = 22 + HL[0] * SC, 22 + HL[1] * SC
            d.rounded_rectangle((x0 - 6, y0 - 4, x0 + HL[2] * SC + 6, y0 + HL[3] * SC + 4), radius=14,
                                outline=(245, 181, 49), width=6)
        if u > 1.8:  # kart aşağıdan kayar
            k = ease((u - 1.8) / 0.45)
            top = 22 + int(SHEET_Y * SC)
            card = PH_TAP.crop((0, top, PH_TAP.width, PH_TAP.height))
            yy = top + int((1 - k) * card.height)
            phone.alpha_composite(card.crop((0, 0, card.width, card.height - (yy - top))), (0, yy))
        img.alpha_composite(phone, (int(W / 2 - phone.width / 2), int(y)))
        if 1.3 < u < 2.0:  # parmak dokunuşu halkası
            r = (u - 1.3) / 0.7
            cx = W / 2 - phone.width / 2 + 22 + (HL[0] + HL[2] / 2) * SC
            cy = y + 22 + (HL[1] + HL[3] / 2) * SC
            d = ImageDraw.Draw(img)
            rad = 30 + r * 70
            d.ellipse((cx - rad, cy - rad, cx + rad, cy + rad), outline=(245, 181, 49, int(255 * (1 - r))), width=10)
        cap = ["Bilmediğin kelimeye", "dokun"] if u < 2.0 else ["Türkçesi", "anında gelsin!"]
        bubble(img, cap, 300, back((u - (0 if u < 2.0 else 2.0)) / 0.35), hl_index=1, size=74)
        # Lumi kart açılınca alttan sağ üste geçer (çeviriyi kapatmasın)
        mv = ease((u - 1.7) / 0.5)
        paste_center(img, SP["words"].frame(t), 190 + mv * 760, 1690 - mv * 1180, (0.95 - 0.35 * mv) * ease((u - 0.4) / 0.4))
    # Sahne C: 9-12 sn kütüphane
    if 9.2 <= t < 12.4:
        u = t - 9.2
        y = 1920 - ease(u / 0.5) * (1920 - 560)
        if t > 12.0:
            y += ease((t - 12.0) / 0.4) * 1500
        img.alpha_composite(PH_LIB, (int(W / 2 - PH_LIB.width / 2), int(y)))
        bubble(img, ["500+ hikâye,", "seviyene göre"], 300, back(u / 0.35), hl_index=1, size=78)
        paste_center(img, SP["books"].frame(t), 900, 1650, 1.05 * ease((u - 0.3) / 0.4))
    # Sahne D: 12.2-15 sn kapanış
    if t >= 12.2:
        u = t - 12.2
        paste_center(img, WORDMARK, W / 2, 430, 0.62 * back(u / 0.4))
        bubble(img, ["Lumi ile", "İngilizce oku!"], 800, back((u - 0.25) / 0.4), hl_index=1, size=84)
        paste_center(img, SP["crown"].frame(t), W / 2, 1340, 1.25 * back((u - 0.4) / 0.45))
        pill(img, "App Store'da: Lingo", 1760, ease((u - 0.8) / 0.4))
    return img.convert("RGB")


if __name__ == "__main__":
    n = int(DUR * FPS)
    for i in range(n):
        render(i / FPS).save(FR / f"{i:04d}.jpg", quality=92)
        if i % 60 == 0:
            print(i, flush=True)
    mp4 = OUT / "lingo-lumi-video01.mp4"
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-framerate", str(FPS), "-i", str(FR / "%04d.jpg"),
                    "-c:v", "libx264", "-pix_fmt", "yuv420p", "-crf", "18", "-preset", "slow",
                    "-movflags", "+faststart", str(mp4)], check=True)
    print(mp4)
