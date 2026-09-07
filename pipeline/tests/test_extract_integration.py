"""Uçtan uca extract -> profile -> validate, gerçek EPUB'larla, AĞSIZ
(Wikidata sorgusu YAPILMAZ — bu testler wikidata.lookup_author_death_year'ı
çağırmaz, sadece extract_epub + profiler + validator zincirini test eder).

Referans ölçümler (iki gerçek kitapta doğrulanmış, profiler'ın doğruluğunun
kanıtı): bu sayıları üretmiyorsa normalizasyon/profiling katmanında hata
var demektir. Kelime/cümle sayıları için ARALIK kullanılıyor (tek sayı
değil) — spaCy sürümüne göre birkaç yüz oynayabilir. Paragraf sayısı
tamamen yapısal (spaCy'ye bağımlı değil), o yüzden sıkı tolerans.
"""

from __future__ import annotations

import re

import pytest

from src.epub.parser import extract_epub
from src.profiler import compute_metrics
from src.validator import load_thresholds, validate_book


def test_frankenstein_reference_measurements(frankenstein_epub, cefr_vocab, norm_maps, nlp):
    book = extract_epub(str(frankenstein_epub), "frankenstein")

    # Frankenstein bir ROMAN: 4 mektup (letter-1..4) + 24 bölüm
    # (chapter-1..24), sıralı numaralı dosya adı deseninde -> novel.
    assert book.meta.content_type == "novel"

    # 762 KESİN referans — 703 önceki bir turda kullanılan basit bir <p>
    # regex scriptinden geliyordu ve letter-2 (11 paragraf), letter-3
    # (9 paragraf), letter-4 (39 paragraf) dosyalarını hiç saymamıştı
    # (703 + 59 = 762). Teşhis scriptiyle (scripts/diagnose_frankenstein.py)
    # doğrulandı: 28 birim doğru tespit ediliyor, frontmatter doğru
    # ayrılıyor, 28 birim dışında content sayılan section yok. 762 doğru.
    story_sections = [s for s in book.sections if not s.is_frontmatter]

    # 28 MANTIKSAL birim: 4 mektup (letter-1..4) + 24 bölüm (chapter-1..24).
    # Ama chunker.py uzun bölümleri ~1500 kelimelik parçalara böldüğü için
    # (bkz. epub/chunker.py, MAX_SECTION_WORDS=4000) DB'ye/section listesine
    # yazılan section SAYISI 33 — bu YANLIŞ değil, kasıtlı chunking'in
    # sonucu (dry-run çıktısı da 33 doğruluyor). 28 rakamı önceki bir
    # turda benim hatamdı — chunking'i hesaba katmamıştım.
    assert len(story_sections) == 33

    # Chunking'in mantıksal birim sayısını BOZMADIĞINI ayrıca doğrula:
    # her orijinal EPUB dosyası (bölünmüş olsa bile) TEK bir source_index
    # paylaşır — kaç FARKLI source_index varsa o kadar mantıksal birim
    # vardır, section sayısından bağımsız.
    logical_units = {s.source_index for s in story_sections}
    assert len(logical_units) == 28

    total_paragraphs = sum(len(s.paragraphs) for s in story_sections)
    assert total_paragraphs == pytest.approx(762, abs=2)

    # SORUN 3 REGRESYONU: section.title her zaman None dönüyordu (bkz.
    # extract_section_title docstring'i — remove_headings_and_notes'tan
    # SONRA h1 aranıyordu, o fonksiyon h1-h6'yı zaten silmişti). Standard
    # Ebooks'ta Frankenstein "Letter I"/"Chapter I" biçiminde <h2> +
    # <span> kullanır. En az mektup/bölümlerin çoğunda başlık dolu olmalı.
    titled = [s for s in story_sections if s.title]
    assert len(titled) >= 25, f"beklenenden az başlık dolu: {len(titled)}/33"
    assert any(re.match(r"^(Letter|Chapter)\s+[IVXLCDM]+$", s.title or "") for s in story_sections)

    metrics = compute_metrics(book, cefr_vocab, norm_maps, nlp)

    assert metrics.paragraph_count == pytest.approx(762, abs=2)
    # 3400+ ve 77000+ önceki turda TAHMİNDİ, ölçüm değildi (703->762
    # düzeltmesinden sonra artışı kafadan atmıştım). Gerçek ölçüm:
    # 3309 cümle / 74858 kelime. Aralık bunun etrafında.
    assert 3250 <= metrics.sentence_count <= 3400
    assert 74_000 <= metrics.word_count <= 76_000
    assert 21.0 <= metrics.sentence_length.mean <= 23.0
    assert 150 <= metrics.sentence_length.max <= 180
    # %87.7 referansı da 703 gibi eksik veriden (letter-2/3/4 sayılmamış)
    # geliyordu. Gerçek ölçüm %85.18.
    assert 84.0 <= metrics.cumulative_coverage["B1"] <= 87.0
    assert metrics.inferred_level == "C1"

    # off_list_ratio %7.65 ölçülmüştü, --explain-offlist analizinin
    # ortaya çıkardığı iki bug (BUG A: "your"un -our ekiyle "yor"a
    # yanlış dönüştürülmesi; BUG B: rise/arise/raise/enterprise'ın -ise
    # eki sanılması) off_list'i DÜŞÜRMEK yerine ARTIRIYORDU. Düzeltmeden
    # sonra daha düşük olmalı — kesin sayıyı iddia etmiyoruz (henüz
    # ölçmedik), ama önceki bilinen-hatalı değerden düşük olmalı.
    assert metrics.off_list_ratio < 7.65

    thresholds = load_thresholds()
    # Frankenstein ham bir kaynak metin (adapte değil) — off_list eşiği
    # gevşek olmalı (bkz. thresholds.yaml common.off_list.raw) ve sadece
    # bu yüzden reddedilmemeli. Gerçek ölçüm (~%7) ham metin uyarı
    # bandının (%8-12) da altında, yani uyarı da üretilmemeli.
    result = validate_book(metrics, thresholds, metrics.inferred_level, is_adaptation=False)
    assert result.passed, f"beklenmeyen red sebepleri: {result.reasons}"
    assert result.warnings == [], f"beklenmeyen uyarılar: {result.warnings}"


def test_gullibles_travels_reference_measurements(
    gullibles_travels_epub, cefr_vocab, norm_maps, nlp
):
    """Gullible's Travels (Ring Lardner) — Jonathan Swift'in "Gulliver's
    Travels"ı DEĞİL, farklı bir kitap. Ağız/argo ağırlıklı öykülerden
    oluşan bir derleme; normalizasyon katmanının (eye-dialect tespiti)
    gerçekten çalıştığını kanıtlayan TEK entegrasyon testi budur."""
    book = extract_epub(str(gullibles_travels_epub), "gullibles-travels")

    # Bağımsız isimli öykü dosyaları, sıralı numaralı desen (chapter-N/
    # letter-N) değil -> collection.
    assert book.meta.content_type == "collection"

    metrics = compute_metrics(book, cefr_vocab, norm_maps, nlp)
    assert metrics.word_count > 0

    # dialect_ratio normalizasyon ÖNCESİ/SONRASI farkını ölçer — bu
    # kitapta ağız yazımı (goin', nothin', hisself, ast, ...) yoğun.
    # Normalizasyon katmanı çalışmıyorsa bu sıfıra yakın çıkar.
    assert metrics.dialect_ratio > 3.0

    thresholds = load_thresholds()
    # is_adaptation=False (bu da ham bir kaynak metin) — ama dialect_ratio
    # kuralı her iki modda da sıkı, bu kitap yine de reddedilmeli.
    result = validate_book(metrics, thresholds, metrics.inferred_level, is_adaptation=False)
    assert not result.passed
