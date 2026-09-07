from __future__ import annotations

from dataclasses import dataclass, field


@dataclass
class ParagraphData:
    order_index: int
    text: str


@dataclass
class SectionData:
    order_index: int
    title: str | None
    kind: str  # letter | chapter | story | part
    is_frontmatter: bool  # introduction/preface -> excluded from level metrics
    paragraphs: list[ParagraphData] = field(default_factory=list)
    # split_long_section (chunker.py) uzun bölümleri birden fazla
    # SectionData'ya böldüğünde, aynı orijinal EPUB dosyasından gelen
    # tüm parçalar AYNI source_index'i paylaşır — chunking'in mantıksal
    # birim sayısını bozmadığını doğrulamak için (bkz.
    # test_extract_integration.py). Bölünmemiş bir section için de
    # kendi benzersiz source_index'i vardır (tek parçalı "grup").
    source_index: int = -1


@dataclass
class BookMeta:
    slug: str
    title: str
    subtitle: str | None
    author: str | None
    # EPUB metadata'sındaki "file-as" (sıralanabilir, "Soyad, Ad") biçimi —
    # varsa. wikidata.py'ye alternatif arama ismi olarak verilir (bkz.
    # cli.py extract): bazı Wikidata aramalarında doğal sıra ("Jack
    # London") yerine bu biçim daha isabetli sonuç verebilir, ya da tam
    # tersi — ikisi de denenir.
    author_file_as: str | None
    author_death_year: int | None
    source: str
    source_url: str | None
    license: str | None
    license_text: str | None
    content_type: str  # novel | collection | short_story | article | play
    cover_image_bytes: bytes | None
    cover_image_ext: str | None
    # Bu pipeline şu an sadece ham Standard Ebooks kaynak metinlerini
    # işliyor (adapte/basitleştirilmiş sürümler değil) — bu yüzden
    # varsayılan False. validate_book bunu off_list_ratio eşiğini
    # seçmek için kullanır (bkz. validator.py).
    is_adaptation: bool = False
    # `author` (yukarıda) tek bir "birincil" yazarı taşır (display/geriye
    # dönük uyumluluk için) — all_authors HİÇBİR opf:role="aut" dc:creator'ı
    # düşürmeden hepsini taşır. Telif (copyright) kontrolü all_authors
    # üzerinden yapılmalı, author üzerinden DEĞİL (bkz. wikidata.py,
    # validator.py — June Moon bug'ı: ikinci yazar George S. Kaufman'ın
    # ölüm yılı hiç kontrol edilmiyordu).
    all_authors: list[str] = field(default_factory=list)
    # Çevirmenler (dc:contributor, opf:role="trl") — varsa aynı şekilde
    # telif kontrolüne dahil edilir (bkz. validator.py). Standard
    # Ebooks'ta genelde boş liste.
    all_translators: list[str] = field(default_factory=list)
    # --- Aşağıdaki 5 alan SADECE markdown ingest path'i (Task 1, orijinal/
    # LLM üretimi içerik) tarafından doldurulur; EPUB path'inde hepsi
    # varsayılan değerde kalır. is_original=True olduğunda: (1)
    # validator.py STRICT eşikleri (levels.<target_level>) uygular, (2)
    # cli.py validate() author_death_year (telif) kontrolünü tamamen
    # ATLAR — orijinal içeriğin public-domain telif meselesi yok.
    is_original: bool = False
    target_level: str | None = None  # A1 | A2 | B1 — frontmatter'dan
    # collection_books'a bağlanacak seri slug'ı, varsa (bkz. cli.py ingest
    # markdown dalı, Task 5).
    series: str | None = None
    series_index: int | None = None
    # Provenance — publish.py bunu public.books.generation_prompt_version'a
    # yazar (bkz. Task 4, pipeline/prompts/generate_story_a2.md).
    generation_prompt_version: str | None = None


@dataclass
class ExtractedBook:
    meta: BookMeta
    sections: list[SectionData]
    # Spine'daki tüm XHTML dosyalarının sıkıştırılmamış toplam byte
    # boyutu — validator.py'nin word_count/dosya-boyutu oran kontrolü
    # için (bkz. thresholds.yaml common.min_words_per_10kb_xhtml).
    total_xhtml_bytes: int = 0


@dataclass
class SentenceLengthStats:
    mean: float
    median: float
    p90: float
    max: int


@dataclass
class BookMetrics:
    word_count: int
    sentence_count: int
    paragraph_count: int
    unique_lemma_count: int
    ttr: float
    sentence_length: SentenceLengthStats
    cefr_distribution: dict[str, float]  # level -> % of tokens
    cumulative_coverage: dict[str, float]  # level -> cumulative % up to and incl. level
    off_list_ratio: float
    dialect_ratio: float
    dialogue_ratio: float
    archaic_ratio: float
    inferred_level: str
    lemma_counts: dict[str, int]  # lemma -> count in this book
    lemma_pos: dict[str, str]  # lemma -> dominant CEFR-pos bucket seen in this book
    lemma_levels: dict[str, str | None]  # lemma -> CEFR level (None = off-list)


@dataclass
class ValidationResult:
    passed: bool
    level: str
    reasons: list[str]
    auto_rejected: bool
    # Reddetmeye NEDEN OLMAYAN uyarılar (ör. ham kaynak metinde off_list
    # eşiği aşıldı ama is_adaptation=False olduğu için sadece uyarı).
    warnings: list[str] = field(default_factory=list)
    # SADECE is_original=True (STRICT mod, bkz. validator.py validate_book)
    # doldurulur: hedef seviyenin ÜZERİNDEKİ en sık 30 kelime, her biri
    # gerçek CEFR seviyesiyle, sıklığa göre azalan sırada. (lemma, cefr_level,
    # count) üçlüleri. Diğer tüm durumlarda boş liste.
    top_overlevel_words: list[tuple[str, str, int]] = field(default_factory=list)
