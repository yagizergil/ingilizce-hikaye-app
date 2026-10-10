"""Mağaza görselleri için dil tablosu. Dil SHOT_LANG ortam değişkeninden gelir (varsayılan tr).
tr için her şey eskisiyle birebir aynı kalır (raw/ kökü, aynı font bağlantısı)."""
import os
import pathlib

ROOT = pathlib.Path(__file__).resolve().parent
LANG = os.environ.get("SHOT_LANG", "tr")
RAW = ROOT / "screenshots" / "raw" if LANG == "tr" else ROOT / "screenshots" / "raw" / LANG
OUT = ROOT / "screenshots" / LANG
BUILD = ROOT / "build" if LANG == "tr" else ROOT / "build" / LANG

# Sıra: 01..08 başlıkları (üst, vurgulu), sonra "search" orta sütunu, sonra 08 alt hap.
CAPTIONS = {
    "tr": [("Hikâye okuyarak", "İngilizce öğren"), ("Kelimeye dokun,", "Türkçesi anında"), ("Stüdyo sesiyle", "dinleyerek öğren"),
           ("Seviyene uygun", "500+ kitap"), ("Her kitapta", "3 basamaklı quiz"), ("Her gün biraz oku,", "serini koru"),
           ("Seviye atla,", "XP topla"), ("10 dil,", "tek uygulama"), ("Stüdyo sesiyle", "dinle"),
           "Türkçe arayüz · İngilizce hikâyeler"],
    "en": [("Read stories,", "learn English"), ("Tap any word,", "instant meaning"), ("Studio narration,", "learn by listening"),
           ("Right for your level,", "500+ books"), ("Every book has a", "3-level quiz"), ("Read a little daily,", "keep your streak"),
           ("Level up,", "earn XP"), ("10 languages,", "one app"), ("Studio voice,", "listen"),
           "English interface · English stories"],
    "de": [("Lerne Englisch", "mit Geschichten"), ("Tippe auf ein Wort,", "sofort auf Deutsch"), ("Mit Studio-Stimme", "hörend lernen"),
           ("Für dein Niveau", "500+ Bücher"), ("In jedem Buch", "ein 3-Stufen-Quiz"), ("Lies täglich etwas,", "halte deine Serie"),
           ("Steig auf,", "sammle XP"), ("10 Sprachen,", "eine App"), ("Mit Studio-Stimme", "zuhören"),
           "Deutsche Oberfläche · Englische Geschichten"],
    "fr": [("Apprends l'anglais", "avec des histoires"), ("Touche un mot,", "traduit aussitôt"), ("Voix de studio :", "apprends en écoutant"),
           ("À ton niveau,", "500+ livres"), ("Dans chaque livre,", "un quiz en 3 étapes"), ("Lis un peu chaque jour,", "garde ta série"),
           ("Monte de niveau,", "gagne des XP"), ("10 langues,", "une seule appli"), ("Voix de studio", "écoute"),
           "Interface en français · Histoires en anglais"],
    "it": [("Impara l'inglese", "con le storie"), ("Tocca una parola,", "subito in italiano"), ("Voce da studio:", "impara ascoltando"),
           ("Per il tuo livello,", "500+ libri"), ("In ogni libro", "un quiz a 3 livelli"), ("Leggi un po' ogni giorno,", "mantieni la serie"),
           ("Sali di livello,", "guadagna XP"), ("10 lingue,", "una sola app"), ("Voce da studio", "ascolta"),
           "Interfaccia in italiano · Storie in inglese"],
    "es": [("Aprende inglés", "con historias"), ("Toca una palabra,", "traducida al instante"), ("Voz de estudio:", "aprende escuchando"),
           ("Para tu nivel,", "500+ libros"), ("En cada libro,", "un quiz de 3 niveles"), ("Lee un poco cada día,", "mantén tu racha"),
           ("Sube de nivel,", "gana XP"), ("10 idiomas,", "una sola app"), ("Voz de estudio", "escucha"),
           "Interfaz en español · Historias en inglés"],
    "ru": [("Учи английский,", "читая истории"), ("Нажми на слово —", "перевод сразу"), ("Студийный голос:", "учись на слух"),
           ("Для твоего уровня", "500+ книг"), ("В каждой книге", "квиз из 3 этапов"), ("Читай понемногу", "и держи серию"),
           ("Повышай уровень,", "копи XP"), ("10 языков,", "одно приложение"), ("Студийный голос", "слушай"),
           "Интерфейс на русском · Истории на английском"],
    "ar": [("تعلّم الإنجليزية", "بقراءة القصص"), ("المس أي كلمة", "وترجمتها فورًا"), ("بصوت استوديو", "تعلّم بالاستماع"),
           ("حسب مستواك", "500+ كتاب"), ("في كل كتاب", "اختبار من 3 مراحل"), ("اقرأ قليلًا كل يوم", "وحافظ على سلسلتك"),
           ("ارتقِ مستوى", "واجمع XP"), ("10 لغات", "تطبيق واحد"), ("بصوت استوديو", "استمع"),
           "واجهة عربية · قصص إنجليزية"],
    "zh": [("读故事", "学英语"), ("点一下单词", "中文释义秒出"), ("录音室级朗读", "边听边学"),
           ("适合你的水平", "500+ 本书"), ("每本书都有", "3 级测验"), ("每天读一点", "保持连续打卡"),
           ("升级", "赚取 XP"), ("10 种语言", "一个应用"), ("录音室朗读", "边听边学"),
           "中文界面 · 英文故事"],
    "ja": [("物語を読んで", "英語を学ぼう"), ("単語をタップ", "すぐに日本語訳"), ("スタジオ音声で", "聞いて学ぶ"),
           ("レベルに合った", "500+ 冊の本"), ("どの本にも", "3段階クイズ"), ("毎日少しずつ読んで", "連続記録をキープ"),
           ("レベルアップ", "XPを集めよう"), ("10言語", "1つのアプリ"), ("スタジオ音声で", "聞く"),
           "日本語インターフェース · 英語の物語"],
}

# Okuyucu kopyası: bölüm, oku, dinle, tür, kitapta N kez, karşılık, kaydet, stüdyo, hız
READER = {
    "tr": ("Bölüm 1 · 4/12", "Oku", "Dinle", "isim", "Bu kitapta 9 kez", "un", "Kelimelerime kaydet", "Stüdyo seslendirmesi", "Hız"),
    "en": ("Chapter 1 · 4/12", "Read", "Listen", "noun", "9 times in this book", "powder made from grain", "Save to my words", "Studio narration", "Speed"),
    "de": ("Kapitel 1 · 4/12", "Lesen", "Hören", "Nomen", "9-mal in diesem Buch", "Mehl", "Zu meinen Wörtern", "Studioaufnahme", "Tempo"),
    "fr": ("Chapitre 1 · 4/12", "Lire", "Écouter", "nom", "9 fois dans ce livre", "farine", "Ajouter à mes mots", "Narration studio", "Vitesse"),
    "it": ("Capitolo 1 · 4/12", "Leggi", "Ascolta", "sostantivo", "9 volte in questo libro", "farina", "Salva nelle mie parole", "Voce da studio", "Velocità"),
    "es": ("Capítulo 1 · 4/12", "Leer", "Escuchar", "sustantivo", "9 veces en este libro", "harina", "Guardar en mis palabras", "Narración de estudio", "Velocidad"),
    "ru": ("Глава 1 · 4/12", "Читать", "Слушать", "сущ.", "9 раз в этой книге", "мука", "Сохранить в мои слова", "Студийная озвучка", "Скорость"),
    "ar": ("الفصل 1 · 4/12", "اقرأ", "استمع", "اسم", "9 مرات في هذا الكتاب", "طحين", "احفظ في كلماتي", "تسجيل استوديو", "السرعة"),
    "zh": ("第 1 章 · 4/12", "阅读", "收听", "名词", "本书中出现 9 次", "面粉", "保存到我的单词", "录音室朗读", "语速"),
    "ja": ("第1章 · 4/12", "読む", "聞く", "名詞", "この本に9回", "小麦粉", "単語帳に保存", "スタジオ音声", "速度"),
}

_NOTO = {"zh": "'Noto Sans SC'", "ja": "'Noto Sans JP'", "ar": "'Noto Sans Arabic'"}
FAMILY = "Gabarito,sans-serif" if LANG == "tr" else (
    "Gabarito," + (_NOTO[LANG] + "," if LANG in _NOTO else "") + "'Noto Sans','Noto Sans SC',sans-serif")
_EXTRA = "&family=Noto+Sans:wght@600;700;800&family=Noto+Sans+SC:wght@600;700;800&family=Noto+Sans+JP:wght@600;700;800&family=Noto+Sans+Arabic:wght@600;700;800"


def font_link(base_families="family=Gabarito:wght@600;700;800"):
    extra = "" if LANG == "tr" else _EXTRA
    return f'<link href="https://fonts.googleapis.com/css2?{base_families}{extra}&display=swap" rel="stylesheet">'


DIR = ' dir="rtl"' if LANG == "ar" else ""
