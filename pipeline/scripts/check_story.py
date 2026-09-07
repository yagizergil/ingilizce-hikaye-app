"""Markdown hikâye dosyasını, veritabanına dokunmadan hızlıca denetler.

`pipeline validate` gerçek denetimdir ama ingest + extract aşamalarını ve
`state.db`'yi gerektirir; birden fazla yazar aynı anda çalışırken bu
dosyada çakışma olur. Bu script aynı eşiklere (config/thresholds.yaml) ve
aynı kelime listelerine (CEFR-J + Octanove) bakar, ama yalnızca .md
dosyasını okur — paralel çalıştırmak güvenlidir.

Kullanım:
    python scripts/check_story.py stories/my-story.md
    python scripts/check_story.py stories/          # klasördeki hepsi

Çıkış kodu 0 = geçti, 1 = en az bir dosya kaldı.
"""

from __future__ import annotations

import re
import sys
from pathlib import Path

# Windows konsolu varsayılan olarak cp1254; ✓/✗ ve Türkçe karakterler
# UnicodeEncodeError verir. Çıktıyı UTF-8'e sabitliyoruz.
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    sys.stderr.reconfigure(encoding="utf-8", errors="replace")

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from src.profiler import (  # noqa: E402
    load_cefr_vocabulary,
    load_spacy_model,
    lookup_level,
)
from src.validator import load_thresholds  # noqa: E402

LEVEL_ORDER = ["A1", "A2", "B1", "B2", "C1", "C2"]

# A2 promptunun yasakladığı yapılar (bkz. prompts/generate_story_a2.md §3).
# Kaba desenler — yanlış pozitif verebilir, o yüzden UYARI olarak raporlanır,
# hata olarak değil.
FORBIDDEN_PATTERNS = [
    (r"\b(has|have|had)\s+(been|got|gone|seen|made|done|taken|found|left|come)\b", "present/past perfect"),
    (r"\bwould\b", "would (koşul)"),
    (r"\bshould\b", "should"),
    (r"\bmight\b", "might"),
    (r"\bcould\b", "could"),
    (r"\bIf\b[^.!?]*\b(was|were|had)\b", "koşul cümlesi"),
]


def split_front_matter(raw: str) -> tuple[dict[str, str], str]:
    if not raw.startswith("---"):
        raise ValueError("frontmatter yok (dosya '---' ile başlamalı)")
    end = raw.index("\n---", 3)
    head = raw[3:end]
    body = raw[end + 4 :]
    meta: dict[str, str] = {}
    for line in head.splitlines():
        if ":" in line and not line.strip().startswith("#"):
            key, _, value = line.partition(":")
            meta[key.strip()] = value.strip()
    return meta, body


def paragraphs_of(body: str) -> list[str]:
    """Başlık satırlarını atar, kalan paragrafları döndürür."""
    body = re.sub(r"^#.*$", "", body, flags=re.MULTILINE)
    return [p.strip() for p in body.split("\n\n") if p.strip()]


def sentences_of(text: str) -> list[str]:
    parts = re.split(r'(?<=[.!?])["”’\']?\s+', text)
    return [p.strip() for p in parts if p.strip()]


def check(path: Path, vocab, nlp, thresholds) -> bool:
    raw = path.read_text(encoding="utf-8")
    try:
        meta, body = split_front_matter(raw)
    except ValueError as error:
        print(f"✗ {path.name}: {error}")
        return False

    problems: list[str] = []
    warnings: list[str] = []

    for field in ("title", "author", "target_level"):
        if not meta.get(field):
            problems.append(f"frontmatter '{field}' eksik")

    level = meta.get("target_level", "A2")
    limits = thresholds.get("levels", {}).get(level)
    if limits is None:
        problems.append(f"thresholds.yaml içinde '{level}' seviyesi yok")
        limits = {}

    chapters = re.findall(r"^#\s+(.+)$", body, flags=re.MULTILINE)
    if not chapters:
        problems.append("hiç '# ' bölüm başlığı yok")

    paras = paragraphs_of(body)
    sentences = [s for p in paras for s in sentences_of(p)]
    if not sentences:
        problems.append("metin boş")
        print(f"✗ {path.name}: " + "; ".join(problems))
        return False

    lengths = [len(s.split()) for s in sentences]
    avg_len = sum(lengths) / len(lengths)
    max_len = max(lengths)
    words = sum(lengths)

    max_avg = limits.get("max_avg_sentence_length")
    max_single = limits.get("max_sentence_length")

    if max_avg is not None and avg_len > max_avg:
        problems.append(f"ortalama cümle {avg_len:.1f} > {max_avg}")
    if max_single is not None and max_len > max_single:
        offenders = [s for s, n in zip(sentences, lengths) if n > max_single]
        problems.append(f"{len(offenders)} cümle {max_single} kelimeyi aşıyor (en uzun {max_len})")
        for s in offenders[:5]:
            problems.append(f"    → {len(s.split())} kelime: {s[:110]}")

    # Kelime kapsamı: hedef seviye ve altındaki lemma oranı.
    doc = nlp(" ".join(paras))
    tokens = [t for t in doc if t.is_alpha]
    target_index = LEVEL_ORDER.index(level) if level in LEVEL_ORDER else 1
    known = 0
    above: dict[str, str] = {}
    for token in tokens:
        if token.pos_ == "PROPN":
            known += 1
            continue
        found = lookup_level(vocab, token.lemma_.lower(), token.pos_)
        if found is not None and LEVEL_ORDER.index(found) <= target_index:
            known += 1
        elif found is not None:
            above[token.lemma_.lower()] = found
    coverage = 100.0 * known / len(tokens) if tokens else 0.0

    min_coverage = limits.get("min_coverage")
    if min_coverage is not None and coverage < min_coverage:
        problems.append(f"{level} kapsamı %{coverage:.2f} < %{min_coverage}")

    for pattern, label in FORBIDDEN_PATTERNS:
        hits = re.findall(pattern, body, flags=re.IGNORECASE)
        if hits:
            warnings.append(f"yasak yapı olabilir — {label} ({len(hits)} kez)")

    mark = "✓" if not problems else "✗"
    print(f"{mark} {path.name}  [{level}]  {words} kelime, {len(chapters)} bölüm, "
          f"ort {avg_len:.1f} / max {max_len}, kapsam %{coverage:.2f}")
    for problem in problems:
        print(f"    HATA: {problem}")
    for warning in warnings:
        print(f"    uyarı: {warning}")
    if above and problems:
        top = sorted(above.items(), key=lambda kv: LEVEL_ORDER.index(kv[1]), reverse=True)[:12]
        print("    seviye üstü kelimeler: " + ", ".join(f"{w}[{lv}]" for w, lv in top))
    return not problems


def main() -> int:
    if len(sys.argv) < 2:
        print(__doc__)
        return 2
    target = Path(sys.argv[1])
    files = sorted(target.glob("*.md")) if target.is_dir() else [target]
    if not files:
        print(f"{target} altında .md dosyası yok")
        return 2

    vocab = load_cefr_vocabulary()
    nlp = load_spacy_model()
    thresholds = load_thresholds()

    results = [check(path, vocab, nlp, thresholds) for path in files]
    passed = sum(results)
    print(f"\n{passed}/{len(results)} dosya geçti.")
    return 0 if passed == len(results) else 1


if __name__ == "__main__":
    raise SystemExit(main())
