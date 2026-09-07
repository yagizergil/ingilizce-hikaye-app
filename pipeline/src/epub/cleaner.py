"""EPUB XHTML gövde temizleme yardımcıları."""

from __future__ import annotations

import re
import unicodedata

from lxml import etree

_XHTML_NS = "http://www.w3.org/1999/xhtml"
_EPUB_NS = "http://www.idpf.org/2007/ops"
_NSMAP = {"x": _XHTML_NS, "epub": _EPUB_NS}

_INVISIBLE_CHARS = {
    "⁠",  # word joiner
    "﻿",  # BOM / zero-width no-break space
    "­",  # soft hyphen
}


def strip_invisible_chars(text: str) -> str:
    return "".join(ch for ch in text if ch not in _INVISIBLE_CHARS)


def collapse_whitespace(text: str) -> str:
    text = re.sub(r"[ \t ]+", " ", text)
    text = re.sub(r"\n\s*\n+", "\n", text)
    return text.strip()


_HEADING_TAGS = ("h1", "h2", "h3", "h4", "h5", "h6")


def extract_section_title(body: etree._Element) -> str | None:
    """Section başlığını döner — remove_headings_and_notes'tan ÖNCE
    çağrılmalı (o fonksiyon başlığı siler). h1'den h6'ya ilk bulunan
    kullanılır — Standard Ebooks genelde <h2> kullanır (ör. Frankenstein:
    <h2><span epub:type="se:label">Chapter</span>
    <span epub:type="z3998:roman">I</span></h2>), sadece h1 aramak hiçbir
    zaman eşleşmiyordu. İçindeki <span>'lar sırayla birleştirilir
    ("Chapter" + "I" -> "Chapter I"); span yoksa düz metin alınır.
    Başlık gerçekten yoksa None döner (uydurma yok)."""
    for tag in _HEADING_TAGS:
        heading = body.find(f".//x:{tag}", _NSMAP)
        if heading is None:
            continue
        spans = heading.findall(".//x:span", _NSMAP)
        if spans:
            parts = [collapse_whitespace("".join(s.itertext())) for s in spans]
            title = " ".join(p for p in parts if p)
        else:
            title = collapse_whitespace("".join(heading.itertext()))
        return title or None
    return None


def remove_headings_and_notes(root: etree._Element) -> None:
    for tag in ("h1", "h2", "h3", "h4", "h5", "h6"):
        for el in root.findall(f".//x:{tag}", _NSMAP):
            el.getparent().remove(el)

    for a in root.findall(".//x:a", _NSMAP):
        epub_type = a.get(f"{{{_EPUB_NS}}}type", "")
        if "noteref" in epub_type.split():
            a.getparent().remove(a)


def extract_paragraph_texts(section_el: etree._Element) -> list[str]:
    """<p> elementlerinin metnini, iç link/emphasis tag'lerini metne
    düzleştirerek çıkarır. Not linkleri ve başlıklar bu noktada zaten
    kaldırılmış olmalı (remove_headings_and_notes önce çağrılır)."""
    paragraphs: list[str] = []
    for p in section_el.findall(".//x:p", _NSMAP):
        text = "".join(p.itertext())
        text = unicodedata.normalize("NFC", text)
        text = strip_invisible_chars(text)
        text = collapse_whitespace(text)
        if text:
            paragraphs.append(text)
    return paragraphs


_PERSONA_TYPE = "z3998:persona"


def _clean_text(raw: str) -> str:
    text = "".join(raw) if not isinstance(raw, str) else raw
    text = unicodedata.normalize("NFC", text)
    text = strip_invisible_chars(text)
    return collapse_whitespace(text)


def extract_drama_paragraph_texts(section_el: etree._Element) -> list[str]:
    """Standard Ebooks oyun (z3998:drama) diyaloglarını çıkarır. Oyunlarda
    diyalog <p> değil <table><tr><td>konuşmacı</td><td>replik</td></tr>
    yapısındadır (bkz. ADR/görev tanımı — cleaner.py'nin eski
    extract_paragraph_texts'i sadece <p> aradığı için bu satırların hemen
    hemen hiçbirini yakalamıyordu).

    Biçim kararı (belgeleniyor, DB'de yeni bir alan YOK — tek bir paragraf
    metni içine kodlanıyor):
      - Diyalog satırı: "KONUŞMACI: replik metni" — konuşmacı adı BÜYÜK
        HARF, replikten ":" ile ayrılır. Büyük harf tercih edildi çünkü
        oyun metinlerinde alışılmış bir konvansiyon ve düz metin içinde
        diyalog/sahne yönergesini görsel olarak ayırt etmeyi kolaylaştırır.
      - Sahne yönergesi (stage direction) satırı, konuşmacısı olmayan
        <tr> (ör. "Enter Parker." veya "Lady Windermere is at table R.,
        arranging roses..."): parantez içine alınır, ör.
        "(Lady Windermere is at table R., arranging roses in a blue bowl.)"
        — konuşmacı öneki YOK, diyalogdan açıkça ayırt edilebilir.
      - <table> öncesi/dışı sahne tasviri <p> (ör. "Scene: Morning-room
        of Lord Windermere's house...") normal bir anlatı paragrafı olarak
        olduğu gibi eklenir.

    Her <tr>, tek bir çıktı paragrafına karşılık gelir. Konuşmacı, ilgili
    <td>'nin kendisinde epub:type="z3998:persona" ile işaretlenmişse
    diyalog satırıdır; aksi halde (konuşmacı <td>'si boşsa, kişi adı
    içerikte sadece iç içe <b epub:type="z3998:persona"> olarak geçse
    bile) satır bir sahne yönergesi kabul edilir."""
    paragraphs: list[str] = []
    table_tag = f"{{{_XHTML_NS}}}table"
    p_tag = f"{{{_XHTML_NS}}}p"
    tr_tag = f"{{{_XHTML_NS}}}tr"
    td_tag = f"{{{_XHTML_NS}}}td"

    for el in section_el.iter():
        if el.tag == p_tag:
            if any(a.tag == table_tag for a in el.iterancestors()):
                continue
            text = _clean_text("".join(el.itertext()))
            if text:
                paragraphs.append(text)
            continue

        if el.tag != tr_tag:
            continue

        tds = [c for c in el if c.tag == td_tag]
        if len(tds) < 2:
            continue
        speaker_td, content_td = tds[0], tds[1]
        speaker_types = get_epub_types(speaker_td)
        speaker_text = _clean_text("".join(speaker_td.itertext()))
        content_text = _clean_text("".join(content_td.itertext()))
        if not content_text:
            continue

        if _PERSONA_TYPE in speaker_types and speaker_text:
            paragraphs.append(f"{speaker_text.upper()}: {content_text}")
        else:
            paragraphs.append(f"({content_text})")

    return paragraphs


def parse_xhtml(content: bytes) -> etree._Element:
    parser = etree.XMLParser(recover=True, resolve_entities=False)
    return etree.fromstring(content, parser=parser)


def get_epub_types(el: etree._Element) -> set[str]:
    raw = el.get(f"{{{_EPUB_NS}}}type", "")
    return set(raw.split())


def collect_epub_types(root_el: etree._Element) -> set[str]:
    """Standard Ebooks epub:type'ı genelde <body> üzerinde değil, içindeki
    <section epub:type="chapter">/<section epub:type="introduction"> gibi
    iç içe elementler üzerinde taşır (<body epub:type="bodymatter"> sadece
    genel bir sarmalayıcıdır). Sadece body'ye bakmak "introduction"/
    "chapter"/"letter" gibi asıl sınıflandırma sinyalini kaçırır — bu
    yüzden body + TÜM alt elementlerdeki epub:type token'larının
    birleşimini döneriz."""
    types = set(get_epub_types(root_el))
    for el in root_el.iter():
        types |= get_epub_types(el)
    return types


def find_body(root: etree._Element) -> etree._Element | None:
    return root.find(".//x:body", _NSMAP)


_DRAMA_TYPE = "z3998:drama"


def is_drama_body(body_el: etree._Element) -> bool:
    """<body epub:type="... z3998:drama ...">'ya sahip mi? Standard
    Ebooks oyunlarında (ör. Oscar Wilde'ın "Lady Windermere's Fan"ı) bu
    işaret doğrudan <body> üzerindedir."""
    return _DRAMA_TYPE in get_epub_types(body_el)
