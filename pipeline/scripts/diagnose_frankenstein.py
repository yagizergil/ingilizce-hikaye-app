#!/usr/bin/env python
"""Tek seferlik teşhis scripti — TEST DEĞİL, elle çalıştırılır.

Frankenstein paragraf sayısı farkını (extract_epub() 762 döndürüyor,
referans ölçüm 703) araştırmak için: spine'daki her dosyayı, epub:type
birleşimini, is_frontmatter bayrağını ve paragraf sayısını dökeriz;
28 gerçek birime (letter-1..4 + chapter-1..24) göre gruplarız; dışında
kalanları listeleriz; 28 birimin içindeki ilk/son 5 paragrafı basarız
(gövde metni mi, imza/epigraf gibi yapısal öğeler mi görmek için).

Kullanım:
    cd pipeline
    python scripts/diagnose_frankenstein.py tests/fixtures/mary-shelley_frankenstein.epub
"""

from __future__ import annotations

import sys
import zipfile
from pathlib import PurePosixPath

from lxml import etree

from src.epub.cleaner import (
    collect_epub_types,
    extract_paragraph_texts,
    find_body,
    parse_xhtml,
    remove_headings_and_notes,
)
from src.epub.parser import (
    _NUMBERED_FILENAME_PATTERN,
    _classify_section,
    _parse_manifest,
    _parse_spine_idrefs,
    _read_container_opf_path,
)


def main(epub_path: str) -> None:
    with zipfile.ZipFile(epub_path) as zf:
        opf_path = _read_container_opf_path(zf)
        opf_root = etree.fromstring(zf.read(opf_path))
        opf_dir = PurePosixPath(opf_path).parent

        manifest = _parse_manifest(opf_root)
        spine_idrefs = _parse_spine_idrefs(opf_root)

        rows: list[dict] = []
        skipped_files: list[tuple[str, object, str]] = []

        for idref in spine_idrefs:
            item = manifest.get(idref)
            if item is None or "html" not in item.media_type:
                continue

            href_path = str(opf_dir / item.href) if str(opf_dir) != "." else item.href
            content = zf.read(href_path)
            root = parse_xhtml(content)
            body = find_body(root)
            if body is None:
                skipped_files.append((item.href, [], "NO <body>"))
                continue

            types = sorted(collect_epub_types(body))
            classification = _classify_section(body, item.href)
            basename = PurePosixPath(item.href).stem.lower()

            if classification is None:
                skipped_files.append((item.href, types, "SKIP (_SKIP_TYPES eşleşti)"))
                continue

            kind, is_frontmatter = classification

            remove_headings_and_notes(body)
            paragraphs = extract_paragraph_texts(body)

            rows.append(
                {
                    "basename": basename,
                    "href": item.href,
                    "types": types,
                    "kind": kind,
                    "is_frontmatter": is_frontmatter,
                    "paragraph_count": len(paragraphs),
                    "paragraphs": paragraphs,
                }
            )

    print("=" * 100)
    print(f"Toplam spine html dosyası (body'li) işlendi: {len(rows)}, atlanan: {len(skipped_files)}")
    print("=" * 100)

    print("\n--- ATLANAN DOSYALAR (_SKIP_TYPES eşleşti veya <body> yok) ---")
    for href, types, reason in skipped_files:
        print(f"  {href:45s} types={types} reason={reason}")

    print("\n--- HER SECTION (spine sırasıyla) ---")
    for r in rows:
        flag = "FRONTMATTER" if r["is_frontmatter"] else "CONTENT"
        numbered = "NUMBERED" if _NUMBERED_FILENAME_PATTERN.match(r["basename"]) else "unnumbered"
        print(
            f"  {r['href']:45s} kind={r['kind']:10s} {flag:12s} {numbered:11s} "
            f"paragraphs={r['paragraph_count']:4d}  types={r['types']}"
        )

    content_rows = [r for r in rows if not r["is_frontmatter"]]
    total_content_paragraphs = sum(r["paragraph_count"] for r in content_rows)
    print(f"\nToplam CONTENT (is_frontmatter=False) paragraf: {total_content_paragraphs}")

    core_28 = [r for r in content_rows if _NUMBERED_FILENAME_PATTERN.match(r["basename"])]
    extra = [r for r in content_rows if not _NUMBERED_FILENAME_PATTERN.match(r["basename"])]

    core_28_paragraphs = sum(r["paragraph_count"] for r in core_28)
    print(f"\n28 birime (letter-N / chapter-N deseni) uyan section sayısı: {len(core_28)}")
    print(f"Bu 28 birimin toplam paragraf sayısı: {core_28_paragraphs}")

    print(f"\n--- 28 BİRİM DIŞINDA KALAN AMA CONTENT (is_frontmatter=False) SAYILAN SECTION'LAR ({len(extra)}) ---")
    extra_total = 0
    for r in extra:
        extra_total += r["paragraph_count"]
        print(f"  {r['href']:45s} kind={r['kind']} paragraphs={r['paragraph_count']} types={r['types']}")
    print(f"Bunların toplam paragraf sayısı: {extra_total}")
    print(f"\nKontrol: {core_28_paragraphs} + {extra_total} = {core_28_paragraphs + extra_total} "
          f"(yukarıdaki 'toplam CONTENT paragraf' ile eşleşmeli: {total_content_paragraphs})")

    print("\n" + "=" * 100)
    print("--- 28 BİRİMİN İÇİNDEKİ İLK/SON 5 PARAGRAF ÖRNEKLERİ ---")
    print("=" * 100)
    for r in core_28:
        print(f"\n### {r['href']} (types={r['types']}, {r['paragraph_count']} paragraf) ###")
        print("  İLK 5:")
        for i, p in enumerate(r["paragraphs"][:5]):
            preview = p[:140].replace("\n", " ")
            print(f"    [{i}] {preview}")
        print("  SON 5:")
        start_idx = max(0, len(r["paragraphs"]) - 5)
        for i, p in enumerate(r["paragraphs"][-5:], start=start_idx):
            preview = p[:140].replace("\n", " ")
            print(f"    [{i}] {preview}")


if __name__ == "__main__":
    if len(sys.argv) != 2:
        print("Kullanım: python scripts/diagnose_frankenstein.py <epub_path>")
        sys.exit(1)
    main(sys.argv[1])
