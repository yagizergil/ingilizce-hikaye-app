"""CEFR seviye tahmini ve metin metrikleri.

Kelime listeleri: cefrj-vocabulary-profile-1.5.csv (A1-B2) + octanove-
vocabulary-profile-c1c2-1.0.csv (C1-C2), pipeline/data/ altına sabitlenmiş
(openlanguageprofiles/olp-en-cefrj). Runtime'da ağdan çekilmez.
"""

from __future__ import annotations

import csv
import re
import statistics
from collections import Counter
from dataclasses import dataclass
from pathlib import Path
from typing import Any

import spacy
from spacy.language import Language

from src.models import BookMetrics, ExtractedBook, SectionData, SentenceLengthStats
from src.normalize import NormalizationMaps, normalize_text, normalize_word
from src.settings import CEFRJ_CSV_PATH, OCTANOVE_CSV_PATH
from src.validator import load_thresholds

CEFR_ORDER = ["A1", "A2", "B1", "B2", "C1", "C2"]
CEFR_RANK = {level: i for i, level in enumerate(CEFR_ORDER)}

# CEFR-J/Octanove pos label -> normalized bucket used for lookup keys.
_POS_BUCKET_ALIASES = {
    "be-verb": "verb",
    "do-verb": "verb",
    "have-verb": "verb",
    "modal auxiliary": "verb",
    "infinitive-to": "verb",
    "vern": "verb",  # data typo in octanove CSV
}

# spaCy UPOS -> CEFR pos bucket.
_SPACY_TO_CEFR_POS = {
    "NOUN": "noun",
    "PROPN": "noun",
    "VERB": "verb",
    "AUX": "verb",
    "ADJ": "adjective",
    "ADV": "adverb",
    "ADP": "preposition",
    "CCONJ": "conjunction",
    "SCONJ": "conjunction",
    "PRON": "pronoun",
    "DET": "determiner",
    "INTJ": "interjection",
    "NUM": "number",
}

ARCHAIC_WORDS = {
    "thy",
    "thou",
    "thee",
    "thine",
    "hath",
    "doth",
    "art",
    "wilt",
    "shalt",
    "ye",
    "tis",
    "twas",
    "wert",
    "didst",
    "dost",
    "shouldst",
    "wouldst",
    "couldst",
    "hadst",
    "canst",
    "hast",
}

_CAPITALIZED_WORD_RE = re.compile(r"[A-Z][a-z']+")
# Referans kelime tanımı: harfle başlayan, harf/apostrof/tire içerebilen
# her token. spaCy'nin token.is_alpha'sından KASITLI olarak daha geniş —
# is_alpha kesme işaretli (don't parçaları) ve tireli (well-known)
# token'ları tamamen düşürüyordu, bu da word_count'u sistematik olarak
# düşük gösteriyordu.
_WORD_TOKEN_RE = re.compile(r"^[A-Za-z][A-Za-z'\-]*$")


@dataclass(frozen=True)
class CefrVocabulary:
    by_lemma_pos: dict[tuple[str, str], str]
    by_lemma: dict[str, str]


def _register(
    by_pos: dict[tuple[str, str], str], by_lemma: dict[str, str], word: str, pos: str, level: str
) -> None:
    pos_key = (word, pos)
    if pos_key not in by_pos or CEFR_RANK[level] < CEFR_RANK[by_pos[pos_key]]:
        by_pos[pos_key] = level
    if word not in by_lemma or CEFR_RANK[level] < CEFR_RANK[by_lemma[word]]:
        by_lemma[word] = level


def load_cefr_vocabulary(
    cefrj_path: Path = CEFRJ_CSV_PATH, octanove_path: Path = OCTANOVE_CSV_PATH
) -> CefrVocabulary:
    by_pos: dict[tuple[str, str], str] = {}
    by_lemma: dict[str, str] = {}

    for path in (cefrj_path, octanove_path):
        with open(path, encoding="utf-8") as f:
            for row in csv.DictReader(f):
                headword = (row.get("headword") or "").strip()
                pos_raw = (row.get("pos") or "").strip().lower()
                level = (row.get("CEFR") or "").strip().upper()
                if not headword or level not in CEFR_RANK:
                    continue
                pos = _POS_BUCKET_ALIASES.get(pos_raw, pos_raw)
                for variant in headword.split("/"):
                    word = variant.strip().lower()
                    if word:
                        _register(by_pos, by_lemma, word, pos, level)

    return CefrVocabulary(by_lemma_pos=by_pos, by_lemma=by_lemma)


def lookup_level(vocab: CefrVocabulary, lemma: str, spacy_pos: str) -> str | None:
    cefr_pos = _SPACY_TO_CEFR_POS.get(spacy_pos)
    if cefr_pos is not None:
        level = vocab.by_lemma_pos.get((lemma, cefr_pos))
        if level is not None:
            return level
    return vocab.by_lemma.get(lemma)


def load_spacy_model() -> Language:
    try:
        return spacy.load("en_core_web_sm")
    except OSError as exc:
        raise RuntimeError(
            "spaCy modeli 'en_core_web_sm' kurulu değil. "
            "Kur: python -m spacy download en_core_web_sm"
        ) from exc


def build_proper_noun_whitelist(paragraph_texts: list[str]) -> set[str]:
    """Bir kelime özel isim sayılır eğer: (a) metinde en az 2 kez büyük
    harfle geçiyorsa VE (b) bu geçişlerden en az biri cümle başı DEĞİLSE.

    (b) şartı olmadan her cümlenin ilk kelimesi (The, It, ...) yanlışlıkla
    özel isim sayılabilir. Ama cümle-başı geçişleri sayımdan TAMAMEN
    çıkarmak da yanlış — bir isim metinde 3 kez geçip 2'si cümle başıysa
    (ör. "Frankenstein walked in. ... Victor Frankenstein was tired.")
    sadece niteliksel sinyal (en az bir cümle-içi geçiş) aranır, cümle
    başı geçişler yine de toplam sayıma dahil edilir."""
    total_counts: Counter[str] = Counter()
    seen_non_initial: set[str] = set()

    for text in paragraph_texts:
        # Cümle başlarını kabaca ayır.
        sentences = re.split(r"(?<=[.!?])\s+", text)
        for sentence in sentences:
            words = sentence.split()
            for i, word in enumerate(words):
                match = _CAPITALIZED_WORD_RE.fullmatch(word.strip(".,;:!?\"'()"))
                if not match:
                    continue
                lower = match.group(0).lower()
                total_counts[lower] += 1
                if i != 0:
                    seen_non_initial.add(lower)

    return {word for word, count in total_counts.items() if count >= 2 and word in seen_non_initial}


def _content_paragraph_texts(sections: list[SectionData]) -> list[str]:
    return [p.text for s in sections if not s.is_frontmatter for p in s.paragraphs]


def infer_level(
    cumulative_coverage: dict[str, float],
    avg_sentence_length: float = 0.0,
    thresholds: dict[str, Any] | None = None,
) -> str:
    """Ham metnin CEFR seviyesini TESPİT eder — thresholds.yaml'daki
    `levels.*.min_coverage` (%95) ile KARIŞTIRILMAMALI. O eşik, adapte/
    basitleştirilmiş bir metnin bir seviye için KABUL kriteridir; ham
    klasik metinlerin seviye tespiti için yanlıştır (hiçbir gerçek
    klasik %95 kümülatif kelime kapsamına ulaşmaz — bkz. Frankenstein
    C1'de %91.76). Bunun yerine ayrı `level_inference` bölümü kullanılır:
    kümülatif kapsamı ilk %90'a ulaştıran seviye aday alınır, sonra
    ortalama cümle uzunluğu bir eşiği aşıyorsa bir seviye yukarı
    "bump" edilir (üslup/sözdizimi karmaşıklığı saf kelime kapsamından
    daha zor bir seviyeye işaret ediyor demektir — ör. Frankenstein'da
    B2 kapsamı (%90.85) ama 22.6 kelimelik ortalama cümle -> C1)."""
    thresholds = thresholds or load_thresholds()
    cfg = thresholds.get("level_inference", {})
    min_coverage = cfg.get("min_coverage", 90.0)
    bump_threshold = cfg.get("sentence_length_bump_threshold")

    candidate = CEFR_ORDER[-1]
    for level in CEFR_ORDER:
        if cumulative_coverage[level] >= min_coverage:
            candidate = level
            break

    if bump_threshold is not None and avg_sentence_length > bump_threshold:
        idx = CEFR_RANK[candidate]
        if idx < len(CEFR_ORDER) - 1:
            candidate = CEFR_ORDER[idx + 1]

    return candidate


def compute_metrics(
    book: ExtractedBook,
    vocab: CefrVocabulary,
    norm_maps: NormalizationMaps,
    nlp: Language,
    thresholds: dict[str, Any] | None = None,
) -> BookMetrics:
    thresholds = thresholds or load_thresholds()
    paragraph_texts = _content_paragraph_texts(book.sections)

    proper_nouns = build_proper_noun_whitelist(paragraph_texts)

    def is_known(w: str) -> bool:
        # BrE->AmE suffix dönüşümlerinin sadece SONUÇ gerçek bir sözlük
        # kelimesiyse kabul edilmesini sağlar (bkz. normalize.py) —
        # "your"un "-our" ekiyle bittiği için yanlışlıkla "yor"a
        # çevrilmesi gibi durumları önler (yor sözlükte yok, reddedilir).
        return w in vocab.by_lemma

    sentence_lengths: list[int] = []
    dialogue_paragraphs = 0
    archaic_hits = 0
    total_words_raw = 0
    dialect_hits_total = 0
    all_word_tokens = 0
    lemma_counter: Counter[str] = Counter()
    lemma_pos_counter: dict[str, Counter[str]] = {}
    lemma_levels: dict[str, str | None] = {}
    cefr_token_counts: Counter[str] = Counter()
    off_list_count = 0
    total_content_tokens = 0

    for text in paragraph_texts:
        stripped = text.strip()
        if stripped[:1] in {'"', "'", "“", "‘"}:
            dialogue_paragraphs += 1

        # dialect/BrE istatistikleri kendi regex tabanlı tokenizasyonuyla,
        # HAM metin üzerinde ölçülür (spaCy'den bağımsız, sadece
        # dialect_ratio için).
        normalized_stats = normalize_text(text, norm_maps)
        dialect_hits_total += normalized_stats.dialect_hits
        total_words_raw += normalized_stats.total_words

        # spaCy HAM metin üzerinde çalışır. normalize_text'in ürettiği
        # noktalamasız string'i spaCy'ye vermek cümle bölmeyi (doc.sents)
        # tamamen bozuyordu — noktalama olmadan sentencizer/parser bütün
        # paragrafı tek "cümle" sayıyordu (ort. cümle 70 kelime, max 329
        # gibi anlamsız değerler). Normalizasyon artık CEFR sözlük
        # aramasından hemen önce, token bazında uygulanıyor (aşağıda).
        doc = nlp(text)

        for sent in doc.sents:
            length = sum(1 for t in sent if _WORD_TOKEN_RE.match(t.text))
            if length > 0:
                sentence_lengths.append(length)

        for token in doc:
            if not _WORD_TOKEN_RE.match(token.text):
                continue

            all_word_tokens += 1
            lower = token.text.lower()
            if lower in ARCHAIC_WORDS:
                archaic_hits += 1

            # Özel isimler word_count'a (yukarıda) dahil ama CEFR kapsam/
            # off-list ölçümüne (aşağıda) hiç girmiyor — "Frankenstein"
            # metnin gerçek uzunluğunun bir parçası, ama bir "zor kelime"
            # değil.
            if lower in proper_nouns or token.pos_ == "PROPN":
                continue

            # BrE yazımı/eye-dialect/iyelik eklerinin CEFR sözlük
            # aramasından ÖNCE normalize edilmesi gerekiyor — aksi halde
            # "towards", "endeavour", "labour" gibi yaygın BrE kelimeler
            # sözlükte bulunamayıp yapay şekilde off-list sayılıyordu.
            raw_lemma = token.lemma_.lower()
            normalized_lemma, _category = normalize_word(raw_lemma, norm_maps, is_known)

            total_content_tokens += 1
            lemma_counter[normalized_lemma] += 1
            lemma_pos_counter.setdefault(normalized_lemma, Counter())[
                _SPACY_TO_CEFR_POS.get(token.pos_, token.pos_.lower())
            ] += 1

            level = lookup_level(vocab, normalized_lemma, token.pos_)
            lemma_levels[normalized_lemma] = level
            if level is None:
                off_list_count += 1
            else:
                cefr_token_counts[level] += 1

    word_count = all_word_tokens
    sentence_count = len(sentence_lengths)
    paragraph_count = len(paragraph_texts)
    unique_lemma_count = len(lemma_counter)
    # TTR ve CEFR kapsamı, özel isimler hariç tutulmuş "gerçek kelime
    # dağarcığı" alt kümesi (total_content_tokens) üzerinden hesaplanır —
    # word_count (kitabın toplam uzunluğu) özel isimleri de içerir.
    ttr = (unique_lemma_count / total_content_tokens) if total_content_tokens else 0.0

    sorted_lengths = sorted(sentence_lengths)
    mean_len: float
    median_len: float
    p90_len: float
    max_len: int
    if sorted_lengths:
        mean_len = statistics.mean(sorted_lengths)
        median_len = statistics.median(sorted_lengths)
        # p90, sorted_lengths içindeki gerçek bir cümle uzunluğu (int) —
        # float() burada tip birleştirme içindir, hassasiyet kaybı yok
        # (ör. float(17) == 17.0, yuvarlama değil).
        p90_len = float(
            sorted_lengths[min(int(len(sorted_lengths) * 0.9), len(sorted_lengths) - 1)]
        )
        max_len = sorted_lengths[-1]
    else:
        mean_len = median_len = p90_len = 0.0
        max_len = 0

    cefr_distribution = {
        level: (
            cefr_token_counts.get(level, 0) / total_content_tokens * 100
            if total_content_tokens
            else 0.0
        )
        for level in CEFR_ORDER
    }
    cumulative_coverage: dict[str, float] = {}
    running = 0.0
    for level in CEFR_ORDER:
        running += cefr_distribution[level]
        cumulative_coverage[level] = running

    off_list_ratio = (
        (off_list_count / total_content_tokens * 100) if total_content_tokens else 0.0
    )
    dialect_ratio = (dialect_hits_total / total_words_raw * 100) if total_words_raw else 0.0
    dialogue_ratio = (dialogue_paragraphs / paragraph_count * 100) if paragraph_count else 0.0
    archaic_ratio = (archaic_hits / word_count * 100) if word_count else 0.0

    lemma_pos = {
        lemma: counter.most_common(1)[0][0] for lemma, counter in lemma_pos_counter.items()
    }

    return BookMetrics(
        word_count=word_count,
        sentence_count=sentence_count,
        paragraph_count=paragraph_count,
        unique_lemma_count=unique_lemma_count,
        ttr=ttr,
        sentence_length=SentenceLengthStats(
            mean=mean_len, median=float(median_len), p90=float(p90_len), max=int(max_len)
        ),
        cefr_distribution=cefr_distribution,
        cumulative_coverage=cumulative_coverage,
        off_list_ratio=off_list_ratio,
        dialect_ratio=dialect_ratio,
        dialogue_ratio=dialogue_ratio,
        archaic_ratio=archaic_ratio,
        inferred_level=infer_level(cumulative_coverage, mean_len, thresholds),
        lemma_counts=dict(lemma_counter),
        lemma_pos=lemma_pos,
        lemma_levels=lemma_levels,
    )


# ---------------------------------------------------------------------------
# `pipeline profile --explain-offlist` teşhis komutu içindir. compute_metrics
# ile ORTAK mantığı kasıtlı olarak ufak ölçüde tekrar eder — tek seferlik bir
# teşhis aracının compute_metrics'in performans-kritik iç yapısına sıkı
# bağımlı olması yerine ayrı, okunur kalması tercih edildi.
# ---------------------------------------------------------------------------

_BRE_LOOKALIKE_SUFFIXES = ("our", "ise", "isation", "yse", "ogue", "re")


def _looks_bre_like(word: str) -> bool:
    return any(word.endswith(suffix) for suffix in _BRE_LOOKALIKE_SUFFIXES)


@dataclass
class OfflistLemmaInfo:
    raw_lemma: str
    normalized_lemma: str
    count: int
    category: str


@dataclass
class OfflistExplanation:
    total_content_tokens: int
    off_list_ratio_before: float
    off_list_ratio_after: float
    difference: float
    top_offlist: list[OfflistLemmaInfo]


def explain_offlist(
    book: ExtractedBook,
    vocab: CefrVocabulary,
    norm_maps: NormalizationMaps,
    nlp: Language,
    top_n: int = 50,
) -> OfflistExplanation:
    """Normalizasyon ÖNCESİ/SONRASI off-list oranını ve en sık off-list
    kalan lemma'ları, her biri kabaca kategorize edilmiş olarak döner.
    Kategoriler kesin değil, sezgiseldir (bkz. her dalın yorumu)."""
    paragraph_texts = _content_paragraph_texts(book.sections)
    proper_nouns = build_proper_noun_whitelist(paragraph_texts)

    def is_known(w: str) -> bool:
        return w in vocab.by_lemma

    total_content_tokens = 0
    off_before = 0
    off_after = 0
    offlist_counts: Counter[tuple[str, str]] = Counter()
    # Bir lemma'nın yüzey biçiminin ne sıklıkla CÜMLE BAŞI OLMAYAN bir
    # konumda büyük harfle başladığı — proper_nouns whitelist'inin
    # kaçırdığı gerçek özel isimleri yakalamak için. Cümle başı
    # büyük harfleri SAYMIYORUZ, aksi halde "Oh"/"Alas" gibi cümle
    # başında sık geçen ünlemler yanlışlıkla özel isim sanılıyordu.
    surface_capitalized: Counter[str] = Counter()
    surface_total: Counter[str] = Counter()

    for text in paragraph_texts:
        doc = nlp(text)
        for sent in doc.sents:
            for i, token in enumerate(sent):
                if not _WORD_TOKEN_RE.match(token.text):
                    continue
                lower = token.text.lower()
                if lower in proper_nouns or token.pos_ == "PROPN":
                    continue

                raw_lemma = token.lemma_.lower()
                total_content_tokens += 1
                surface_total[raw_lemma] += 1
                if i != 0 and token.text[:1].isupper():
                    surface_capitalized[raw_lemma] += 1

                if lookup_level(vocab, raw_lemma, token.pos_) is None:
                    off_before += 1

                normalized_lemma, _category = normalize_word(raw_lemma, norm_maps, is_known)
                if lookup_level(vocab, normalized_lemma, token.pos_) is None:
                    off_after += 1
                    offlist_counts[(raw_lemma, normalized_lemma)] += 1

    def _classify(raw_lemma: str, normalized_lemma: str) -> str:
        if raw_lemma in ARCHAIC_WORDS:
            return "arkaik"
        cap_ratio = surface_capitalized[raw_lemma] / max(surface_total[raw_lemma], 1)
        if cap_ratio > 0.5:
            return "özel isim (whitelist kaçırmış olabilir)"
        if normalized_lemma != raw_lemma:
            return "BrE/ağız varyantı (normalize edildi ama sözlükte hâlâ yok)"
        if _looks_bre_like(raw_lemma):
            return "normalizasyon kaçağı (BrE gibi görünüyor, kural yakalamadı)"
        return "gerçekten zor kelime"

    top = [
        OfflistLemmaInfo(
            raw_lemma=raw, normalized_lemma=normalized, count=count,
            category=_classify(raw, normalized),
        )
        for (raw, normalized), count in offlist_counts.most_common(top_n)
    ]

    ratio_before = (off_before / total_content_tokens * 100) if total_content_tokens else 0.0
    ratio_after = (off_after / total_content_tokens * 100) if total_content_tokens else 0.0

    return OfflistExplanation(
        total_content_tokens=total_content_tokens,
        off_list_ratio_before=ratio_before,
        off_list_ratio_after=ratio_after,
        difference=ratio_before - ratio_after,
        top_offlist=top,
    )
