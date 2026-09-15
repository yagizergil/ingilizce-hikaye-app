"""İndirilen klasikleri TELİF ve KALİTE açısından eler.

NEDEN VAR: `fetch_gutenberg.py` Project Gutenberg'in kataloğunu olduğu gibi
alıyor. Gutenberg ABD hukukuna göre çalışıyor (1930 öncesi yayın kamu
malı); bizim kullanıcılarımız AB, Türkiye ve Japonya'da ve oralarda kural
YAZARIN ÖLÜMÜNDEN 70 YIL SONRA. Ölçüldü: indirilen Japonca kitapların
10'u Tanizaki (ö. 1965), Mushanokōji (ö. 1976), Nagai Kafū (ö. 1959) gibi
yazarlara ait -- ABD'de serbest, Türkiye'de ve AB'de DEĞİL. Bu kitapları
yayınlamak telif ihlali olurdu.

Eleme kuralları (hepsi otomatik, hepsi gerekçeli):

1. TELİF: `author_death_year` + 70 > bu yıl ise ELENİR. Ölüm yılı
   bilinmiyorsa da elenir -- "bilmiyoruz" bir izin değil.
2. DİL/YAZI SİSTEMİ: kitabın metni beyan ettiği dilin yazı sistemini
   taşımıyorsa elenir (Gutenberg'in dil etiketi güvenilmez: Çince
   rafında İngilizce bir kitap, Japonca rafında `</pre>` ile başlayan
   HTML artığı bulundu).
3. ARTIK İŞARETLER: metin `</pre>`, `Title:` gibi biçim artıklarıyla
   başlıyorsa elenir -- temizleyiciden geçmemiş demektir.
4. TÜR: sözlük/ders kitabı/problem kitabı gibi DÜZ OKUMA metni olmayan
   eserler elenir (Rusça rafında "1001 zihinden hesap problemi" çıktı).
   Bu kural başlık kalıplarıyla çalışıyor, yani kaçırabilir; amacı
   bariz olanları ayıklamak.

Elenen kitap SİLİNMİYOR, `status='archived'` yapılıyor: veriyi atmak,
aynı kitabı bir dahaki turda yeniden indirip yeniden elemek demek olurdu.

ÇALIŞTIRMA:
    .venv/Scripts/python.exe scripts/vet_classics.py --dry-run
    .venv/Scripts/python.exe scripts/vet_classics.py --apply
"""

from __future__ import annotations

import argparse
import datetime
import io
import os
import re
import sys

if sys.stdout.encoding and sys.stdout.encoding.lower() != "utf-8":
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import psycopg  # noqa: E402

from src.settings import load_settings  # noqa: E402

#: AB ve Türkiye: yazarın ölümünden 70 yıl sonra kamu malı.
COPYRIGHT_TERM_YEARS = 70

#: Dil -> metinde bulunması beklenen karakter aralığı.
SCRIPT_PATTERNS = {
    "ja": r"[぀-ヿ一-鿿]",
    "zh": r"[一-鿿]",
    "ru": r"[Ѐ-ӿ]",
    "ar": r"[؀-ۿ]",
}

#: Temizleyiciden geçmemiş metnin izleri.
FORMAT_LEFTOVERS = [r"^\s*</?pre>", r"^\s*Title:\s", r"^\s*Ver\.\d", r"^\s*/p\s*$"]

#: Düz okuma metni olmayan eserler (başlık kalıbı).
NON_NARRATIVE_TITLE = [
    r"задач",          # problem kitabı
    r"словар",         # sözlük
    r"dictionar",
    r"grammar",
    r"史略",           # edebiyat tarihi (ders kitabı)
    r"詩話",           # şiir eleştirisi derlemesi
    r"^\.txt$",
]


def reasons_to_reject(
    title: str | None,
    language: str,
    death_year: int | None,
    first_text: str,
    this_year: int,
) -> list[str]:
    found: list[str] = []

    if death_year is None:
        found.append("ölüm yılı bilinmiyor -- telif durumu doğrulanamıyor")
    elif death_year + COPYRIGHT_TERM_YEARS >= this_year:
        found.append(
            f"telif sürebilir (ö. {death_year} + {COPYRIGHT_TERM_YEARS} = {death_year + COPYRIGHT_TERM_YEARS})"
        )

    pattern = SCRIPT_PATTERNS.get(language)
    if pattern and not re.search(pattern, first_text or ""):
        found.append(f"metin {language} yazı sistemini taşımıyor")

    for leftover in FORMAT_LEFTOVERS:
        if re.search(leftover, first_text or "", re.IGNORECASE):
            found.append("biçim artığıyla başlıyor (temizlenmemiş)")
            break

    # KLASİK ÇİNCE (文言文) DİL ÖĞRENCİSİ İÇİN OKUNAMAZ.
    #
    # Modern yerel Çince (白话文) 1917 sonrası yazılıyor; ondan öncesi
    # bugünkü Çinceyle aynı dil değil -- İngilizce öğrenen birine
    # Chaucer'ı Orta İngilizce vermek gibi. Gutenberg'in Çince rafı
    # neredeyse tamamen bu döneme ait (紅樓夢 1763, 聊齋志異 1715).
    # Ayrıca geleneksel karakterlerle yazılmışlar; bizim Çince içeriğimiz
    # basitleştirilmiş, ikisini karıştırmak öğrenciyi doğrudan yanıltır.
    if language == "zh" and death_year is not None and death_year < 1912:
        found.append("klasik Çince (1912 öncesi) -- modern Çince öğrencisi okuyamaz")

    for pattern_title in NON_NARRATIVE_TITLE:
        if re.search(pattern_title, (title or ""), re.IGNORECASE):
            found.append("düz okuma metni değil (sözlük/ders/problem kitabı)")
            break

    return found


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--apply", action="store_true")
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()
    if not args.apply and not args.dry_run:
        parser.error("--apply ya da --dry-run ver")

    this_year = datetime.date.today().year
    settings = load_settings()

    with psycopg.connect(settings.database_url, autocommit=False) as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                select b.id, b.slug, b.title, b.target_language, b.author_death_year,
                       coalesce((
                         select p.text from public.book_paragraphs p
                         join public.book_sections s on s.id = p.section_id
                         where s.book_id = b.id
                         order by s.order_index, p.order_index limit 1
                       ), '')
                from public.books b
                where b.status = 'needs_review'
                order by b.target_language, b.slug
                """
            )
            rows = cur.fetchall()

        rejected: list[tuple[str, str, str, list[str]]] = []
        accepted: list[tuple[str, str]] = []

        for book_id, slug, title, language, death_year, first_text in rows:
            problems = reasons_to_reject(title, language, death_year, first_text, this_year)
            if problems:
                rejected.append((book_id, slug, language, problems))
            else:
                accepted.append((book_id, language))

        by_language: dict[str, int] = {}
        for _, language in accepted:
            by_language[language] = by_language.get(language, 0) + 1

        print(f"İNCELENEN: {len(rows)}   GEÇEN: {len(accepted)}   ELENEN: {len(rejected)}\n")
        print("Geçenler dil dağılımı:", by_language, "\n")
        print("Elenenler:")
        for _, slug, language, problems in rejected:
            print(f"  {language} {slug}: {'; '.join(problems)}")

        if args.apply:
            with conn.cursor() as cur:
                cur.execute(
                    "update public.books set status = 'archived' where id = any(%s)",
                    ([book_id for book_id, _, _, _ in rejected],),
                )
            conn.commit()
            print(f"\nUYGULANDI: {len(rejected)} kitap arşivlendi.")
        else:
            print(f"\nKURU ÇALIŞMA: {len(rejected)} kitap arşivlenecekti.")


if __name__ == "__main__":
    main()
