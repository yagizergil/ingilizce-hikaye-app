from __future__ import annotations

from src.models import BookMeta, ExtractedBook, ParagraphData, SectionData
from src.profiler import build_proper_noun_whitelist, compute_metrics, explain_offlist, infer_level


def _book(paragraph_texts: list[str]) -> ExtractedBook:
    section = SectionData(
        order_index=0,
        title="Chapter 1",
        kind="chapter",
        is_frontmatter=False,
        paragraphs=[ParagraphData(order_index=i, text=t) for i, t in enumerate(paragraph_texts)],
    )
    meta = BookMeta(
        slug="test-book",
        title="Test Book",
        subtitle=None,
        author="Test Author",
        author_file_as=None,
        author_death_year=1900,
        source="test",
        source_url=None,
        license=None,
        license_text=None,
        content_type="novel",
        cover_image_bytes=None,
        cover_image_ext=None,
    )
    return ExtractedBook(meta=meta, sections=[section])


def test_simple_easy_text_scores_high_coverage(cefr_vocab, norm_maps, nlp):
    book = _book(
        [
            "The cat sat on the mat. It was a good day.",
            "She went to the shop and bought some bread and milk.",
        ]
    )
    metrics = compute_metrics(book, cefr_vocab, norm_maps, nlp)
    assert metrics.word_count > 0
    assert metrics.cumulative_coverage["A2"] > 50.0


def test_dialogue_ratio_detects_quoted_paragraphs(cefr_vocab, norm_maps, nlp):
    book = _book(
        [
            '"Hello there," she said.',
            "He walked away without a word.",
        ]
    )
    metrics = compute_metrics(book, cefr_vocab, norm_maps, nlp)
    assert metrics.dialogue_ratio == 50.0


def test_archaic_words_detected(cefr_vocab, norm_maps, nlp):
    book = _book(["Thou hath spoken well, and thy words are wise."])
    metrics = compute_metrics(book, cefr_vocab, norm_maps, nlp)
    assert metrics.archaic_ratio > 0


def test_dialect_heavy_text_has_high_dialect_ratio(cefr_vocab, norm_maps, nlp):
    book = _book(
        [
            "He was goin' down the road, talkin' to hisself, ast his mother for money, "
            "and knowed he'd get nothin'."
        ]
    )
    metrics = compute_metrics(book, cefr_vocab, norm_maps, nlp)
    assert metrics.dialect_ratio > 15.0


def test_frontmatter_excluded_from_metrics(cefr_vocab, norm_maps, nlp):
    story_section = SectionData(
        order_index=1,
        title="Chapter 1",
        kind="chapter",
        is_frontmatter=False,
        paragraphs=[ParagraphData(order_index=0, text="The cat sat on the mat.")],
    )
    preface_section = SectionData(
        order_index=0,
        title="Preface",
        kind="part",
        is_frontmatter=True,
        paragraphs=[ParagraphData(order_index=0, text="Xenobiological quasiturbulence discourse.")],
    )
    meta = _book(["placeholder"]).meta
    book = ExtractedBook(meta=meta, sections=[preface_section, story_section])
    metrics = compute_metrics(book, cefr_vocab, norm_maps, nlp)
    assert metrics.paragraph_count == 1


def test_build_proper_noun_whitelist_finds_repeated_capitalized_words():
    texts = [
        "Frankenstein walked into the room. Victor Frankenstein was tired.",
        "Frankenstein sat down and sighed.",
    ]
    whitelist = build_proper_noun_whitelist(texts)
    assert "frankenstein" in whitelist


def test_build_proper_noun_whitelist_ignores_single_occurrence():
    texts = ["The dog saw Rex once and never again."]
    whitelist = build_proper_noun_whitelist(texts)
    assert "rex" not in whitelist


def test_infer_level_picks_first_level_meeting_threshold():
    cumulative = {"A1": 40.0, "A2": 70.0, "B1": 96.0, "B2": 98.0, "C1": 99.0, "C2": 100.0}
    assert infer_level(cumulative) == "B1"


def test_infer_level_falls_back_to_c2_if_never_reached():
    cumulative = {"A1": 10.0, "A2": 20.0, "B1": 30.0, "B2": 40.0, "C1": 50.0, "C2": 60.0}
    assert infer_level(cumulative) == "C2"


def test_infer_level_bumps_up_for_long_sentences():
    """Frankenstein referansı: kapsam tek başına B2 diyor (%90.85) ama
    ortalama cümle uzunluğu (22.6) eşiği aşıyor -> C1'e bump edilmeli.
    validate'in %95 kabul eşiğiyle KARIŞTIRILMAMALI, ayrı thresholds
    dict'i kullanılıyor."""
    thresholds = {
        "level_inference": {"min_coverage": 90.0, "sentence_length_bump_threshold": 20.0},
    }
    cumulative = {"A1": 30.0, "A2": 60.0, "B1": 80.0, "B2": 90.85, "C1": 91.76, "C2": 92.35}
    assert infer_level(cumulative, avg_sentence_length=22.6, thresholds=thresholds) == "C1"


def test_infer_level_no_bump_for_short_sentences():
    thresholds = {
        "level_inference": {"min_coverage": 90.0, "sentence_length_bump_threshold": 20.0},
    }
    cumulative = {"A1": 30.0, "A2": 60.0, "B1": 80.0, "B2": 91.0, "C1": 95.0, "C2": 98.0}
    assert infer_level(cumulative, avg_sentence_length=15.0, thresholds=thresholds) == "B2"


def test_infer_level_bump_does_not_overflow_past_c2():
    thresholds = {
        "level_inference": {"min_coverage": 90.0, "sentence_length_bump_threshold": 20.0},
    }
    cumulative = {"A1": 10.0, "A2": 20.0, "B1": 30.0, "B2": 40.0, "C1": 50.0, "C2": 92.0}
    assert infer_level(cumulative, avg_sentence_length=30.0, thresholds=thresholds) == "C2"


def test_sentence_segmentation_respects_punctuation(cefr_vocab, norm_maps, nlp):
    """Regresyon testi: spaCy'ye noktalaması silinmiş (normalize_text
    çıktısı) metin verilirse cümle bölme tamamen bozuluyordu — bütün
    paragraf tek "cümle" sayılıyordu (ort. cümle 70+ kelime gibi
    anlamsız değerler). spaCy artık HAM metin üzerinde çalışıyor."""
    book = _book(
        [
            "The cat sat on the mat. It was a good day. She smiled. "
            "Then she went home. The end was near.",
        ]
    )
    metrics = compute_metrics(book, cefr_vocab, norm_maps, nlp)
    # 5 açık cümle var (nokta ile ayrılmış) — spaCy'nin gerçek sayısı
    # birebir 5 olmayabilir (bazı model sürümleri farklı bölebilir) ama
    # kesinlikle 1 DEĞİL ve ortalama cümle uzunluğu paragrafın tamamı
    # kadar (20 kelime) OLMAMALI.
    assert metrics.sentence_count >= 4
    assert metrics.sentence_length.mean < 10.0


def test_bre_spelling_normalized_before_cefr_lookup(cefr_vocab, norm_maps, nlp):
    """Regresyon testi: 'towards'/'endeavour' gibi BrE yazımları CEFR
    sözlük aramasından ÖNCE normalize edilmiyordu, bu yüzden yapay
    şekilde off-list sayılıyorlardı (bkz. Frankenstein off_list_ratio
    %7.73 çıkması — normalizasyon öncesi ölçümle aynı değer)."""
    book = _book(
        [
            "She walked towards the house. He made a great endeavour to help her.",
        ]
    )
    metrics = compute_metrics(book, cefr_vocab, norm_maps, nlp)
    assert "toward" in metrics.lemma_counts
    assert "towards" not in metrics.lemma_counts
    assert metrics.lemma_levels.get("toward") is not None


def test_proper_nouns_counted_in_word_count_but_not_in_coverage(cefr_vocab, norm_maps, nlp):
    """Özel isimler kitabın gerçek uzunluğunun bir parçası (word_count'a
    girmeli) ama "zor kelime" değil (off_list/coverage ölçümüne
    girmemeli). Önceki davranış özel isimleri word_count'tan da TAMAMEN
    düşürüyordu, bu da toplam kelime sayısını yapay şekilde azaltıyordu
    (protagonist ismi onlarca kez geçen bir romanda ciddi bir fark
    yaratır)."""
    book = _book(
        [
            "Frankenstein walked into the room. Victor Frankenstein was tired. "
            "Frankenstein sat down and sighed.",
        ]
    )
    metrics = compute_metrics(book, cefr_vocab, norm_maps, nlp)
    assert "frankenstein" not in metrics.lemma_counts
    # "Frankenstein" 3 kez geçiyor, word_count bunları saymalı (toplam
    # kelime sayısı whitelist'e giren isim sayısı kadar düşük çıkmamalı).
    assert metrics.word_count > metrics.unique_lemma_count + 3


def test_explain_offlist_categorizes_archaic_words(cefr_vocab, norm_maps, nlp):
    book = _book(["Thou wert wise, and thy words didst please the crowd."])
    explanation = explain_offlist(book, cefr_vocab, norm_maps, nlp)
    archaic_items = [item for item in explanation.top_offlist if item.category == "arkaik"]
    assert any(item.raw_lemma in {"wert", "didst", "thy"} for item in archaic_items)


def test_explain_offlist_before_after_ratio_makes_sense(cefr_vocab, norm_maps, nlp):
    book = _book(
        [
            "She walked towards the house, goin' down the endeavour road.",
        ]
    )
    explanation = explain_offlist(book, cefr_vocab, norm_maps, nlp)
    # normalizasyon SONRASI oran, ÖNCESİNDEN büyük olamaz (normalizasyon
    # kelimeleri sözlükte bulunabilir hale getirir, off-list'i artırmaz).
    assert explanation.off_list_ratio_after <= explanation.off_list_ratio_before
    assert explanation.difference >= 0.0
