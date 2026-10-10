"""Meta (Reels/Stories/Feed) reklam videosu #1 — 15 sn, 1080x1920, 30 fps, sessiz dosya.

Tasarım kuralları (kaynaklar raporda):
- Güvenli alan: üst 270 px ve alt %35 (y>1248) Reels arayüzüne ait. Ana mesaj ve kritik görsel
  y=285..1248 bandında; bu bant Feed'in 4:5 merkez kırpmasında (y 285..1635) da görünür.
- İlk 3 sn kanca (sorun), ürün 3. saniyede, logo SONDA.
- Sessiz izlemeye göre: her iddia ekranda yazılı, satır başına <=6-8 kelime.
- Psikoloji: sorun -> çözüm anı (dokun, Türkçesi anında) -> kolaylık/kapsam -> düşük risk CTA
  ("Ücretsiz indir", kitaplar gerçekten ücretsiz).
"""
import pathlib
import random
import subprocess

from PIL import ImageDraw

import video01 as V

OUT = V.ROOT / "out" / "meta_ad01"
FR = OUT / "frames"
FR.mkdir(parents=True, exist_ok=True)
W, H, FPS, DUR = 1080, 1920, 30, 15.0
SAFE_TOP, SAFE_BOTTOM = 285, 1248

PH_NO, SC = V.phone_img(V.RAW / "reader_nosheet.png", width=640)
PH_TAP, _ = V.phone_img(V.RAW / "reader_tap.png", width=640)
PH_LIB, _ = V.phone_img(V.RAW / "library.png", width=640)
PH_QUIZ, _ = V.phone_img(V.RAW / "bquiz.png", width=640)
PHONE_Y = 600  # telefon üst kenarı; kelime ~y=1000 (güvenli bant içinde)

rng = random.Random(7)
QMARKS = [(rng.uniform(90, 560), rng.uniform(300, 640), rng.uniform(0, 1)) for _ in range(8)]


def word_xy(phone_x, phone_y):
    return (phone_x + 22 + (V.HL[0] + V.HL[2] / 2) * SC, phone_y + 22 + (V.HL[1] + V.HL[3] / 2) * SC)


def chip(img, text, cx, cy, scale, fill=V.AMBER, size=64):
    if scale <= 0.01:
        return
    from PIL import Image
    f = V.font(size)
    w = f.getbbox(text)[2] + 70
    layer = Image.new("RGBA", (w + 10, size + 70), (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    d.rounded_rectangle((0, 10, w, size + 60), radius=36, fill=(20, 36, 79, 40))
    d.rounded_rectangle((0, 0, w, size + 50), radius=36, fill=fill)
    d.text((35, 18), text, font=f, fill=V.NAVY)
    V.paste_center(img, layer, cx, cy, scale)


def render(t):
    img = V.bg.convert("RGBA").copy()
    px = W / 2 - PH_NO.width / 2

    # 0-3 sn: KANCA — sorun. Telefon okuyucuda, kelimelerin üstünde soru işaretleri, Lumi şaşkın.
    if t < 3.2:
        V.bubble(img, ["İngilizce okurken", "her kelimede", "takılıyor musun?"], 450, V.back((t - 0.05) / 0.4),
                 hl_index=2, size=74)
        y = PHONE_Y + (1 - V.ease(t / 0.5)) * 900
        ph = PH_NO.copy()
        d = ImageDraw.Draw(ph)
        f = V.font(54)
        for (qx, qy, ph0) in QMARKS:
            a = V.ease((t - 0.4 - ph0) / 0.3)
            if a > 0:
                r = 34
                d.ellipse((qx - r, qy - r, qx + r, qy + r), fill=(214, 69, 69, int(235 * a)))
                d.text((qx - 13, qy - 31), "?", font=f, fill=(255, 255, 255, int(255 * a)))
        img.alpha_composite(ph, (int(px), int(y)))
        V.paste_center(img, V.SP["words"].frame(t), 900, 1000, 0.85 * V.ease((t - 0.3) / 0.4))

    # 3-8.5 sn: ÇÖZÜM — dokun, Türkçesi anında.
    if 3.0 <= t < 8.8:
        u = t - 3.0
        y = PHONE_Y + (1 - V.ease(u / 0.5)) * 400
        if t > 8.4:
            y += V.ease((t - 8.4) / 0.4) * 1400
        ph = PH_NO.copy()
        if u > 1.0:
            d = ImageDraw.Draw(ph)
            x0, y0 = 22 + V.HL[0] * SC, 22 + V.HL[1] * SC
            d.rounded_rectangle((x0 - 6, y0 - 4, x0 + V.HL[2] * SC + 6, y0 + V.HL[3] * SC + 4), radius=12,
                                outline=(245, 181, 49), width=6)
        if u > 1.3:
            k = V.ease((u - 1.3) / 0.45)
            top = 22 + int(V.SHEET_Y * SC)
            card = PH_TAP.crop((0, top, PH_TAP.width, PH_TAP.height))
            yy = top + int((1 - k) * card.height)
            ph.alpha_composite(card.crop((0, 0, card.width, card.height - (yy - top))), (0, yy))
        img.alpha_composite(ph, (int(px), int(y)))
        wx, wy = word_xy(px, y)
        if 0.9 < u < 1.6:
            r = (u - 0.9) / 0.7
            rad = 26 + r * 60
            ImageDraw.Draw(img).ellipse((wx - rad, wy - rad, wx + rad, wy + rad),
                                        outline=(245, 181, 49, int(255 * (1 - r))), width=9)
        # büyük çağrı: flour = un (güvenli bantta, kelimenin hemen üstünde)
        if u > 1.5:
            chip(img, "flour  =  un", W / 2 + 120, wy - 150, V.back((u - 1.5) / 0.35), size=70)
        cap = ["Kelimeye dokun"] if u < 1.5 else ["Türkçesi", "anında gelsin"]
        V.bubble(img, cap, 410, V.back((u - (0 if u < 1.5 else 1.5)) / 0.35), hl_index=len(cap) - 1, size=78)
        if u > 3.0:  # ikinci fayda: kaydet -> tekrar
            chip(img, "Tek dokunuşla kaydet, sonra tekrar et", W / 2, 1180, V.ease((u - 3.0) / 0.35),
                 fill=(255, 255, 255), size=44)

    # 8.6-11.8 sn: KAPSAM — 500+ hikâye, A1'den B2'ye, her kitapta quiz
    if 8.6 <= t < 12.0:
        u = t - 8.6
        y = PHONE_Y + (1 - V.ease(u / 0.45)) * 1300
        if t > 11.6:
            y += V.ease((t - 11.6) / 0.4) * 1400
        phone = PH_LIB if u < 1.7 else PH_QUIZ
        img.alpha_composite(phone, (int(px), int(y)))
        lines = ["500+ hikâye,", "A1'den B2'ye"] if u < 1.7 else ["Her kitapta", "3 basamaklı quiz"]
        V.bubble(img, lines, 410, V.back(((u if u < 1.7 else u - 1.7)) / 0.35), hl_index=1, size=78)
        V.paste_center(img, V.SP["books"].frame(t), 930, 1080, 0.8 * V.ease((u - 0.3) / 0.4))

    # 11.8-15 sn: CTA — logo sonda, düşük risk teklif
    if t >= 11.8:
        u = t - 11.8
        V.paste_center(img, V.WORDMARK, W / 2, 420, 0.6 * V.back(u / 0.4))
        V.bubble(img, ["Hikâyeyle", "İngilizce öğren"], 700, V.back((u - 0.2) / 0.4), hl_index=1, size=82)
        V.paste_center(img, V.SP["crown"].frame(t), W / 2, 960, 0.85 * V.back((u - 0.35) / 0.45))
        chip(img, "Ücretsiz indir", W / 2, 1130, V.back((u - 0.7) / 0.4), size=68)
        f = V.font(40, bold=False)
        txt = "Kitaplar her zaman ücretsiz"
        a = V.ease((u - 1.0) / 0.4)
        if a > 0:
            d = ImageDraw.Draw(img)
            tw = f.getbbox(txt)[2]
            d.text((W / 2 - tw / 2, 1195), txt, font=f, fill=(20, 36, 79, int(255 * a)))
    return img.convert("RGB")


def safe_overlay(img):
    """Kontrol için: Reels arayüz bölgelerini kırmızıyla işaretler (yalnızca önizleme)."""
    from PIL import Image
    o = Image.new("RGBA", img.size, (0, 0, 0, 0))
    d = ImageDraw.Draw(o)
    d.rectangle((0, 0, W, 270), fill=(255, 0, 0, 70))
    d.rectangle((0, SAFE_BOTTOM, W, H), fill=(255, 0, 0, 70))
    d.rectangle((0, 285, W, 1635), outline=(0, 120, 255, 255), width=6)  # 4:5 kırpma
    return Image.alpha_composite(img.convert("RGBA"), o).convert("RGB")


if __name__ == "__main__":
    n = int(DUR * FPS)
    for i in range(n):
        render(i / FPS).save(FR / f"{i:04d}.jpg", quality=93)
    mp4 = OUT / "lingo-meta-ad01-9x16.mp4"
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-framerate", str(FPS), "-i", str(FR / "%04d.jpg"),
                    "-c:v", "libx264", "-pix_fmt", "yuv420p", "-crf", "17", "-preset", "slow",
                    "-movflags", "+faststart", str(mp4)], check=True)
    # Feed için 4:5 (1080x1350) — merkez kırpma, ana mesaj bu bantta
    mp4b = OUT / "lingo-meta-ad01-4x5.mp4"
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", str(mp4), "-vf", "crop=1080:1350:0:285",
                    "-c:v", "libx264", "-pix_fmt", "yuv420p", "-crf", "17", "-preset", "slow",
                    "-movflags", "+faststart", str(mp4b)], check=True)
    print(mp4, mp4b)
