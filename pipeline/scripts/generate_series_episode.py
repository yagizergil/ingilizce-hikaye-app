"""Karakterli seri bölümü üretimi (bkz. universe/README.md).

Bir seri kartından (universe/series/<id>.yaml) sıradaki bölümü üretir:

  1. İstem = seviye kuralları (prompts/generate_story_<seviye>.md)
     + dünya kartı + karakter kartı + seri kartı
     + önceki bölümlerin süreklilik özetleri + bu bölümün premise'i.
  2. Çıktı scripts/check_story.py ile AYNI eşiklerle ölçülür; geçemezse
     gerekçeler modele geri verilip yeniden yazdırılır (en çok 3 deneme).
  3. Geçen hikâye stories/ (en) ya da stories_<dil>/ altına frontmatter'ında
     `series`, `series_index`, `character` ile yazılır; modelin döndürdüğü
     özet + yeni gerçekler universe/continuity/<id>.yaml'a eklenir ve seri
     kartında bölümün durumu `generated` olur.

Veritabanına DOKUNMAZ; yayın ayrı ve bilinçli bir adımdır (README §3).

KULLANIM
    cd pipeline
    .venv/Scripts/python.exe scripts/generate_series_episode.py --series leo-little-cafe-a1 --next
    .venv/Scripts/python.exe scripts/generate_series_episode.py --series nora-night-train-a2 --episode 2 --dry-run

YENİ SEZON / YENİ SERİ: universe/series/ altına yeni bir kart ekleyin
(devam sezonu için `continues: <eski-id>`). Eski kartlara ve slug'lara
dokunulmaz; seriler bu yüzden hiçbir zaman karışmaz.

DİĞER DİLLER: `--lang de` o dilin seviye istemini
(prompts/generate_story_<seviye>_<dil>.md) kullanır ve çıktıyı
stories_<dil>/ altına yazar. İngilizce dışı diller için katı doğrulama
`generate_stories_multi.py`deki ölçümle yapılmalı; bu betik onu henüz
çağırmıyor (`--no-validate` gerekir) -- bilinçli olarak bir sonraki adım.
"""

from __future__ import annotations

import argparse
import contextlib
import io
import os
import re
import sys
import time
from pathlib import Path

import yaml

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

PIPELINE_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(PIPELINE_ROOT))
sys.path.insert(0, str(PIPELINE_ROOT / "scripts"))

UNIVERSE = PIPELINE_ROOT / "universe"
PROMPTS_DIR = PIPELINE_ROOT / "prompts"
AUTHOR = "Lingo Studio"
DEFAULT_MODEL = "claude-opus-5"
MAX_ATTEMPTS = 3
CONTINUITY_MARKER = "=== CONTINUITY ==="


def load_yaml(path: Path) -> dict:
    return yaml.safe_load(path.read_text(encoding="utf-8")) or {}


def series_card(series_id: str) -> tuple[Path, dict]:
    path = UNIVERSE / "series" / f"{series_id}.yaml"
    if not path.exists():
        raise SystemExit(f"seri kartı yok: {path}")
    return path, load_yaml(path)


def pick_episode(card: dict, episode: int | None) -> dict:
    episodes = card.get("episodes") or []
    if episode is not None:
        for item in episodes:
            if item["index"] == episode:
                return item
        raise SystemExit(f"{card['id']} içinde {episode}. bölüm yok")
    for item in episodes:
        if item.get("status", "planned") == "planned":
            return item
    raise SystemExit(
        f"{card['id']} içinde planlanmış bölüm yok -- seri kartına yeni bir "
        "episodes satırı ekleyin (index, slug, premise, status: planned)."
    )


def level_rules(level: str, lang: str) -> str:
    suffix = "" if lang == "en" else f"_{lang}"
    candidates = [PROMPTS_DIR / f"generate_story_{level.lower()}{suffix}.md"]
    if lang == "en":
        # İngilizce A1 istem dosyası yok; A2 kuralları + A1 eşikleri kullanılır.
        candidates.append(PROMPTS_DIR / "generate_story_a2.md")
    for path in candidates:
        if path.exists():
            return path.read_text(encoding="utf-8")
    raise SystemExit(f"{level}/{lang} için seviye istemi yok")


def continuity_path(series_id: str) -> Path:
    return UNIVERSE / "continuity" / f"{series_id}.yaml"


def build_prompt(card: dict, episode: dict, lang: str) -> str:
    world = load_yaml(UNIVERSE / "world.yaml")
    if card["character"] not in world.get("main_characters", []):
        raise SystemExit(
            f"'{card['character']}' ana kadroda değil ({world.get('main_characters')}). "
            "Seriler yalnızca ana karakterler için yazılır (world.yaml main_characters)."
        )
    character = load_yaml(UNIVERSE / "characters" / f"{card['character']}.yaml")
    continuity = load_yaml(continuity_path(card["id"])) if continuity_path(card["id"]).exists() else {}
    previous = continuity.get("episodes") or []
    if card.get("continues"):
        prev_card_path = continuity_path(card["continues"])
        if prev_card_path.exists():
            previous = (load_yaml(prev_card_path).get("episodes") or []) + previous

    series_brief = {k: card[k] for k in ("id", "level", "season", "genres", "themes", "format") if k in card}
    series_brief["title"] = (card.get("titles") or {}).get("en")
    level = card["level"]
    frontmatter = (
        f"---\ntitle: <episode title>\nauthor: {AUTHOR}\ntarget_level: {level}\n"
        f"genres: [{', '.join(card.get('genres', []))}]\n"
        f"themes: [{', '.join(card.get('themes', []))}]\n"
        f"series: {card['id'] if lang == 'en' else card['id'] + '-' + lang}\n"
        f"series_index: {episode['index']}\n"
        f"character: {card['character']}\n"
        f"generation_prompt_version: series_v1\n---"
    )
    return "\n\n".join(
        [
            level_rules(level, lang),
            "# SERIES CONTEXT (follow strictly)",
            "## World\n" + yaml.safe_dump(world, allow_unicode=True, sort_keys=False),
            "## Main character\n" + yaml.safe_dump(character, allow_unicode=True, sort_keys=False),
            "## Series\n" + yaml.safe_dump(series_brief, allow_unicode=True, sort_keys=False),
            "## Previous episodes (continuity -- do not contradict)\n"
            + (yaml.safe_dump(previous, allow_unicode=True, sort_keys=False) if previous else "None yet: this is the first episode."),
            f"## This episode\nEpisode {episode['index']}. Premise: {episode['premise'].strip()}",
            "## Output format\n"
            "Return ONLY the story as Markdown, starting with exactly this frontmatter "
            f"(fill in the title):\n{frontmatter}\n"
            "Then chapters, each starting with '# '. The episode must be complete in itself "
            "but end with a small hook for the next episode.\n"
            f"After the story, write a line '{CONTINUITY_MARKER}' and then YAML with keys: "
            "summary (3-5 sentences, English), facts (list of new facts established: names, places, "
            "relationships, objects), open_threads (list).",
        ]
    )


def validate(path: Path) -> tuple[bool, str]:
    from check_story import check  # aynı eşikler ve kelime listeleri
    from src.profiler import load_cefr_vocabulary, load_spacy_model
    from src.validator import load_thresholds

    buffer = io.StringIO()
    with contextlib.redirect_stdout(buffer):
        ok = check(path, load_cefr_vocabulary(), load_spacy_model(), load_thresholds())
    return ok, buffer.getvalue()


def split_output(text: str) -> tuple[str, dict]:
    if CONTINUITY_MARKER not in text:
        return text.strip() + "\n", {}
    story, _, tail = text.partition(CONTINUITY_MARKER)
    try:
        data = yaml.safe_load(tail) or {}
    except yaml.YAMLError:
        data = {}
    return story.strip() + "\n", data if isinstance(data, dict) else {}


def record(card_path: Path, card: dict, episode: dict, story: str, continuity: dict) -> None:
    title_match = re.search(r"^title:\s*(.+)$", story, flags=re.MULTILINE)
    title = title_match.group(1).strip() if title_match else episode.get("title", "")

    cpath = continuity_path(card["id"])
    current = load_yaml(cpath) if cpath.exists() else {"series": card["id"], "episodes": []}
    current["episodes"] = [e for e in current.get("episodes", []) if e.get("index") != episode["index"]]
    current["episodes"].append(
        {
            "index": episode["index"],
            "slug": episode["slug"],
            "title": title,
            "summary": continuity.get("summary", ""),
            "facts": continuity.get("facts", []),
            "open_threads": continuity.get("open_threads", []),
        }
    )
    current["episodes"].sort(key=lambda e: e["index"])
    cpath.parent.mkdir(parents=True, exist_ok=True)
    cpath.write_text(yaml.safe_dump(current, allow_unicode=True, sort_keys=False), encoding="utf-8")

    # Seri kartında yalnızca bu bölümün durumunu değiştir (yorumlar korunur).
    raw = card_path.read_text(encoding="utf-8")
    pattern = re.compile(
        rf"(- index: {episode['index']}\n(?:\s{{4}}.*\n)*?\s{{4}}status: )planned", re.MULTILINE
    )
    card_path.write_text(pattern.sub(r"\1generated", raw, count=1), encoding="utf-8")


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--series", required=True)
    parser.add_argument("--lang", default="en")
    group = parser.add_mutually_exclusive_group(required=True)
    group.add_argument("--episode", type=int)
    group.add_argument("--next", action="store_true")
    parser.add_argument("--model", default=DEFAULT_MODEL)
    parser.add_argument("--dry-run", action="store_true", help="istemi yazdır, model çağırma")
    parser.add_argument("--no-validate", action="store_true")
    args = parser.parse_args()

    card_path, card = series_card(args.series)
    episode = pick_episode(card, args.episode)
    prompt = build_prompt(card, episode, args.lang)
    slug = episode["slug"] if args.lang == "en" else f"{episode['slug']}-{args.lang}"
    out_dir = PIPELINE_ROOT / ("stories" if args.lang == "en" else f"stories_{args.lang}")
    out_path = out_dir / f"{slug}.md"

    if args.dry_run:
        print(prompt)
        print(f"\n[dry-run] çıktı: {out_path}")
        return 0
    if args.lang != "en" and not args.no_validate:
        raise SystemExit("İngilizce dışı dillerde doğrulama henüz bağlı değil; --no-validate ile çalıştırın.")

    from anthropic import Anthropic
    from dotenv import load_dotenv

    load_dotenv(PIPELINE_ROOT / ".env")
    client = Anthropic(api_key=os.environ["ANTHROPIC_API_KEY"])
    messages = [{"role": "user", "content": prompt}]
    for attempt in range(1, MAX_ATTEMPTS + 1):
        response = client.messages.create(model=args.model, max_tokens=32000, messages=messages)
        text = "".join(block.text for block in response.content if block.type == "text")
        story, continuity = split_output(text)
        out_dir.mkdir(parents=True, exist_ok=True)
        out_path.write_text(story, encoding="utf-8")
        if args.no_validate:
            ok, report = True, "(doğrulama atlandı)"
        else:
            ok, report = validate(out_path)
        print(f"deneme {attempt}: {'GEÇTİ' if ok else 'KALDI'}\n{report}")
        if ok:
            record(card_path, card, episode, story, continuity)
            print(f"yazıldı: {out_path}")
            return 0
        messages += [
            {"role": "assistant", "content": text},
            {
                "role": "user",
                "content": "The validator rejected the story:\n"
                + report
                + "\nRewrite the WHOLE episode to fix every problem, same output format.",
            },
        ]
        time.sleep(1)
    rejected = PIPELINE_ROOT / "work" / "rejected" / out_path.name
    rejected.parent.mkdir(parents=True, exist_ok=True)
    out_path.replace(rejected)
    print(f"{MAX_ATTEMPTS} denemede geçmedi; {rejected} altına taşındı.")
    return 1


if __name__ == "__main__":
    raise SystemExit(main())
