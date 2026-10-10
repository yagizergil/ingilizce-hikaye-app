"""Seri devamı (post16..post37) + tüm postlar için YALNIZCA 5 hashtag'lik açıklama.
Kural (ürün sahibi, 2026-10-07): başlık ve açıklama metni YOK, sadece 5 hashtag.
"""
from series import POSTS, cover, cards, quiz, text, cta, render  # noqa: F401

NEW = {
    "post16": [cover("Havalimanında<br><span class='hl'>hayat kurtaran</span><br>cümleler ✈️", None, "search"),
               cards("Check-in 🧳", [("I'd like a window seat.", "Cam kenarı istiyorum."), ("How many bags can I take?", "Kaç bavul alabilirim?")]),
               cards("Kapıda 🚪", [("Is this the gate for Paris?", "Paris kapısı bu mu?"), ("My flight is delayed.", "Uçuşum rötarlı.")], "books"),
               cta()],
    "post17": [cover("“Ben de”<br>İngilizcede<br><span class='hl'>me too</span> değil mi? 🤔", None, "quiz"),
               quiz("“I don't like coffee.” → “Ben de sevmem.”", ["Me too", "Me neither", "Me also"]),
               quiz("“I don't like coffee.” → “Ben de sevmem.”", ["Me too", "Me neither", "Me also"], right=1),
               text("Olumlu cümle → <b>Me too</b><br>Olumsuz cümle → <b>Me neither</b>"),
               cta()],
    "post18": [cover("Otelde<br><span class='hl'>işine yarayacak</span><br>6 cümle 🏨", None, "search"),
               cards("Resepsiyon 🛎️", [("I have a reservation.", "Rezervasyonum var."), ("What time is check-out?", "Çıkış saat kaçta?"), ("Is breakfast included?", "Kahvaltı dahil mi?")]),
               cards("Odada 🛏️", [("The AC isn't working.", "Klima çalışmıyor."), ("Could I get extra towels?", "Ekstra havlu alabilir miyim?"), ("What's the Wi-Fi password?", "Wi-Fi şifresi ne?")], "books"),
               cta()],
    "post19": [cover("<span class='hl'>Duygularını</span><br>İngilizce anlat 💛", "Happy ve sad'den fazlası", "party"),
               cards("Mutlu 😊", [("thrilled", "çok heyecanlı ve mutlu"), ("grateful", "minnettar")]),
               cards("Kötü 😔", [("upset", "üzgün, canı sıkkın"), ("anxious", "kaygılı"), ("frustrated", "bıkmış, sinirli")], "books"),
               cta()],
    "post20": [cover("Hangisi doğru?<br><span class='hl'>since</span> mı <span class='hl'>for</span> mu? ⏳", None, "quiz"),
               quiz("I've lived here ___ 5 years.", ["since", "for"]),
               quiz("I've lived here ___ 5 years.", ["since", "for"], right=1),
               cards("Kısa kural 📌", [("for", "süre — for 5 years, for 2 hours"), ("since", "başlangıç anı — since 2020, since Monday")], "books"),
               cta()],
    "post21": [cover("İngilizce<br><span class='hl'>iltifat</span> etmeyi<br>öğren 🥰", None, "party"),
               cards("Arkadaşına 💬", [("You look great!", "Harika görünüyorsun!"), ("I love your style.", "Tarzına bayılıyorum.")]),
               cards("İşte 💼", [("Great job!", "Harika iş çıkardın!"), ("You nailed it!", "Tam on ikiden vurdun!")], "books"),
               cta()],
    "post22": [cover("Lumi'nin<br><span class='hl'>mini hikâyesi</span> 2 📖", None, "books"),
               text("Tom missed the <span class='hl'>bus</span>.<br>He started to <span class='hl'>run</span>.<br>The driver <span class='hl'>waited</span> for him.<br>Tom was <span class='hl'>lucky</span> today."),
               cards("Kelimeler 👇", [("bus", "otobüs"), ("run", "koşmak"), ("waited", "bekledi"), ("lucky", "şanslı")], "words"),
               cta()],
    "post23": [cover("<span class='hl'>Ödünç ver</span> mi<br>ödünç al mı? 🤯", "borrow vs lend", "quiz"),
               quiz("Can you ___ me your pen?", ["borrow", "lend"]),
               quiz("Can you ___ me your pen?", ["borrow", "lend"], right=1),
               cards("Ezber kartı 📌", [("lend", "ödünç VERMEK — lend me"), ("borrow", "ödünç ALMAK — Can I borrow…?")], "books"),
               cta()],
    "post24": [cover("Restoranda<br><span class='hl'>sipariş</span> verirken 🍝", None, "search"),
               cards("Masada 🍽️", [("Can we see the menu?", "Menüye bakabilir miyiz?"), ("I'll have the pasta.", "Makarna alayım.")]),
               cards("Sonunda 💳", [("Could we get the bill?", "Hesabı alabilir miyiz?"), ("Can I pay by card?", "Kartla ödeyebilir miyim?")], "books"),
               cta()],
    "post25": [cover("Bunlar aslında<br><span class='hl'>tek kelime</span>! 😮", "Bileşik kelimeler", "search"),
               cards("Kaydet 📌", [("sunflower", "ayçiçeği (sun + flower)"), ("toothbrush", "diş fırçası"), ("homework", "ev ödevi")]),
               cards("Devam 👇", [("rainbow", "gökkuşağı (rain + bow)"), ("butterfly", "kelebek 🦋")], "books"),
               cta()],
    "post26": [cover("<span class='hl'>Say · tell · speak · talk</span><br>farkı ne? 🗣️", None, "quiz"),
               cards("Kısa kural 📌", [("say", "bir şey söylemek — say hello"), ("tell", "birine anlatmak — tell me")]),
               cards("Devam 👇", [("speak", "dil konuşmak — speak English"), ("talk", "sohbet etmek — talk to a friend")], "books"),
               quiz("Can you ___ English?", ["say", "speak", "tell"]),
               quiz("Can you ___ English?", ["say", "speak", "tell"], right=1),
               cta()],
    "post27": [cover("<span class='hl'>Hava durumu</span><br>İngilizcede ☀️🌧️", None, "party"),
               cards("Kaydet 📌", [("It's sunny.", "Güneşli."), ("It's cloudy.", "Bulutlu."), ("It's pouring.", "Sağanak yağıyor.")]),
               cards("Devam 👇", [("It's freezing!", "Buz gibi!"), ("It's boiling!", "Cayır cayır yanıyor!")], "books"),
               cta()],
    "post28": [cover("3 saniyede<br>cevapla! ⏱️", "Mini quiz", "quiz"),
               quiz("“Heyecanlıyım” İngilizcede?", ["I'm exciting", "I'm excited"]),
               quiz("“Heyecanlıyım” İngilizcede?", ["I'm exciting", "I'm excited"], right=1),
               text("<b>excited</b> = heyecanlı (ben)<br><b>exciting</b> = heyecan verici (film, maç)"),
               cta()],
    "post29": [cover("Alışverişte<br><span class='hl'>lazım olacak</span><br>cümleler 🛍️", None, "search"),
               cards("Mağazada 👕", [("Do you have this in medium?", "Bunun M bedeni var mı?"), ("Can I try it on?", "Deneyebilir miyim?")]),
               cards("Kasada 💸", [("How much is it?", "Ne kadar?"), ("Is there a discount?", "İndirim var mı?")], "books"),
               cta()],
    "post30": [cover("Tek kelimeyle<br><span class='hl'>daha doğal</span><br>konuş 💬", None, "party"),
               cards("Kaydet 📌", [("Definitely!", "Kesinlikle!"), ("Exactly!", "Aynen öyle!"), ("Seriously?", "Cidden mi?")]),
               cards("Devam 👇", [("Totally!", "Tamamen!"), ("Whatever.", "Her neyse."), ("Obviously.", "Belli ki.")], "books"),
               cta()],
    "post31": [cover("<span class='hl'>Hobilerini</span><br>İngilizce anlat 🎨", None, "books"),
               cards("Kaydet 📌", [("I'm into photography.", "Fotoğrafçılığa ilgim var."), ("I'm a big fan of…", "…'in büyük hayranıyım")]),
               cards("Devam 👇", [("In my free time, I…", "Boş zamanlarımda…"), ("I can't live without music.", "Müziksiz yaşayamam.")], "words"),
               cta()],
    "post32": [cover("Hangisi doğru?<br><span class='hl'>much</span> mı <span class='hl'>many</span> mi? 🤔", None, "quiz"),
               quiz("How ___ water do you drink?", ["many", "much"]),
               quiz("How ___ water do you drink?", ["many", "much"], right=1),
               cards("Kısa kural 📌", [("many", "sayılabilen — many books"), ("much", "sayılamayan — much water")], "books"),
               cta()],
    "post33": [cover("Telefonda<br><span class='hl'>İngilizce</span><br>konuşmak 📞", None, "search"),
               cards("Kaydet 📌", [("Who's calling, please?", "Kim arıyor?"), ("Can you hold on a second?", "Bir saniye bekler misiniz?")]),
               cards("Devam 👇", [("Sorry, you're breaking up.", "Pardon, sesin kesiliyor."), ("I'll call you back.", "Seni geri arayacağım.")], "books"),
               cta()],
    "post34": [cover("Bilmen gereken<br>5 <span class='hl'>sıfat</span> 🌟", "B1 seviyesi", "crown"),
               cards("Kaydet 📌", [("reliable", "güvenilir"), ("curious", "meraklı"), ("generous", "cömert")]),
               cards("Devam 👇", [("confident", "kendinden emin"), ("patient", "sabırlı")], "books"),
               cta()],
    "post35": [cover("Lumi'nin<br><span class='hl'>mini hikâyesi</span> 3 📖", None, "books"),
               text("Mia found an old <span class='hl'>key</span>.<br>She opened a <span class='hl'>dusty</span> box.<br>Inside, there was a <span class='hl'>letter</span>.<br>It was <span class='hl'>from</span> her grandmother."),
               cards("Kelimeler 👇", [("key", "anahtar"), ("dusty", "tozlu"), ("letter", "mektup"), ("from", "-den, tarafından")], "words"),
               cta()],
    "post36": [cover("<span class='hl'>Gonna, wanna,<br>gotta</span> ne demek? 🤔", None, "search"),
               cards("Konuşma dili 💬", [("gonna", "going to — -ecek"), ("wanna", "want to — istemek"), ("gotta", "got to — zorunda olmak")]),
               text("I'm <b>gonna</b> sleep.<br>I <b>wanna</b> eat.<br>I <b>gotta</b> go!<br><span class='small'>Yazıda değil, konuşmada kullanılır.</span>", "words"),
               cta()],
    "post37": [cover("Bir ayda<br><span class='hl'>öğrendiklerimiz</span> 🎉", "Kaçını hatırlıyorsun?", "party"),
               quiz("“I'm boring” mi, “I'm bored” mu? (Sıkıldım)", ["I'm boring", "I'm bored"]),
               quiz("“I'm boring” mi, “I'm bored” mu? (Sıkıldım)", ["I'm boring", "I'm bored"], right=1),
               cards("Hızlı tekrar 📌", [("make a mistake", "hata yapmak"), ("run out of", "tükenmek"), ("for 5 years", "5 yıldır")], "books"),
               cta()],
}

# Her post için YALNIZCA 5 hashtag (geniş + konuya özel karışık).
TAGS = {
    "post01": "#ingilizce #ingilizceöğren #ingilizcekelime #dilöğren #keşfet",
    "post02": "#ingilizce #ingilizcehatalar #ingilizceöğren #ingilizcekonuşma #keşfet",
    "post03": "#ingilizce #ingilizcekelime #falsefriends #ingilizceöğren #keşfet",
    "post04": "#ingilizce #ingilizcequiz #ingilizceöğren #ingilizcekelime #keşfet",
    "post05": "#ingilizce #ingilizcedeyimler #idioms #ingilizceöğren #keşfet",
    "post06": "#ingilizce #günlükingilizce #ingilizcekonuşma #ingilizceöğren #keşfet",
    "post07": "#ingilizce #ingilizcekelime #b1 #ingilizceöğren #keşfet",
    "post08": "#ingilizce #ingilizcequiz #makevsdo #ingilizcegramer #keşfet",
    "post09": "#ingilizce #ingilizcehikaye #ingilizcekelime #okuma #keşfet",
    "post10": "#ingilizce #ingilizcekelime #ingilizcekonuşma #learnenglish #keşfet",
    "post11": "#ingilizce #telaffuz #pronunciation #ingilizceöğren #keşfet",
    "post12": "#ingilizce #phrasalverbs #ingilizcequiz #ingilizceöğren #keşfet",
    "post13": "#ingilizce #diziyleingilizce #ingilizcekonuşma #günlükingilizce #keşfet",
    "post14": "#ingilizce #okumaalışkanlığı #ingilizceöğren #kitap #keşfet",
    "post15": "#ingilizce #ingilizcegramer #prepositions #ingilizcequiz #keşfet",
    "post16": "#ingilizce #seyahat #havalimanı #günlükingilizce #keşfet",
    "post17": "#ingilizce #ingilizcequiz #ingilizcegramer #ingilizcekonuşma #keşfet",
    "post18": "#ingilizce #seyahat #otel #günlükingilizce #keşfet",
    "post19": "#ingilizce #ingilizcekelime #duygular #ingilizceöğren #keşfet",
    "post20": "#ingilizce #ingilizcegramer #ingilizcequiz #sinceandfor #keşfet",
    "post21": "#ingilizce #ingilizcekonuşma #iltifat #günlükingilizce #keşfet",
    "post22": "#ingilizce #ingilizcehikaye #ingilizcekelime #okuma #keşfet",
    "post23": "#ingilizce #ingilizcequiz #ingilizcekelime #ingilizcegramer #keşfet",
    "post24": "#ingilizce #restoran #günlükingilizce #seyahat #keşfet",
    "post25": "#ingilizce #ingilizcekelime #ingilizceöğren #learnenglish #keşfet",
    "post26": "#ingilizce #ingilizcegramer #ingilizcequiz #ingilizcekonuşma #keşfet",
    "post27": "#ingilizce #havadurumu #ingilizcekelime #günlükingilizce #keşfet",
    "post28": "#ingilizce #ingilizcequiz #ingilizcehatalar #ingilizceöğren #keşfet",
    "post29": "#ingilizce #alışveriş #günlükingilizce #seyahat #keşfet",
    "post30": "#ingilizce #ingilizcekonuşma #slang #günlükingilizce #keşfet",
    "post31": "#ingilizce #ingilizcekonuşma #hobiler #ingilizceöğren #keşfet",
    "post32": "#ingilizce #ingilizcegramer #ingilizcequiz #muchmany #keşfet",
    "post33": "#ingilizce #ingilizcekonuşma #iş #günlükingilizce #keşfet",
    "post34": "#ingilizce #ingilizcekelime #b1 #sıfatlar #keşfet",
    "post35": "#ingilizce #ingilizcehikaye #ingilizcekelime #okuma #keşfet",
    "post36": "#ingilizce #slang #ingilizcekonuşma #amerikaningilizcesi #keşfet",
    "post37": "#ingilizce #ingilizcequiz #ingilizcetekrar #ingilizceöğren #keşfet",
}

assert all(len(t.split()) == 5 for t in TAGS.values())

if __name__ == "__main__":
    import pathlib
    import sys
    from PIL import Image
    names = sys.argv[1:] or list(NEW)
    for n in names:
        d = render(n, NEW[n])
        k = len(NEW[n])
        ims = [Image.open(d / f"s{i}.jpg") for i in range(1, k + 1)]
        W = Image.new("RGB", (k * 230, 410), "white")
        for i, im in enumerate(ims):
            W.paste(im.resize((216, 384)), (i * 230, 13))
        W.save(d / "sheet.jpg")
        print(n, k, flush=True)
    # Tüm postların açıklaması = yalnızca 5 hashtag
    for n, t in TAGS.items():
        p = pathlib.Path(__file__).parent / "out" / n
        if p.exists():
            (p / "caption.txt").write_text(t, encoding="utf-8")
