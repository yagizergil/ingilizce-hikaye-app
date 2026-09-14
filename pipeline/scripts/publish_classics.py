"""classics_{lang}/*.txt (fetch_gutenberg.py çıktısı) dosyalarını
seviye TAHMİNİ yaparak veritabanına yayınlar.

KAPSAM VE BİLİNÇLİ SINIRLAMALAR (zaman baskısı altında yapılan gerçek
mühendislik ödünleri, gizlenmeden belgelendi):

1. **Bölüm ayırma kaba.** İngilizce'nin `epub/parser.py`'ı EPUB'un kendi
   TOC/href yapısını kullanıyor -- gerçek bölüm sınırlarını biliyor. Bu
   betik yalnızca DÜZ METİN alıyor (Gutenberg .txt), gerçek bölüm
   başlıklarını dil başına ayrı regex'lerle (Fransızca "CHAPITRE",
   Almanca "Kapitel", vb.) tanımak yerine -- 9 dil için bunu SAĞLAM
   yapmak ayrı bir mühendislik turu gerektirir -- her ~1500 kelimede bir
   paragraf sınırında böler. Okuma deneyimi gerçek bölümlerden daha az
   "doğal" ama uygulamanın kendi sayfalama motoru (ADR-007) zaten
   bölüm İÇİ dinamik sayfalama yapıyor, yani bu bir ENGELLEYICI değil.
2. **Seviye TAHMİNİ, insan onayı YERİNE GEÇMEZ.** `generate_stories_
   multi.py`'nin kelime listelerini (ELELex/FLELex/DAFlex/Kelly/JLPT/
   wordfreq) ve NLP adaptörlerini (spaCy/Stanza/CAMeL) YENİDEN KULLANIR
   -- kümülatif kapsamı ilk %90'a ulaştıran seviye seçiliyor
   (profiler.py'nin `infer_level()`'ıyla AYNI mantık, dil-parametrik).
   Kelime listeleri C2'yi nadiren kapsıyor (ELELex hiç, Kelly kısmen) --
   bu durumda en yüksek mevcut seviyeye düşülüyor.
3. **status='needs_review' ile yayınlanıyor, 'published' DEĞİL** --
   orijinal içerikten farklı olarak (o zaten kelime kısıtlı üretildiği
   için private bir doğrulamadan geçmişti), ham klasik metinlerin seviye
   tahmini gözden geçirilmeden canlıya çıkmamalı.

ÇALIŞTIRMA:
    .venv/Scripts/python.exe scripts/publish_classics.py --lang fr
"""

from __future__ import annotations

import argparse
import io
import json
import re
import sys
import uuid
from pathlib import Path

if sys.stdout.encoding and sys.stdout.encoding.lower() != "utf-8":
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")

import spacy

sys.path.insert(0, str(Path(__file__).resolve().parent))
from generate_stories_multi import LANGS, CamelNlpAdapter, StanzaNlpAdapter, _WORD_RE  # noqa: E402

from src.db import connect, copy_rows, delete_book_content  # noqa: E402
from src.settings import load_settings  # noqa: E402

PIPELINE_ROOT = Path(__file__).resolve().parent.parent
WORDS_PER_MINUTE = 200
CEFR_ORDER = ["A1", "A2", "B1", "B2", "C1", "C2"]


def _load_nlp_and_vocab(lang: str):
    cfg = LANGS[lang]
    if cfg.use_stanza:
        import stanza

        nlp = StanzaNlpAdapter(
            stanza.Pipeline(cfg.spacy_model, processors="tokenize,pos,lemma", verbose=False)
        )
    elif cfg.use_camel:
        from camel_tools.disambig.mle import MLEDisambiguator
        from camel_tools.tokenizers.word import simple_word_tokenize

        nlp = CamelNlpAdapter(MLEDisambiguator.pretrained("calima-msa-r13"), simple_word_tokenize)
    else:
        nlp = spacy.load(cfg.spacy_model)

    import csv

    words_by_level: dict[str, set[str]] = {lvl: set() for lvl in CEFR_ORDER}
    with open(cfg.csv_path, encoding="utf-8") as f:
        for row in csv.DictReader(f):
            word = row["headword"]
            level = row["CEFR"]
            if level in words_by_level and "_" not in word and " " not in word:
                words_by_level[level].add(word)
    return nlp, words_by_level


#: Boşluksuz yazılan diller (Çince/Japonca) için `len(text.split())`
#: neredeyse anlamsız -- bir paragraf tek "kelime" sayılabiliyor, bu da
#: bölüm sınırının hiç tetiklenmemesine yol açıyordu (bkz. oturum
#: notları: Japonca kitaplar TEK dev bölüme dönüşüp SudachiPy'nin 49KB
#: girdi sınırını aşıyordu). KARAKTER sayısı dil-bağımsız bir vekil.
SECTION_TARGET_CHARS = 6000


def _split_sections(text: str) -> list[str]:
    paragraphs = [p.strip() for p in re.split(r"\n\s*\n", text) if p.strip()]
    sections: list[list[str]] = []
    current: list[str] = []
    current_chars = 0
    for para in paragraphs:
        current.append(para)
        current_chars += len(para)
        if current_chars >= SECTION_TARGET_CHARS:
            sections.append(current)
            current = []
            current_chars = 0
    if current:
        sections.append(current)
    return ["\n\n".join(s) for s in sections]


def _infer_level(doc_tokens_by_lemma_surface: list[tuple[str, str]], words_by_level: dict) -> str:
    total = len(doc_tokens_by_lemma_surface)
    if total == 0:
        return "C1"
    cumulative: set[str] = set()
    for level in CEFR_ORDER:
        cumulative |= words_by_level[level]
        matched = sum(
            1 for lemma, surface in doc_tokens_by_lemma_surface if lemma in cumulative or surface in cumulative
        )
        if matched / total >= 0.90:
            return level
    return CEFR_ORDER[-1]


def publish_classic(conn, nlp, words_by_level: dict, txt_path: Path, lang: str) -> str:
    meta_path = txt_path.with_suffix(".json")
    meta = json.loads(meta_path.read_text(encoding="utf-8")) if meta_path.exists() else {}
    raw_text = txt_path.read_text(encoding="utf-8")

    section_texts = _split_sections(raw_text)
    if not section_texts:
        raise ValueError("bölümlere ayrılamadı (metin boş)")

    # Seviye tahmini için TÜM metni analiz etmek yavaş/pahalı olabilir --
    # ilk 3 bölüm (yaklaşık 4500 kelime) temsili bir örneklem.
    # NEDEN SABİT KARAKTER LİMİTİ (kelime/bölüm sayısı DEĞİL): Japonca gibi
    # boşluksuz yazılan dillerde `_split_sections()`'ın kelime sayacı
    # (whitespace `.split()`) bir paragrafı NEREDEYSE HİÇ "kelime"
    # saymıyor -- 1500 kelime eşiği pratikte hiç tetiklenmiyor ve "ilk 3
    # bölüm" koca kitabın neredeyse tamamı olabiliyor. Sonuç: SudachiPy'nin
    # 49KB girdi sınırını aştı (gerçek hata, bkz. oturum notları). Sabit
    # karakter limiti dil-bağımsız bir güvenlik ağı.
    sample_text = "\n\n".join(section_texts[:3])[:8000]
    doc = nlp(sample_text)
    token_pairs = [
        (t.lemma_.lower(), t.text.lower())
        for t in doc
        if t.is_alpha and t.pos_.upper() not in ("PROPN", "NOUN_PROP")
    ]
    inferred_level = _infer_level(token_pairs, words_by_level)

    total_words = sum(len(_WORD_RE.findall(s)) for s in section_texts)
    estimated_minutes = round(total_words / WORDS_PER_MINUTE) if total_words else 0
    slug = f"{txt_path.stem}-{lang}"
    title = meta.get("title") or txt_path.stem.replace("-", " ").title()

    with conn.transaction():
        with conn.cursor() as cur:
            cur.execute(
                """
                insert into public.books (
                  slug, title, author, author_death_year, source, source_url,
                  license, content_type, is_adaptation, is_original, cefr_level,
                  target_language, word_count, estimated_minutes, status
                ) values (
                  %(slug)s, %(title)s, %(author)s, %(author_death_year)s, 'gutenberg',
                  %(source_url)s, %(license)s, 'novel', false, false, %(cefr_level)s,
                  %(target_language)s, %(word_count)s, %(estimated_minutes)s, 'needs_review'
                )
                on conflict (slug) do update set
                  title = excluded.title, author = excluded.author,
                  author_death_year = excluded.author_death_year,
                  cefr_level = excluded.cefr_level, word_count = excluded.word_count,
                  estimated_minutes = excluded.estimated_minutes, updated_at = now()
                returning id
                """,
                {
                    "slug": slug,
                    "title": title,
                    "author": meta.get("author"),
                    "author_death_year": meta.get("author_death_year"),
                    "source_url": meta.get("source_url"),
                    "license": meta.get("license", "Public Domain"),
                    "cefr_level": inferred_level,
                    "target_language": lang,
                    "word_count": total_words,
                    "estimated_minutes": estimated_minutes,
                },
            )
            book_id = str(cur.fetchone()[0])

        delete_book_content(conn, book_id)

        section_rows = []
        paragraph_rows = []
        for i, section_text in enumerate(section_texts):
            section_id = str(uuid.uuid4())
            paras = [p.strip() for p in re.split(r"\n\s*\n", section_text) if p.strip()]
            word_count = len(_WORD_RE.findall(section_text))
            section_rows.append(
                (
                    section_id,
                    book_id,
                    i,
                    f"{i + 1}",
                    "chapter",
                    word_count,
                    round(word_count / WORDS_PER_MINUTE) if word_count else 0,
                )
            )
            for j, para in enumerate(paras):
                paragraph_rows.append((str(uuid.uuid4()), section_id, j, " ".join(para.split())))

        copy_rows(
            conn,
            "public.book_sections",
            ["id", "book_id", "order_index", "title", "kind", "word_count", "estimated_minutes"],
            section_rows,
        )
        copy_rows(
            conn, "public.book_paragraphs", ["id", "section_id", "order_index", "text"], paragraph_rows
        )

    return book_id, inferred_level


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--lang", required=True)
    parser.add_argument("--count", type=int, default=999)
    args = parser.parse_args()

    classics_dir = PIPELINE_ROOT / f"classics_{args.lang}"
    if not classics_dir.exists():
        raise SystemExit(f"{classics_dir} yok -- önce fetch_gutenberg.py çalıştırın.")

    print(f"[{args.lang}] NLP + kelime listesi yükleniyor...")
    nlp, words_by_level = _load_nlp_and_vocab(args.lang)

    settings = load_settings()
    txt_files = sorted(classics_dir.glob("*.txt"))[: args.count]
    print(f"[{args.lang}] {len(txt_files)} dosya işlenecek.")

    with connect(settings.database_url) as conn:
        for txt_path in txt_files:
            try:
                book_id, level = publish_classic(conn, nlp, words_by_level, txt_path, args.lang)
                print(f"  {txt_path.stem} -> {book_id} (tahmini seviye: {level})")
            except Exception as exc:  # noqa: BLE001
                print(f"  {txt_path.stem} -> HATA: {exc}")


if __name__ == "__main__":
    main()
