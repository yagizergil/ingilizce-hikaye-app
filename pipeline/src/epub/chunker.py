"""Uzun bölümleri paragraf sınırında alt-bölümlere ayırır."""

from __future__ import annotations

from src.models import ParagraphData, SectionData

MAX_SECTION_WORDS = 4000
TARGET_CHUNK_WORDS = 1500


def _word_count(text: str) -> int:
    return len(text.split())


def split_long_section(section: SectionData) -> list[SectionData]:
    total_words = sum(_word_count(p.text) for p in section.paragraphs)
    if total_words <= MAX_SECTION_WORDS:
        return [section]

    chunks: list[list[ParagraphData]] = [[]]
    current_words = 0
    for paragraph in section.paragraphs:
        para_words = _word_count(paragraph.text)
        if current_words >= TARGET_CHUNK_WORDS and chunks[-1]:
            chunks.append([])
            current_words = 0
        chunks[-1].append(paragraph)
        current_words += para_words

    result: list[SectionData] = []
    for i, chunk_paragraphs in enumerate(chunks, start=1):
        title = f"{section.title} ({i}/{len(chunks)})" if section.title else None
        result.append(
            SectionData(
                order_index=section.order_index,  # renumbered by caller across whole book
                title=title,
                kind=section.kind,
                is_frontmatter=section.is_frontmatter,
                paragraphs=[
                    ParagraphData(order_index=idx, text=p.text)
                    for idx, p in enumerate(chunk_paragraphs)
                ],
            )
        )
    return result
