"""1.0.10 App Store metinleri (10 dil): What's New + Promotional Text (<=170). Uzunlukları doğrular, md yazar."""
import pathlib

T = {
"tr": ("Bilmediğin kelimeye dokun, cümledeki anlamı anında gelsin. Artık her dilde daha doğru çeviri, kitap quizleri ve günlük okuma meydan okuması seni bekliyor.",
"""Lingo 1.0.10 ile çeviriler çok daha akıllı!
• Kelime çevirisi artık cümleye bakıyor: aynı kelimenin farklı anlamlarını doğru ayırıyor (ör. Fransızca "au", "sa", Almanca "zum", "die").
• Tüm hikâye dillerinde daha doğru karşılıklar.
• İnternet yokken uygulama takılı kalmıyor; daha önce giriş yaptıysan indirilmiş bölümleri çevrimdışı okuyabilirsin.
• Quiz sekmesindeki kartlar artık tıklanıyor: tekrar bekleyen, kaydedilen ve öğrenilen kelimelerine tek dokunuşla git.
• Kelimelerim ekranı yenilendi: liste tüm ekranı kullanıyor.
• Yeni alt menü tasarımı.
• Hata düzeltmeleri ve performans iyileştirmeleri."""),
"en": ("Tap any word and get its meaning in that sentence, instantly. More accurate translations in every language, plus book quizzes and a daily reading challenge.",
"""Smarter translations in Lingo 1.0.10!
• Word translation now reads the sentence, so it tells apart different meanings of the same word (e.g. French "au", "sa", German "zum", "die").
• More accurate meanings across all story languages.
• No more getting stuck without internet; if you've signed in before, you can read downloaded chapters offline.
• Quiz tab cards are now tappable: jump to your due, saved and learned words in one tap.
• Refreshed My Words screen: the list now uses the full screen.
• New bottom navigation design.
• Bug fixes and performance improvements."""),
"de": ("Tippe auf ein Wort und sieh sofort seine Bedeutung im Satz. Genauere Übersetzungen in jeder Sprache, dazu Buch-Quiz und eine tägliche Lese-Challenge.",
"""Klügere Übersetzungen in Lingo 1.0.10!
• Die Wortübersetzung berücksichtigt jetzt den Satz und unterscheidet verschiedene Bedeutungen desselben Wortes (z. B. Französisch „au“, „sa“, Deutsch „zum“, „die“).
• Genauere Bedeutungen in allen Geschichtensprachen.
• Ohne Internet bleibt die App nicht mehr hängen; wenn du schon angemeldet warst, kannst du heruntergeladene Kapitel offline lesen.
• Die Karten im Quiz-Tab sind jetzt antippbar: fällige, gespeicherte und gelernte Wörter mit einem Tipp.
• Neu gestalteter Bildschirm „Meine Wörter“: die Liste nutzt den ganzen Bildschirm.
• Neues Design der unteren Navigation.
• Fehlerbehebungen und Leistungsverbesserungen."""),
"fr": ("Touche un mot et découvre aussitôt son sens dans la phrase. Des traductions plus justes dans toutes les langues, des quiz de livre et un défi lecture.",
"""Des traductions plus intelligentes dans Lingo 1.0.10 !
• La traduction des mots tient désormais compte de la phrase et distingue les différents sens d'un même mot (ex. « au », « sa » en français, « zum », « die » en allemand).
• Des sens plus justes dans toutes les langues des histoires.
• L'appli ne reste plus bloquée sans internet ; si tu t'es déjà connecté, tu peux lire hors ligne les chapitres téléchargés.
• Les cartes de l'onglet Quiz sont maintenant cliquables : accède en un geste à tes mots à réviser, enregistrés et appris.
• Écran « Mes mots » repensé : la liste occupe tout l'écran.
• Nouveau design de la barre de navigation.
• Corrections de bugs et amélioration des performances."""),
"it": ("Tocca una parola e scopri subito il suo significato nella frase. Traduzioni più precise in ogni lingua, quiz sui libri e una sfida di lettura quotidiana.",
"""Traduzioni più intelligenti in Lingo 1.0.10!
• La traduzione delle parole ora considera la frase e distingue i diversi significati della stessa parola (es. francese "au", "sa", tedesco "zum", "die").
• Significati più precisi in tutte le lingue delle storie.
• Senza internet l'app non si blocca più; se hai già effettuato l'accesso, puoi leggere offline i capitoli scaricati.
• Le schede della sezione Quiz ora si possono toccare: vai con un tocco alle parole da ripassare, salvate e imparate.
• Schermata "Le mie parole" rinnovata: l'elenco usa tutto lo schermo.
• Nuovo design della barra di navigazione.
• Correzioni di bug e miglioramenti delle prestazioni."""),
"es": ("Toca una palabra y ve al instante su significado en la frase. Traducciones más precisas en todos los idiomas, quizzes de libros y un reto de lectura diario.",
"""¡Traducciones más inteligentes en Lingo 1.0.10!
• La traducción de palabras ahora tiene en cuenta la frase y distingue los distintos significados de una misma palabra (p. ej. francés «au», «sa», alemán «zum», «die»).
• Significados más precisos en todos los idiomas de las historias.
• La app ya no se queda atascada sin internet; si ya iniciaste sesión, puedes leer sin conexión los capítulos descargados.
• Las tarjetas de la pestaña Quiz ahora se pueden tocar: ve con un toque a tus palabras pendientes, guardadas y aprendidas.
• Pantalla «Mis palabras» renovada: la lista ocupa toda la pantalla.
• Nuevo diseño de la barra de navegación.
• Corrección de errores y mejoras de rendimiento."""),
"ru": ("Нажмите на слово и сразу узнайте его значение в предложении. Более точный перевод на всех языках, викторины по книгам и ежедневный челлендж чтения.",
"""Более умный перевод в Lingo 1.0.10!
• Перевод слов теперь учитывает предложение и различает значения одного и того же слова (напр., французские «au», «sa», немецкие «zum», «die»).
• Более точные значения во всех языках историй.
• Без интернета приложение больше не зависает; если вы уже входили, загруженные главы можно читать офлайн.
• Карточки во вкладке «Квиз» теперь нажимаются: одним касанием к словам на повторение, сохранённым и выученным.
• Обновлён экран «Мои слова»: список занимает весь экран.
• Новый дизайн нижнего меню.
• Исправления ошибок и улучшение производительности."""),
"ar": ("المس أي كلمة لترى معناها في الجملة فورًا. ترجمات أدق في كل اللغات، مع اختبارات للكتب وتحدٍّ يومي للقراءة.",
"""ترجمات أذكى في Lingo 1.0.10!
• ترجمة الكلمات تراعي الآن الجملة وتميّز بين المعاني المختلفة للكلمة نفسها (مثل الفرنسية «au» و«sa» والألمانية «zum» و«die»).
• معانٍ أدق في جميع لغات القصص.
• لم يعد التطبيق يتوقف عند انقطاع الإنترنت؛ إن كنت قد سجّلت الدخول سابقًا يمكنك قراءة الفصول المحمّلة دون اتصال.
• بطاقات تبويب الاختبار أصبحت قابلة للنقر: انتقل بلمسة إلى الكلمات المستحقة للمراجعة والمحفوظة والمتعلَّمة.
• تصميم جديد لشاشة «كلماتي»: القائمة تشغل الشاشة كاملة.
• تصميم جديد لشريط التنقل السفلي.
• إصلاح الأخطاء وتحسين الأداء."""),
"zh": ("点一下单词，立刻看到它在句子中的意思。各语言翻译更准确，还有书籍测验和每日阅读挑战。",
"""Lingo 1.0.10 翻译更智能！
• 单词翻译现在会结合整句，能区分同一个词的不同含义（如法语 "au"、"sa"，德语 "zum"、"die"）。
• 所有故事语言的释义更准确。
• 没有网络时应用不再卡住；如果之前登录过，可离线阅读已下载的章节。
• 测验页的卡片现在可以点击：一键查看待复习、已收藏和已掌握的单词。
• 全新"我的单词"页面：列表占满整个屏幕。
• 全新底部导航设计。
• 问题修复与性能优化。"""),
"ja": ("単語をタップすると、その文での意味がすぐにわかります。全言語で翻訳がより正確に。本のクイズと毎日の読書チャレンジも楽しめます。",
"""Lingo 1.0.10 で翻訳がもっと賢く！
• 単語の翻訳が文脈を読み取り、同じ単語の異なる意味を正しく区別します（例：フランス語の「au」「sa」、ドイツ語の「zum」「die」）。
• すべての物語の言語で、より正確な訳に。
• インターネットがなくてもアプリが止まらなくなりました。以前ログインしていれば、ダウンロード済みの章をオフラインで読めます。
• クイズタブのカードがタップ可能に：復習待ち・保存済み・習得済みの単語へワンタップで移動。
• 「マイ単語」画面を刷新：リストが画面全体に表示されます。
• 下部ナビゲーションのデザインを一新。
• 不具合の修正とパフォーマンスの向上。"""),
}

NAMES = {"tr": "Türkçe", "en": "English (U.S.)", "de": "Deutsch", "fr": "Français", "it": "Italiano",
         "es": "Español (Mexico/Spain)", "ru": "Русский", "ar": "العربية", "zh": "简体中文", "ja": "日本語"}

out = ["# Lingo 1.0.10 — What's New + Promotional Text (10 dil)\n"]
for k, (promo, wn) in T.items():
    assert len(promo) <= 170, (k, len(promo))
    assert len(wn) <= 4000
    out.append(f"\n## {NAMES[k]} ({k})\n\n**Promotional Text** ({len(promo)}/170)\n```\n{promo}\n```\n\n**What's New**\n```\n{wn}\n```\n")
    print(k, len(promo))
pathlib.Path(__file__).with_name("appstore-1.0.10-metinler.md").write_text("".join(out), encoding="utf-8")
