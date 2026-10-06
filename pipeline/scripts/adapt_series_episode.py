"""Karakterli seri bölümünü İngilizceden diğer 9 dile UYARLAR (bkz. universe/README.md).

Seri sistemi kuralı: her bölüm önce İngilizce yazılır (stories/<slug>.md,
check_story ile doğrulanır), sonra bu betikle 9 dile uyarlanır. Uyarlama
çeviri DEĞİL, aynı seviyede yeniden yazımdır: olay örgüsü, sahne sırası,
bölüm sayısı, karakterler ve süreklilik gerçekleri aynen kalır; cümleler
hedef dilin o seviyedeki kurallarına göre (prompts/generate_story_<seviye>_<dil>.md)
yeniden kurulur. Ana karakterlerin adları karakter kartındaki `names`
alanından gelir.

Doğrulama: generate_stories_multi.py'nin dil başına ölçümü (cümle
uzunluğu + seviye kelime listesi dışı oranı); geçemeyen sürüm gerekçeleriyle
modele geri verilir (en çok 3 deneme), yine geçemezse work/rejected_<dil>/'e
yazılır ve o dil yayınlanmaz.

Çıktı: stories_<dil>/<slug>-<dil>.md -- frontmatter'ında series
(<series-id>-<dil>), series_index, character, target_language var.
Yayın: scripts/publish_series_multilang.py. Veritabanına DOKUNMAZ.

KULLANIM
    cd pipeline
    .venv/Scripts/python.exe scripts/adapt_series_episode.py --slug kai-repair-files-b1-e01 --lang all
    .venv/Scripts/python.exe scripts/adapt_series_episode.py --slug leo-little-cafe-a1-e01 --lang de fr
"""

from __future__ import annotations

import argparse
import re
import sys
import time
from pathlib import Path

import yaml
from anthropic import Anthropic
from dotenv import load_dotenv

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

PIPELINE_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(PIPELINE_ROOT))
sys.path.insert(0, str(PIPELINE_ROOT / "scripts"))

import generate_stories_multi as multi  # noqa: E402

UNIVERSE = PIPELINE_ROOT / "universe"
ALL_LANGS = ["tr", "de", "fr", "it", "es", "ru", "ar", "zh", "ja"]
LANG_NAMES = {
    "tr": "Turkish", "de": "German", "fr": "French", "it": "Italian", "es": "Spanish",
    "ru": "Russian", "ar": "Modern Standard Arabic", "zh": "Simplified Chinese", "ja": "Japanese",
}
MODEL = multi.MODEL
MAX_ATTEMPTS = 3
# generate_stories_multi B2 tanımlamıyor; uyarlama B1 tabanını bir basamak yukarı taşır.
B2_THRESHOLDS = {"max_avg_sentence": 24.0, "min_avg_sentence": 13.0, "max_sentence": 60, "min_words": 1500}
# Uyarlamada kelime sayısı tabanı kaynağın uzunluğundan gelir (A1 bölümü 500 kelime olabilir).
MIN_WORDS_RATIO = 0.6


def load_card(path: Path) -> dict:
    return yaml.safe_load(path.read_text(encoding="utf-8"))


def character_names(lang: str) -> dict[str, str]:
    names: dict[str, str] = {}
    for card_path in (UNIVERSE / "characters").glob("*.yaml"):
        card = load_card(card_path)
        local = (card.get("names") or {}).get(lang)
        if local:
            names[card["name"].split()[0]] = local
    return names


def build_system(lang: str, level: str, series: dict) -> str:
    prompt_level = level if level != "B2" else "B1"
    level_prompt = (PIPELINE_ROOT / "prompts" / f"generate_story_{prompt_level.lower()}_{lang}.md").read_text(
        encoding="utf-8"
    )
    b2_note = (
        "\nTHIS EPISODE IS B2, NOT B1: keep the level rules' clarity, but use richer, more "
        "precise vocabulary, varied sentence structure and longer sentences "
        "(average 15-22 words, never above 50).\n"
        if level == "B2"
        else ""
    )
    return (
        f"{level_prompt}\n\n=== SERIES ADAPTATION MODE ===\n"
        f"You are adapting an episode of the series \"{series['titles'].get(lang, series['titles']['en'])}\" "
        f"from English into {LANG_NAMES[lang]} at CEFR level {level}.{b2_note}\n"
        "Rules:\n"
        "- Keep EVERY plot event, scene, chapter (same number and order of `#` headings), "
        "character, place name and fact. Do not add or remove events; the ending hook must stay.\n"
        "- Rewrite naturally, as a native author would at this level; do not translate word by word.\n"
        "- Translate chapter headings and the title.\n"
        "- Output the full story with YAML frontmatter exactly like the input, but with the "
        "translated `title` and `target_language` set, plus a `description` key: a 2-3 sentence "
        "teaser for the book page in the same language and level, without spoiling the ending. "
        "Keep the other frontmatter keys unchanged.\n"
        "- Output only the story, no commentary, no code fence."
    )


def build_user(source: str, lang: str, feedback: str | None) -> str:
    names = character_names(lang)
    name_rules = "\n".join(f"- {en} -> {local}" for en, local in names.items())
    msg = (
        f"Main character names in {LANG_NAMES[lang]} (use exactly these):\n{name_rules}\n"
        "Other people and places keep their English names (transliterate only where the "
        "script requires it).\n\nENGLISH EPISODE:\n\n" + source
    )
    if feedback:
        msg += (
            "\n\nYour previous adaptation was REJECTED by the validator for these reasons:\n"
            f"{feedback}\nFix exactly these issues and output the full adaptation again."
        )
    return msg


def make_nlp(cfg):
    if cfg.use_stanza:
        import stanza

        return multi.StanzaNlpAdapter(
            stanza.Pipeline(cfg.spacy_model, processors="tokenize,pos,lemma", verbose=False)
        )
    if cfg.use_camel:
        from camel_tools.disambig.mle import MLEDisambiguator
        from camel_tools.tokenizers.word import simple_word_tokenize

        return multi.CamelNlpAdapter(MLEDisambiguator.pretrained("calima-msa-r13"), simple_word_tokenize)
    import spacy

    return ParagraphNlp(spacy.load(cfg.spacy_model))


class ParagraphNlp:
    """spaCy'yi paragraf paragraf çalıştırır. Bütün gövdeyi tek seferde
    vermek, tırnak/« ile biten bir paragrafı sonrakiyle TEK cümle sayıyordu
    (fr/it uyarlamaları 15 kelimelik A1 tavanına bu yüzden takılıyordu)."""

    def __init__(self, nlp):
        self._nlp = nlp

    def __call__(self, text: str):
        from spacy.tokens import Doc

        paragraphs = [p for p in re.split(r"\n\s*\n", text) if p.strip()]
        return Doc.from_docs([self._nlp(p) for p in paragraphs])


def fix_frontmatter(meta: dict, source_meta: dict, lang: str) -> dict:
    """Seviye/seri alanları modele bırakılmaz (bkz. CLAUDE.md force_frontmatter dersi)."""
    fixed = dict(source_meta)
    fixed["title"] = meta.get("title") or source_meta["title"]
    fixed["target_language"] = lang
    fixed["series"] = f"{source_meta['series']}-{lang}"
    fixed["description"] = meta.get("description")
    return {k: v for k, v in fixed.items() if v is not None}


def adapt_one(client: Anthropic, slug: str, lang: str, dry_run: bool) -> bool:
    source_path = PIPELINE_ROOT / "stories" / f"{slug}.md"
    source = source_path.read_text(encoding="utf-8")
    source_meta, source_body = multi.parse_frontmatter(source)
    level = source_meta["target_level"]
    series = load_card(UNIVERSE / "series" / f"{source_meta['series']}.yaml")

    cfg = multi.LANGS[lang]
    thresholds = dict(B2_THRESHOLDS) if level == "B2" else cfg.thresholds_for(level)
    source_words = len(source_body.split())
    thresholds["min_words"] = min(thresholds["min_words"], int(source_words * MIN_WORDS_RATIO))
    if cfg.use_token_count:
        thresholds["min_words"] = int(thresholds["min_words"] * 1.2)
    # Cümle TABANI kaynağa göre: diyalog ağırlıklı bir İngilizce bölüm (ör. Kai
    # e01, ort. 9) sadık uyarlandığında tabanın altında kalır; bu bir seviye
    # düşüşü değil, kaynağın kendi ritmi. Taban kaynağın %70'ine iner
    # (Romen dilleri diyalogu İngilizceden daha kısa cümlelere böler).
    if "min_avg_sentence" in thresholds:
        src_sentences = [s for s in re.split(r"(?<=[.!?])\s+", source_body) if s.split()]
        src_avg = sum(len(s.split()) for s in src_sentences) / max(len(src_sentences), 1)
        thresholds["min_avg_sentence"] = min(thresholds["min_avg_sentence"], round(src_avg * (0.55 if lang == "tr" else 0.7), 1))
        # Türkçe eklemeli: İngilizce 9 kelimelik cümle Türkçede ~6 kelime.
    nlp = make_nlp(cfg)
    vocab = multi.load_vocab(cfg, level)
    off_list_max = cfg.off_list_ratio_override or multi.MAX_OFF_LIST_RATIO

    out_dir = PIPELINE_ROOT / f"stories_{lang}"
    out_path = out_dir / f"{slug}-{lang}.md"
    system = build_system(lang, level, series)
    rejected = PIPELINE_ROOT / "work" / f"rejected_{lang}" / f"{slug}-{lang}.md"
    feedback: str | None = None
    raw = ""
    # Deneme 0: önceki koşudan kalan reddedilmiş sürüm (elle düzeltilmiş ya da
    # eşik değişmiş olabilir) API çağrılmadan yeniden denetlenir.
    first = 0 if rejected.exists() else 1
    for attempt in range(first, MAX_ATTEMPTS + 1):
        if attempt == 0:
            raw = rejected.read_text(encoding="utf-8")
        else:
            response = client.messages.create(
                model=MODEL,
                max_tokens=multi.MAX_TOKENS,
                system=system,
                messages=[{"role": "user", "content": build_user(source, lang, feedback)}],
            )
            raw = multi.strip_code_fence("".join(b.text for b in response.content if b.type == "text"))
        try:
            meta, body = multi.parse_frontmatter(raw)
        except ValueError as exc:
            feedback = str(exc)
            print(f"  [{lang}] deneme {attempt}: frontmatter hatası")
            continue
        if body.count("\n# ") + body.startswith("# ") != source_body.count("\n# ") + source_body.startswith("# "):
            feedback = "The number of `#` chapter headings differs from the English episode."
            print(f"  [{lang}] deneme {attempt}: bölüm sayısı farklı")
            continue
        result = multi.check_story(body, nlp, vocab, thresholds, off_list_max, cfg.use_token_count, cfg.use_camel)
        print(
            f"  [{lang}] deneme {attempt}: ort.cümle={result.avg_sentence:.1f} "
            f"off_list=%{result.off_list_ratio:.1f} kelime={result.word_count} ok={result.ok}"
        )
        if result.ok:
            final = "---\n" + yaml.safe_dump(
                fix_frontmatter(meta, source_meta, lang), allow_unicode=True, sort_keys=False
            ) + "---\n" + body
            if not dry_run:
                out_dir.mkdir(exist_ok=True)
                out_path.write_text(final, encoding="utf-8")
            print(f"  [{lang}] KABUL -> {out_path.name}")
            if not dry_run and rejected.exists():
                rejected.unlink()
            return True
        feedback = "\n".join(result.reasons)
        print(f"  [{lang}] RED: {feedback}")
        time.sleep(1)

    if not dry_run:
        rejected.parent.mkdir(parents=True, exist_ok=True)
        rejected.write_text(raw, encoding="utf-8")
    print(f"  [{lang}] {MAX_ATTEMPTS} denemede geçemedi -> {rejected}")
    return False


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--slug", required=True, help="İngilizce bölüm slug'ı, ör. kai-repair-files-b1-e01")
    parser.add_argument("--lang", nargs="+", default=["all"])
    parser.add_argument("--force", action="store_true", help="Var olan uyarlamanın üzerine yaz")
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()

    langs = ALL_LANGS if args.lang == ["all"] else args.lang
    load_dotenv(PIPELINE_ROOT / ".env")
    client = Anthropic()
    failed: list[str] = []
    for lang in langs:
        out_path = PIPELINE_ROOT / f"stories_{lang}" / f"{args.slug}-{lang}.md"
        if out_path.exists() and not args.force:
            print(f"[{lang}] zaten var, atlanıyor ({out_path.name})")
            continue
        print(f"[{lang}] {args.slug} uyarlanıyor...")
        if not adapt_one(client, args.slug, lang, args.dry_run):
            failed.append(lang)
    print(f"\nBitti. Başarısız: {failed or 'yok'}")
    return 1 if failed else 0


if __name__ == "__main__":
    raise SystemExit(main())
