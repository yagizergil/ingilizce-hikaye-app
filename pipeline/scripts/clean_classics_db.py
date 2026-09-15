"""Veritabanındaki klasiklerin metnini TEMİZLER ve sayaçlarını düzeltir.

NEDEN GEREKLİ: `fetch_gutenberg.py` yalnızca `*** START/END OF THE PROJECT
GUTENBERG EBOOK ***` işaretlerini kesiyor. Gutenberg dosyalarında yazıcı
notları (`Produced by ...`, `Transcriber's note:`, `Distributed
Proofreading Team at http://www.pgdp.net`) o işaretlerin İÇİNDE kalıyor --
yani kitabın ilk paragrafı olarak veritabanına giriyor ve okuyucu
Fransızca bir romanı açtığında İngilizce bir dizgi notuyla karşılaşıyor.
Ölçüldü: 167 klasiğin 82'sinde, 161 paragraf.

NEDEN YENİDEN ALIM DEĞİL, YERİNDE TEMİZLİK: metni yeniden işlemek her dil
için spaCy/Stanza modeli yüklemek ve 167 kitabı baştan ayrıştırmak demek.
Kusur yalnızca birkaç paragrafta; onları silmek aynı sonucu veriyor ve
saatler yerine saniyeler sürüyor.

CJK SAYAÇLARI: `word_count` boşlukla bölerek hesaplanmıştı. Japonca/Çince
boşluk kullanmadığı için bir kitap 185 "kelime" görünüyordu (gerçek metin
on binlerce karakter). Okuma süresi de bundan türetildiği için "1 dakika"
yazıyordu. Bu diller için sayaç KARAKTER tabanlı yeniden hesaplanıyor
(ja/zh için dakikada ~400 karakter, diğerlerinde dakikada ~200 kelime).

ÇALIŞTIRMA:
    .venv/Scripts/python.exe scripts/clean_classics_db.py --dry-run
    .venv/Scripts/python.exe scripts/clean_classics_db.py --apply
"""

from __future__ import annotations

import argparse
import io
import os
import re
import sys

if sys.stdout.encoding and sys.stdout.encoding.lower() != "utf-8":
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import psycopg  # noqa: E402

from src.settings import load_settings  # noqa: E402

#: Yazıcı/dizgi notu kalıpları.
#:
#: HEPSİ İNGİLİZCE ve bu kasıtlı: Gutenberg'in dizgi notları kitabın dili ne
#: olursa olsun İngilizce yazılıyor. Fransızca bir romanın gövdesinde
#: "Distributed Proofreading Team" geçme ihtimali yok, yani bu kalıplar
#: gerçek içeriği silme riski taşımıyor. Rusça arşivlerin kendi notu için
#: bir kalıp da eklendi.
BOILERPLATE_PATTERNS = [
    r"produced by",
    r"transcriber'?s? note",
    # "Typographical errors corrected by the etext transcriber" -- 56
    # karakterlik bir satır; "note" geçmediği için ilk turda kaçmıştı.
    r"etext transcriber",
    r"typographical errors corrected",
    r"proofreading team",
    r"pgdp\.net",
    r"project gutenberg",
    r"www\.gutenberg\.org",
    r"этот файл был получен",
    r"распознавание и вычитка",
]

#: BİÇİM ARTIKLARI -- Gutenberg'in HTML/başlık kalıntıları.
#:
#: Bunlar yazıcı notu değil, dosya biçiminin kendisinden sızan artıklar:
#: `</pre>` (HTML kapanışı), `Title: ...` (dosya künyesi), `Ver.10/04/01`
#: (sürüm damgası), tek başına `/p`. İlk paragraf olarak kaldıklarında
#: kullanıcı kitabı açtığında ilk gördüğü şey oluyorlar. Ayrı bir liste,
#: çünkü bunlar KISA satırlar ve uzunluk sınırına takılmamalılar.
FORMAT_LEFTOVER_PATTERNS = [
    r"^\s*</?pre>",
    r"^\s*title:\s",
    r"^\s*ver\.\d",
    r"^\s*/p\s*$",
    r"^\s*\*end\*",
]

#: Bir paragrafın boilerplate sayılması için kalıbın BAŞLARDA geçmesi
#: yeterli; metnin ortasında geçen uzun bir paragrafı silmiyoruz.
MAX_BOILERPLATE_CHARS = 600

CJK_LANGUAGES = {"ja", "zh"}
#: Dakikada okunan birim. Latin alfabesinde kelime, CJK'de karakter.
WORDS_PER_MINUTE = 200
CHARS_PER_MINUTE_CJK = 400


def is_boilerplate(text: str) -> bool:
    lowered = text.lower()

    # Biçim artıkları her uzunlukta silinir: bunlar metin değil, dosya
    # biçiminin kalıntısı.
    if any(re.search(pattern, lowered) for pattern in FORMAT_LEFTOVER_PATTERNS):
        return True

    if len(text) > MAX_BOILERPLATE_CHARS:
        return False
    return any(re.search(pattern, lowered) for pattern in BOILERPLATE_PATTERNS)


def count_units(text: str, language: str) -> int:
    if language in CJK_LANGUAGES:
        # Boşluk ve noktalama dışındaki karakterler.
        return len(re.sub(r"[\s　]", "", text))
    return len(text.split())


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--apply", action="store_true", help="Değişiklikleri yaz")
    parser.add_argument("--dry-run", action="store_true", help="Yalnızca raporla")
    parser.add_argument(
        "--status",
        default="needs_review",
        help="Hangi durumdaki kitaplar temizlensin (varsayılan: needs_review)",
    )
    args = parser.parse_args()

    if not args.apply and not args.dry_run:
        parser.error("--apply ya da --dry-run ver")

    settings = load_settings()

    with psycopg.connect(settings.database_url, autocommit=False) as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                select b.id, b.slug, b.target_language, b.is_original
                from public.books b
                where b.status = %s
                order by b.target_language, b.slug
                """,
                (args.status,),
            )
            books = cur.fetchall()

        print(f"{len(books)} kitap inceleniyor ({args.status})\n")

        removed_total = 0
        touched_books = 0

        for book_id, slug, language, _is_original in books:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    select p.id, p.text, p.section_id
                    from public.book_paragraphs p
                    join public.book_sections s on s.id = p.section_id
                    where s.book_id = %s
                    order by s.order_index, p.order_index
                    """,
                    (book_id,),
                )
                paragraphs = cur.fetchall()

            doomed = [row[0] for row in paragraphs if is_boilerplate(row[1])]
            if doomed:
                touched_books += 1
                removed_total += len(doomed)
                print(f"  {language} {slug}: {len(doomed)} paragraf")

                if args.apply:
                    with conn.cursor() as cur:
                        cur.execute(
                            "delete from public.book_paragraphs where id = any(%s)",
                            (doomed,),
                        )
                        # Sıra numaraları yeniden veriliyor: boşluk kalırsa
                        # okuyucunun sayfalayıcısı paragraf sırasına göre
                        # çalıştığı için sorun çıkmaz, ama ilerleme kaydı
                        # paragraf INDEKSİNİ tutuyor -- delikli bir dizi
                        # kayıtlı konumu yanlış yere taşırdı.
                        cur.execute(
                            """
                            with sirali as (
                              select p.id,
                                     row_number() over (
                                       partition by p.section_id order by p.order_index
                                     ) - 1 as yeni
                              from public.book_paragraphs p
                              join public.book_sections s on s.id = p.section_id
                              where s.book_id = %s
                            )
                            update public.book_paragraphs p
                            set order_index = sirali.yeni
                            from sirali where sirali.id = p.id and p.order_index <> sirali.yeni
                            """,
                            (book_id,),
                        )

            # Sayaçlar her kitapta yeniden hesaplanıyor (CJK düzeltmesi).
            if args.apply:
                with conn.cursor() as cur:
                    cur.execute(
                        """
                        select coalesce(string_agg(p.text, ' '), '')
                        from public.book_paragraphs p
                        join public.book_sections s on s.id = p.section_id
                        where s.book_id = %s
                        """,
                        (book_id,),
                    )
                    full_text = cur.fetchone()[0]

                units = count_units(full_text, language)
                per_minute = (
                    CHARS_PER_MINUTE_CJK if language in CJK_LANGUAGES else WORDS_PER_MINUTE
                )
                minutes = max(1, round(units / per_minute))

                with conn.cursor() as cur:
                    cur.execute(
                        """
                        update public.books
                        set word_count = %s, estimated_minutes = %s
                        where id = %s
                        """,
                        (units, minutes, book_id),
                    )

        if args.apply:
            conn.commit()
            print(f"\nUYGULANDI: {touched_books} kitapta {removed_total} paragraf silindi.")
            print("Tüm kitapların kelime/dakika sayaçları yeniden hesaplandı.")
        else:
            print(f"\nKURU ÇALIŞMA: {touched_books} kitapta {removed_total} paragraf silinecekti.")


if __name__ == "__main__":
    main()
