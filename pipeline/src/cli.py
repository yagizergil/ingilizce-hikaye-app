from __future__ import annotations

import re
import shutil
import sys
import time
import unicodedata
from pathlib import Path

import anthropic
import psycopg
import typer

# Windows terminals often default stdout/stderr to a legacy codepage (e.g.
# cp1254 for Turkish locale) that can't encode the ✓/✗/⚠ characters used
# throughout this CLI's output below, crashing with UnicodeEncodeError on
# the very first status line. Force UTF-8 explicitly (Python 3.7+) rather
# than stripping the symbols — this keeps the same readable output on every
# platform instead of degrading it for terminals that already handle UTF-8
# fine. `errors="replace"` is a last-resort safety net so an exotic
# character we haven't anticipated degrades to "?" instead of crashing the
# whole command.
for _stream in (sys.stdout, sys.stderr):
    if hasattr(_stream, "reconfigure"):
        _stream.reconfigure(encoding="utf-8", errors="replace")

from src import cache, db
from src.author_overrides import find_author_override, load_author_overrides
from src.cover import generate_placeholder_cover, upload_cover
from src.epub.parser import extract_epub
from src.lemmas import (
    LemmaGlossResult,
    estimate_cost,
    estimate_dry_run_cost,
    generate_glosses_streaming,
    get_existing_lemmas,
)
from src.markdown.parser import (
    MarkdownFrontmatterError,
    extract_markdown,
    read_markdown_frontmatter,
)
from src.models import BookMetrics, ExtractedBook, ValidationResult
from src.normalize import load_normalization_maps
from src.profiler import (
    compute_metrics,
    explain_offlist,
    load_cefr_vocabulary,
    load_spacy_model,
)
from src.publish import LEMMA_GLOSS_COVERAGE_THRESHOLD, publish_book
from src.settings import (
    AUTHOR_OVERRIDES_PATH,
    CEFRJ_CSV_PATH,
    NORMALIZATION_PATH,
    OCTANOVE_CSV_PATH,
    RAW_DIR,
    THRESHOLDS_PATH,
    load_settings,
)
from src.state import (
    all_status,
    get_ingested_file,
    record_ingested_file,
    require_stage_done,
    stage_run,
    status_for_book,
)
from src.validator import load_thresholds, validate_author_death_year, validate_book
from src.wikidata import WikidataBlockedError, combine_death_years, lookup_author_death_year

app = typer.Typer(add_completion=False, no_args_is_help=True)


def _slugify(text: str) -> str:
    text = unicodedata.normalize("NFKD", text).encode("ascii", "ignore").decode("ascii")
    text = re.sub(r"[^a-zA-Z0-9]+", "-", text).strip("-").lower()
    return text or "book"


def _print_timing(label: str, seconds: float, timing: bool) -> None:
    if timing:
        typer.echo(f"  ⏱  {label}: {seconds:.2f}s")


@app.command()
def preflight() -> None:
    """`.env`, DB bağlantısı, spaCy modeli, referans veri dosyalarının
    varlığını kontrol eder."""
    ok = True

    try:
        settings = load_settings()
        typer.echo("✓ .env değişkenleri okunabildi")
    except RuntimeError as exc:
        typer.echo(f"✗ {exc}")
        raise typer.Exit(1) from None

    try:
        with psycopg.connect(settings.database_url, connect_timeout=10) as conn:
            conn.execute("select 1")
        typer.echo("✓ Postgres bağlantısı (DATABASE_URL) çalışıyor")
    except Exception as exc:  # noqa: BLE001
        typer.echo(f"✗ Postgres bağlantısı başarısız: {exc}")
        ok = False

    try:
        load_spacy_model()
        typer.echo("✓ spaCy en_core_web_sm yüklü")
    except RuntimeError as exc:
        typer.echo(f"✗ {exc}")
        ok = False

    for path, label in (
        (CEFRJ_CSV_PATH, "CEFR-J kelime listesi"),
        (OCTANOVE_CSV_PATH, "Octanove C1/C2 kelime listesi"),
        (NORMALIZATION_PATH, "normalizasyon sözlüğü"),
        (THRESHOLDS_PATH, "eşik konfigürasyonu"),
        (AUTHOR_OVERRIDES_PATH, "yazar ölüm yılı override cache'i"),
    ):
        if path.exists():
            typer.echo(f"✓ {label} bulundu ({path.name})")
        else:
            typer.echo(f"✗ {label} eksik: {path}")
            ok = False

    if not settings.anthropic_api_key:
        typer.echo("⚠ ANTHROPIC_API_KEY boş — `lemmas` aşaması çalışmaz")

    if not ok:
        raise typer.Exit(1)
    typer.echo("\nHer şey hazır.")


@app.command()
def ingest(
    file: Path = typer.Option(..., "--file", exists=True, dir_okay=False),
    slug: str | None = typer.Option(None, "--slug"),
) -> None:
    """EPUB'ı ya da (Task 1) Markdown ingest formatındaki .md dosyasını
    pipeline/raw/ altına kopyalar ve state.db'ye kaydeder. Kaynak türü
    uzantıya göre belirlenir (.md -> markdown ingest path, aksi halde
    EPUB path) — extract() aşaması aynı ayrımı source_path'ten yapar."""
    book_slug = slug or _slugify(file.stem)
    RAW_DIR.mkdir(parents=True, exist_ok=True)
    dest = RAW_DIR / f"{book_slug}{file.suffix}"

    if file.suffix.lower() == ".md":
        # Erken doğrulama — frontmatter bozuksa kullanıcı bunu extract
        # aşamasına kadar beklemeden hemen öğrenir.
        try:
            read_markdown_frontmatter(str(file))
        except MarkdownFrontmatterError as exc:
            typer.echo(f"✗ {exc}")
            raise typer.Exit(1) from None

    with stage_run(book_slug, "ingest"):
        shutil.copy2(file, dest)
        record_ingested_file(book_slug, str(dest))

    typer.echo(f"✓ {file.name} -> {dest} (slug: {book_slug})")


@app.command()
def extract(
    book: str = typer.Option(..., "--book"),
    author_death_year: int | None = typer.Option(
        None,
        "--author-death-year",
        help=(
            "Wikidata çözemezse veya yanlış eşleştirirse elle gir "
            "(telif kontrolü için zorunlu)."
        ),
    ),
    timing: bool = typer.Option(False, "--timing"),
) -> None:
    """EPUB'dan paragraf metinlerini çıkarır, yazar ölüm yılını çözer,
    kapak hazırlar."""
    source_path = get_ingested_file(book)
    if not source_path:
        typer.echo(
            f"'{book}' hiç ingest edilmemiş. Önce `pipeline ingest --file <path>` çalıştır."
        )
        raise typer.Exit(1)

    is_markdown = source_path.lower().endswith(".md")

    with stage_run(book, "extract"):
        t0 = time.monotonic()
        if is_markdown:
            extracted = extract_markdown(source_path, book)
        else:
            extracted = extract_epub(source_path, book)
        _print_timing(
            "Markdown ayrıştırma" if is_markdown else "EPUB ayrıştırma",
            time.monotonic() - t0,
            timing,
        )

        if is_markdown:
            # Orijinal (is_original=True) içerik telif konusu değil —
            # public.books.author_death_year NULL kalır ve validate()
            # aşağıda copyright kontrolünü tamamen ATLAR (bkz. Task 6.4).
            typer.echo(
                f"  (is_original=True, target_level={extracted.meta.target_level} — "
                "author_death_year telif kontrolü atlanacak)"
            )
            _print_timing("Kapak hazırlama (yerel)", 0.0, timing)
            if not extracted.meta.cover_image_bytes:
                extracted.meta.cover_image_bytes = generate_placeholder_cover(
                    extracted.meta.title,
                    extracted.meta.author,
                    extracted.meta.target_level,
                )
                extracted.meta.cover_image_ext = "png"
            cache.save(book, "extracted", extracted)

            story_sections = [s for s in extracted.sections if not s.is_frontmatter]
            total_paragraphs = sum(len(s.paragraphs) for s in story_sections)
            typer.echo(
                f"✓ {len(story_sections)} bölüm, {total_paragraphs} paragraf çıkarıldı "
                f"(content_type={extracted.meta.content_type}, is_original=True)"
            )
            return

        t0 = time.monotonic()
        if author_death_year is not None:
            extracted.meta.author_death_year = author_death_year
            typer.echo(f"  (author_death_year elle verildi: {author_death_year})")
        else:
            # TÜM yazarlar (all_authors) + varsa TÜM çevirmenler
            # (all_translators) tek tek çözülür, en YÜKSEK (en geç
            # ölen) yıl "efektif" telif-gate yılı olarak kullanılır —
            # herhangi biri çözülemezse efektif yıl None kalır (aşağıdaki
            # validate_author_death_year zaten None'ı "belirlenemedi,
            # yayınlanamaz" olarak reddediyor, bkz. validator.py). Bu,
            # June Moon bug'ını düzeltir: Ring Lardner (öl. 1933) VE
            # George S. Kaufman (öl. 1961) ikisi de kontrol edilir,
            # sadece ilk yazar değil.
            #
            # ÇEVİRMEN NOTU (ürün sahibi gözden geçirmeli): çevirmenin
            # telif süresi yazarınkinden FARKLI olabilir (bazı
            # yargı alanlarında çeviri ayrı bir eser sayılır, bazılarında
            # değil) — burada aynı "ölüm+70" kuralı, aynı eşikle
            # uygulanıyor; bu hukuki nüans DOĞRULANMADI, sadece
            # muhafazakar bir varsayılan (aynı sıkı eşik) olarak
            # eklendi.
            names_to_resolve: list[tuple[str, list[str]]] = []
            for author_name in extracted.meta.all_authors or (
                [extracted.meta.author] if extracted.meta.author else []
            ):
                alt = (
                    [extracted.meta.author_file_as]
                    if extracted.meta.author_file_as
                    and author_name == extracted.meta.author
                    else []
                )
                names_to_resolve.append((author_name, alt))
            for translator_name in extracted.meta.all_translators:
                names_to_resolve.append((translator_name, []))

            per_name_years: list[int | None] = []
            overrides = None
            for name, alt_names in names_to_resolve:
                try:
                    resolved_year = lookup_author_death_year(name, alt_names=alt_names)
                except WikidataBlockedError as exc:
                    typer.echo(f"  (Wikidata: {exc})")
                    resolved_year = None

                if resolved_year is None:
                    if overrides is None:
                        overrides = load_author_overrides()
                    override_year = find_author_override(name, overrides)
                    if override_year is not None:
                        typer.echo(
                            f"  (Wikidata '{name}' için çözemedi, "
                            f"author_overrides.yaml kullanıldı: {override_year})"
                        )
                        resolved_year = override_year

                if resolved_year is None:
                    typer.echo(f"  ⚠ '{name}' için ölüm yılı çözülemedi")
                per_name_years.append(resolved_year)

            extracted.meta.author_death_year = combine_death_years(per_name_years)
        _print_timing("Yazar ölüm yılı çözümü", time.monotonic() - t0, timing)

        t0 = time.monotonic()
        if not extracted.meta.cover_image_bytes:
            extracted.meta.cover_image_bytes = generate_placeholder_cover(
                extracted.meta.title,
                extracted.meta.author,
                extracted.meta.target_level,
            )
            extracted.meta.cover_image_ext = "png"
        _print_timing("Kapak hazırlama (yerel)", time.monotonic() - t0, timing)

        cache.save(book, "extracted", extracted)

    # Frontmatter (introduction/preface/dedication/epigraph/endnotes) hiç
    # sayılmıyor — bunlar book_paragraphs'a da yazılmayacak (bkz.
    # publish.py), özet satırı gerçekte yayınlanacak olanı yansıtmalı.
    story_sections = [s for s in extracted.sections if not s.is_frontmatter]
    total_paragraphs = sum(len(s.paragraphs) for s in story_sections)
    typer.echo(
        f"✓ {len(story_sections)} bölüm, {total_paragraphs} paragraf çıkarıldı "
        f"(content_type={extracted.meta.content_type}, author_death_year="
        f"{extracted.meta.author_death_year})"
    )
    frontmatter_count = len(extracted.sections) - len(story_sections)
    if frontmatter_count:
        typer.echo(f"  ({frontmatter_count} frontmatter section hariç tutuldu)")
    if extracted.meta.author_death_year is None:
        typer.echo("⚠ author_death_year çözülemedi — validate aşamasında REDDEDİLECEK")


@app.command()
def profile(
    book: str = typer.Option(..., "--book"),
    explain_offlist_flag: bool = typer.Option(
        False,
        "--explain-offlist",
        help="off_list_ratio'nun normalizasyon öncesi/sonrası kırılımını ve "
        "en sık off-list lemma'ları kategorize ederek göster.",
    ),
    timing: bool = typer.Option(False, "--timing"),
) -> None:
    """CEFR kapsamı, cümle uzunlukları, dialect/off-list oranlarını hesaplar."""
    require_stage_done(book, "extract")
    extracted = cache.load(book, "extracted", ExtractedBook)

    with stage_run(book, "profile"):
        t0 = time.monotonic()
        vocab = load_cefr_vocabulary()
        norm_maps = load_normalization_maps()
        nlp = load_spacy_model()
        _print_timing("Model/sözlük yükleme", time.monotonic() - t0, timing)

        t0 = time.monotonic()
        metrics = compute_metrics(extracted, vocab, norm_maps, nlp)
        _print_timing("Metrik hesaplama", time.monotonic() - t0, timing)

        offlist_explanation = None
        if explain_offlist_flag:
            t0 = time.monotonic()
            offlist_explanation = explain_offlist(extracted, vocab, norm_maps, nlp)
            _print_timing("Off-list analizi", time.monotonic() - t0, timing)

        cache.save(book, "metrics", metrics)

    typer.echo(f"✓ {metrics.word_count} kelime, {metrics.sentence_count} cümle")
    typer.echo(f"  Tahmini seviye: {metrics.inferred_level}")
    typer.echo(
        f"  Ort. cümle: {metrics.sentence_length.mean:.1f}  "
        f"Medyan: {metrics.sentence_length.median:.1f}  "
        f"P90: {metrics.sentence_length.p90:.1f}  Max: {metrics.sentence_length.max}"
    )
    typer.echo(f"  off_list_ratio: %{metrics.off_list_ratio:.2f}")
    typer.echo(f"  dialect_ratio: %{metrics.dialect_ratio:.2f}")
    typer.echo(f"  dialogue_ratio: %{metrics.dialogue_ratio:.2f}")
    typer.echo(f"  archaic_ratio: %{metrics.archaic_ratio:.3f}")
    for level in ("A1", "A2", "B1", "B2", "C1", "C2"):
        typer.echo(f"  {level} kümülatif kapsam: %{metrics.cumulative_coverage[level]:.2f}")

    if offlist_explanation is not None:
        typer.echo("\n--- OFF-LIST AÇIKLAMASI ---")
        typer.echo(
            f"  Normalizasyon ÖNCESİ off_list: %{offlist_explanation.off_list_ratio_before:.2f}"
        )
        typer.echo(
            f"  Normalizasyon SONRASI off_list: %{offlist_explanation.off_list_ratio_after:.2f}"
        )
        typer.echo(
            f"  Fark (normalizasyonun düşürdüğü): %{offlist_explanation.difference:.2f}"
        )
        typer.echo(f"\n  En sık {len(offlist_explanation.top_offlist)} off-list lemma:")
        for item in offlist_explanation.top_offlist:
            arrow = (
                f"{item.raw_lemma} -> {item.normalized_lemma}"
                if item.raw_lemma != item.normalized_lemma
                else item.raw_lemma
            )
            typer.echo(f"    {item.count:5d}x  {arrow:35s} [{item.category}]")


@app.command()
def validate(
    book: str = typer.Option(..., "--book"),
    level: str | None = typer.Option(
        None, "--level", help="Zorla belirli bir seviyeye karşı doğrula"
    ),
) -> None:
    """Eşik ihlallerini kontrol eder (pipeline/config/thresholds.yaml)."""
    require_stage_done(book, "profile")
    metrics = cache.load(book, "metrics", BookMetrics)
    extracted = cache.load(book, "extracted", ExtractedBook)

    with stage_run(book, "validate"):
        thresholds = load_thresholds()
        result = validate_book(
            metrics,
            thresholds,
            level or extracted.meta.target_level,
            is_adaptation=extracted.meta.is_adaptation,
            total_xhtml_bytes=extracted.total_xhtml_bytes,
            content_type=extracted.meta.content_type,
            is_original=extracted.meta.is_original,
        )
        # Task 6.4: is_original=True (orijinal/LLM üretimi içerik) telif
        # (copyright) kontrolünden TAMAMEN muaf — public domain kaynaklı
        # değil, bir yazarın ölüm yılına bağlı bir telif süresi kavramı
        # yok. EPUB path'i (is_original=False, varsayılan) bu kontrolü
        # her zaman uygulamaya devam eder.
        if not extracted.meta.is_original:
            copyright_reasons = validate_author_death_year(
                extracted.meta.author_death_year, thresholds
            )
            result.reasons.extend(copyright_reasons)
            if copyright_reasons:
                result.passed = False
        cache.save(book, "validation", result)

    if result.passed:
        typer.echo(f"✓ '{book}' {result.level} seviyesi için GEÇERLİ")
        for warning in result.warnings:
            typer.echo(f"  ⚠ {warning}")
    else:
        typer.echo(f"✗ '{book}' {result.level} seviyesi için REDDEDİLDİ:")
        for reason in result.reasons:
            typer.echo(f"  - {reason}")
        if result.auto_rejected:
            typer.echo("  (otomatik red — dialect_ratio eşiği aşıldı)")
        _print_top_overlevel_words(result)
        raise typer.Exit(1)


def _print_top_overlevel_words(result: ValidationResult) -> None:
    if not result.top_overlevel_words:
        return
    typer.echo(
        f"\n  Hedef seviyenin ({result.level}) ÜZERİNDEKİ en sık "
        f"{len(result.top_overlevel_words)} kelime (sıklığa göre azalan):"
    )
    for lemma, cefr_level, count in result.top_overlevel_words:
        typer.echo(f"    {count:5d}x  {lemma:25s} [{cefr_level}]")


@app.command()
def lemmas(
    book: str = typer.Option(..., "--book"),
    dry_run: bool = typer.Option(False, "--dry-run"),
    timing: bool = typer.Option(False, "--timing"),
) -> None:
    """Kitaptaki lemma'ları çıkarır, eksik tr_gloss'ları Anthropic ile üretir."""
    require_stage_done(book, "profile")
    metrics = cache.load(book, "metrics", BookMetrics)
    settings = load_settings()

    candidates = sorted(
        (lemma, metrics.lemma_pos.get(lemma, "noun")) for lemma in metrics.lemma_counts
    )

    if dry_run:
        # Okuma serbest (kaç lemma eksik olduğunu görmek için DB'ye
        # bakılır), ama Anthropic ASLA çağrılmaz ve hiçbir şey yazılmaz.
        # stage_run'a hiç girilmez — dry-run bir aşamayı "done" yapmaz.
        with db.connect(settings.database_url) as conn:
            existing = get_existing_lemmas(conn, candidates)
        missing = [c for c in candidates if c not in existing]
        estimated = estimate_dry_run_cost(len(missing))
        typer.echo(
            f"[dry-run] {len(candidates)} benzersiz lemma, {len(existing)} zaten mevcut, "
            f"{len(missing)} yeni üretilecekti (kaba tahmini maliyet: ~${estimated:.4f}). "
            "Anthropic çağrılmadı, hiçbir şey yazılmadı."
        )
        return

    if not settings.anthropic_api_key:
        typer.echo("✗ ANTHROPIC_API_KEY tanımlı değil, lemma çevirisi yapılamaz")
        raise typer.Exit(1)

    with stage_run(book, "lemmas"):
        with db.connect(settings.database_url) as conn:
            t0 = time.monotonic()
            existing = get_existing_lemmas(conn, candidates)
            missing = [c for c in candidates if c not in existing]
            _print_timing("Mevcut lemma kontrolü", time.monotonic() - t0, timing)

            typer.echo(
                f"{len(candidates)} benzersiz lemma, {len(existing)} zaten mevcut, "
                f"{len(missing)} yeni üretilecek"
            )

            if missing:
                client = anthropic.Anthropic(api_key=settings.anthropic_api_key)

                def on_batch_success(
                    results: list[LemmaGlossResult],
                    batch_index: int,
                    total_batches: int,
                    batch_input_tokens: int,
                    batch_output_tokens: int,
                ) -> None:
                    # Her batch KENDİ transaction'ında hemen yazılır — bir
                    # sonraki batch patlasa bile bu satırlar kalıcı olur.
                    # Tekrar çalıştırıldığında get_existing_lemmas bunları
                    # zaten-mevcut sayıp atlar.
                    rows = [
                        (r.lemma, r.pos, metrics.lemma_levels.get(r.lemma), r.tr_gloss)
                        for r in results
                    ]
                    with conn.transaction():
                        db.copy_rows(
                            conn,
                            "public.lemmas",
                            ["lemma", "pos", "cefr_level", "tr_gloss"],
                            rows,
                            label=f"lemmas batch {batch_index}",
                        )
                    batch_cost = estimate_cost(batch_input_tokens, batch_output_tokens)
                    typer.echo(
                        f"  batch {batch_index}/{total_batches} — {len(results)} kelime — "
                        f"~${batch_cost:.4f}"
                    )

                t0 = time.monotonic()
                stats, failed_batches = generate_glosses_streaming(
                    client, missing, on_batch_success
                )
                _print_timing("Anthropic çeviri üretimi", time.monotonic() - t0, timing)

                cost = estimate_cost(
                    stats.input_tokens,
                    stats.output_tokens,
                    stats.cache_creation_tokens,
                    stats.cache_read_tokens,
                )
                typer.echo(
                    f"✓ {stats.generated}/{stats.requested} yeni tr_gloss üretildi "
                    f"({stats.batches} batch denendi, {len(failed_batches)} başarısız, "
                    f"{stats.input_tokens} girdi + {stats.output_tokens} çıktı + "
                    f"{stats.cache_creation_tokens} cache-yazma + "
                    f"{stats.cache_read_tokens} cache-okuma token, "
                    f"{stats.elapsed_seconds:.1f}s, ~${cost:.4f})"
                )
                if failed_batches:
                    typer.echo(f"⚠ {len(failed_batches)} batch başarısız oldu:")
                    for fb in failed_batches:
                        typer.echo(
                            f"  batch {fb.batch_index}: {fb.error} "
                            f"({len(fb.candidates)} kelime kayıp)"
                        )
                    typer.echo(
                        "  `pipeline lemmas` tekrar çalıştırılırsa sadece bu eksikler "
                        "üretilir (başarılı batch'ler zaten yazıldı)."
                    )
            else:
                typer.echo("✓ Yeni lemma yok, hepsi mevcut")


@app.command()
def publish(
    book: str = typer.Option(..., "--book"),
    force: bool = typer.Option(
        False,
        "--force",
        help="Lemma tr_gloss kapsam önkoşulunu atla (geliştirme içindir — "
        "kitap eksik çevirilerle de 'published' yazılabilir).",
    ),
    dry_run: bool = typer.Option(False, "--dry-run"),
    timing: bool = typer.Option(False, "--timing"),
) -> None:
    """Tek transaction, toplu COPY ile canlıya yazar. Idempotent."""
    require_stage_done(book, "validate")
    extracted = cache.load(book, "extracted", ExtractedBook)
    metrics = cache.load(book, "metrics", BookMetrics)
    validation = cache.load(book, "validation", ValidationResult)
    settings = load_settings()

    if dry_run:
        story_section_count = sum(1 for s in extracted.sections if not s.is_frontmatter)
        typer.echo(
            f"[dry-run] '{book}' yayınlanacaktı: durum="
            f"{'published' if validation.passed else 'needs_review'}, "
            f"{story_section_count} bölüm, {metrics.word_count} kelime "
            "(lemma tr_gloss kapsamı burada kontrol edilmez, sadece gerçek publish'te)"
        )
        return

    with stage_run(book, "publish"):
        t0 = time.monotonic()
        cover_url = None
        if extracted.meta.cover_image_bytes:
            cover_url = upload_cover(
                settings,
                book,
                extracted.meta.cover_image_bytes,
                extracted.meta.cover_image_ext or "png",
            )
        _print_timing("Kapak yükleme", time.monotonic() - t0, timing)

        t0 = time.monotonic()
        with db.connect(settings.database_url) as conn:
            result = publish_book(conn, extracted, metrics, validation, cover_url, force=force)
        _print_timing("DB yazma (COPY)", time.monotonic() - t0, timing)

    typer.echo(
        f"✓ '{book}' yayınlandı: status={result.status}, book_id={result.book_id}, "
        f"{result.section_count} bölüm, {result.paragraph_count} paragraf, "
        f"{result.lemma_count} lemma"
    )
    typer.echo(
        f"  lemma tr_gloss kapsamı: %{result.lemma_gloss_coverage:.1f} "
        f"({result.missing_gloss_count} eksik)"
    )
    if result.status != "published":
        if result.missing_gloss_count > 0 and validation.passed:
            typer.echo(
                f"⚠ status='needs_review' — lemma tr_gloss kapsamı %98'in altında "
                f"({result.missing_gloss_count} kelimenin çevirisi eksik). "
                "`pipeline lemmas --book "
                f"{book}` çalıştırıp tekrar publish et, ya da --force ile atla."
            )
        else:
            typer.echo(
                "⚠ status='needs_review' — validate aşaması geçmedi, elle gözden geçir"
            )


@app.command()
def run(
    file: Path = typer.Option(..., "--file", exists=True, dir_okay=False),
    slug: str | None = typer.Option(None, "--slug"),
    author_death_year: int | None = typer.Option(None, "--author-death-year"),
    force: bool = typer.Option(
        False, "--force", help="publish'teki lemma tr_gloss kapsam önkoşulunu atla."
    ),
    timing: bool = typer.Option(False, "--timing"),
    dry_run: bool = typer.Option(False, "--dry-run"),
) -> None:
    """ingest -> extract -> profile -> validate -> lemmas -> publish, sırayla."""
    book_slug = slug or _slugify(file.stem)
    started = time.monotonic()

    ingest(file=file, slug=book_slug)
    extract(book=book_slug, author_death_year=author_death_year, timing=timing)
    # explain_offlist_flag AÇIKÇA False geçilmeli — typer komutları düz
    # Python fonksiyonu olarak çağrılınca (CLI parse'ı devre dışı),
    # atlanan bir parametrenin varsayılanı typer.Option(...) NESNESİNİN
    # KENDİSİ olur (bool False değil), bu nesne truthy olduğu için
    # "if explain_offlist_flag:" her zaman True dönerdi — bayrak hiç
    # verilmese bile ~18s'lik off-list analizi her `run`'da çalışıyordu.
    profile(book=book_slug, explain_offlist_flag=False, timing=timing)
    try:
        validate(book=book_slug, level=None)
    except typer.Exit:
        typer.echo(
            "\nValidate başarısız oldu ama devam ediliyor (needs_review olarak yayınlanacak)."
        )
    lemmas(book=book_slug, dry_run=dry_run, timing=timing)
    publish(book=book_slug, force=force, dry_run=dry_run, timing=timing)

    typer.echo(f"\nToplam süre: {time.monotonic() - started:.2f}s")


@app.command()
def audit() -> None:
    """Yayındaki (status='published') tüm kitapları kalite/telif
    eşiklerine karşı denetler; hiçbir şey yazmaz, sadece raporlar."""
    settings = load_settings()
    thresholds = load_thresholds()
    min_word_count = thresholds["common"]["min_total_word_count"]
    max_death_year = thresholds["copyright"]["max_author_death_year"]

    with (
        psycopg.connect(settings.database_url, connect_timeout=10) as conn,
        conn.cursor() as cur,
    ):
        cur.execute(
            """
            select id, slug, title, word_count, author_death_year
            from public.books
            where status = 'published'
            order by slug
            """
        )
        books = cur.fetchall()

        rows: list[dict[str, object]] = []
        for book_id, slug, title, word_count, author_death_year in books:
            problems: list[str] = []

            word_count = word_count or 0
            if word_count < min_word_count:
                problems.append(f"word_count {word_count} < {min_word_count}")

            cur.execute(
                "select count(*) from public.book_sections where book_id = %s",
                (book_id,),
            )
            section_count = cur.fetchone()[0]
            cur.execute(
                """
                select count(*) from public.book_paragraphs bp
                join public.book_sections bs on bs.id = bp.section_id
                where bs.book_id = %s
                """,
                (book_id,),
            )
            paragraph_count = cur.fetchone()[0]
            avg_paragraphs = (paragraph_count / section_count) if section_count else 0.0
            if section_count and avg_paragraphs < 3:
                problems.append(f"avg_paragraphs/section {avg_paragraphs:.1f} < 3")

            if author_death_year is None:
                problems.append("author_death_year NULL (çözülemedi)")
            elif author_death_year > max_death_year:
                problems.append(f"author_death_year {author_death_year} > {max_death_year}")

            cur.execute(
                """
                select
                  count(*) as total,
                  count(*) filter (
                    where exists (
                      select 1 from public.lemmas l
                      where l.lemma = bl.lemma
                        and l.tr_gloss is not null and l.tr_gloss <> ''
                    )
                  ) as with_gloss
                from public.book_lemmas bl
                where bl.book_id = %s
                """,
                (book_id,),
            )
            total_lemmas, with_gloss = cur.fetchone()
            gloss_pct = (with_gloss / total_lemmas * 100) if total_lemmas else 100.0
            if gloss_pct < LEMMA_GLOSS_COVERAGE_THRESHOLD:
                problems.append(f"tr_gloss kapsamı %{gloss_pct:.1f} < %{LEMMA_GLOSS_COVERAGE_THRESHOLD:.0f}")

            cur.execute(
                """
                select count(*) from public.book_sections
                where book_id = %s and (title is null or trim(title) = '')
                """,
                (book_id,),
            )
            untitled_sections = cur.fetchone()[0]
            if untitled_sections:
                problems.append(f"{untitled_sections} bölümde başlık eksik")

            rows.append(
                {
                    "slug": slug,
                    "title": title,
                    "word_count": word_count,
                    "byte_ratio": "N/A (total_xhtml_bytes kalıcı değil)",
                    "avg_paragraphs": avg_paragraphs,
                    "author_death_year": author_death_year,
                    "gloss_pct": gloss_pct,
                    "untitled_sections": untitled_sections,
                    "problems": problems,
                }
            )

    flagged = [r for r in rows if r["problems"]]

    typer.echo(
        f"{'slug':<45} {'word_count':>10} {'avg_par/sec':>11} "
        f"{'death_yr':>8} {'gloss%':>7} {'no_title':>8}  sorunlar"
    )
    typer.echo("-" * 130)
    for r in flagged:
        death_year_str = str(r["author_death_year"]) if r["author_death_year"] is not None else "NULL"
        typer.echo(
            f"{r['slug']:<45} {r['word_count']:>10} {r['avg_paragraphs']:>11.1f} "
            f"{death_year_str:>8} {r['gloss_pct']:>6.1f}% {r['untitled_sections']:>8}  "
            f"byte_ratio={r['byte_ratio']}"
        )
        for p in r["problems"]:
            typer.echo(f"    - {p}")

    typer.echo("-" * 130)
    typer.echo(f"Toplam yayındaki kitap: {len(rows)}, sorunlu: {len(flagged)}")


@app.command()
def status(book: str | None = typer.Option(None, "--book")) -> None:
    """Her aşamanın durumunu gösterir (state.db)."""
    rows = status_for_book(book) if book else all_status()
    if not rows:
        typer.echo("Henüz hiçbir kitap işlenmedi.")
        return

    for row in rows:
        duration = f"{row['duration_seconds']:.2f}s" if row["duration_seconds"] else "-"
        marker = {"done": "✓", "failed": "✗", "running": "…"}.get(str(row["status"]), "?")
        line = f"{marker} {row['book_slug']:<24} {row['stage']:<10} {row['status']:<8} {duration}"
        if row["status"] == "failed" and row["detail"]:
            line += f"  ({row['detail']})"
        typer.echo(line)

    if book:
        # state.db'nin dışında, canlı DB'deki lemma tr_gloss kapsamını da
        # göster — bu, lemma-bazlı (pos'suz) bir yaklaşıklık: book_lemmas
        # tabloda pos tutmuyor, bu yüzden "bu lemma'nın HERHANGİ bir pos
        # varyantının çevirisi var mı" sorusuna bakar. publish'in kendi
        # önkoşul kontrolü (lemma, pos) çiftine göre daha kesin ölçer.
        try:
            settings = load_settings()
            with (
                psycopg.connect(settings.database_url, connect_timeout=10) as conn,
                conn.cursor() as cur,
            ):
                cur.execute(
                    """
                    select
                      count(*) as total,
                      count(*) filter (
                        where exists (
                          select 1 from public.lemmas l
                          where l.lemma = bl.lemma
                            and l.tr_gloss is not null and l.tr_gloss <> ''
                        )
                      ) as with_gloss
                    from public.book_lemmas bl
                    where bl.book_id = (select id from public.books where slug = %s)
                    """,
                    (book,),
                )
                coverage_row = cur.fetchone()
            if coverage_row and coverage_row[0]:
                total, with_gloss = coverage_row
                pct = (with_gloss / total * 100) if total else 0.0
                typer.echo(f"\n{total} lemma, {with_gloss} tr_gloss var (%{pct:.0f})")
        except Exception as exc:  # noqa: BLE001 - best-effort, DB'ye erişilemezse sessizce atla
            typer.echo(f"\n(lemma kapsamı alınamadı — DB'ye erişilemedi: {exc})")


@app.command()
def check(
    file: Path = typer.Option(..., "--file", exists=True, dir_okay=False),
) -> None:
    """(Task 3) Markdown dosyasını ayrıştırır -> profiller -> STRICT
    eşiklere karşı doğrular ve TAM raporu stdout'a basar. Hiçbir DB
    yazması / ingest / publish yan etkisi YOK (state.db'ye bile
    dokunmaz) — saf bir dry-run, ürün sahibinin bir taslak hikayeyi
    yayınlamadan önce hızlıca kontrol etmesi için.

    Kullanım: `pipeline check --file pipeline/tests/fixtures/sample_story_a2.md`
    """
    if file.suffix.lower() != ".md":
        typer.echo("✗ `pipeline check` sadece .md dosyaları destekler (Task 1 markdown formatı)")
        raise typer.Exit(1)

    try:
        extracted = extract_markdown(str(file), _slugify(file.stem))
    except MarkdownFrontmatterError as exc:
        typer.echo(f"✗ Frontmatter hatası: {exc}")
        raise typer.Exit(1) from None

    vocab = load_cefr_vocabulary()
    norm_maps = load_normalization_maps()
    nlp = load_spacy_model()
    thresholds = load_thresholds()
    metrics = compute_metrics(extracted, vocab, norm_maps, nlp, thresholds)

    result = validate_book(
        metrics,
        thresholds,
        extracted.meta.target_level,
        is_adaptation=extracted.meta.is_adaptation,
        total_xhtml_bytes=extracted.total_xhtml_bytes,
        content_type=extracted.meta.content_type,
        is_original=True,
    )

    typer.echo(f"'{extracted.meta.title}' — hedef seviye: {extracted.meta.target_level}")
    typer.echo(f"  {metrics.word_count} kelime, {metrics.sentence_count} cümle")
    typer.echo(
        f"  Ort. cümle: {metrics.sentence_length.mean:.1f}  Max: {metrics.sentence_length.max}"
    )
    typer.echo(f"  off_list_ratio: %{metrics.off_list_ratio:.2f}")
    coverage = metrics.cumulative_coverage.get(extracted.meta.target_level or "", 0.0)
    typer.echo(f"  {extracted.meta.target_level} kümülatif kapsam: %{coverage:.2f}")

    if result.passed:
        typer.echo(f"\n✓ '{file.name}' {result.level} STRICT eşiklerini GEÇTİ (needs_review değil)")
        for warning in result.warnings:
            typer.echo(f"  ⚠ {warning}")
    else:
        typer.echo(f"\n✗ '{file.name}' {result.level} STRICT eşiklerini GEÇEMEDİ (needs_review):")
        for reason in result.reasons:
            typer.echo(f"  - {reason}")
        _print_top_overlevel_words(result)
        raise typer.Exit(1)


if __name__ == "__main__":
    app()
