"""EPUB (Standard Ebooks / GITenberg tarzı) ayrıştırma.

Okuma sırası her zaman content.opf'un <spine>'ından gelir — dosya adından
çıkarım yapılmaz (bazı öykü derlemelerinde chapter-N deseni yoktur).
"""

from __future__ import annotations

import re
import zipfile
from dataclasses import dataclass
from pathlib import PurePosixPath
from typing import Any

from lxml import etree

from src.epub.chunker import split_long_section
from src.epub.cleaner import (
    collect_epub_types,
    extract_drama_paragraph_texts,
    extract_paragraph_texts,
    extract_section_title,
    find_body,
    is_drama_body,
    parse_xhtml,
    remove_headings_and_notes,
)
from src.models import BookMeta, ExtractedBook, ParagraphData, SectionData

_OPF_NS = {
    "opf": "http://www.idpf.org/2007/opf",
    "dc": "http://purl.org/dc/elements/1.1/",
}
_CONTAINER_NS = {"c": "urn:oasis:names:tc:opendocument:xmlns:container"}

# Bu epub:type'lara sahip dosyalar tamamen atlanır (kitabın hikaye
# içeriğine dahil değil).
_SKIP_TYPES = {
    "titlepage",
    "imprint",
    "halftitlepage",
    "halftitle",
    "colophon",
    "uncopyright",
    "toc",
    "loi",
    "copyright-page",
    "volume",
}
# Bu epub:type'lar hikaye dışı ama saklanır (metriklere dahil edilmez).
# endnotes/glossary/afterword/appendix Standard Ebooks'ta yaygın — bunları
# frontmatter setine almazsak paragraf/kelime sayıları şişiyor (bkz.
# Frankenstein: 795 paragraf çıktı, 703 olmalıydı — fark bu tür ek
# materyallerden geliyordu).
_FRONTMATTER_TYPES = {
    "introduction",
    "preface",
    "foreword",
    "dedication",
    "epigraph",
    "afterword",
    "endnotes",
    "glossary",
    "appendix",
}

_CHAPTER_PATTERN = re.compile(r"chapter-\d+", re.IGNORECASE)
# content_type tespiti için: dosya adının TAMAMI bu desenle eşleşmeli
# (chapter-12.xhtml gibi), kısmi eşleşme değil — "carmen.xhtml" gibi
# bağımsız isimli dosyaları yanlışlıkla saymamak için.
_NUMBERED_FILENAME_PATTERN = re.compile(r"^(chapter|part|letter)-\d+$", re.IGNORECASE)
_LETTER_TYPE = "letter"
_NOVEL_SIGNAL_THRESHOLD = 0.6


@dataclass
class ManifestItem:
    id: str
    href: str
    media_type: str
    properties: set[str]


def _read_container_opf_path(zf: zipfile.ZipFile) -> str:
    container = etree.fromstring(zf.read("META-INF/container.xml"))
    rootfile = container.find(".//c:rootfile", _CONTAINER_NS)
    if rootfile is None:
        raise ValueError("META-INF/container.xml içinde rootfile bulunamadı")
    full_path = rootfile.get("full-path")
    if not full_path:
        raise ValueError("rootfile full-path özniteliği eksik")
    return str(full_path)


def _text_or_none(el: etree._Element | None) -> str | None:
    if el is None or el.text is None:
        return None
    text = el.text.strip()
    return text or None


def _parse_manifest(opf_root: etree._Element) -> dict[str, ManifestItem]:
    items: dict[str, ManifestItem] = {}
    for item in opf_root.findall(".//opf:manifest/opf:item", _OPF_NS):
        item_id = item.get("id", "")
        items[item_id] = ManifestItem(
            id=item_id,
            href=item.get("href", ""),
            media_type=item.get("media-type", ""),
            properties=set((item.get("properties") or "").split()),
        )
    return items


def _parse_spine_idrefs(opf_root: etree._Element) -> list[str]:
    idrefs: list[str] = []
    for itemref in opf_root.findall(".//opf:spine/opf:itemref", _OPF_NS):
        if itemref.get("linear", "yes") == "no":
            continue
        idref = itemref.get("idref")
        if idref:
            idrefs.append(idref)
    return idrefs


def _find_role_creators(
    metadata: etree._Element, tag: str, role: str
) -> list[etree._Element]:
    """metadata altındaki TÜM `tag` (dc:creator veya dc:contributor)
    elementlerinden, opf:role (EPUB2) veya <meta property="role"
    refines="#id"> (EPUB3) ile `role`ye (ör. "aut", "trl") işaretlenmiş
    olanların TAMAMINI döner — sadece ilkini/birini değil. June Moon
    örneği: Ring Lardner (öl. 1933) VE George S. Kaufman (öl. 1961) her
    ikisi de opf:role="aut" ile ayrı dc:creator elementleri; sadece
    ilkini almak ikinci yazarın telif durumunun hiç kontrol edilmemesine
    yol açıyordu (bkz. görev tanımı — June Moon bug'ı)."""
    elements = metadata.findall(f"dc:{tag}", _OPF_NS)
    matched: list[etree._Element] = []
    opf_role_attr = f"{{{_OPF_NS['opf']}}}role"

    for el in elements:
        if el.get(opf_role_attr) == role:
            matched.append(el)

    for el in elements:
        if el in matched:
            continue
        el_id = el.get("id")
        if not el_id:
            continue
        for meta_el in metadata.findall("opf:meta", _OPF_NS):
            if (
                meta_el.get("property") == "role"
                and meta_el.get("refines") == f"#{el_id}"
                and (meta_el.text or "").strip() == role
            ):
                matched.append(el)
                break

    return matched


def _find_author_creator(metadata: etree._Element) -> etree._Element | None:
    """Standard Ebooks/EPUB3 kitaplarında birden fazla dc:creator olabilir
    (yazar + çevirmen + illüstratör, ör. Call of the Wild'ın bazı
    baskılarında). İlkini körü körüne almak yanlış kişiyi (Wikidata
    aramasında yanlış QID'ye düşen bir isim) seçebilir. Öncelik: EPUB2
    tarzı opf:role="aut" özniteliği -> EPUB3 tarzı
    <meta property="role" refines="#id">aut</meta> -> hiçbiri
    işaretlenmemişse İLK dc:creator (eski davranış, geriye dönük uyumlu)."""
    creators = metadata.findall("dc:creator", _OPF_NS)
    if not creators:
        return None
    if len(creators) == 1:
        return creators[0]

    opf_role_attr = f"{{{_OPF_NS['opf']}}}role"
    for creator in creators:
        if creator.get(opf_role_attr) == "aut":
            return creator

    for creator in creators:
        creator_id = creator.get("id")
        if not creator_id:
            continue
        for meta_el in metadata.findall("opf:meta", _OPF_NS):
            if (
                meta_el.get("property") == "role"
                and meta_el.get("refines") == f"#{creator_id}"
                and (meta_el.text or "").strip() == "aut"
            ):
                return creator

    return creators[0]


def _find_file_as(metadata: etree._Element, creator_el: etree._Element) -> str | None:
    """dc:creator'ın sıralanabilir ("Soyad, Ad") biçimi, varsa. EPUB2
    tarzı opf:file-as özniteliği ya da EPUB3 tarzı meta refines ile."""
    opf_file_as_attr = f"{{{_OPF_NS['opf']}}}file-as"
    file_as_attr = creator_el.get(opf_file_as_attr)
    if file_as_attr and file_as_attr.strip():
        return str(file_as_attr.strip())

    creator_id = creator_el.get("id")
    if not creator_id:
        return None
    for meta_el in metadata.findall("opf:meta", _OPF_NS):
        if meta_el.get("property") == "file-as" and meta_el.get("refines") == f"#{creator_id}":
            return _text_or_none(meta_el)
    return None


def _parse_metadata(opf_root: etree._Element) -> dict[str, Any]:
    metadata = opf_root.find(".//opf:metadata", _OPF_NS)
    if metadata is None:
        return {}

    creator_el = _find_author_creator(metadata)

    # Tüm opf:role="aut" (ya da EPUB3 refines eşdeğeri) dc:creator'lar —
    # BookMeta.author (tek string, display için) hâlâ _find_author_creator
    # ile tek bir "birincil" yazarı seçiyor (geriye dönük uyumluluk), ama
    # all_authors hiçbir yazarı sessizce düşürmüyor (bkz. copyright gate,
    # validator.py + wikidata.py).
    author_els = _find_role_creators(metadata, "creator", "aut")
    if not author_els and creator_el is not None:
        author_els = [creator_el]
    all_authors = [name for el in author_els if (name := _text_or_none(el))]

    # Çevirmenler Standard Ebooks'ta dc:creator değil dc:contributor
    # olarak, opf:role="trl" ile işaretlenir (bkz. Kafka "The Castle"
    # örneği: Willa Muir + Edwin Muir, ikisi de dc:contributor/trl).
    translator_els = _find_role_creators(metadata, "contributor", "trl")
    all_translators = [name for el in translator_els if (name := _text_or_none(el))]

    return {
        "title": _text_or_none(metadata.find("dc:title", _OPF_NS)),
        "creator": _text_or_none(creator_el),
        "creator_file_as": _find_file_as(metadata, creator_el) if creator_el is not None else None,
        "all_authors": all_authors,
        "all_translators": all_translators,
        "rights": _text_or_none(metadata.find("dc:rights", _OPF_NS)),
        "source": _text_or_none(metadata.find("dc:source", _OPF_NS)),
        "identifier": _text_or_none(metadata.find("dc:identifier", _OPF_NS)),
    }


def _classify_section(body_el: etree._Element, href: str) -> tuple[str, bool] | None:
    """Returns (kind, is_frontmatter) or None if the file should be skipped
    entirely."""
    # Standard Ebooks epub:type'ı genelde <body epub:type="bodymatter">
    # üzerinde değil, içindeki <section epub:type="chapter"|"letter"|
    # "introduction"> gibi alt elementler üzerindedir — body + tüm alt
    # elementlerin epub:type birleşimine bakılır (bkz. collect_epub_types).
    types = collect_epub_types(body_el)
    basename = PurePosixPath(href).stem.lower()

    if types & _SKIP_TYPES:
        return None

    # GÜÇLÜ İÇERİK SİNYALLERİ (letter/chapter/bodymatter) frontmatter
    # kontrolünden ÖNCE değerlendirilir. Standard Ebooks'ta bir öykünün
    # kendisi <body epub:type="bodymatter"> olsa bile İÇİNDE küçük gömülü
    # bir <p epub:type="dedication"> olabilir (ör. Oscar Wilde'ın "A House
    # of Pomegranates" derlemesinde her masal ayrı bir kişiye ithaf
    # edilmiş: <p epub:type="dedication">To Margaret Lady Brooke...</p>,
    # masalın <header>'ı içinde). collect_epub_types TÜM alt elementlerin
    # union'ını aldığı için eski sıralama (önce frontmatter kontrolü) bu
    # 4 masalın TAMAMINI frontmatter sanıp atlıyordu — gövde atlanmadı,
    # dosyanın KENDİSİ hiç publish edilmedi (bkz. Wilde derlemesi doğrulama
    # raporu: 9 section beklenirken sadece 5 farklı öykü çıkmıştı).
    if _LETTER_TYPE in types or basename.startswith("letter"):
        return "letter", False

    if "chapter" in types or _CHAPTER_PATTERN.search(basename):
        return "chapter", False

    if "bodymatter" in types or "story" in types:
        return "story", False

    if types & _FRONTMATTER_TYPES:
        return "part", True

    # Sınıflandırılamayan içerik (bilinen epub:type token'larından
    # hiçbiri yok): varsayılan olarak metriklerden HARİÇ tutulur, ama
    # tamamen atılmaz (is_frontmatter=True — book_paragraphs'a yazılır,
    # ileride elle gözden geçirilebilir). Önceki davranış (varsayılan
    # olarak DAHİL etmek) endnotes/glossary gibi bilinmeyen ek
    # materyalleri sessizce hikaye içeriğine karıştırıp paragraf/kelime
    # sayılarını şişiriyordu (bkz. Frankenstein: 795 paragraf çıktı,
    # 703 olmalıydı).
    return "part", True


def _detect_content_type(basenames: list[str], kinds: list[str]) -> str:
    """Birincil sinyal: spine dosya adlarının chapter-N/part-N/letter-N gibi
    SIRALI numaralı desende olma oranı (carmen.xhtml, the-water-cure.xhtml
    gibi bağımsız isimli dosyalar bu deseni tutturmaz). İkincil sinyal:
    epub:type="chapter"/"letter" olarak sınıflandırılan bölüm oranı. İkisinin
    daha güçlü olanı kullanılır — bir kitapta dosya adları numaralı ama
    epub:type eksik/tutarsız olabilir, ya da tersi."""
    total = len(basenames)
    if total == 0:
        return "novel"

    numbered = sum(1 for b in basenames if _NUMBERED_FILENAME_PATTERN.match(b))
    chapter_or_letter_kind = sum(1 for k in kinds if k in ("chapter", "letter"))
    signal_ratio = max(numbered, chapter_or_letter_kind) / total

    return "novel" if signal_ratio >= _NOVEL_SIGNAL_THRESHOLD else "collection"


def extract_epub(epub_path: str, slug: str) -> ExtractedBook:
    with zipfile.ZipFile(epub_path) as zf:
        opf_path = _read_container_opf_path(zf)
        opf_root = etree.fromstring(zf.read(opf_path))
        opf_dir = PurePosixPath(opf_path).parent

        manifest = _parse_manifest(opf_root)
        spine_idrefs = _parse_spine_idrefs(opf_root)
        metadata = _parse_metadata(opf_root)

        sections: list[SectionData] = []
        content_basenames: list[str] = []
        content_kinds: list[str] = []
        order_index = 0
        source_index = 0
        is_play = False
        # Sağlık kontrolü (validator.py) için: spine'daki TÜM XHTML
        # dosyalarının sıkıştırılmamış (decompressed) toplam byte boyutu.
        # word_count'un dosya boyutuna göre çok düşük çıktığı (ör. tablo
        # tabanlı oyun diyaloğunun <p> selector'ünce yakalanamaması gibi)
        # durumları yakalamak için — bkz. ExtractedBook.total_xhtml_bytes.
        total_xhtml_bytes = 0

        for idref in spine_idrefs:
            item = manifest.get(idref)
            if item is None or "html" not in item.media_type:
                continue

            href_path = str(opf_dir / item.href) if str(opf_dir) != "." else item.href
            content = zf.read(href_path)
            total_xhtml_bytes += len(content)
            root = parse_xhtml(content)
            body = find_body(root)
            if body is None:
                continue

            if is_drama_body(body):
                is_play = True

            classification = _classify_section(body, item.href)
            if classification is None:
                continue
            kind, is_frontmatter = classification

            # Başlık, kaldırılmadan ÖNCE okunmalı — remove_headings_and_notes
            # h1-h6'yı tamamen siliyor (bkz. extract_section_title
            # docstring'i: eski kod bu sildikten SONRA h1 arıyordu, bu
            # yüzden title her zaman None dönüyordu).
            title = extract_section_title(body)

            remove_headings_and_notes(body)
            if is_drama_body(body):
                # Oyunlarda diyalog <p> değil <table><tr> yapısındadır
                # (bkz. cleaner.py extract_drama_paragraph_texts
                # docstring'i) — normal <p> selector'ü neredeyse hiçbir
                # şey yakalamaz.
                paragraph_texts = extract_drama_paragraph_texts(body)
            else:
                paragraph_texts = extract_paragraph_texts(body)
            if not paragraph_texts:
                continue

            section = SectionData(
                order_index=order_index,
                title=title,
                kind=kind,
                is_frontmatter=is_frontmatter,
                paragraphs=[
                    ParagraphData(order_index=i, text=t) for i, t in enumerate(paragraph_texts)
                ],
            )

            for chunk in split_long_section(section):
                chunk.order_index = order_index
                chunk.source_index = source_index
                sections.append(chunk)
                order_index += 1
            source_index += 1

            if not is_frontmatter:
                content_basenames.append(PurePosixPath(item.href).stem.lower())
                content_kinds.append(kind)

        # Oyun tespiti (is_play), novel/collection sezgisel yönteminden
        # ÖNCE değerlendirilir — bir oyunun sahne/perde dosya adları
        # (act-1.xhtml gibi) chapter-N deseniyle karışabilir, ama asıl
        # sinyal <body epub:type="... z3998:drama ...">'dır.
        content_type = "play" if is_play else _detect_content_type(content_basenames, content_kinds)

        cover_bytes, cover_ext = _extract_cover(zf, manifest, opf_dir)

        meta = BookMeta(
            slug=slug,
            title=metadata.get("title") or slug,
            subtitle=None,
            author=metadata.get("creator"),
            author_file_as=metadata.get("creator_file_as"),
            all_authors=metadata.get("all_authors") or [],
            all_translators=metadata.get("all_translators") or [],
            author_death_year=None,  # wikidata.py tarafından ayrıca doldurulur
            source="Standard Ebooks",
            source_url=metadata.get("source"),
            license="CC0"
            if metadata.get("rights") and "public domain" in (metadata["rights"] or "").lower()
            else None,
            license_text=metadata.get("rights"),
            content_type=content_type,
            cover_image_bytes=cover_bytes,
            cover_image_ext=cover_ext,
        )

        return ExtractedBook(meta=meta, sections=sections, total_xhtml_bytes=total_xhtml_bytes)


def _extract_cover(
    zf: zipfile.ZipFile, manifest: dict[str, ManifestItem], opf_dir: PurePosixPath
) -> tuple[bytes | None, str | None]:
    for item in manifest.values():
        if "cover-image" in item.properties:
            href_path = str(opf_dir / item.href) if str(opf_dir) != "." else item.href
            try:
                data = zf.read(href_path)
            except KeyError:
                return None, None
            ext = PurePosixPath(item.href).suffix.lstrip(".")
            return data, ext
    return None, None
