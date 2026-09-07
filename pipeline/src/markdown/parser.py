"""Markdown ingest formatı ayrıştırma (Task 1, orijinal/LLM üretimi içerik
için — bkz. CLAUDE.md ADR'leri, `pipeline ingest --file story.md`).

Format:

    ---
    title: ...
    author: ...
    target_level: A1 | A2 | B1
    genres: [...]
    themes: [...]
    series: <slug>       # opsiyonel
    series_index: <n>    # opsiyonel
    ---

    # Bölüm Başlığı

    Paragraf metni...

YAML frontmatter ZORUNLU — eksik/bozuksa ya da zorunlu bir alan
(title/author/target_level) eksik/geçersizse `MarkdownFrontmatterError`
fırlatılır (hangi alanın sorunlu olduğunu AÇIKÇA söyleyerek, genel bir
traceback değil).

Bağımlılık notu: pyproject.toml zaten `pyyaml>=6.0` içeriyor (validator.py
thresholds.yaml'ı bununla okuyor) — `python-frontmatter` gibi ayrı bir
paket EKLENMEDİ, frontmatter blok ayırma (`---` sınırları) burada elle,
YAML gövdesi ise mevcut `yaml.safe_load` ile ayrıştırılıyor. Yeni bir
bağımlılık eklemek "Basitlik önce gelir" ilkesine (CLAUDE.md) aykırı
olurdu — ihtiyaç zaten pyyaml ile karşılanıyor."""

from __future__ import annotations

import re

import yaml

from src.models import BookMeta, ExtractedBook, ParagraphData, SectionData

_VALID_LEVELS = {"A1", "A2", "B1"}
_FRONTMATTER_RE = re.compile(r"\A---\s*\n(.*?\n)---\s*\n?(.*)\Z", re.DOTALL)
_H1_RE = re.compile(r"^#\s+(.+?)\s*$")

# Basit inline markdown biçimlendirmesini düz metne indirger. Sıra önemli:
# link/görsel önce (metin kısmını korumak için), sonra bold/italic/kod.
_INLINE_PATTERNS: list[tuple[re.Pattern[str], str]] = [
    (re.compile(r"!\[([^\]]*)\]\([^)]*\)"), r"\1"),  # ![alt](url) -> alt
    (re.compile(r"\[([^\]]+)\]\([^)]*\)"), r"\1"),  # [text](url) -> text
    (re.compile(r"\*\*\*([^*]+)\*\*\*"), r"\1"),  # ***bold italic***
    (re.compile(r"___([^_]+)___"), r"\1"),
    (re.compile(r"\*\*([^*]+)\*\*"), r"\1"),  # **bold**
    (re.compile(r"__([^_]+)__"), r"\1"),
    (re.compile(r"\*([^*]+)\*"), r"\1"),  # *italic*
    (re.compile(r"(?<!\w)_([^_]+)_(?!\w)"), r"\1"),
    (re.compile(r"`([^`]+)`"), r"\1"),  # `code`
]


class MarkdownFrontmatterError(ValueError):
    """Markdown frontmatter eksik, bozuk, ya da zorunlu bir alan
    (title/author/target_level) eksik/geçersiz olduğunda fırlatılır.
    Mesaj her zaman HANGİ alanın sorunlu olduğunu açıkça belirtir —
    çağıran taraf (cli.py) bunu doğrudan kullanıcıya gösterir."""


def _flatten_inline_markdown(text: str) -> str:
    for pattern, replacement in _INLINE_PATTERNS:
        text = pattern.sub(replacement, text)
    return text


def _split_frontmatter(raw: str) -> tuple[str, str]:
    match = _FRONTMATTER_RE.match(raw)
    if not match:
        raise MarkdownFrontmatterError(
            "YAML frontmatter bulunamadı ya da bozuk — dosya `---` ile başlayıp "
            "ikinci bir `---` ile kapanan bir YAML bloğuyla başlamalı "
            "(bkz. pipeline/prompts/generate_story_a2.md örnek format)."
        )
    return match.group(1), match.group(2)


def _parse_frontmatter_yaml(raw_yaml: str) -> dict[str, object]:
    try:
        data = yaml.safe_load(raw_yaml)
    except yaml.YAMLError as exc:
        raise MarkdownFrontmatterError(f"YAML frontmatter ayrıştırılamadı: {exc}") from exc
    if not isinstance(data, dict):
        raise MarkdownFrontmatterError(
            "YAML frontmatter bir key-value haritası (mapping) olmalı, "
            f"{type(data).__name__} bulundu."
        )
    return data


def _require_str_field(data: dict[str, object], field: str) -> str:
    value = data.get(field)
    if not isinstance(value, str) or not value.strip():
        raise MarkdownFrontmatterError(
            f"frontmatter alanı '{field}' eksik ya da boş — zorunlu bir metin alanı."
        )
    return value.strip()


def _require_target_level(data: dict[str, object]) -> str:
    value = data.get("target_level")
    if not isinstance(value, str) or value.strip().upper() not in _VALID_LEVELS:
        raise MarkdownFrontmatterError(
            f"frontmatter alanı 'target_level' geçersiz: {value!r} — "
            f"şunlardan biri olmalı: {', '.join(sorted(_VALID_LEVELS))}."
        )
    return value.strip().upper()


def _optional_str_list(data: dict[str, object], field: str) -> list[str]:
    value = data.get(field)
    if value is None:
        return []
    if not isinstance(value, list) or not all(isinstance(v, str) for v in value):
        raise MarkdownFrontmatterError(
            f"frontmatter alanı '{field}' bir string listesi olmalı, {value!r} bulundu."
        )
    return [v.strip() for v in value]


def _optional_str(data: dict[str, object], field: str) -> str | None:
    value = data.get(field)
    if value is None:
        return None
    if not isinstance(value, str) or not value.strip():
        raise MarkdownFrontmatterError(f"frontmatter alanı '{field}' boş olamaz.")
    return value.strip()


def _optional_int(data: dict[str, object], field: str) -> int | None:
    value = data.get(field)
    if value is None:
        return None
    if not isinstance(value, int) or isinstance(value, bool):
        raise MarkdownFrontmatterError(
            f"frontmatter alanı '{field}' bir tam sayı olmalı: {value!r}"
        )
    return value


def _parse_sections(body: str) -> list[SectionData]:
    """`# ` (H1) ile başlayan yeni bir bölüm; boş satırla ayrılmış
    bloklar o bölümün paragrafları. H1'den önceki metin (varsa) sessizce
    yok sayılır — düzyazı format, drama/dialogue özel işlemesi yok."""
    lines = body.splitlines()
    sections: list[SectionData] = []
    current_title: str | None = None
    current_lines: list[str] = []
    order_index = 0

    def _flush() -> None:
        nonlocal order_index
        if current_title is None:
            return
        raw_blocks = re.split(r"\n\s*\n", "\n".join(current_lines).strip())
        paragraphs = [
            ParagraphData(order_index=i, text=_flatten_inline_markdown(" ".join(block.split())))
            for i, block in enumerate(b for b in raw_blocks if b.strip())
        ]
        if paragraphs:
            sections.append(
                SectionData(
                    order_index=order_index,
                    title=current_title,
                    kind="chapter",
                    is_frontmatter=False,
                    paragraphs=paragraphs,
                    source_index=order_index,
                )
            )
            order_index += 1

    for line in lines:
        h1_match = _H1_RE.match(line)
        if h1_match:
            _flush()
            current_title = _flatten_inline_markdown(h1_match.group(1))
            current_lines = []
        else:
            current_lines.append(line)
    _flush()

    if not sections:
        raise MarkdownFrontmatterError(
            "gövdede hiç `# Bölüm Başlığı` (H1) bulunamadı — en az bir bölüm gerekli."
        )
    return sections


def extract_markdown(md_path: str, slug: str) -> ExtractedBook:
    """EPUB path'inin (epub/parser.py extract_epub) markdown karşılığı —
    aynı ExtractedBook/BookMeta/SectionData/ParagraphData dataclass'larını
    üretir, böylece profiler.py/validator.py/publish.py hiç
    değişmeden her iki kaynaktan gelen kitapları işleyebilir."""
    with open(md_path, encoding="utf-8") as f:
        raw = f.read()

    raw_yaml, body = _split_frontmatter(raw)
    data = _parse_frontmatter_yaml(raw_yaml)

    title = _require_str_field(data, "title")
    author = _require_str_field(data, "author")
    target_level = _require_target_level(data)
    genres = _optional_str_list(data, "genres")
    themes = _optional_str_list(data, "themes")
    series = _optional_str(data, "series")
    series_index = _optional_int(data, "series_index")
    generation_prompt_version = _optional_str(data, "generation_prompt_version")
    # genres/themes şu an publish.py tarafından hiç yazılmıyor (EPUB
    # path'i de yazmıyor — bkz. publish.py _upsert_book), bu yüzden burada
    # ayrıştırılıp doğrulanıyor ama BookMeta'ya taşınmıyor; publish şeması
    # genres/themes'i desteklemeye başladığında buraya eklenmeli.
    #
    # ARA ÇÖZÜM (2026-09-07): yayınlanmış hikâyelerin tür/tema alanları
    # `scripts/backfill_genres_themes.py` ile frontmatter'dan doğrudan
    # veritabanına yazılıyor. Yeni bir hikâye publish edildikten sonra o
    # script'i çalıştırmak gerekiyor — publish.py bu alanları desteklemeye
    # başladığında hem bu `del` hem o script silinmeli.
    del genres, themes

    sections = _parse_sections(body)

    meta = BookMeta(
        slug=slug,
        title=title,
        subtitle=None,
        author=author,
        author_file_as=None,
        author_death_year=None,
        source="original",
        source_url=None,
        license="proprietary",
        license_text=None,
        content_type="short_story",
        cover_image_bytes=None,
        cover_image_ext=None,
        is_adaptation=False,
        all_authors=[author],
        all_translators=[],
        is_original=True,
        target_level=target_level,
        series=series,
        series_index=series_index,
        generation_prompt_version=generation_prompt_version,
    )

    total_bytes = len(raw.encode("utf-8"))
    return ExtractedBook(meta=meta, sections=sections, total_xhtml_bytes=total_bytes)


def read_markdown_frontmatter(md_path: str) -> dict[str, object]:
    """cli.py'nin genres/themes/series/series_index/target_level gibi
    EPUB şemasında olmayan alanlara erişmesi için — extract_markdown ile
    aynı frontmatter'ı ayrıştırır ama ham dict döner."""
    with open(md_path, encoding="utf-8") as f:
        raw = f.read()
    raw_yaml, _body = _split_frontmatter(raw)
    return _parse_frontmatter_yaml(raw_yaml)
