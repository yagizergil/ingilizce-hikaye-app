"""Task 1 (markdown ingest formatı) + Task 6.3 testleri: frontmatter
doğrulama, section/paragraph ayrıştırma, inline markdown düzleştirme."""

from __future__ import annotations

from pathlib import Path

import pytest

from src.markdown.parser import MarkdownFrontmatterError, extract_markdown

FIXTURES_DIR = Path(__file__).parent / "fixtures"


def test_sample_story_a2_parses_into_expected_shape():
    book = extract_markdown(str(FIXTURES_DIR / "sample_story_a2.md"), "sample-story-a2")

    assert book.meta.title == "The Lost Key"
    assert book.meta.author == "Test Author"
    assert book.meta.target_level == "A2"
    assert book.meta.is_original is True
    assert book.meta.generation_prompt_version == "generate_story_a2_v1"
    assert book.meta.series is None

    assert len(book.sections) == 2
    assert book.sections[0].title == "The Locked Door"
    assert book.sections[1].title == "The Old House"
    assert all(not s.is_frontmatter for s in book.sections)
    assert len(book.sections[0].paragraphs) == 2
    assert len(book.sections[1].paragraphs) == 2


def test_missing_frontmatter_raises_specific_error(tmp_path):
    md_file = tmp_path / "no_frontmatter.md"
    md_file.write_text("# Chapter One\n\nJust some text.\n", encoding="utf-8")

    with pytest.raises(MarkdownFrontmatterError, match="frontmatter"):
        extract_markdown(str(md_file), "no-frontmatter")


def test_missing_required_field_names_the_field(tmp_path):
    md_file = tmp_path / "missing_title.md"
    md_file.write_text(
        "---\nauthor: Someone\ntarget_level: A2\n---\n\n# Ch\n\nText here.\n",
        encoding="utf-8",
    )

    with pytest.raises(MarkdownFrontmatterError, match="title"):
        extract_markdown(str(md_file), "missing-title")


def test_invalid_target_level_is_named_and_rejected(tmp_path):
    md_file = tmp_path / "bad_level.md"
    md_file.write_text(
        "---\ntitle: X\nauthor: Y\ntarget_level: Z9\n---\n\n# Ch\n\nText here.\n",
        encoding="utf-8",
    )

    with pytest.raises(MarkdownFrontmatterError, match="target_level"):
        extract_markdown(str(md_file), "bad-level")


def test_malformed_yaml_raises_specific_error(tmp_path):
    md_file = tmp_path / "bad_yaml.md"
    md_file.write_text(
        "---\ntitle: [unterminated\n---\n\n# Ch\n\nText.\n",
        encoding="utf-8",
    )

    with pytest.raises(MarkdownFrontmatterError):
        extract_markdown(str(md_file), "bad-yaml")


def test_inline_markdown_formatting_is_flattened(tmp_path):
    md_file = tmp_path / "formatted.md"
    md_file.write_text(
        "---\ntitle: X\nauthor: Y\ntarget_level: A1\n---\n\n"
        "# Chapter\n\n"
        "This is **bold** and *italic* and `code` and [a link](http://example.com).\n",
        encoding="utf-8",
    )

    book = extract_markdown(str(md_file), "formatted")
    text = book.sections[0].paragraphs[0].text
    assert "*" not in text
    assert "`" not in text
    assert "[" not in text and "](" not in text
    assert "bold" in text and "italic" in text and "code" in text and "a link" in text


def test_series_and_series_index_parsed(tmp_path):
    md_file = tmp_path / "series.md"
    md_file.write_text(
        "---\ntitle: X\nauthor: Y\ntarget_level: B1\nseries: my-series\nseries_index: 2\n"
        "---\n\n# Ch\n\nText.\n",
        encoding="utf-8",
    )

    book = extract_markdown(str(md_file), "series-book")
    assert book.meta.series == "my-series"
    assert book.meta.series_index == 2


def test_no_h1_sections_raises():
    with pytest.raises(MarkdownFrontmatterError):
        import tempfile

        with tempfile.NamedTemporaryFile(
            "w", suffix=".md", delete=False, encoding="utf-8"
        ) as f:
            f.write("---\ntitle: X\nauthor: Y\ntarget_level: A1\n---\n\nJust a paragraph.\n")
            path = f.name
        extract_markdown(path, "no-sections")
