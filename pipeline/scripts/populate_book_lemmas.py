"""KRİTİK DÜZELTME (2026-09-14 gece, aynı oturum): `publish_multilang.py`
ve `publish_classics.py` `book_lemmas` tablosunu HİÇ doldurmuyordu --
ADR-013'ü yanlış yorumlamıştım: "kelime karşılığı artık `lemma_
translations` ile çalışma anında geliyor" cümlesi yalnızca GLOSS'un
(çeviri) kaynağının değiştiğini söylüyor, `book_lemmas` (kitap -> lemma
kümesi eşlemesi) hâlâ gerekli -- `useUserLemmaStatesForBook.ts`
(`enabled: lemmas.length > 0`) o küme BOŞSA hiç ÇALIŞMIYOR, `data`i
sonsuza kadar `undefined` kalıyor, `ReaderScreen.tsx`nin
`isVocabDataLoading` kapısı hiç açılmıyor -- SONUÇ: bu oturumda
yayınlanan 229 kitabın HİÇBİRİ okuma ekranında sonsuz yükleme
göstergesinden öteye geçemiyordu. Gerçek kullanıcı raporuyla bulundu.

Bu betik `generate_stories_multi.py`nin ZATEN KURULU NLP adaptörlerini
(spaCy/Stanza/CAMeL) yeniden kullanarak her kitabın metnini lemmatize
edip `book_lemmas`e (book_id, lemma, count) yazıyor.

ÇALIŞTIRMA:
    .venv/Scripts/python.exe scripts/populate_book_lemmas.py --lang all
"""

from __future__ import annotations

import argparse
import io
import sys
from collections import Counter
from pathlib import Path

import spacy

sys.path.insert(0, str(Path(__file__).resolve().parent))
from generate_stories_multi import LANGS, CamelNlpAdapter, StanzaNlpAdapter  # noqa: E402

from src.db import connect, copy_rows  # noqa: E402
from src.settings import load_settings  # noqa: E402

#: Parça boyutu DİLE GÖRE değişiyor çünkü sınırı koyan araç değişiyor.
#:
#: spaCy'nin sınırı 1.000.000 KARAKTER (bellek kaynaklı); 200.000 güvenli
#: bir pay bırakıyor. SudachiPy (Japonca) ise 49.149 BAYT ile sınırlı ve
#: Japonca karakterler UTF-8'de 3 bayt tutuyor -- yani 200.000 karakterlik
#: bir parça 600 KB olur ve tokenizer düşer (ölçüldü: 346.008 baytlık bir
#: parçada `SudachiError: Input is too long`). 12.000 karakter ~36 KB,
#: sınırın rahat altında.
NLP_CHUNK_CHARS_DEFAULT = 200_000
NLP_CHUNK_CHARS_BY_LANG = {
    "ja": 12_000,
    # Çince de karakter başına 3 bayt ama Stanza'nın böyle bir bayt
    # sınırı yok; yine de büyük parçalar belleği zorluyor.
    "zh": 50_000,
}

if sys.stdout.encoding and sys.stdout.encoding.lower() != "utf-8":
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")

PIPELINE_ROOT = Path(__file__).resolve().parent.parent

_NLP_CACHE: dict[str, object] = {}


def _load_nlp(lang: str):
    if lang in _NLP_CACHE:
        return _NLP_CACHE[lang]
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
    _NLP_CACHE[lang] = nlp
    return nlp


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--lang", required=True, choices=[*LANGS, "all"])
    args = parser.parse_args()

    langs = sorted(LANGS) if args.lang == "all" else [args.lang]
    settings = load_settings()

    with connect(settings.database_url) as conn:
        for lang in langs:
            with conn.cursor() as cur:
                cur.execute(
                    # needs_review de dahil: klasikler yayina alinmadan
                    # ONCE sozlukleri uretilmeli, cunku yayin kapisi
                    # (publish_vetted.py) okunabilirligi sart kosuyor ve
                    # sozluksuz kitap okuma ekraninda acilmiyor.
                    "select id from public.books where target_language = %s"
                    " and status in ('published', 'needs_review')",
                    (lang,),
                )
                book_ids = [row[0] for row in cur.fetchall()]
            if not book_ids:
                print(f"[{lang}] yayınlanmış kitap yok, atlanıyor.")
                continue

            print(f"[{lang}] {len(book_ids)} kitap, NLP yükleniyor...")
            nlp = _load_nlp(lang)

            for book_id in book_ids:
                with conn.cursor() as cur:
                    cur.execute(
                        """
                        select bp.text from public.book_paragraphs bp
                        join public.book_sections bs on bs.id = bp.section_id
                        where bs.book_id = %s
                        """,
                        (str(book_id),),
                    )
                    paragraphs = [row[0] for row in cur.fetchall()]
                # METİN PARÇALANARAK İŞLENİYOR.
                #
                # spaCy tek çağrıda 1.000.000 karakterle sınırlı ve uzun
                # klasikler bunu kolayca aşıyor (ölçüldü: Almanca rafında
                # 2.173.236 karakterlik bir kitap). Tek dev çağrı
                # `ValueError [E088]` ile düşüyor ve o kitabın sözlüğü hiç
                # üretilmiyordu -- yani kitap okuma ekranında AÇILMIYORDU.
                # Paragraf sınırında bölmek lemmatizasyonu etkilemiyor:
                # lemma kararı cümle içinde veriliyor, paragraflar arasında
                # taşınan bir bağlam zaten yok.
                chunk_limit = NLP_CHUNK_CHARS_BY_LANG.get(lang, NLP_CHUNK_CHARS_DEFAULT)
                counts: Counter[str] = Counter()
                chunk_texts: list[str] = []
                current: list[str] = []
                current_len = 0
                for paragraph in paragraphs:
                    if current and current_len + len(paragraph) > chunk_limit:
                        chunk_texts.append("\n\n".join(current))
                        current, current_len = [], 0
                    current.append(paragraph)
                    current_len += len(paragraph)
                if current:
                    chunk_texts.append("\n\n".join(current))

                for chunk_text in chunk_texts:
                    doc = nlp(chunk_text)
                    for token in doc:
                        if not token.is_alpha:
                            continue
                        if token.pos_.upper() in ("PROPN", "NOUN_PROP"):
                            continue
                        lemma = (token.lemma_ or token.text).lower().strip()
                        if lemma:
                            counts[lemma] += 1

                rows = [(str(book_id), lemma, count) for lemma, count in counts.items()]
                with conn.transaction():
                    with conn.cursor() as cur:
                        cur.execute("delete from public.book_lemmas where book_id = %s", (str(book_id),))
                    copy_rows(conn, "public.book_lemmas", ["book_id", "lemma", "count"], rows)
                print(f"  {book_id} -> {len(rows)} benzersiz lemma")

    print("Tamamlandı.")


if __name__ == "__main__":
    main()
