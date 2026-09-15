"""Çok dilli A1 pilot hikâye üretimi — `generate_stories_es.py`nin
genellenmiş hâli. İspanyolca pilotu tek dil için yazılmıştı; Fransızca ve
Almanca eklenirken üç ayrı neredeyse-özdeş betik yerine tek, `--lang`
parametreli bir betiğe indirgendi. Mantığın kendisi (kapalı döngü: üret ->
spaCy ile ölç -> reddedilirse gerekçeyle yeniden yazdır) DEĞİŞMEDİ, sadece
dil-özel sabitler (prompt dosyası, kelime listesi CSV'si, spaCy modeli,
çıktı klasörü) bir config'e taşındı.

NEDEN HÂLÂ `pipeline check`/`validator.py`'den AYRI: bkz.
generate_stories_es.py'nin orijinal NEDEN notu -- İngilizce'nin kalibre
edilmiş STRICT doğrulama yolunu riske atmamak için. Bu, üç dil için de
hâlâ bir PİLOT doğrulayıcı; off-list toleransı İngilizce'den gevşek.

ÇALIŞTIRMA:
    .venv/Scripts/python.exe scripts/generate_stories_multi.py --lang fr --count 1 --dry-run
    .venv/Scripts/python.exe scripts/generate_stories_multi.py --lang de --count 5
"""

from __future__ import annotations

import argparse
import csv
import io
import re
import sys
import time
from dataclasses import dataclass, field
from pathlib import Path

import spacy
import yaml
from anthropic import Anthropic
from dotenv import load_dotenv


class _StanzaToken:
    """spaCy Token'ın check_story'nin kullandığı KISMİ arayüzü (text,
    lemma_, pos_, is_alpha, is_punct) -- Stanza'nın kendi Word nesnesi
    farklı bir API sunduğu için (örn. `.text` yerine `.text`, ama
    `.upos` `.pos_` değil) bu ince adaptör gerekiyor. Türkçe (Stanza)
    spaCy'ye (diğer 8 dil) tamamen aynı check_story kod yolunu
    kullanabilsin diye yazıldı -- ayrı bir Türkçe-özel doğrulayıcı
    yazmaktan daha az kod, daha az bakım yükü."""

    __slots__ = ("text", "lemma_", "pos_", "is_alpha", "is_punct", "is_space")

    def __init__(self, word) -> None:
        self.text = word.text
        self.lemma_ = word.lemma or word.text
        self.pos_ = word.upos or ""
        self.is_alpha = any(c.isalpha() for c in word.text)
        self.is_punct = word.upos == "PUNCT"
        self.is_space = word.text.isspace()


class _StanzaSentence:
    __slots__ = ("text", "_tokens")

    def __init__(self, sentence) -> None:
        self.text = sentence.text
        self._tokens = [_StanzaToken(w) for w in sentence.words]

    def __iter__(self):
        return iter(self._tokens)


class _StanzaDoc:
    """check_story'nin `doc.sents` ve `for token in doc` kullanımını
    taklit eden, Stanza `Document`ı saran adaptör."""

    def __init__(self, document) -> None:
        self.sents = [_StanzaSentence(s) for s in document.sentences]

    def __iter__(self):
        for sent in self.sents:
            yield from sent


class StanzaNlpAdapter:
    """`spacy.load(...)` çağrısının yerine geçen çağrılabilir nesne --
    `nlp(text)` -> `_StanzaDoc`. Böylece check_story hangi motorun
    (spaCy/Stanza) arkada çalıştığını hiç bilmiyor."""

    def __init__(self, pipeline) -> None:
        self._pipeline = pipeline

    def __call__(self, text: str) -> _StanzaDoc:
        return _StanzaDoc(self._pipeline(text))


_ARABIC_SENTENCE_SPLIT_RE = re.compile(r"(?<=[.!?؟])\s+")
_ARABIC_PUNCT_RE = re.compile(r"^[.,!?؟،؛:\"'()\[\]{}—-]+$")


class _CamelToken:
    __slots__ = ("text", "lemma_", "pos_", "is_alpha", "is_punct", "is_space")

    def __init__(self, surface: str, lemma: str, pos: str) -> None:
        self.text = surface
        self.lemma_ = lemma
        self.pos_ = pos
        self.is_punct = bool(_ARABIC_PUNCT_RE.match(surface))
        self.is_alpha = not self.is_punct and any(c.isalpha() for c in surface)
        self.is_space = surface.isspace()


class _CamelSentence:
    __slots__ = ("text", "_tokens")

    def __init__(self, text: str, tokens: list) -> None:
        self.text = text
        self._tokens = tokens

    def __iter__(self):
        return iter(self._tokens)


class _CamelDoc:
    def __init__(self, sentences: list) -> None:
        self.sents = sentences

    def __iter__(self):
        for sent in self.sents:
            yield from sent


class CamelNlpAdapter:
    """Arapça için `spacy.load(...)`nin yerine geçen adaptör -- CAMeL
    Tools'un API'si spaCy/Stanza'dan TAMAMEN farklı (kelime tokenize +
    MLE disambiguator, cümle bölme YOK). Cümle bölme burada basit
    noktalama regex'iyle yapılıyor (Arapça ؟ dahil); CAMeL Tools bunu
    sağlamıyor. `analyses[0]` -- disambiguator'ın en olası okuması --
    lemma ve POS için kullanılıyor (bkz. oturum notları: ham analyzer,
    disambiguator OLMADAN "القطة"yı yanlış lemmalıyordu)."""

    def __init__(self, disambiguator, tokenizer) -> None:
        self._disambig = disambiguator
        self._tokenize = tokenizer

    def __call__(self, text: str) -> _CamelDoc:
        sentences = []
        for sent_text in _ARABIC_SENTENCE_SPLIT_RE.split(text):
            sent_text = sent_text.strip()
            if not sent_text:
                continue
            words = self._tokenize(sent_text)
            if not words:
                continue
            disambig = self._disambig.disambiguate(words)
            tokens = []
            for d in disambig:
                top = d.analyses[0].analysis if d.analyses else None
                lemma = _strip_diacritics(top.get("lex", d.word)) if top else d.word
                pos = top.get("pos", "") if top else ""
                tokens.append(_CamelToken(d.word, lemma, pos))
            sentences.append(_CamelSentence(sent_text, tokens))
        return _CamelDoc(sentences)


_ARABIC_DIACRITICS_RE = re.compile(r"[ً-ْٰ]")


def _strip_diacritics(word: str) -> str:
    """CAMeL Tools lemma'ları harekeli dönüyor (örn. "ذَهَب") ama Kelly
    listesi haraketsiz -- karşılaştırmadan önce harekeleri temizle."""
    return _ARABIC_DIACRITICS_RE.sub("", word)

# Windows terminali varsayılan olarak cp1254/cp1252 gibi dar bir kod
# sayfası kullanıyor -- Rusça (Kiril) çıktı `print()`e ulaşınca
# UnicodeEncodeError ile çöküyordu (Latin alfabeli diller bu sınırın
# içinde kaldığı için İspanyolca/Fransızca/Almanca/İtalyanca'da hiç
# görünmemişti). stdout'u UTF-8'e zorlamak yerine `errors="replace"`
# tercih edildi: konsolda görünmeyen bir karakter olursa üretim
# durmasın, sadece o karakter `?` olarak görünsün -- dosyaya yazılan
# hikâye metni bundan ETKİLENMİYOR (raw string, encode edilmeden
# write_text ile UTF-8 yazılıyor).
if sys.stdout.encoding and sys.stdout.encoding.lower() != "utf-8":
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")

PIPELINE_ROOT = Path(__file__).resolve().parent.parent
AUTHOR = "Lingo Studio"
MODEL = "claude-sonnet-5"
MAX_TOKENS = 16000
MAX_ATTEMPTS = 3

# Seviye başına eşikler -- thresholds.yaml'daki İngilizce A1/A2 satırlarıyla
# AYNI sayılar (bkz. prompts/generate_story_a2.md §2), off-list toleransı
# hâlâ pilot gevşekliğinde (İngilizce STRICT %3'e karşı burada %12).
LEVEL_THRESHOLDS = {
    "A1": {"max_avg_sentence": 8.0, "max_sentence": 15, "min_words": 300},
    "A2": {"max_avg_sentence": 12.0, "max_sentence": 25, "min_words": 500},
    # B1 bir TABAN da içeriyor -- İngilizce pipeline'daki B2 kalibrasyon
    # dersinden (bkz. CLAUDE.md "İçerik: B2 basamağı") alındı: yalnızca
    # tavan koymak, ortalaması A2 düzeyinde kalan ama daha zor kelimelerle
    # yazılmış bir metnin geçmesine izin veriyor -- basamak dolduruluyormuş
    # gibi görünür ama aslında doldurulmuyor.
    "B1": {"max_avg_sentence": 17.0, "min_avg_sentence": 13.0, "max_sentence": 40, "min_words": 1200},
}
MAX_OFF_LIST_RATIO = 12.0
CEFR_ORDER = ["A1", "A2", "B1", "B2", "C1", "C2"]

# Latin-1 Supplement (İspanyolca/Fransızca/Almanca/İtalyanca aksanlı
# harfler) + Kiril alfabesi (Rusça) tek regex'te -- her dil kendi script'i
# dışındaki aralığı zaten hiç kullanmıyor, tek regex'i paylaşmak zararsız.
# Latin-1 Supplement + Latin Extended-A (Türkçe ğ/ş/ı/İ, Latin-1'in
# KAPSAMADIĞI harfler -- İspanyolca "año" ile aynı kategori hata, burada
# Türkçe eklenmeden önce yakalandı) + Kiril alfabesi tek regex'te.
_WORD_RE = re.compile(r"[A-Za-zÀ-ÖØ-öø-ÿĀ-ſЀ-ӿ؀-ۿ]+")


@dataclass(frozen=True)
class Brief:
    slug: str
    premise: str


@dataclass(frozen=True)
class LangConfig:
    code: str
    spacy_model: str
    csv_path: Path
    title_hint: str
    supplement: frozenset[str]
    briefs_by_level: dict[str, tuple[Brief, ...]]
    # Kelly İtalyanca listesi (5.348 kelime) CEFRLex ailesinden (14k+)
    # çok daha seyrek -- "gatto", "cucina", "sedia" gibi bariz A1
    # kelimeleri bile eksik. Aynı off-list eşiğini uygulamak listenin
    # seyrekliğini metnin kalitesizliği gibi göstermek olurdu. Varsayılan
    # None ise modül-seviyesi MAX_OFF_LIST_RATIO kullanılır.
    off_list_ratio_override: float | None = None
    # Çince'de boşluk kelime sınırı DEĞİL (bkz. araştırma raporu §2.1) --
    # "cümle uzunluğu kelime sayısı" ölçümü whitespace `.split()` ile
    # anlamsız (tüm cümle TEK "kelime" sayılır). Bu bayrak True olduğunda
    # check_story spaCy'nin KENDİ token'larını sayıyor (pkuseg zaten
    # segmentasyonu yapmış oluyor) -- diğer diller geriye dönük ETKİLENMİYOR.
    use_token_count: bool = False
    # spaCy'nin resmi Türkçe pipeline'ı yok (yalnızca tokenizer) -- bu
    # bayrak True olduğunda `spacy_model` alanı Stanza dil koduna
    # (ör. "tr") dönüşüyor ve nlp `spacy.load()` yerine
    # `StanzaNlpAdapter` ile kuruluyor.
    use_stanza: bool = False
    # Arapça için CAMeL Tools -- spaCy'nin resmi bir Arapça pipeline'ı
    # (POS+lemma) yok, yalnızca tokenizer var (bkz. araştırma raporu §2.2).
    use_camel: bool = False
    # Japonca'da て-form iki basit eylemi doğal olarak TEK cümlede
    # birleştiriyor (bkz. prompt §3) -- bu, kelime SAYISI olarak diğer
    # dillerin A1 eşiğinden daha uzun ama yapısal olarak hâlâ A1 basit bir
    # cümle. Global eşiği gevşetmek yerine (diğer 6 dilin kalibrasyonunu
    # bozardı) yalnızca bu dile özel bir üst-yazma.
    threshold_overrides: dict[str, dict[str, float]] = field(default_factory=dict)

    def thresholds_for(self, level: str) -> dict[str, float]:
        base = dict(LEVEL_THRESHOLDS[level])
        base.update(self.threshold_overrides.get(level, {}))
        return base

    def prompt_path(self, level: str) -> Path:
        return PIPELINE_ROOT / "prompts" / f"generate_story_{level.lower()}_{self.code}.md"


FR_A1_BRIEFS: tuple[Brief, ...] = (
    Brief("le-chat-perdu", "Une fille cherche son chat dans le quartier et rencontre ses voisins."),
    Brief("le-marche-du-samedi", "Un garçon va au marché avec sa grand-mère et apprend à choisir des fruits."),
    Brief("la-lettre-de-mon-ami", "Un garçon reçoit une lettre d'un ami qui habite dans une autre ville."),
    Brief("un-jour-de-pluie", "Une famille passe une journée de pluie à la maison, à jouer et cuisiner."),
    Brief("le-premier-jour-de-travail", "Une jeune femme commence son premier jour de travail dans une petite boulangerie."),
    Brief("la-fete-de-maman", "Deux enfants préparent une fête surprise pour l'anniversaire de leur mère."),
    Brief("le-nouveau-chien", "Un garçon convainc ses parents d'adopter un chien du refuge."),
    Brief("le-voyage-en-train", "Une fille voyage seule en train pour la première fois pour voir sa tante."),
    Brief("le-cours-de-cuisine", "Un groupe d'amis suit un cours de cuisine et tout se passe mal."),
    Brief("le-jardin-de-l-ecole", "Les enfants d'une petite école plantent un jardin de légumes."),
)

ES_A1_BRIEFS: tuple[Brief, ...] = (
    Brief("el-gato-perdido", "Una niña busca a su gato por el barrio y conoce a sus vecinos."),
    Brief("el-mercado-el-sabado", "Un niño va al mercado con su abuela y aprende a elegir fruta fresca."),
    Brief("la-carta-de-mi-amigo", "Un chico recibe una carta de un amigo que vive en otra ciudad."),
    Brief("un-dia-de-lluvia", "Una familia pasa un día de lluvia en casa jugando y cocinando juntos."),
    Brief("el-primer-dia-de-trabajo", "Una joven empieza su primer día de trabajo en una panadería pequeña."),
    Brief("el-cumpleanos-de-mama", "Dos hermanos preparan una fiesta sorpresa para el cumpleaños de su madre."),
    Brief("el-perro-nuevo", "Un niño convence a sus padres de adoptar un perro del refugio."),
    Brief("el-viaje-en-tren", "Una chica viaja sola en tren por primera vez para visitar a su tía."),
    Brief("la-clase-de-cocina", "Un grupo de amigos toma una clase de cocina y todo sale mal."),
    Brief("el-jardin-de-la-escuela", "Los niños de una escuela pequeña plantan un jardín de verduras."),
    Brief("una-noche-sin-luz", "Una familia pasa la noche sin electricidad y cuenta historias con velas."),
)

ES_A2_BRIEFS: tuple[Brief, ...] = (
    Brief("el-concurso-de-dibujo", "Una niña participa en un concurso de dibujo escolar y duda de su talento."),
    Brief("el-vecino-misterioso", "Dos amigos investigan por qué su nuevo vecino nunca sale de casa de día."),
    Brief("las-vacaciones-canceladas", "Una familia debe cambiar sus planes de vacaciones a última hora."),
    Brief("el-equipo-de-futbol", "Un chico tímido se une a un equipo de fútbol nuevo en su ciudad."),
    Brief("la-receta-de-la-abuela", "Una joven intenta recrear la receta secreta de su abuela fallecida."),
    Brief("el-examen-importante", "Un estudiante se prepara para un examen mientras ayuda a su hermano menor."),
    Brief("la-tienda-que-cierra", "Los vecinos de un barrio intentan salvar una tienda familiar antigua."),
    Brief("el-festival-del-pueblo", "Dos amigas organizan la música para el festival anual de su pueblo."),
    Brief("una-mudanza-dificil", "Una familia se muda a una ciudad nueva y un niño extraña a sus amigos."),
    Brief("el-perro-que-desaparece", "Un veterinario joven investiga por qué varios perros del barrio desaparecen."),
)

FR_A2_BRIEFS: tuple[Brief, ...] = (
    Brief("le-concours-de-dessin", "Une fille participe à un concours de dessin scolaire et doute de son talent."),
    Brief("le-voisin-mysterieux", "Deux amis se demandent pourquoi leur nouveau voisin ne sort jamais le jour."),
    Brief("les-vacances-annulees", "Une famille doit changer ses projets de vacances à la dernière minute."),
    Brief("l-equipe-de-football", "Un garçon timide rejoint une nouvelle équipe de football dans sa ville."),
    Brief("la-recette-de-grand-mere", "Une jeune femme essaie de retrouver la recette secrète de sa grand-mère."),
    Brief("l-examen-important", "Un étudiant se prépare pour un examen tout en aidant son petit frère."),
    Brief("le-magasin-qui-ferme", "Les voisins d'un quartier essaient de sauver une vieille boutique familiale."),
    Brief("le-festival-du-village", "Deux amies organisent la musique du festival annuel de leur village."),
    Brief("un-demenagement-difficile", "Une famille déménage dans une nouvelle ville et un enfant regrette ses amis."),
    Brief("le-chien-qui-disparait", "Une jeune vétérinaire cherche pourquoi plusieurs chiens du quartier disparaissent."),
)

DE_A2_BRIEFS: tuple[Brief, ...] = (
    Brief("der-malwettbewerb", "Ein Mädchen nimmt an einem Schul-Malwettbewerb teil und zweifelt an ihrem Talent."),
    Brief("der-geheimnisvolle-nachbar", "Zwei Freunde fragen sich, warum ihr neuer Nachbar tagsüber nie herauskommt."),
    Brief("der-abgesagte-urlaub", "Eine Familie muss ihre Urlaubspläne in letzter Minute ändern."),
    Brief("die-fussballmannschaft", "Ein schüchterner Junge tritt einer neuen Fußballmannschaft in seiner Stadt bei."),
    Brief("omas-geheimrezept", "Eine junge Frau versucht, das geheime Rezept ihrer verstorbenen Oma nachzukochen."),
    Brief("die-wichtige-pruefung", "Ein Student lernt für eine wichtige Prüfung und hilft dabei seinem kleinen Bruder."),
    Brief("der-laden-schliesst", "Nachbarn in einem Viertel versuchen, einen alten Familienladen zu retten."),
    Brief("das-dorffest", "Zwei Freundinnen organisieren die Musik für das jährliche Dorffest."),
    Brief("ein-schwieriger-umzug", "Eine Familie zieht in eine neue Stadt und ein Kind vermisst seine Freunde."),
    Brief("der-verschwundene-hund", "Eine junge Tierärztin untersucht, warum mehrere Hunde im Viertel verschwinden."),
)

ES_B1_BRIEFS: tuple[Brief, ...] = (
    Brief("la-herencia-inesperada", "Una mujer hereda la casa de su abuela y descubre una carta que cambia lo que sabía de su familia."),
    Brief("el-socio-desconfiado", "Dos amigos abren un pequeño restaurante juntos, pero uno empieza a sospechar que el otro le esconde algo."),
    Brief("la-promesa-rota", "Un padre prometió a su hija llevarla a ver el mar, pero un problema de dinero pone todo en riesgo."),
    Brief("el-testigo-silencioso", "Un adolescente ve algo extraño en su edificio y debe decidir si hablar o quedarse callado."),
    Brief("la-carta-sin-enviar", "Una mujer encuentra una carta que su madre nunca envió y decide terminar lo que ella empezó."),
    Brief("el-prestamo-familiar", "Dos hermanos discuten sobre un préstamo que uno le pidió al otro hace años."),
    Brief("la-mudanza-al-pueblo", "Una familia se muda a un pueblo pequeño y debe ganarse la confianza de vecinos desconfiados."),
    Brief("el-empleo-perdido", "Un hombre pierde su trabajo y debe decidir si acepta una oferta que lo alejaría de su familia."),
    Brief("la-competencia-injusta", "Una joven descubre que un competidor hizo trampa en un concurso importante para ella."),
    Brief("el-regreso-del-hermano", "Un hermano que se fue hace años regresa al pueblo, y su familia no sabe si perdonarlo."),
)

FR_B1_BRIEFS: tuple[Brief, ...] = (
    Brief("l-heritage-inattendu", "Une femme hérite de la maison de sa grand-mère et découvre une lettre qui change ce qu'elle savait de sa famille."),
    Brief("l-associe-mefiant", "Deux amis ouvrent un petit restaurant ensemble, mais l'un commence à soupçonner que l'autre lui cache quelque chose."),
    Brief("la-promesse-brisee", "Un père avait promis à sa fille de l'emmener voir la mer, mais un problème d'argent met tout en danger."),
    Brief("le-temoin-silencieux", "Un adolescent voit quelque chose d'étrange dans son immeuble et doit décider s'il parle ou se tait."),
    Brief("la-lettre-jamais-envoyee", "Une femme trouve une lettre que sa mère n'a jamais envoyée et décide de terminer ce qu'elle avait commencé."),
    Brief("le-pret-familial", "Deux frères se disputent au sujet d'un prêt que l'un avait demandé à l'autre il y a des années."),
    Brief("le-demenagement-au-village", "Une famille déménage dans un petit village et doit gagner la confiance de voisins méfiants."),
    Brief("l-emploi-perdu", "Un homme perd son travail et doit décider s'il accepte une offre qui l'éloignerait de sa famille."),
    Brief("la-concurrence-deloyale", "Une jeune femme découvre qu'un concurrent a triché lors d'un concours important pour elle."),
    Brief("le-retour-du-frere", "Un frère parti depuis des années revient au village, et sa famille ne sait pas si elle doit lui pardonner."),
)

DE_B1_BRIEFS: tuple[Brief, ...] = (
    Brief("das-unerwartete-erbe", "Eine Frau erbt das Haus ihrer Großmutter und findet einen Brief, der alles verändert, was sie über ihre Familie wusste."),
    Brief("der-misstrauische-partner", "Zwei Freunde eröffnen zusammen ein kleines Restaurant, aber einer beginnt zu vermuten, dass der andere etwas verheimlicht."),
    Brief("das-gebrochene-versprechen", "Ein Vater hatte seiner Tochter versprochen, sie ans Meer zu bringen, aber ein Geldproblem gefährdet alles."),
    Brief("der-stille-zeuge", "Ein Jugendlicher sieht etwas Seltsames in seinem Gebäude und muss entscheiden, ob er spricht oder schweigt."),
    Brief("der-unversandte-brief", "Eine Frau findet einen Brief, den ihre Mutter nie abgeschickt hat, und beschließt, zu beenden, was sie begonnen hatte."),
    Brief("der-familienkredit", "Zwei Brüder streiten über einen Kredit, den einer dem anderen vor Jahren gegeben hat."),
    Brief("der-umzug-ins-dorf", "Eine Familie zieht in ein kleines Dorf und muss das Vertrauen misstrauischer Nachbarn gewinnen."),
    Brief("der-verlorene-job", "Ein Mann verliert seine Arbeit und muss entscheiden, ob er ein Angebot annimmt, das ihn von seiner Familie entfernen würde."),
    Brief("der-unfaire-wettbewerb", "Eine junge Frau entdeckt, dass ein Konkurrent bei einem für sie wichtigen Wettbewerb betrogen hat."),
    Brief("die-rueckkehr-des-bruders", "Ein Bruder, der vor Jahren gegangen ist, kehrt ins Dorf zurück, und seine Familie weiß nicht, ob sie ihm vergeben soll."),
)

DE_A1_BRIEFS: tuple[Brief, ...] = (
    Brief("die-verlorene-katze", "Ein Mädchen sucht ihre Katze im Viertel und trifft ihre Nachbarn."),
    Brief("der-samstagsmarkt", "Ein Junge geht mit seiner Oma auf den Markt und lernt frisches Obst auszuwählen."),
    Brief("der-brief-von-meinem-freund", "Ein Junge bekommt einen Brief von einem Freund, der in einer anderen Stadt wohnt."),
    Brief("ein-regnerischer-tag", "Eine Familie verbringt einen Regentag zu Hause mit Spielen und Kochen."),
    Brief("der-erste-arbeitstag", "Eine junge Frau beginnt ihren ersten Arbeitstag in einer kleinen Bäckerei."),
    Brief("mamas-geburtstagsfeier", "Zwei Geschwister planen eine Überraschungsparty für den Geburtstag ihrer Mutter."),
    Brief("der-neue-hund", "Ein Junge überzeugt seine Eltern, einen Hund aus dem Tierheim zu adoptieren."),
    Brief("die-zugfahrt", "Ein Mädchen fährt zum ersten Mal allein mit dem Zug, um ihre Tante zu besuchen."),
    Brief("der-kochkurs", "Eine Gruppe Freunde macht einen Kochkurs und alles geht schief."),
    Brief("der-schulgarten", "Die Kinder einer kleinen Schule pflanzen einen Gemüsegarten."),
)

IT_A1_BRIEFS: tuple[Brief, ...] = (
    Brief("il-gatto-perduto", "Una bambina cerca il suo gatto nel quartiere e conosce i vicini."),
    Brief("il-mercato-del-sabato", "Un bambino va al mercato con la nonna e impara a scegliere la frutta fresca."),
    Brief("la-lettera-del-mio-amico", "Un ragazzo riceve una lettera da un amico che vive in un'altra città."),
    Brief("un-giorno-di-pioggia", "Una famiglia passa una giornata di pioggia in casa giocando e cucinando."),
    Brief("il-primo-giorno-di-lavoro", "Una giovane donna inizia il suo primo giorno di lavoro in una piccola panetteria."),
    Brief("la-festa-della-mamma", "Due fratelli preparano una festa a sorpresa per il compleanno della madre."),
    Brief("il-nuovo-cane", "Un bambino convince i genitori ad adottare un cane dal rifugio."),
    Brief("il-viaggio-in-treno", "Una ragazza viaggia da sola in treno per la prima volta per vedere la zia."),
    Brief("il-corso-di-cucina", "Un gruppo di amici segue un corso di cucina e tutto va storto."),
    Brief("il-giardino-della-scuola", "I bambini di una piccola scuola piantano un orto di verdure."),
)

IT_A2_BRIEFS: tuple[Brief, ...] = (
    Brief("il-concorso-di-disegno", "Una bambina partecipa a un concorso di disegno scolastico e dubita del suo talento."),
    Brief("il-vicino-misterioso", "Due amici si chiedono perché il loro nuovo vicino non esce mai di giorno."),
    Brief("le-vacanze-annullate", "Una famiglia deve cambiare i piani delle vacanze all'ultimo momento."),
    Brief("la-squadra-di-calcio", "Un ragazzo timido si unisce a una nuova squadra di calcio nella sua città."),
    Brief("la-ricetta-della-nonna", "Una giovane donna cerca di ricreare la ricetta segreta della nonna scomparsa."),
    Brief("l-esame-importante", "Uno studente si prepara per un esame importante mentre aiuta il fratello minore."),
    Brief("il-negozio-che-chiude", "I vicini di un quartiere cercano di salvare un vecchio negozio di famiglia."),
    Brief("la-festa-del-paese", "Due amiche organizzano la musica per la festa annuale del loro paese."),
    Brief("un-trasloco-difficile", "Una famiglia si trasferisce in una nuova città e un bambino sente la mancanza degli amici."),
    Brief("il-cane-che-scompare", "Una giovane veterinaria indaga sul perché diversi cani del quartiere scompaiono."),
)

RU_A1_BRIEFS: tuple[Brief, ...] = (
    Brief("propavshaya-koshka", "Девочка ищет свою кошку в районе и знакомится с соседями."),
    Brief("subbotniy-rynok", "Мальчик идёт на рынок с бабушкой и учится выбирать свежие фрукты."),
    Brief("pismo-ot-druga", "Мальчик получает письмо от друга, который живёт в другом городе."),
    Brief("dozhdlivyy-den", "Семья проводит дождливый день дома, играет и готовит еду."),
    Brief("pervyy-den-na-rabote", "Молодая женщина начинает первый день работы в маленькой пекарне."),
    Brief("den-rozhdeniya-mamy", "Два брата готовят сюрприз-праздник на день рождения мамы."),
    Brief("novaya-sobaka", "Мальчик убеждает родителей взять собаку из приюта."),
    Brief("poezdka-na-poezde", "Девочка первый раз едет одна на поезде к своей тёте."),
    Brief("urok-kulinarii", "Группа друзей идёт на урок кулинарии, и всё идёт не так."),
    Brief("shkolnyy-sad", "Дети маленькой школы сажают овощной сад."),
)

RU_A2_BRIEFS: tuple[Brief, ...] = (
    Brief("konkurs-risunkov", "Девочка участвует в школьном конкурсе рисунков и сомневается в своём таланте."),
    Brief("zagadochnyy-sosed", "Два друга думают, почему их новый сосед никогда не выходит днём."),
    Brief("otmenennyy-otpusk", "Семья должна изменить планы на отпуск в последнюю минуту."),
    Brief("futbolnaya-komanda", "Застенчивый мальчик присоединяется к новой футбольной команде в своём городе."),
    Brief("recept-babushki", "Молодая женщина пытается повторить секретный рецепт своей покойной бабушки."),
    Brief("vazhnyy-ekzamen", "Студент готовится к важному экзамену и помогает младшему брату."),
    Brief("magazin-kotoryy-zakryvaetsya", "Соседи района пытаются спасти старый семейный магазин."),
    Brief("prazdnik-derevni", "Две подруги организуют музыку для ежегодного праздника деревни."),
    Brief("trudnyy-pereezd", "Семья переезжает в новый город, и ребёнок скучает по друзьям."),
    Brief("propavshaya-sobaka", "Молодой ветеринар выясняет, почему несколько собак в районе пропадают."),
)

IT_B1_BRIEFS: tuple[Brief, ...] = (
    Brief("l-eredita-inaspettata", "Una donna eredita la casa della nonna e trova una lettera che cambia ciò che sapeva della sua famiglia."),
    Brief("il-socio-diffidente", "Due amici aprono insieme un piccolo ristorante, ma uno inizia a sospettare che l'altro gli nasconda qualcosa."),
    Brief("la-promessa-infranta", "Un padre aveva promesso alla figlia di portarla al mare, ma un problema di soldi mette tutto a rischio."),
    Brief("il-testimone-silenzioso", "Un adolescente vede qualcosa di strano nel suo palazzo e deve decidere se parlare o tacere."),
    Brief("la-lettera-mai-spedita", "Una donna trova una lettera che sua madre non ha mai spedito e decide di finire ciò che aveva iniziato."),
    Brief("il-prestito-in-famiglia", "Due fratelli litigano per un prestito che uno aveva chiesto all'altro anni prima."),
    Brief("il-trasferimento-al-paese", "Una famiglia si trasferisce in un piccolo paese e deve guadagnarsi la fiducia di vicini diffidenti."),
    Brief("il-lavoro-perduto", "Un uomo perde il lavoro e deve decidere se accettare un'offerta che lo allontanerebbe dalla famiglia."),
    Brief("la-gara-scorretta", "Una giovane donna scopre che un concorrente ha barato in una gara importante per lei."),
    Brief("il-ritorno-del-fratello", "Un fratello partito anni prima torna al paese, e la sua famiglia non sa se perdonarlo."),
)

RU_B1_BRIEFS: tuple[Brief, ...] = (
    Brief("neozhidannoe-nasledstvo", "Женщина получает в наследство дом бабушки и находит письмо, которое меняет всё, что она знала о семье."),
    Brief("nedoverchivyy-partner", "Два друга открывают вместе маленький ресторан, но один начинает подозревать, что другой что-то скрывает."),
    Brief("narushennoe-obeshchanie", "Отец обещал дочери отвезти её к морю, но проблема с деньгами ставит всё под угрозу."),
    Brief("molchalivyy-svidetel", "Подросток видит что-то странное в своём доме и должен решить, говорить или молчать."),
    Brief("neotpravlennoe-pismo", "Женщина находит письмо, которое её мать так и не отправила, и решает закончить начатое."),
    Brief("semeynyy-dolg", "Два брата спорят из-за долга, который один взял у другого много лет назад."),
    Brief("pereezd-v-derevnyu", "Семья переезжает в маленькую деревню и должна заслужить доверие недоверчивых соседей."),
    Brief("poteryannaya-rabota", "Мужчина теряет работу и должен решить, принять ли предложение, которое отдалит его от семьи."),
    Brief("nechestnoe-sorevnovanie", "Молодая женщина узнаёт, что соперник обманул на важном для неё соревновании."),
    Brief("vozvrashchenie-brata", "Брат, уехавший много лет назад, возвращается в деревню, и семья не знает, простить ли его."),
)

ZH_A1_BRIEFS: tuple[Brief, ...] = (
    Brief("zoule-de-mao", "一个小女孩在小区里找她的猫，认识了邻居。"),
    Brief("xingqiliu-de-shichang", "一个男孩和奶奶去市场，学习怎么选新鲜的水果。"),
    Brief("pengyou-de-xin", "一个男孩收到住在别的城市的朋友的信。"),
    Brief("xiayu-de-yitian", "一家人在下雨天在家玩游戏，一起做饭。"),
    Brief("di-yi-tian-shangban", "一个年轻女人在一家小面包店开始第一天上班。"),
    Brief("mama-de-shengri", "两个兄弟为妈妈的生日准备一个惊喜派对。"),
    Brief("xin-de-gou", "一个男孩说服父母从收容所领养一只狗。"),
    Brief("huoche-lvxing", "一个女孩第一次一个人坐火车去看阿姨。"),
    Brief("zuofan-ke", "一群朋友去上做饭课，可是一切都出错了。"),
    Brief("xuexiao-de-huayuan", "一所小学校的孩子们种了一个菜园。"),
)

ZH_A2_BRIEFS: tuple[Brief, ...] = (
    Brief("huihua-bisai", "一个女孩参加学校的画画比赛，怀疑自己的才能。"),
    Brief("shenmi-de-linju", "两个朋友想知道为什么新邻居白天从不出门。"),
    Brief("qxiao-de-jiaqi", "一家人最后一分钟必须改变假期计划。"),
    Brief("zuqiu-dui", "一个害羞的男孩加入了他所在城市的新足球队。"),
    Brief("nainai-de-shipu", "一个年轻女人想重新做出已故奶奶的秘密食谱。"),
    Brief("zhongyao-de-kaoshi", "一个学生准备重要的考试，同时帮助弟弟。"),
    Brief("guanmen-de-shangdian", "一个社区的邻居们想办法救一家老家庭商店。"),
    Brief("cunzhuang-jie", "两个朋友为村里每年的节日安排音乐。"),
    Brief("kunnan-de-banjia", "一家人搬到新城市，一个孩子想念朋友。"),
    Brief("shizong-de-gou", "一个年轻的兽医调查为什么社区里的几只狗不见了。"),
)

ZH_B1_BRIEFS: tuple[Brief, ...] = (
    Brief("yiwai-de-yichan", "一个女人继承了奶奶的房子，发现一封改变她对家人看法的信。"),
    Brief("duoyi-de-hehuoren", "两个朋友一起开了一家小餐馆，但一个人开始怀疑另一个人隐瞒了什么。"),
    Brief("shixin-de-chengnuo", "一位父亲答应带女儿去看海，但钱的问题让一切变得危险。"),
    Brief("chenmo-de-mujizhe", "一个青少年在自己的楼里看到奇怪的事情，必须决定说还是不说。"),
    Brief("weijichu-de-xin", "一个女人发现母亲从未寄出的信，决定完成母亲未完成的事。"),
    Brief("jiating-de-jiekuan", "两兄弟为多年前一个人向另一个人借的钱而争吵。"),
    Brief("banjia-dao-cunzhuang", "一家人搬到一个小村庄，必须赢得多疑邻居的信任。"),
    Brief("shiqu-de-gongzuo", "一个男人失去了工作，必须决定是否接受一个会让他远离家人的工作。"),
    Brief("bugongping-de-bisai", "一个年轻女人发现对手在对她很重要的比赛中作弊。"),
    Brief("gege-de-guilai", "多年前离开的哥哥回到村庄，家人不知道是否该原谅他。"),
)

JA_A1_BRIEFS: tuple[Brief, ...] = (
    Brief("neko-ga-inaku-natta", "女の子が近所で猫を探して、隣の人たちに会います。"),
    Brief("doyoubi-no-ichiba", "男の子がおばあさんと市場に行って、新しい果物の選び方を習います。"),
    Brief("tomodachi-no-tegami", "男の子が別の町に住む友達から手紙をもらいます。"),
    Brief("ame-no-hi", "家族が雨の日に家で遊んだり料理をしたりします。"),
    Brief("hajimete-no-shigoto", "若い女の人が小さいパン屋で初めての仕事の日を迎えます。"),
    Brief("okaasan-no-tanjoubi", "兄弟がお母さんの誕生日にサプライズパーティーを準備します。"),
    Brief("atarashii-inu", "男の子が保護施設から犬をもらうように両親を説得します。"),
    Brief("densha-no-tabi", "女の子が初めて一人で電車に乗っておばさんに会いに行きます。"),
    Brief("ryouri-kyoushitsu", "友達のグループが料理教室に行って、いろいろ失敗します。"),
    Brief("gakkou-no-niwa", "小さい学校の子供たちが野菜の庭を作ります。"),
)

JA_A2_BRIEFS: tuple[Brief, ...] = (
    Brief("e-no-taikai", "女の子が学校の絵のコンテストに参加して、自分の才能を疑います。"),
    Brief("nazo-no-tonari", "二人の友達が新しい隣人がなぜ昼間に一度も出てこないのか考えます。"),
    Brief("chuushi-ni-natta-kyuka", "家族が最後の瞬間に休暇の計画を変えなければなりません。"),
    Brief("sakkaa-chiimu", "内気な男の子が自分の町の新しいサッカーチームに入ります。"),
    Brief("obaachan-no-reshipi", "若い女性が亡くなったおばあちゃんの秘密のレシピを再現しようとします。"),
    Brief("taisetsuna-shiken", "学生が大切な試験の準備をしながら弟を手伝います。"),
    Brief("shimaru-mise", "近所の人たちが古い家族の店を救おうとします。"),
    Brief("mura-no-matsuri", "二人の友達が村の毎年のお祭りの音楽を準備します。"),
    Brief("taihenna-hikkoshi", "家族が新しい町に引っ越して、子供が友達を恋しく思います。"),
    Brief("kieta-inu", "若い獣医が近所の何匹かの犬がなぜいなくなるのか調べます。"),
)

JA_B1_BRIEFS: tuple[Brief, ...] = (
    Brief("yoki-shinai-isan", "女性がおばあちゃんの家を相続して、家族について知っていたことを変える手紙を見つけます。"),
    Brief("utagaibukai-aite", "二人の友達が一緒に小さいレストランを始めますが、一人がもう一人が何かを隠していると疑い始めます。"),
    Brief("yaburareta-yakusoku", "父親が娘を海に連れて行くと約束しましたが、お金の問題ですべてが危うくなります。"),
    Brief("damatta-mokugekisha", "十代の若者が自分のアパートで奇妙なことを見て、話すか黙るか決めなければなりません。"),
    Brief("dasarenakatta-tegami", "女性が母親が一度も送らなかった手紙を見つけて、始めたことを終わらせることにします。"),
    Brief("kazoku-no-shakkin", "二人の兄弟が何年も前に一人がもう一人に貸したお金についてけんかします。"),
    Brief("mura-eno-hikkoshi", "家族が小さい村に引っ越して、疑い深い隣人の信頼を得なければなりません。"),
    Brief("ushinawareta-shigoto", "男性が仕事を失い、家族から離れることになる仕事を受けるかどうか決めなければなりません。"),
    Brief("fukouheina-kyousou", "若い女性が自分にとって大切な大会で相手がずるをしたことを知ります。"),
    Brief("kikoku-shita-ani", "何年も前に去った兄が村に戻ってきて、家族は許すべきかどうかわかりません。"),
)

TR_A1_BRIEFS: tuple[Brief, ...] = (
    Brief("kayip-kedi", "Küçük bir kız mahallesinde kedisini arıyor ve komşularla tanışıyor."),
    Brief("cumartesi-pazari", "Bir çocuk büyükannesiyle pazara gidiyor ve taze meyve seçmeyi öğreniyor."),
    Brief("arkadasimin-mektubu", "Bir çocuk başka bir şehirde yaşayan arkadaşından mektup alıyor."),
    Brief("yagmurlu-gun", "Bir aile yağmurlu bir günü evde oyun oynayarak ve yemek yaparak geçiriyor."),
    Brief("ilk-is-gunu", "Genç bir kadın küçük bir fırında ilk iş gününe başlıyor."),
    Brief("annemin-dogum-gunu", "İki kardeş annelerinin doğum günü için sürpriz parti hazırlıyor."),
    Brief("yeni-kopek", "Bir çocuk ailesini barınaktan bir köpek almaya ikna ediyor."),
    Brief("tren-yolculugu", "Bir kız ilk kez tek başına trenle teyzesini görmeye gidiyor."),
    Brief("yemek-kursu", "Bir grup arkadaş yemek kursuna gidiyor ve her şey ters gidiyor."),
    Brief("okul-bahcesi", "Küçük bir okulun çocukları bir sebze bahçesi ekiyor."),
)

TR_A2_BRIEFS: tuple[Brief, ...] = (
    Brief("resim-yarismasi", "Bir kız okulun resim yarışmasına katılıyor ve yeteneğinden şüphe ediyor."),
    Brief("gizemli-komsu", "İki arkadaş yeni komşularının neden gündüz hiç dışarı çıkmadığını merak ediyor."),
    Brief("iptal-edilen-tatil", "Bir aile son dakikada tatil planlarını değiştirmek zorunda kalıyor."),
    Brief("futbol-takimi", "Utangaç bir çocuk şehrindeki yeni bir futbol takımına katılıyor."),
    Brief("babaannemin-tarifi", "Genç bir kadın vefat eden babaannesinin gizli tarifini yeniden yapmaya çalışıyor."),
    Brief("onemli-sinav", "Bir öğrenci önemli bir sınava hazırlanırken küçük kardeşine yardım ediyor."),
    Brief("kapanan-dukkan", "Bir mahallenin komşuları eski bir aile dükkanını kurtarmaya çalışıyor."),
    Brief("koy-festivali", "İki arkadaş köylerinin yıllık festivali için müziği organize ediyor."),
    Brief("zor-tasinma", "Bir aile yeni bir şehre taşınıyor ve bir çocuk arkadaşlarını özlüyor."),
    Brief("kaybolan-kopek", "Genç bir veteriner mahalledeki birkaç köpeğin neden kaybolduğunu araştırıyor."),
)

TR_B1_BRIEFS: tuple[Brief, ...] = (
    Brief("beklenmedik-miras", "Bir kadın büyükannesinin evine varis oluyor ve ailesi hakkında bildiklerini değiştiren bir mektup buluyor."),
    Brief("guvensiz-ortak", "İki arkadaş birlikte küçük bir restoran açıyor ama biri diğerinin bir şey sakladığından şüpheleniyor."),
    Brief("bozulan-soz", "Bir baba kızına onu denize götüreceğine söz vermişti ama bir para sorunu her şeyi tehlikeye atıyor."),
    Brief("sessiz-tanik", "Bir genç, binasında garip bir şey görüyor ve konuşup konuşmayacağına karar vermek zorunda kalıyor."),
    Brief("gonderilmeyen-mektup", "Bir kadın annesinin hiç göndermediği bir mektup buluyor ve başladığı işi bitirmeye karar veriyor."),
    Brief("aile-borcu", "İki kardeş yıllar önce birinin diğerinden aldığı bir borç yüzünden tartışıyor."),
    Brief("koye-tasinma", "Bir aile küçük bir köye taşınıyor ve şüpheci komşuların güvenini kazanmak zorunda kalıyor."),
    Brief("kaybedilen-is", "Bir adam işini kaybediyor ve onu ailesinden uzaklaştıracak bir teklifi kabul edip etmeyeceğine karar vermek zorunda."),
    Brief("haksiz-yarisma", "Genç bir kadın kendisi için önemli bir yarışmada bir rakibinin hile yaptığını öğreniyor."),
    Brief("kardesinin-donusu", "Yıllar önce ayrılan bir kardeş köye geri dönüyor ve ailesi onu affedip affetmeyeceğini bilmiyor."),
)

AR_A1_BRIEFS: tuple[Brief, ...] = (
    Brief("alqitta-aldaiaa", "فتاة صغيرة تبحث عن قطتها في الحي وتتعرف على الجيران."),
    Brief("suq-alsabt", "ولد يذهب مع جدته إلى السوق ويتعلم كيف يختار فاكهة طازجة."),
    Brief("risalat-sadiqi", "ولد يستلم رسالة من صديق يعيش في مدينة أخرى."),
    Brief("yawm-mumtir", "عائلة تقضي يوماً ممطراً في البيت تلعب وتطبخ معاً."),
    Brief("awwal-yawm-fi-alamal", "امرأة شابة تبدأ أول يوم عمل لها في مخبز صغير."),
    Brief("eid-milad-alumm", "أخوان يحضران حفلة مفاجئة لعيد ميلاد أمهما."),
    Brief("alkalb-aljadid", "ولد يقنع والديه بتبني كلب من الملجأ."),
    Brief("rihlat-alqitar", "فتاة تسافر بالقطار وحدها لأول مرة لزيارة خالتها."),
    Brief("dars-altabkh", "مجموعة أصدقاء يذهبون إلى درس طبخ ويحدث كل شيء خطأ."),
    Brief("hadiqat-almadrasa", "أطفال مدرسة صغيرة يزرعون حديقة خضروات."),
)

AR_A2_BRIEFS: tuple[Brief, ...] = (
    Brief("musabaqat-alrasm", "فتاة تشارك في مسابقة رسم في المدرسة وتشك في موهبتها."),
    Brief("aljar-alghamid", "صديقان يتساءلان لماذا لا يخرج جارهما الجديد أبداً في النهار."),
    Brief("alujaza-almulghaa", "عائلة يجب أن تغير خطط عطلتها في اللحظة الأخيرة."),
    Brief("fariq-kurat-alqadam", "ولد خجول ينضم إلى فريق كرة قدم جديد في مدينته."),
    Brief("wasfat-aljadda", "امرأة شابة تحاول إعادة صنع وصفة جدتها المتوفاة السرية."),
    Brief("alimtihan-almuhim", "طالب يستعد لامتحان مهم بينما يساعد أخاه الصغير."),
    Brief("almahal-alladhi-yughliq", "جيران في حي يحاولون إنقاذ متجر عائلي قديم."),
    Brief("mahrajan-alqarya", "صديقتان تنظمان الموسيقى لمهرجان القرية السنوي."),
    Brief("intiqal-saeb", "عائلة تنتقل إلى مدينة جديدة وطفل يشتاق إلى أصدقائه."),
    Brief("alkalb-almafqud", "طبيبة بيطرية شابة تحقق في سبب اختفاء عدة كلاب في الحي."),
    Brief("hadiyat-almafajaa", "ولد يخطط لهدية مفاجئة لأخته الكبرى قبل سفرها."),
)

AR_B1_BRIEFS: tuple[Brief, ...] = (
    Brief("almirath-ghayr-almutawaqqa", "امرأة ترث بيت جدتها وتجد رسالة تغير ما كانت تعرفه عن عائلتها."),
    Brief("alsharik-almurtab", "صديقان يفتحان مطعماً صغيراً معاً لكن أحدهما يبدأ يشك أن الآخر يخفي شيئاً."),
    Brief("alwaed-almaksur", "أب وعد ابنته بأن يأخذها إلى البحر لكن مشكلة مالية تهدد كل شيء."),
    Brief("alshahid-alsamit", "مراهق يرى شيئاً غريباً في مبناه ويجب أن يقرر إن كان سيتكلم أم يصمت."),
    Brief("alrisala-ghayr-almursala", "امرأة تجد رسالة لم ترسلها أمها أبداً وتقرر إنهاء ما بدأته."),
    Brief("dayn-alaila", "أخوان يتشاجران بسبب دين اقترضه أحدهما من الآخر منذ سنوات."),
    Brief("alintiqal-lilqarya", "عائلة تنتقل إلى قرية صغيرة ويجب أن تكسب ثقة جيران متشككين."),
    Brief("alwazifa-almafquda", "رجل يفقد وظيفته ويجب أن يقرر إن كان سيقبل عرضاً سيبعده عن عائلته."),
    Brief("almunafasa-ghayr-alaadila", "امرأة شابة تكتشف أن منافساً غش في مسابقة مهمة بالنسبة لها."),
    Brief("audat-alakh", "أخ غادر منذ سنوات يعود إلى القرية وعائلته لا تعرف إن كانت ستسامحه."),
    Brief("sirr-almuallima", "معلمة تكتشف أن أحد طلابها يخفي مشكلة كبيرة في بيته."),
    Brief("bustan-aljadd", "حفيدة تحاول إنقاذ بستان جدها القديم من البيع."),
)

LANGS: dict[str, LangConfig] = {
    "es": LangConfig(
        code="es",
        spacy_model="es_core_news_sm",
        csv_path=PIPELINE_ROOT / "data" / "elelex-vocabulary-profile-es-1.0.csv",
        title_hint="Spanish",
        # bkz. scripts/generate_stories_es.py'nin orijinal NEDEN notu:
        # ELELex "abuela"yı B1, "mercado"yu B2 koyuyor -- ders kitabı
        # korpusunun kendine özgü dağılımı, kelimenin zorluğu değil.
        supplement=frozenset(
            {"abuela", "abuelastro", "mercado", "tienda", "panadería", "panadero", "vecino", "vecina", "barrio"}
        ),
        briefs_by_level={"A1": ES_A1_BRIEFS, "A2": ES_A2_BRIEFS, "B1": ES_B1_BRIEFS},
    ),
    "fr": LangConfig(
        code="fr",
        spacy_model="fr_core_news_sm",
        csv_path=PIPELINE_ROOT / "data" / "flelex-vocabulary-profile-fr-1.0.csv",
        title_hint="French",
        supplement=frozenset(),
        briefs_by_level={"A1": FR_A1_BRIEFS, "A2": FR_A2_BRIEFS, "B1": FR_B1_BRIEFS},
    ),
    "de": LangConfig(
        code="de",
        spacy_model="de_core_news_sm",
        csv_path=PIPELINE_ROOT / "data" / "daflex-vocabulary-profile-de-1.0.csv",
        title_hint="German",
        # DAFlex'in kaynak korpusu Almanca artikelleri (der/die/das ve
        # hâl ekli formları den/dem/des) çoğunlukla İLGİ ZAMİRİ ("der
        # Mann, DER dort steht") olarak etiketlemiş, TANIMLIK olarak
        # değil -- bu yüzden dönüştürülen listede "der" B1/C2'ye
        # düşüyor, oysa bir A1 hikâyesinde HER cümlede geçen bir kelime.
        # Almanca artikel sistemi kapalı bir sınıf (sonlu sayıda kelime)
        # olduğu için otomatik listeye güvenmek yerine elle eklendi --
        # İspanyolca pilotundaki "abuela" ile aynı kategori sorun.
        supplement=frozenset(
            "der die das den dem des ein eine einen einem einer eines "
            "ich du er sie es wir ihr mich dich ihn uns euch mir dir ihm "
            "und oder aber wenn dass weil nicht kein keine".split()
        ),
        briefs_by_level={"A1": DE_A1_BRIEFS, "A2": DE_A2_BRIEFS, "B1": DE_B1_BRIEFS},
    ),
    "it": LangConfig(
        code="it",
        spacy_model="it_core_news_sm",
        csv_path=PIPELINE_ROOT / "data" / "kelly-vocabulary-profile-it-1.0.csv",
        title_hint="Italian",
        # Kelly İtalyanca listesi (5.348 kelime) CEFRLex ailesinden (14k+)
        # daha seyrek ve eril tanımlığı ("il") hiç içermiyor -- Almanca'daki
        # "der" ile aynı kapalı-sınıf boşluğu.
        supplement=frozenset(
            "il lo gli un uno io tu lui lei noi voi loro mi ti ci vi "
            "e o ma se perché quando gatto cane cucina sedia letto "
            "giardino albero neve pane latte mamma papà sorella fratello "
            "compleanno sorpresa nonno nonna zia zio".split()
        ),
        off_list_ratio_override=20.0,
        briefs_by_level={"A1": IT_A1_BRIEFS, "A2": IT_A2_BRIEFS, "B1": IT_B1_BRIEFS},
    ),
    "ru": LangConfig(
        code="ru",
        spacy_model="ru_core_news_sm",
        csv_path=PIPELINE_ROOT / "data" / "kelly-vocabulary-profile-ru-1.0.csv",
        title_hint="Russian",
        # `ru_core_news_sm`nin lemmatizer'ı diğer Batı Avrupa modellerinden
        # (fr/de/it/es) belirgin şekilde daha zayıf -- "меня"yı "я"ya,
        # "живёт"i "жить"e İNDİRGEMİYOR (test edildi, bkz. oturum notları).
        # Bu, off-list ölçümünün lemma eşleşmesine dayanması yüzünden çok
        # yaygın zamir/fiil YÜZEY formlarının yanlışlıkla off-list
        # sayılmasına yol açıyor -- kelime listesinin eksikliği değil,
        # lemmatizasyonun kendisinin zayıflığı. Kalıcı çözüm `pymorphy3`
        # (zaten kurulu, ru_core_news_sm'nin bağımlılığı) ile ayrı bir
        # morfolojik analiz katmanı eklemek -- bu round'da YAPILMADI,
        # bunun yerine en sık geçen zamir yüzey formları elle eklendi.
        supplement=frozenset(
            "я меня мне мной ты тебя тебе тобой он его ему им она её ей ею "
            "оно мы нас нам нами вы вас вам вами они их им ими "
            "живёт живу живёшь зовут зовёт зовусь есть был была было были "
            "и а но или что это там тут где когда".split()
        ),
        off_list_ratio_override=20.0,
        briefs_by_level={"A1": RU_A1_BRIEFS, "A2": RU_A2_BRIEFS, "B1": RU_B1_BRIEFS},
    ),
    "zh": LangConfig(
        code="zh",
        spacy_model="zh_core_web_sm",
        csv_path=PIPELINE_ROOT / "data" / "kelly-vocabulary-profile-zh-1.0.csv",
        title_hint="Chinese",
        # Kelly zh listesinde POS yok (yalnızca kelime+CEFR); lemma_ da
        # spaCy'nin Çince modelinde boş dönüyor (Çince'de çekim yok) --
        # off-list eşleşmesi doğrudan yüzey formuna dayanıyor. "了" gibi
        # en temel gramer parçacıkları bile listede eksik -- diğer
        # dillerdeki kapalı-sınıf boşluğuyla aynı kategori sorun.
        supplement=frozenset(
            "了 的 是 在 着 和 也 都 不 没 很 太 就 才 一个 这个 那个 "
            "什么 怎么 为什么 因为 所以 但是 可是".split()
        ),
        off_list_ratio_override=20.0,
        use_token_count=True,
        threshold_overrides={"A1": {"max_sentence": 20}, "A2": {"max_sentence": 33}},
        briefs_by_level={"A1": ZH_A1_BRIEFS, "A2": ZH_A2_BRIEFS, "B1": ZH_B1_BRIEFS},
    ),
    "ja": LangConfig(
        code="ja",
        spacy_model="ja_core_news_sm",
        csv_path=PIPELINE_ROOT / "data" / "jlpt-vocabulary-profile-ja-1.0.csv",
        title_hint="Japanese",
        # Japonca da boşluksuz yazılıyor -- Çince ile aynı token-sayma
        # yaklaşımı gerekiyor. En temel parçacıklar (は/が/の/を/に/で vb.)
        # JLPT listesinde YOK (liste içerik kelimelerini hedefliyor,
        # gramer parçacıklarını değil) -- kapalı sınıf ek listesi zorunlu.
        supplement=frozenset(
            "は が の を に で と も から まで へ や し です ます "
            "この その あの どの これ それ あれ どれ".split()
        ),
        off_list_ratio_override=20.0,
        use_token_count=True,
        threshold_overrides={
            "A1": {"max_avg_sentence": 9.0, "max_sentence": 22},
            "A2": {"max_avg_sentence": 13.0, "max_sentence": 32},
            "B1": {"max_avg_sentence": 20.0, "max_sentence": 50},
        },
        briefs_by_level={"A1": JA_A1_BRIEFS, "A2": JA_A2_BRIEFS, "B1": JA_B1_BRIEFS},
    ),
    "tr": LangConfig(
        code="tr",
        spacy_model="tr",  # Stanza dil kodu (bkz. use_stanza)
        csv_path=PIPELINE_ROOT / "data" / "wordfreq-vocabulary-profile-tr-1.0.csv",
        title_hint="Turkish",
        supplement=frozenset(),
        use_stanza=True,
        off_list_ratio_override=20.0,  # wordfreq yaklaşıklığı + agglütinasyon
        # Türkçe sondan eklemeli (agglutinative) -- aynı gramatik karmaşıklık
        # çok daha AZ "kelime" (whitespace token) ile ifade ediliyor
        # ("evimizdekilerden" tek kelime, İngilizce'de 4-5 kelime karşılığı).
        # B1'in global TABANI (13) bu yüzden Türkçe'de neredeyse hiç
        # tutturulamıyor -- test edildi, gramatik olarak zengin B1 metinleri
        # bile 7-12 aralığında kalıyor. Taban dile göre düşürüldü.
        threshold_overrides={"B1": {"min_avg_sentence": 8.0}},
        briefs_by_level={"A1": TR_A1_BRIEFS, "A2": TR_A2_BRIEFS, "B1": TR_B1_BRIEFS},
    ),
    "ar": LangConfig(
        code="ar",
        spacy_model="",  # kullanılmıyor (bkz. use_camel)
        csv_path=PIPELINE_ROOT / "data" / "kelly-vocabulary-profile-ar-1.0.csv",
        title_hint="Arabic",
        supplement=frozenset(
            "لم لا لن ما هل أين متى كيف لماذا هذا هذه ذلك تلك هؤلاء "
            "اسم اسمي اسمها اسمه عمر عمري حي حديقة".split()
        ),
        use_camel=True,
        off_list_ratio_override=25.0,
        briefs_by_level={"A1": AR_A1_BRIEFS, "A2": AR_A2_BRIEFS, "B1": AR_B1_BRIEFS},
    ),
}


def load_vocab(cfg: LangConfig, level: str) -> set[str]:
    """Hedef seviye ve BİR ÜST seviyeye kadar (dahil) kelimeleri döner --
    off-list ölçümü için ceiling. Bir üst seviyeye izin verilmesi
    prompt'un kendi kabul ettiği küçük sapma toleransıyla tutarlı (bkz.
    generate_story_a2.md §1 "a handful of unavoidable topic words")."""
    target_idx = CEFR_ORDER.index(level)
    allowed_levels = {CEFR_ORDER[i].upper() for i in range(target_idx + 2) if i < len(CEFR_ORDER)}
    words: set[str] = set(cfg.supplement)
    with open(cfg.csv_path, encoding="utf-8") as f:
        for row in csv.DictReader(f):
            word = row["headword"]
            if "_" in word or " " in word:
                continue
            if row["CEFR"] in allowed_levels:
                words.add(word)
    return words


def parse_frontmatter(raw: str) -> tuple[dict, str]:
    match = re.match(r"^---\n(.*?)\n---\n(.*)$", raw, re.DOTALL)
    if not match:
        raise ValueError("Frontmatter bulunamadı (--- ... --- bloğu yok)")
    meta = yaml.safe_load(match.group(1))
    body = match.group(2)
    return meta, body


def strip_code_fence(text: str) -> str:
    stripped = text.strip()
    if stripped.startswith("```"):
        stripped = re.sub(r"^```[a-zA-Z]*\n", "", stripped)
        stripped = re.sub(r"\n```$", "", stripped)
    return stripped.strip() + "\n"


@dataclass
class CheckResult:
    ok: bool
    reasons: list[str]
    avg_sentence: float
    off_list_ratio: float
    word_count: int


def check_story(
    body: str,
    nlp,
    vocab_words: set[str],
    thresholds: dict[str, float],
    off_list_ratio_max: float,
    use_token_count: bool = False,
    use_camel: bool = False,
) -> CheckResult:
    reasons: list[str] = []
    doc = nlp(body)
    if use_token_count:
        # Çince: spaCy/pkuseg zaten kelime sınırını segmentasyonla
        # buluyor -- whitespace `.split()` boşluksuz yazıda tüm cümleyi
        # TEK "kelime" sayardı.
        sentence_lengths = [
            sum(1 for t in sent if not t.is_punct) for sent in doc.sents if sent.text.strip()
        ]
    else:
        sentences = [s.text.strip() for s in doc.sents if s.text.strip()]
        sentence_lengths = [len(s.split()) for s in sentences if s.split()]
    avg_sentence = sum(sentence_lengths) / len(sentence_lengths) if sentence_lengths else 0.0
    max_sentence = max(sentence_lengths) if sentence_lengths else 0

    if avg_sentence > thresholds["max_avg_sentence"]:
        reasons.append(f"ort. cümle {avg_sentence:.1f} > {thresholds['max_avg_sentence']}")
    min_avg = thresholds.get("min_avg_sentence")
    if min_avg is not None and avg_sentence < min_avg:
        reasons.append(f"ort. cümle {avg_sentence:.1f} < TABAN {min_avg} (yapısal olarak alt seviye)")
    if max_sentence > thresholds["max_sentence"]:
        reasons.append(f"en uzun cümle {max_sentence} kelime > {thresholds['max_sentence']}")

    if use_token_count:
        word_count = sum(1 for t in doc if not t.is_punct and not t.is_space)
    else:
        word_count = len(_WORD_RE.findall(body))
    # Ad tespiti için frekans tabanlı yedek -- `pipeline/src/profiler.py`nin
    # `build_proper_noun_whitelist()`ıyla AYNI fikir (bir kelime metinde
    # ≥2 kez geçiyorsa muhtemelen özel isimdir). Bu, spaCy'nin küçük Çince
    # modelinin karakter isimlerini (örn. "小美", "丽丽") PROPN olarak
    # ETİKETLEMEDİĞİ (sıradan NOUN sayıyor) durumda gerekiyor -- Batı
    # dillerinde büyük harfle başlama zaten bunu ayırt ediyordu, Çince'de
    # büyük/küçük harf yok, bu yüzden POS etiketine güvenmek yetmiyor.
    surface_counts: dict[str, int] = {}
    for token in doc:
        if token.is_alpha:
            surface_counts[token.text.lower()] = surface_counts.get(token.text.lower(), 0) + 1

    off_list = 0
    off_list_examples: list[str] = []
    for token in doc:
        if not token.is_alpha:
            continue
        lemma = token.lemma_.lower()
        surface = token.text.lower()
        if lemma in vocab_words or surface in vocab_words:
            continue
        if token.pos_.upper() in ("PROPN", "NOUN_PROP"):
            continue
        if use_token_count and len(surface) <= 3 and surface_counts.get(surface, 0) >= 3:
            continue
        if use_camel and len(surface) <= 6 and surface_counts.get(surface, 0) >= 2:
            # Arapça: CAMeL'in disambiguator'ı isimleri güvenilir şekilde
            # noun_prop etiketlemiyor (bkz. oturum notları) -- Çince'deki
            # aynı frekans tabanlı yedek, farklı bir eşikle (Arapça
            # isimler genelde 3-6 harf, tek kelimede 2+ kez geçer).
            continue
        off_list += 1
        if len(off_list_examples) < 15:
            off_list_examples.append(surface)

    alpha_token_count = sum(1 for t in doc if t.is_alpha)
    off_list_ratio = (off_list / alpha_token_count * 100) if alpha_token_count else 0.0

    if off_list_ratio > off_list_ratio_max:
        reasons.append(
            f"off_list_ratio %{off_list_ratio:.1f} > %{off_list_ratio_max} "
            f"(örnek: {', '.join(off_list_examples[:10])})"
        )
    if word_count < thresholds["min_words"]:
        reasons.append(f"kelime sayısı {word_count} < {thresholds['min_words']}")

    return CheckResult(
        ok=not reasons,
        reasons=reasons,
        avg_sentence=avg_sentence,
        off_list_ratio=off_list_ratio,
        word_count=word_count,
    )


def generate_story(
    client: Anthropic, prompt_template: str, brief: Brief, title_hint: str, feedback: str | None
) -> str:
    user_message = f"Premise: {brief.premise}\n\nChoose your own {title_hint} title."
    if feedback:
        user_message += (
            f"\n\nYour previous attempt was REJECTED by the validator for these "
            f"reasons:\n{feedback}\n\nFix these specific issues and write a new "
            f"full version of the story."
        )

    response = client.messages.create(
        model=MODEL,
        max_tokens=MAX_TOKENS,
        system=prompt_template,
        messages=[{"role": "user", "content": user_message}],
    )
    text_blocks = [b.text for b in response.content if b.type == "text"]
    return strip_code_fence("".join(text_blocks))


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--lang", required=True, choices=sorted(LANGS))
    parser.add_argument("--level", default="A1", choices=sorted(LEVEL_THRESHOLDS))
    parser.add_argument("--count", type=int, default=1)
    parser.add_argument("--start", type=int, default=0)
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()

    cfg = LANGS[args.lang]
    level = args.level
    stories_dir = PIPELINE_ROOT / f"stories_{cfg.code}"
    rejected_dir = PIPELINE_ROOT / "work" / f"rejected_{cfg.code}"
    stories_dir.mkdir(exist_ok=True)
    rejected_dir.mkdir(parents=True, exist_ok=True)

    load_dotenv(PIPELINE_ROOT / ".env")
    client = Anthropic()
    prompt_template = cfg.prompt_path(level).read_text(encoding="utf-8")

    if cfg.use_stanza:
        import stanza

        nlp = StanzaNlpAdapter(
            stanza.Pipeline(cfg.spacy_model, processors="tokenize,pos,lemma", verbose=False)
        )
    elif cfg.use_camel:
        from camel_tools.disambig.mle import MLEDisambiguator
        from camel_tools.tokenizers.word import simple_word_tokenize

        disambiguator = MLEDisambiguator.pretrained("calima-msa-r13")
        nlp = CamelNlpAdapter(disambiguator, simple_word_tokenize)
    else:
        try:
            nlp = spacy.load(cfg.spacy_model)
        except OSError as exc:
            raise SystemExit(
                f"spaCy modeli '{cfg.spacy_model}' kurulu değil. "
                f"Kur: .venv/Scripts/python.exe -m spacy download {cfg.spacy_model}"
            ) from exc

    vocab_words = load_vocab(cfg, level)
    print(f"[{cfg.code}/{level}] kelime listesi: {len(vocab_words)} kelime.")

    briefs = cfg.briefs_by_level[level][args.start : args.start + args.count]
    for brief in briefs:
        out_path = stories_dir / f"{level.lower()}-{brief.slug}.md"
        if out_path.exists():
            print(f"[atla] {brief.slug} zaten var.")
            continue

        feedback: str | None = None
        accepted = False
        raw = ""
        for attempt in range(1, MAX_ATTEMPTS + 1):
            print(f"[{brief.slug}] deneme {attempt}/{MAX_ATTEMPTS}...")
            raw = generate_story(client, prompt_template, brief, cfg.title_hint, feedback)
            try:
                _meta, body = parse_frontmatter(raw)
            except ValueError as exc:
                feedback = str(exc)
                print(f"  frontmatter hatası: {exc}")
                continue

            off_list_max = cfg.off_list_ratio_override or MAX_OFF_LIST_RATIO
            thresholds = cfg.thresholds_for(level)
            result = check_story(
                body, nlp, vocab_words, thresholds, off_list_max, cfg.use_token_count, cfg.use_camel
            )
            print(
                f"  ort.cümle={result.avg_sentence:.1f} "
                f"off_list=%{result.off_list_ratio:.1f} "
                f"kelime={result.word_count} ok={result.ok}"
            )
            if result.ok:
                if not args.dry_run:
                    out_path.write_text(raw, encoding="utf-8")
                    print(f"  KABUL -> {out_path}")
                else:
                    print("  KABUL (dry-run, dosya yazılmadı)")
                accepted = True
                break

            feedback = "\n".join(result.reasons)
            print(f"  RED: {feedback}")
            time.sleep(1)

        if not accepted:
            rejected_path = rejected_dir / f"{level.lower()}-{brief.slug}.md"
            if not args.dry_run:
                rejected_path.write_text(raw, encoding="utf-8")
            print(f"[{brief.slug}] {MAX_ATTEMPTS} denemede geçemedi -> {rejected_path}")


if __name__ == "__main__":
    main()
