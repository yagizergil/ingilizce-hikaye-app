import json
M = {
"tr": dict(
 name="Lingo: Hikayeyle İngilizce",
 sub="Kitap oku, kelime öğren",
 kw="ingilizce,okuma,sözlük,çeviri,dil,öğrenme,a2,b1,b2,sesli,quiz,kart,ielts,yds,ydt,toefl,roman",
 promo="Hikâye okuyarak İngilizce öğren! Kelimeye dokun, Türkçesi anında gelsin. Her kitapta quiz, stüdyo seslendirmesi ve günlük hedef seni bekliyor.",
),
"en": dict(
 name="Lingo: Learn English Stories",
 sub="Read books, build vocabulary",
 kw="esl,reading,graded,readers,dictionary,translate,audiobook,quiz,flashcards,grammar,toefl,ielts,a2,b1",
 promo="Learn English by reading stories! Tap any word for an instant translation. Book quizzes, studio narration and daily goals keep you on track.",
),
"de": dict(
 name="Lingo: Englisch mit Büchern",
 sub="Geschichten lesen & verstehen",
 kw="lernen,sprache,vokabeln,wörterbuch,übersetzer,hörbuch,quiz,anfänger,a2,b1,karteikarten",
 promo="Lerne Englisch mit Geschichten! Tippe auf ein Wort und sieh sofort die Übersetzung. Buch-Quiz, Studio-Sprecher und Tagesziele halten dich am Ball.",
),
"fr": dict(
 name="Lingo: Anglais en histoires",
 sub="Lis des livres, apprends vite",
 kw="apprendre,langue,vocabulaire,dictionnaire,traduction,lecture,audio,quiz,débutant,a2,b1,toeic,mots",
 promo="Apprends l'anglais en lisant des histoires ! Touche un mot pour sa traduction immédiate. Quiz, narration studio et objectifs quotidiens t'attendent.",
),
"it": dict(
 name="Lingo: Inglese con le storie",
 sub="Leggi libri, impara parole",
 kw="imparare,lingua,vocabolario,dizionario,traduttore,lettura,audiolibro,quiz,principianti,a2,b1",
 promo="Impara l'inglese leggendo storie! Tocca una parola e vedi subito la traduzione. Quiz, narrazione in studio e obiettivi giornalieri ti aspettano.",
),
"es": dict(
 name="Lingo: Inglés con historias",
 sub="Lee libros, aprende palabras",
 kw="aprender,idioma,vocabulario,diccionario,traductor,lectura,audiolibro,quiz,principiantes,a2,b1",
 promo="¡Aprende inglés leyendo historias! Toca una palabra y ve su traducción al instante. Quizzes, narración de estudio y metas diarias te esperan.",
),
"ru": dict(
 name="Lingo: Английский по книгам",
 sub="Читай истории, учи слова",
 kw="язык,словарь,перевод,чтение,аудио,тест,a2,b1,ielts",
 promo="Учите английский, читая истории! Нажмите на слово — перевод появится сразу. Викторины, студийная озвучка и ежедневные цели помогут не сбиться.",
),
"ar": dict(
 name="Lingo: الإنجليزية بالقصص",
 sub="اقرأ الكتب وتعلّم الكلمات",
 kw="لغة,قاموس,ترجمة,قراءة,صوتي,اختبار,مفردات,مبتدئ",
 promo="تعلّم الإنجليزية بقراءة القصص! المس أي كلمة لترى ترجمتها فورًا. اختبارات الكتب والسرد الصوتي الاحترافي والأهداف اليومية بانتظارك.",
),
"zh": dict(
 name="Lingo：读故事学英语",
 sub="英语阅读，轻松记单词",
 kw="英文,词典,翻译,有声书,分级,背单词,口语,听力,测验,雅思,托福",
 promo="读故事，学英语！点一下单词，立刻看到中文释义。书籍测验、专业配音和每日目标，助你坚持学习。",
),
"ja": dict(
 name="Lingo：物語で英語を学ぶ",
 sub="英語の本を読んで単語力アップ",
 kw="英単語,辞書,翻訳,多読,リーディング,朗読,クイズ,初心者,英検,TOEIC",
 promo="物語を読んで英語を身につけよう！単語をタップすればすぐに日本語訳。本のクイズ、スタジオ朗読、毎日の目標で楽しく続けられます。",
),
}
import re
for L,d in M.items():
    words=set(re.findall(r"\w+",(d["name"]+" "+d["sub"]).lower()))
    dup=[k for k in d["kw"].split(",") if k.lower() in words]
    print(L,len(d["name"]),len(d["sub"]),len(d["kw"].encode()),len(d["promo"]),"DUP" if dup else "",dup)
json.dump(M,open("build/aso.json","w",encoding="utf-8"),ensure_ascii=False)
