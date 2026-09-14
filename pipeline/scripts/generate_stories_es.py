"""İspanyolca A1 pilot hikâye üretimi — kapalı döngü, `generate_stories.py`
(İngilizce) ile AYNI desen ama TAMAMEN AYRI ve İZOLE bir betik.

NEDEN AYRI BİR BETİK (generate_stories.py'yi genişletmek yerine):
`generate_stories.py`nin `run_validator()`'ı `pipeline check` CLI'sini
çağırıyor, o da `src/profiler.py`'nin `load_spacy_model()` (sabit
`en_core_web_sm`) ve `load_cefr_vocabulary()` (sabit CEFR-J/Octanove CSV)
fonksiyonlarına dayanıyor -- ikisi de İNGİLİZCE'YE SABİTLENMİŞ. Bu
betiği/validator.py'yi dil parametresi alacak şekilde genelleştirmek,
768 satırlık ve zaten yayında olan, kalibre edilmiş İngilizce doğrulama
yolunu riske atmak demek olurdu -- CLAUDE.md'nin "basitlik önce gelir"
ilkesi burada "önce izole bir pilot, KANITLANDIKTAN SONRA ortak
soyutlama" yönünde yorumlandı (bkz. docs/research/2026-09-13-cok-dilli-
icerik-arastirmasi.md §2: "dil-analizci soyutlaması" önerisi -- bu betik
o soyutlamanın YERİNE geçmiyor, ona giden İLK somut veri noktası).

DOĞRULAMA NE KADAR SIKI: İngilizce STRICT doğrulayıcısının aynısı DEĞİL.
Kapsam listesi (`data/elelex-vocabulary-profile-es-1.0.csv`) kendi
üretilmiş bir yaklaşıklık (bkz. scripts/convert_elelex.py'deki NEDEN
notu) ve İspanyolca lemmatize etme İngilizce kadar test edilmemiş. Bu
yüzden off-list toleransı İngilizce'den GEVŞEK tutuldu (bkz. aşağıdaki
sabitler). Bu bir PİLOT -- hedef, birkaç hikâyenin döngüyü uçtan uca
kapattığını göstermek, ilk turda yayına hazır 24 hikâyelik bir katalog
üretmek değil.

ÜRETİLEN HİKÂYELER stories_es/ ALTINA YAZILIR, veritabanına DOKUNULMAZ --
mevcut generate_stories.py ile aynı "yayınlama ayrı bir adım" ilkesi.

ÇALIŞTIRMA:
    .venv/Scripts/python.exe scripts/generate_stories_es.py --count 1 --dry-run
    .venv/Scripts/python.exe scripts/generate_stories_es.py --count 3
"""

from __future__ import annotations

import argparse
import csv
import re
import sys
import time
from dataclasses import dataclass
from pathlib import Path

import spacy
import yaml
from anthropic import Anthropic
from dotenv import load_dotenv

PIPELINE_ROOT = Path(__file__).resolve().parent.parent
PROMPT_PATH = PIPELINE_ROOT / "prompts" / "generate_story_a1_es.md"
STORIES_DIR = PIPELINE_ROOT / "stories_es"
REJECTED_DIR = PIPELINE_ROOT / "work" / "rejected_es"
ELELEX_CSV = PIPELINE_ROOT / "data" / "elelex-vocabulary-profile-es-1.0.csv"

AUTHOR = "İngilizce Hikaye Stüdyosu"

#: Sonnet 5 -- A1 kelime dağarcığı zaten çok kısıtlı, Opus'un
#: yaratıcılık avantajı burada gerekmiyor (bkz. araştırma raporu §3.3
#: "A1-B1 için Sonnet 5 yeterli" önerisi). Bütçe: pilotta ~$18 sınırı var.
MODEL = "claude-sonnet-5"
MAX_TOKENS = 8000
MAX_ATTEMPTS = 3

# A1 hedefi -- validator.py'deki thresholds.yaml A1 satırıyla AYNI sayılar
# (bkz. prompts/generate_story_a1_es.md §2), ama off-list toleransı
# yukarıdaki NEDEN notunda açıklandığı gibi gevşetildi.
MAX_AVG_SENTENCE = 8.0
MAX_SENTENCE = 15
MAX_OFF_LIST_RATIO = 12.0  # İngilizce A1/adaptasyon eşiği %3 -- burada gevşek.
MIN_WORD_COUNT = 300

_WORD_RE = re.compile(r"[A-Za-zÀ-ÖØ-öø-ÿ]+")


@dataclass(frozen=True)
class Brief:
    slug: str
    premise: str


BRIEFS: tuple[Brief, ...] = (
    Brief(
        "el-gato-perdido",
        "Una niña busca a su gato por el barrio y conoce a sus vecinos.",
    ),
    Brief(
        "el-mercado-el-sabado",
        "Un niño va al mercado con su abuela y aprende a elegir fruta fresca.",
    ),
    Brief(
        "la-carta-de-mi-amigo",
        "Un chico recibe una carta de un amigo que vive en otra ciudad.",
    ),
    Brief(
        "un-dia-de-lluvia",
        "Una familia pasa un día de lluvia en casa jugando y cocinando juntos.",
    ),
    Brief(
        "el-primer-dia-de-trabajo",
        "Una joven empieza su primer día de trabajo en una panadería pequeña.",
    ),
    Brief(
        "el-cumpleanos-de-mama",
        "Dos hermanos preparan una fiesta sorpresa para el cumpleaños de su madre.",
    ),
    Brief(
        "el-perro-nuevo",
        "Un niño convence a sus padres de adoptar un perro del refugio.",
    ),
    Brief(
        "el-viaje-en-tren",
        "Una chica viaja sola en tren por primera vez para visitar a su tía.",
    ),
    Brief(
        "la-clase-de-cocina",
        "Un grupo de amigos toma una clase de cocina y todo sale mal.",
    ),
    Brief(
        "el-jardin-de-la-escuela",
        "Los niños de una escuela pequeña plantan un jardín de verduras.",
    ),
    Brief(
        "una-noche-sin-luz",
        "Una familia pasa la noche sin electricidad y cuenta historias con velas.",
    ),
    Brief(
        "el-nuevo-vecino",
        "Un niño tímido conoce a un vecino nuevo que no habla su idioma.",
    ),
)


# ELELex'in kendi metodolojisi (ders kitabı korpusu) bazı çok yaygın
# gündelik kelimeleri şaşırtıcı derecede geç seviyeye koyuyor -- "abuela"
# B1, "mercado" B2 çıkıyor (muhtemelen bu iki kelimenin GEÇTİĞİ ders
# kitabı örnekleri o seviyelerde yoğunlaşmış, kelimenin kendisi zor
# olduğu için değil). Bir A1 hikâyesi aile/pazar temasına doğal olarak
# değiniyor, bu yüzden bariz gündelik kelimeler için küçük bir elle
# düzeltme listesi -- CEFR-J'nin İngilizce'de de yaptığı gibi (bkz.
# profiler.py ARCHAIC_WORDS, author_overrides.py) tam otomatik bir
# kaynağın asla kusursuz olmayacağının kabulü.
_A1_SUPPLEMENT = {
    "abuela",
    "abuelastro",
    "mercado",
    "tienda",
    "panadería",
    "panadero",
    "vecino",
    "vecina",
    "barrio",
}


def load_elelex() -> tuple[set[str], set[str]]:
    """(a1_words, a1_and_a2_words) döner -- ikinci küme off-list ölçümü
    için ceiling olarak kullanılıyor (A1 prompt'unun kaçınılmaz birkaç A2
    kelimesine düşmesi bekleniyor, bkz. prompt §1)."""
    a1: set[str] = set(_A1_SUPPLEMENT)
    a1a2: set[str] = set(_A1_SUPPLEMENT)
    with open(ELELEX_CSV, encoding="utf-8") as f:
        for row in csv.DictReader(f):
            word = row["headword"]
            if "_" in word:  # ELELex'teki çok kelimeli/hatalı girişler
                continue
            if row["CEFR"] == "A1":
                a1.add(word)
                a1a2.add(word)
            elif row["CEFR"] == "A2":
                a1a2.add(word)
    return a1, a1a2


def load_spacy_es():
    try:
        return spacy.load("es_core_news_sm")
    except OSError as exc:
        raise SystemExit(
            "spaCy modeli 'es_core_news_sm' kurulu değil. "
            "Kur: .venv/Scripts/python.exe -m spacy download es_core_news_sm"
        ) from exc


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


def check_story(body: str, nlp, a1_words: set[str], a1a2_words: set[str]) -> CheckResult:
    reasons: list[str] = []

    # Cümle uzunluğu -- boşlukla token'lama, validator.py ile aynı yöntem
    # (whitespace tokenization), spaCy'nin kendi cümle bölücüsüyle.
    doc = nlp(body)
    sentences = [s.text.strip() for s in doc.sents if s.text.strip()]
    sentence_lengths = [len(s.split()) for s in sentences if s.split()]
    avg_sentence = sum(sentence_lengths) / len(sentence_lengths) if sentence_lengths else 0.0
    max_sentence = max(sentence_lengths) if sentence_lengths else 0

    if avg_sentence > MAX_AVG_SENTENCE:
        reasons.append(f"ort. cümle {avg_sentence:.1f} > {MAX_AVG_SENTENCE}")
    if max_sentence > MAX_SENTENCE:
        reasons.append(f"en uzun cümle {max_sentence} kelime > {MAX_SENTENCE}")

    # Kapsam / off-list -- spaCy lemma'sı A1+A2 listesinde mi.
    words = _WORD_RE.findall(body)
    word_count = len(words)
    off_list = 0
    off_list_examples: list[str] = []
    for token in doc:
        if not token.is_alpha:
            continue
        lemma = token.lemma_.lower()
        surface = token.text.lower()
        if lemma in a1a2_words or surface in a1a2_words:
            continue
        if token.pos_ == "PROPN":
            continue
        off_list += 1
        if len(off_list_examples) < 15:
            off_list_examples.append(surface)

    alpha_token_count = sum(1 for t in doc if t.is_alpha)
    off_list_ratio = (off_list / alpha_token_count * 100) if alpha_token_count else 0.0

    if off_list_ratio > MAX_OFF_LIST_RATIO:
        reasons.append(
            f"off_list_ratio %{off_list_ratio:.1f} > %{MAX_OFF_LIST_RATIO} "
            f"(örnek: {', '.join(off_list_examples[:10])})"
        )
    if word_count < MIN_WORD_COUNT:
        reasons.append(f"kelime sayısı {word_count} < {MIN_WORD_COUNT}")

    return CheckResult(
        ok=not reasons,
        reasons=reasons,
        avg_sentence=avg_sentence,
        off_list_ratio=off_list_ratio,
        word_count=word_count,
    )


def generate_story(
    client: Anthropic, prompt_template: str, brief: Brief, feedback: str | None
) -> str:
    user_message = f"Premise: {brief.premise}\n\nChoose your own Spanish title."
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
    parser.add_argument("--count", type=int, default=1)
    parser.add_argument("--start", type=int, default=0)
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()

    load_dotenv(PIPELINE_ROOT / ".env")
    client = Anthropic()
    prompt_template = PROMPT_PATH.read_text(encoding="utf-8")
    nlp = load_spacy_es()
    a1_words, a1a2_words = load_elelex()
    print(f"ELELex yüklendi: {len(a1_words)} A1 kelime, {len(a1a2_words)} A1+A2 kelime.")

    STORIES_DIR.mkdir(exist_ok=True)
    REJECTED_DIR.mkdir(parents=True, exist_ok=True)

    briefs = BRIEFS[args.start : args.start + args.count]
    for brief in briefs:
        out_path = STORIES_DIR / f"{brief.slug}.md"
        if out_path.exists():
            print(f"[atla] {brief.slug} zaten var.")
            continue

        feedback: str | None = None
        accepted = False
        for attempt in range(1, MAX_ATTEMPTS + 1):
            print(f"[{brief.slug}] deneme {attempt}/{MAX_ATTEMPTS}...")
            raw = generate_story(client, prompt_template, brief, feedback)
            try:
                meta, body = parse_frontmatter(raw)
            except ValueError as exc:
                feedback = str(exc)
                print(f"  frontmatter hatası: {exc}")
                continue

            result = check_story(body, nlp, a1_words, a1a2_words)
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
            rejected_path = REJECTED_DIR / f"{brief.slug}.md"
            if not args.dry_run:
                rejected_path.write_text(raw, encoding="utf-8")
            print(f"[{brief.slug}] {MAX_ATTEMPTS} denemede geçemedi -> {rejected_path}")


if __name__ == "__main__":
    main()
