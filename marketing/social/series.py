"""Lumi carousel serisi: içerik + şablon. Her post out/postNN/ altına s1..sN.jpg + caption.txt yazar.

Format seçimi (TR İngilizce TikTok'unda en çok kaydedilen/paylaşılan türler):
- "Yanlış bildiğin" / sık yapılan hatalar  -> yorum ve kaydetme getirir
- Mini quiz, cevap son karede              -> kaydırma süresi (carousel'in asıl metriği)
- Deyimler, kelime kelime çevirisi komik   -> paylaşım
- Günlük hayat cümleleri / "bunu nasıl dersin" -> kaydetme
Her post Lumi ile açılır, son kare takip + uygulama çağrısı.
"""
import pathlib
from playwright.sync_api import sync_playwright
from PIL import Image

ROOT = pathlib.Path(__file__).resolve().parent
M = ROOT.parent
A = M.parent / "assets"


def u(p):
    return pathlib.Path(p).resolve().as_uri()


BG = u(A / "splash" / "lingo-bg.jpg")
L = {k: u(M / "build" / f"lumi-{k}.png") for k in ["home", "party", "words", "books", "quiz", "crown", "search", "profile"]}
WORDMARK = u(A / "brand" / "lingo-wordmark.png")

CSS = f"""*{{margin:0;box-sizing:border-box}}
body{{width:1080px;height:1920px;overflow:hidden;font-family:Gabarito,'Noto Color Emoji',sans-serif;position:relative;
background:url('{BG}') center/cover;color:#14244F}}
.b{{position:absolute;left:80px;right:80px;background:#fff;border-radius:56px;padding:48px 56px;
box-shadow:0 18px 0 rgba(20,36,79,.12);font-size:62px;font-weight:700;line-height:1.18;text-align:center}}
.big{{font-size:88px;font-weight:800;letter-spacing:-2px}}
.hl{{background:#FFC94A;border-radius:18px;padding:0 14px}}
.lumi{{position:absolute;filter:drop-shadow(0 30px 40px rgba(20,36,79,.3))}}
.list{{position:absolute;left:80px;right:80px}}
.card{{background:#fff;border-radius:40px;padding:34px 44px;box-shadow:0 12px 0 rgba(20,36,79,.1);margin-bottom:26px}}
.en{{font-size:60px;font-weight:800}} .tr{{font-size:46px;color:#b5760a;font-weight:700;margin-top:6px}}
.x{{color:#D64545;text-decoration:line-through;text-decoration-thickness:6px}} .ok{{color:#1E9E5A}}
.opt{{background:#fff;border-radius:36px;padding:34px 44px;margin-bottom:24px;font-size:56px;font-weight:700;
box-shadow:0 12px 0 rgba(20,36,79,.1)}} .opt.right{{background:#C8F2D9;border:6px solid #1E9E5A}}
.pill{{position:absolute;left:50%;transform:translateX(-50%);bottom:120px;background:#14244F;color:#fff;border-radius:999px;
padding:22px 48px;font-size:40px;font-weight:700;white-space:nowrap}}
.small{{font-size:44px;font-weight:600;color:#4A5578;margin-top:14px}}
"""


def cover(title, sub=None, lumi="party"):
    s = f'<div class="small">{sub}</div>' if sub else ""
    return (f'<div class="b big" style="top:260px">{title}{s}</div>'
            f'<img class="lumi" src="{L[lumi]}" style="width:640px;left:220px;top:{900 if sub else 840}px">'
            f'<div class="pill">Kaydır →</div>')


def cards(head, items, lumi="words"):
    """items: list of (en_html, tr_html)."""
    rows = "".join(f'<div class="card"><div class="en">{e}</div><div class="tr">{t}</div></div>' for e, t in items)
    return (f'<div class="b" style="top:150px">{head}</div>'
            f'<div class="list" style="top:420px">{rows}</div>'
            f'<img class="lumi" src="{L[lumi]}" style="width:300px;right:40px;bottom:40px">')


def quiz(q, opts, right=None, lumi="quiz"):
    o = "".join(f'<div class="opt{" right" if i == right else ""}">{"ABCD"[i]}) {t}{" ✅" if i == right else ""}</div>'
                for i, t in enumerate(opts))
    return (f'<div class="b" style="top:180px">{q}</div>'
            f'<div class="list" style="top:640px">{o}</div>'
            f'<img class="lumi" src="{L[lumi]}" style="width:340px;left:60px;bottom:40px">'
            + ('' if right is not None else '<div class="pill" style="left:auto;right:80px;transform:none">Cevap son karede →</div>'))


def text(body, lumi="books"):
    return (f'<div class="b" style="top:300px">{body}</div>'
            f'<img class="lumi" src="{L[lumi]}" style="width:560px;left:260px;top:1000px">')


def cta(line="Her gün yeni kelimeler için<br><span class='hl'>takip et!</span> 🦜"):
    return (f'<div class="b big" style="top:240px">{line}</div>'
            f'<img src="{WORDMARK}" style="position:absolute;left:290px;top:1000px;width:500px">'
            f'<img class="lumi" src="{L["crown"]}" style="width:380px;left:350px;top:1260px">'
            f'<div class="pill">App Store\'da: Lingo</div>')


HT = "#ingilizce #ingilizceöğren #ingilizcekelime #dilöğren #lingo"

POSTS = {
    "post02": ([
        cover("Türklerin en çok<br>yaptığı <span class='hl'>5 hata</span> 😅", "Sen kaçını yapıyorsun?", "search"),
        cards("1-2", [("<span class='x'>I am agree</span>", "✅ I agree — katılıyorum"),
                      ("<span class='x'>He go to school</span>", "✅ He goes to school")]),
        cards("3-4", [("<span class='x'>I am 20 years</span>", "✅ I am 20 (years old)"),
                      ("<span class='x'>Open the light</span>", "✅ Turn on the light")]),
        cards("5", [("<span class='x'>I'm boring</span>", "✅ I'm bored — sıkıldım"),
                    ("boring 😴", "sıkıcı (başkasını sıkan)")], "books"),
        cta(),
    ], f"Merhaba, ben Lumi! 🦜 Bu 5 hatadan kaçını yapıyorsun? Dürüst ol, yoruma sayıyı yaz 👇\n\n{HT} #ingilizcehatalar"),
    "post03": ([
        cover("Bu kelimeyi<br><span class='hl'>yanlış biliyor</span><br>olabilirsin 👀", None, "search"),
        cards("Sahte arkadaşlar 🤝", [("actually", "aslında (❌ aktüel değil)"), ("sympathetic", "anlayışlı (❌ sempatik değil)"),
                                      ("eventually", "sonunda (❌ eventüel değil)")]),
        cards("Devam 👇", [("sensible", "mantıklı (❌ hassas değil)"), ("argument", "tartışma (❌ argüman değil)"),
                          ("fabric", "kumaş (❌ fabrika değil)")], "books"),
        cta(),
    ], f"Lumi uyarıyor: bunlar sahte arkadaş! 🦜 Hangisini yanlış biliyordun? 👇\n\n{HT} #falsefriends"),
    "post04": ([
        cover("3 saniyede<br>cevapla! ⏱️", "İngilizce mini quiz", "quiz"),
        quiz("“Yorgunum” İngilizcede?", ["I'm tiring", "I'm tired", "I'm tire"]),
        quiz("“Yorgunum” İngilizcede?", ["I'm tiring", "I'm tired", "I'm tire"], right=1),
        text("<b>tired</b> = yorgun (ben)<br><b>tiring</b> = yorucu (iş, gün)<br><br><span class='small'>The day was tiring. I'm tired.</span>"),
        cta(),
    ], f"Lumi'nin mini quizi 🦜 Cevabını yorumlara yaz, sonra son kareye bak 👀\n\n{HT} #ingilizcequiz"),
    "post05": ([
        cover("Kelime kelime<br>çevirince <span class='hl'>komik</span><br>olan deyimler 😂", None, "party"),
        cards("1", [("It's raining cats and dogs", "🐱🐶 kedi köpek yağıyor → bardaktan boşanırcasına yağıyor")]),
        cards("2", [("Break a leg!", "🦵 bacağını kır! → bol şans!")]),
        cards("3", [("Piece of cake", "🍰 bir dilim kek → çocuk oyuncağı")]),
        cards("4", [("Hit the sack", "🛏️ çuvala vur → yatmaya git")], "books"),
        cta(),
    ], f"Lumi deyim sever 🦜 Hangisi en komik? 😂\n\n{HT} #ingilizcedeyimler #idioms"),
    "post06": ([
        cover("Bunu İngilizce<br><span class='hl'>nasıl dersin?</span> 🤔", "Günlük hayat", "search"),
        cards("Kafede ☕", [("Can I get a latte, please?", "Bir latte alabilir miyim?"), ("For here or to go?", "Burada mı, götürmek için mi?")]),
        cards("Arkadaşla 🙌", [("What's up?", "Naber?"), ("I'm on my way!", "Yoldayım, geliyorum!")]),
        cards("Mesajda 📱", [("BRB", "be right back — hemen dönerim"), ("No worries", "Dert etme / sorun değil")], "books"),
        cta(),
    ], f"Bunları kaydet, lazım olacak 🦜📌\n\n{HT} #günlükingilizce"),
    "post07": ([
        cover("A2'den B1'e<br>geçiren <span class='hl'>5 kelime</span> 🚀", None, "crown"),
        cards("Kaydet 📌", [("however", "ancak, yine de"), ("although", "-e rağmen"), ("instead", "yerine")]),
        cards("Devam 👇", [("probably", "muhtemelen"), ("suddenly", "aniden")], "books"),
        text("Bu kelimeleri <b>hikâyelerde</b> görünce<br>bir daha unutmazsın 📖<br><span class='small'>Lingo'da kelimeye dokun, Türkçesi gelsin.</span>"),
        cta(),
    ], f"Seviye atlatan kelimeler 🦜 Kaydet, her gün birini kullan!\n\n{HT} #b1 #ingilizceseviye"),
    "post08": ([
        cover("Hangisi doğru?<br><span class='hl'>make</span> mi <span class='hl'>do</span> mu? 🤯", None, "quiz"),
        quiz("___ a mistake", ["do", "make"]),
        quiz("___ a mistake", ["do", "make"], right=1),
        cards("Ezber kartı 📌", [("make", "a mistake · a decision · money · friends"), ("do", "homework · the dishes · sport · a favor")], "books"),
        cta(),
    ], f"Make mi do mu? 🦜 İlk tahminin neydi? 👇\n\n{HT} #makevsdo"),
    "post09": ([
        cover("Lumi'nin<br><span class='hl'>1 dakikalık</span><br>hikâyesi 📖", None, "books"),
        text("Ela opened the <span class='hl'>window</span>.<br>The rain was <span class='hl'>quiet</span> and <span class='hl'>cold</span>.<br>She smiled. Today was <span class='hl'>different</span>."),
        cards("Kelimeler 👇", [("window", "pencere"), ("quiet", "sessiz"), ("cold", "soğuk"), ("different", "farklı")], "words"),
        text("Okuyarak öğrenmek = <b>unutmamak</b> 🧠<br><span class='small'>Lingo'da 500+ hikâye seni bekliyor.</span>", "home"),
        cta(),
    ], f"Hikâyeyle öğrendiğin kelime unutulmaz 🦜📖 Sence devamında ne oldu? 👇\n\n{HT} #ingilizcehikaye"),
    "post10": ([
        cover("“Çok” derken<br><span class='hl'>very</span> yetmez! 💪", "Daha doğal 5 alternatif", "party"),
        cards("very good →", [("amazing", "harika"), ("excellent", "mükemmel")]),
        cards("very tired →", [("exhausted", "bitkin"), ("very hungry → starving", "açlıktan ölüyorum")]),
        cards("very big →", [("huge", "devasa"), ("very small → tiny", "minicik")], "books"),
        cta(),
    ], f"Very'yi emekliye ayır 🦜 Senin favorin hangisi? 👇\n\n{HT} #ingilizcekonuşma"),
    "post11": ([
        cover("Telaffuzda<br><span class='hl'>herkesin</span><br>takıldığı kelimeler 🗣️", None, "search"),
        cards("Sessiz harfler 🤫", [("knife", "/naɪf/ — k okunmaz"), ("island", "/ˈaɪlənd/ — s okunmaz"), ("listen", "/ˈlɪsən/ — t okunmaz")]),
        cards("Tuzak 🪤", [("comfortable", "/ˈkʌmftəbəl/ — kamftıbıl"), ("Wednesday", "/ˈwenzdeɪ/ — wenzdey")], "books"),
        text("Lingo'da her kelimenin<br><b>sesini dinleyebilirsin</b> 🔊<br><span class='small'>Kelime telaffuzu ücretsiz.</span>", "words"),
        cta(),
    ], f"Hangisini yanlış okuyordun? 🦜🔊\n\n{HT} #telaffuz #pronunciation"),
    "post12": ([
        cover("Phrasal verb<br><span class='hl'>korkusunu</span> yenelim 👊", "En çok kullanılan 6 tanesi", "crown"),
        cards("1-3", [("give up", "vazgeçmek"), ("find out", "öğrenmek, keşfetmek"), ("look for", "aramak")]),
        cards("4-6", [("turn off", "kapatmak"), ("get up", "kalkmak (yataktan)"), ("run out of", "tükenmek")], "books"),
        quiz("We ___ milk. Market'e git!", ["ran out of", "gave up", "found out"]),
        quiz("We ___ milk. Market'e git!", ["ran out of", "gave up", "found out"], right=0),
        cta(),
    ], f"Phrasal verb'ler aslında kolay 🦜 Quiz'de kaç doğru? 👇\n\n{HT} #phrasalverbs"),
    "post13": ([
        cover("Dizi izlerken<br><span class='hl'>en çok</span> duyacağın<br>ifadeler 🎬", None, "party"),
        cards("Kaydet 📌", [("I'm kidding", "Şaka yapıyorum"), ("Fair enough", "Haklısın / makul"), ("Never mind", "Boş ver")]),
        cards("Devam 👇", [("That makes sense", "Mantıklı"), ("I'm in!", "Ben varım!"), ("Hang on", "Bir saniye")], "books"),
        cta(),
    ], f"Bir dahaki dizide fark edeceksin 🦜🎬\n\n{HT} #diziyleingilizce"),
    "post14": ([
        cover("Günde <span class='hl'>10 dakika</span><br>okursan<br>ne olur? 📈", None, "books"),
        text("1 hafta → <b>~50</b> yeni kelime<br>1 ay → <b>~200</b> kelime<br>3 ay → bir seviye atla 🚀", "crown"),
        text("Sır: <b>ezber değil, bağlam</b>.<br>Kelimeyi hikâyede görünce<br>beynin onu tutar 🧠", "words"),
        cta("Bugün 10 dakika<br>Lumi ile <span class='hl'>oku!</span> 🦜"),
    ], f"10 dakika = her gün bir adım 🦜📖 Bugün kaç dakika okudun? 👇\n\n{HT} #okumaalışkanlığı"),
    "post15": ([
        cover("Hangisi doğru?<br><span class='hl'>in · on · at</span> 😵", None, "quiz"),
        quiz("I was born ___ 2005.", ["in", "on", "at"]),
        quiz("I was born ___ 2005.", ["in", "on", "at"], right=0),
        cards("Kısa kural 📌", [("in", "yıl, ay, mevsim — in May"), ("on", "gün, tarih — on Monday"), ("at", "saat — at 7 pm")], "books"),
        cta(),
    ], f"In-on-at karmaşasına son 🦜 Doğru bildin mi? 👇\n\n{HT} #prepositions"),
}


def render(name, slides):
    out = ROOT / "out" / name
    out.mkdir(parents=True, exist_ok=True)
    with sync_playwright() as p:
        b = p.chromium.launch()
        pg = b.new_page(viewport={"width": 1080, "height": 1920})
        for i, body in enumerate(slides, 1):
            f = out / f"s{i}.html"
            f.write_text('<!doctype html><html><head><meta charset="utf-8"><link href="https://fonts.googleapis.com/css2?'
                         'family=Gabarito:wght@600;700;800&family=Noto+Color+Emoji&display=swap" rel="stylesheet">'
                         f'<style>{CSS}</style></head><body>{body}</body></html>', encoding="utf-8")
            pg.goto(u(f))
            pg.wait_for_timeout(1500)
            png = out / f"s{i}.png"
            pg.screenshot(path=str(png))
            Image.open(png).convert("RGB").save(out / f"s{i}.jpg", quality=92)
            png.unlink()
        b.close()
    return out


if __name__ == "__main__":
    import sys
    names = sys.argv[1:] or list(POSTS)
    for n in names:
        slides, caption = POSTS[n]
        d = render(n, slides)
        (d / "caption.txt").write_text(caption, encoding="utf-8")
        ims = [Image.open(d / f"s{i}.jpg") for i in range(1, len(slides) + 1)]
        W = Image.new("RGB", (len(ims) * 230, 410), "white")
        for i, im in enumerate(ims):
            W.paste(im.resize((216, 384)), (i * 230, 13))
        W.save(d / "sheet.jpg")
        print(n, len(slides))
