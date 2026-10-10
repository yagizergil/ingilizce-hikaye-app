"""Telefondan paylaşım paketi (ilk hafta, ısınma dönemi): post01..post07.
Her gün için klasör: görseller (1.jpg, 2.jpg...) + PAYLAS.txt. Kökte BENIOKU.txt ve zip.
"""
import pathlib
import shutil
import zipfile

ROOT = pathlib.Path(__file__).resolve().parent
OUT = ROOT / "out"
PACK = ROOT / "telefon-paketi"

DAYS = [
    ("2026-10-08", "Perşembe", "post01",
     "Merhaba, ben Lumi! Hikâyeyle İngilizce öğreniyoruz 🦜",
     "Merhaba, ben Lumi! 🦜 Bu hesapta İngilizceyi ezberleyerek değil, hikâye okuyarak öğreniyoruz 📖\n\n"
     "Her gün kısa kelime listeleri, mini quizler ve komik deyimler paylaşacağım. "
     "4. karedeki kelimelerden birini yorumlarda bir cümlede kullan, en iyi cümleyi sabitleyeceğim 👇",
     "#ingilizce #ingilizceöğren #ingilizcekelime #dilöğren #keşfet",
     "Ok I Like It – Milky Chance",
     "Hangi kelimeyi kullandın? Cümleni yaz, düzelteyim 🦜"),
    ("2026-10-09", "Cuma", "post02",
     "Türklerin İngilizcede en çok yaptığı 5 hata 😅",
     "Bu 5 hatadan kaçını yapıyorsun? Dürüst ol 😅\n\n"
     "“I am agree” ve “open the light” en sık duyduğum iki hata. "
     "Doğrularını kaydet, bir daha yanlış söyleme 📌 Sayını yorumlara yaz 👇",
     "#ingilizce #ingilizcehatalar #ingilizceöğren #ingilizcekonuşma #keşfet",
     "Fashionable + cute + city pop – Kyosuke TAMAGAWA",
     "Sen kaç tanesini yapıyordun? 1-5 arası yaz 👇"),
    ("2026-10-10", "Cumartesi", "post03",
     "Bu İngilizce kelimeleri yanlış biliyor olabilirsin 👀",
     "Actually “aktüel” değil, sympathetic “sempatik” değil 👀 "
     "Bunlar sahte arkadaşlar: Türkçeye benziyor ama anlamı bambaşka.\n\n"
     "Hangisini yanlış biliyordun? Kaydet, sonra tekrar bak 📌",
     "#ingilizce #ingilizcekelime #falsefriends #ingilizceöğren #keşfet",
     "Casual Swinging (Loop) – Kobat",
     "Listede olmayan bir sahte arkadaş biliyor musun? Yaz, sonraki postta kullanayım 🦜"),
    ("2026-10-11", "Pazar", "post04",
     "3 saniyede cevapla: “Yorgunum” İngilizcede nasıl? ⏱️",
     "Mini quiz zamanı ⏱️ “Yorgunum” İngilizcede nasıl denir? "
     "Cevabını yorumlara yaz, SONRA kaydır 👀\n\n"
     "İpucu: tired ve tiring aynı şey değil.",
     "#ingilizce #ingilizcequiz #ingilizceöğren #ingilizcekelime #keşfet",
     "Sunset in Girona – Noah Preminger & Max Light",
     "Kaç kişi B dedi? 👀 Cevabı kaydırmadan yazanlar burada mı?"),
    ("2026-10-12", "Pazartesi", "post05",
     "Kelime kelime çevirince komik olan İngilizce deyimler 😂",
     "“It's raining cats and dogs” = kedi köpek yağıyor 😂 "
     "Ama aslında “bardaktan boşanırcasına yağıyor” demek.\n\n"
     "Hangisi en komik? Arkadaşını etiketle, beraber öğrenin 👇",
     "#ingilizce #ingilizcedeyimler #idioms #ingilizceöğren #keşfet",
     "Ok I Like It – Milky Chance",
     "Bildiğin başka komik bir deyim var mı? 😂"),
    ("2026-10-13", "Salı", "post06",
     "Kafede, arkadaşla, mesajda: bunu İngilizce nasıl dersin? 🤔",
     "Bunları kaydet, mutlaka lazım olacak 📌\n\n"
     "“For here or to go?” kafede en çok duyacağın soru. "
     "“No worries” da “sorun değil”in en doğal hâli.",
     "#ingilizce #günlükingilizce #ingilizcekonuşma #ingilizceöğren #keşfet",
     "Fashionable + cute + city pop – Kyosuke TAMAGAWA",
     "Bir sonraki postta hangi durumu yapayım? Otel mi, havalimanı mı? ✈️"),
    ("2026-10-14", "Çarşamba", "post07",
     "A2'den B1'e geçiren 5 İngilizce kelime 🚀",
     "Seviye atlatan 5 kelime 🚀 however, although, instead, probably, suddenly.\n\n"
     "Bu kelimeleri hikâyelerde görünce bir daha unutmazsın. Kaydet ve her gün birini bir cümlede kullan 📌",
     "#ingilizce #ingilizcekelime #b1 #ingilizceöğren #keşfet",
     "Casual Swinging (Loop) – Kobat",
     "Bugün hangisini kullanacaksın? Cümleni yaz 👇"),
]

README = """LINGO TIKTOK — İLK HAFTA TELEFON PAKETİ (@lingo.ingilizce)
================================================================

NEDEN TELEFONDAN?
Yeni bir hesap ilk günden zamanlayıcı/API ile paylaşım yapınca TikTok onu bot
gibi görüp videolara 0 görüntüleme verebiliyor. İlk 7 gün hesabı normal bir
kullanıcı gibi kullanıp paylaşımları uygulamadan yapıyoruz. 15 Ekim'den sonra
paylaşımlar PostFast ile otomatik devam edecek.

HER GÜN YAPILACAKLAR (10-15 dk, paylaşımdan ÖNCE)
1. "Senin İçin" sayfasında 5-10 dk İngilizce öğrenme / dil videoları izle,
   videoları sonuna kadar izle, beğendiklerini beğen.
2. 3-5 hesaba anlamlı yorum yaz (ör. "Bu kelimeyi ben de karıştırıyordum").
3. Dil öğrenme hesaplarından birkaçını takip et.
4. VPN KAPALI olsun, hep aynı telefondan gir.

PAYLAŞIM ADIMLARI (her gün saat 20:00 civarı)
1. "+" -> "Yükle" -> "Fotoğraflar" -> o günün klasöründeki görselleri SIRAYLA seç (1, 2, 3...).
2. "Ses ekle" -> PAYLAS.txt'deki şarkıyı ara. Bulamazsan "Önerilen"den
   neşeli/enerjik bir parça seç. Ses seviyesi düşük kalsın.
3. Başlık BOŞ kalsın. Açıklamaya YALNIZCA PAYLAS.txt'deki 5 hashtag'i yapıştır
   (metin yok: görsel tam ekran kalsın diye).
4. Kapak: 1. görsel. Yorumlar açık, Duet/Stitch açık.
5. "Marka içeriği" anahtarında "Kendi markanı tanıtıyorsun" (Your brand) seçili olsun.
6. İlk 1 saat gelen her yoruma cevap ver (algoritma ilk etkileşime bakıyor).

YAPMA
- Aynı postu silip tekrar yükleme (kopya içerik sayılır, erişim düşer).
- Günde 1'den fazla paylaşım (ilk hafta).
- Açıklamaya link, "uygulamayı indir" gibi sert satış cümlesi koyma.
- 5'ten fazla hashtag kullanma.

PROFİL (henüz yapmadıysan)
- Ad: Lingo • Hikâyeyle İngilizce
- Bio: Kelimeye dokun, Türkçesi gelsin 🦜 Hikâye okuyarak İngilizce öğren 👇
- Profil fotoğrafı: Lumi (lumi-profil.png bu pakette)

NOT: Daha önce API ile yayınlanan ilk "Merhaba, ben Lumi" postunu TikTok
uygulamasından SİL (Profil -> post -> ... -> Sil). Bugün aynı postu bu paketten
müzikli olarak yeniden paylaşacaksın.
"""


def build():
    if PACK.exists():
        shutil.rmtree(PACK)
    PACK.mkdir()
    (PACK / "BENIOKU.txt").write_text(README, encoding="utf-8")
    shutil.copy(ROOT.parent / "build" / "lumi-party.png", PACK / "lumi-profil.png")
    for i, (date, day, post, title, desc, tags, sound, pin) in enumerate(DAYS, 1):
        d = PACK / f"Gun{i}_{date}_{day}"
        d.mkdir()
        src = OUT / post
        files = sorted(src.glob("s[0-9]*.jpg"), key=lambda p: int(p.stem[1:]))
        for j, f in enumerate(files, 1):
            shutil.copy(f, d / f"{j}.jpg")
        # Kural: başlık ve açıklama metni YOK, yalnızca 5 hashtag (görsel tam ekran kalsın).
        (d / "PAYLAS.txt").write_text(
            f"TARİH: {date} {day}, 20:00\n\n"
            f"AÇIKLAMA (yalnızca bunu yapıştır, başlık boş kalsın):\n{tags}\n\n"
            f"ŞARKI:\n{sound}\n", encoding="utf-8")
    z = ROOT / "lingo-tiktok-ilk-hafta.zip"
    with zipfile.ZipFile(z, "w", zipfile.ZIP_DEFLATED) as zf:
        for f in PACK.rglob("*"):
            zf.write(f, f.relative_to(PACK.parent))
    print(z)


if __name__ == "__main__":
    build()
