"""Yayındaki kitaplar için 3 basamaklı quiz üretir (migration 052).

  level 1 "Kelime"       6 soru  kitaptaki kelimelerin bağlam içindeki anlamı  (ücretsiz)
  level 2 "Anlama"       8 soru  kim / ne / nerede / ne oldu                  (premium)
  level 3 "Derin okuma"  8 soru  neden, çıkarım, olay sırası, niyet            (premium)

Sorular kitabın KENDİ metninden, kendi dilinde ve CEFR seviyesinde üretilir.
Uzun kitaplarda metnin tamamı modele verilmez: her bölümün başından eşit
pay alınarak ~MAX_WORDS kelimelik, kitabın tamamına yayılmış bir örneklem
kurulur (sorular kitabın yalnızca ilk sayfalarından olmasın diye).

Doğrulama (geçmezse gerekçeyle yeniden sorulur, en çok 3 deneme): her
basamakta doğru soru sayısı, 4 benzersiz seçenek, geçerli doğru indeksi,
boş olmayan açıklama, doğru cevabın seçenekler arasında tek olması.
Doğru cevabın konumu modelin sapmasına bırakılmaz: seçenekler yazılmadan
önce karıştırılır.

KULLANIM
    cd pipeline
    .venv/Scripts/python.exe scripts/generate_book_quizzes.py --limit 3         # pilot
    .venv/Scripts/python.exe scripts/generate_book_quizzes.py --all
    .venv/Scripts/python.exe scripts/generate_book_quizzes.py --slug kai-repair-files-b1-e01 --force
"""

from __future__ import annotations

import argparse
import json
import random
import sys
import time
from pathlib import Path

from anthropic import Anthropic
from dotenv import load_dotenv

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

PIPELINE_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(PIPELINE_ROOT))

from src.db import connect  # noqa: E402
from src.settings import load_settings  # noqa: E402

MODEL = "claude-sonnet-5"
MAX_WORDS = 6000


def _word_count(text: str) -> int:
    """Kelime sayısı; boşluksuz yazılan dillerde (ja/zh) karakterden kestirim.

    Eskiden yalnızca `split()` vardı: Japonca/Çince metinde boşluk olmadığı
    için örneklem sınırı hiç işlemiyor, modele çok uzun metin gidiyor ve
    maliyet katlanıyordu (2026-10-07).
    """
    spaced = len(text.split())
    cjk = sum(1 for ch in text if "぀" <= ch <= "ヿ" or "一" <= ch <= "鿿")
    return max(spaced, round(cjk / 1.5))
MAX_ATTEMPTS = 3
LEVELS = {
    1: {"count": 6, "kinds": ["vocabulary"]},
    2: {"count": 8, "kinds": ["fact"]},
    3: {"count": 8, "kinds": ["inference", "sequence", "motive"]},
}
LANG_NAMES = {
    "en": "English", "tr": "Turkish", "de": "German", "fr": "French", "it": "Italian",
    "es": "Spanish", "ru": "Russian", "ar": "Modern Standard Arabic", "zh": "Simplified Chinese",
    "ja": "Japanese",
}

SYSTEM = """You write reading-comprehension quizzes for a language-learning reading app.
Learners read a book in {language} at CEFR level {level}. Write every question, option and
explanation in {language}, using vocabulary and grammar a {level} learner can read.

Produce three quizzes that go from easy to hard:

LEVEL 1 "Words" - exactly 6 questions, kind "vocabulary". Pick useful words or short phrases
that really appear in the text (not names). Ask what the word means in the sentence where it
appears; quote that short sentence in the prompt. Options are short meanings/synonyms in {language}.

LEVEL 2 "Understanding" - exactly 8 questions, kind "fact". Who, what, where, when: facts
stated directly in the text. Spread questions over the whole excerpt, in story order.

LEVEL 3 "Deep reading" - exactly 8 questions, kinds "inference", "sequence" or "motive" (use
all three). Why did someone act, what can we conclude, what happened before/after what, what
does a character feel or want. The answer must be clearly supported by the text, never a guess.

Rules for every question:
- 4 options, all plausible, similar length, only ONE correct. No "all of the above".
- "explanation": one or two sentences saying why the answer is right, pointing to the text.
- Do not reveal the answer in the prompt.

Return ONLY JSON, no code fence:
{{"levels": [{{"level": 1, "questions": [{{"kind": "...", "prompt": "...", "options": ["..","..","..",".."],
"correct_index": 0, "explanation": "..."}}]}}, {{"level": 2, ...}}, {{"level": 3, ...}}]}}"""


def sample_text(sections: list[tuple[str | None, list[str]]]) -> str:
    total = sum(_word_count(" ".join(paras)) for _, paras in sections)
    budget_per_section = max(150, MAX_WORDS // max(len(sections), 1)) if total > MAX_WORDS else 10**9
    parts: list[str] = []
    for title, paras in sections:
        taken: list[str] = []
        words = 0
        for para in paras:
            if words >= budget_per_section:
                taken.append("[...]")
                break
            taken.append(para)
            words += _word_count(para)
        parts.append((f"## {title}\n" if title else "") + "\n\n".join(taken))
    return "\n\n".join(parts)


def validate(data: object) -> list[str]:
    errors: list[str] = []
    if not isinstance(data, dict) or not isinstance(data.get("levels"), list):
        return ["top-level object must have a 'levels' list"]
    by_level = {lvl.get("level"): lvl for lvl in data["levels"] if isinstance(lvl, dict)}
    for level, spec in LEVELS.items():
        block = by_level.get(level)
        if not block or not isinstance(block.get("questions"), list):
            errors.append(f"level {level} missing")
            continue
        questions = block["questions"]
        if len(questions) != spec["count"]:
            errors.append(f"level {level} must have exactly {spec['count']} questions, got {len(questions)}")
        for i, q in enumerate(questions, 1):
            where = f"level {level} question {i}"
            if not isinstance(q, dict):
                errors.append(f"{where}: not an object")
                continue
            if q.get("kind") not in spec["kinds"]:
                errors.append(f"{where}: kind must be one of {spec['kinds']}")
            options = q.get("options")
            if not isinstance(options, list) or len(options) != 4 or len({str(o).strip().lower() for o in options}) != 4:
                errors.append(f"{where}: needs 4 different options")
            if not isinstance(q.get("correct_index"), int) or not 0 <= q["correct_index"] <= 3:
                errors.append(f"{where}: correct_index must be 0-3")
            if not str(q.get("prompt", "")).strip() or not str(q.get("explanation", "")).strip():
                errors.append(f"{where}: prompt and explanation are required")
    return errors


def shuffled(q: dict, rng: random.Random) -> tuple[list[str], int]:
    options = [str(o).strip() for o in q["options"]]
    correct = options[q["correct_index"]]
    rng.shuffle(options)
    return options, options.index(correct)


def generate(client: Anthropic, book: dict, text: str) -> dict:
    system = SYSTEM.format(language=LANG_NAMES.get(book["lang"], "English"), level=book["level"] or "B1")
    feedback = ""
    for attempt in range(1, MAX_ATTEMPTS + 1):
        user = f"BOOK: {book['title']}\n\nTEXT:\n\n{text}" + feedback
        response = client.messages.create(
            model=MODEL, max_tokens=12000, system=system, messages=[{"role": "user", "content": user}]
        )
        raw = "".join(b.text for b in response.content if b.type == "text").strip()
        raw = raw.removeprefix("```json").removeprefix("```").removesuffix("```").strip()
        try:
            data = json.loads(raw)
        except json.JSONDecodeError as exc:
            errors = [f"invalid JSON: {exc}"]
        else:
            errors = validate(data)
            if not errors:
                return data
        print(f"    deneme {attempt}: {'; '.join(errors[:3])}")
        feedback = "\n\nYour previous answer was rejected:\n- " + "\n- ".join(errors[:10]) + "\nFix it."
        time.sleep(1)
    raise RuntimeError("quiz could not be validated")


def load_books(conn, args) -> list[dict]:
    where = "b.status = 'published'"
    params: list = []
    if args.slug:
        where += " and b.slug = any(%s)"
        params.append(args.slug)
    if not args.force:
        where += " and not exists (select 1 from public.book_quizzes q where q.book_id = b.id)"
    with conn.cursor() as cur:
        cur.execute(
            f"""select b.id, b.slug, b.title, coalesce(b.target_language, 'en'), b.cefr_level
                from public.books b where {where}
                order by b.is_original desc, coalesce(b.popularity_score, 0) desc, b.slug""",
            params,
        )
        rows = cur.fetchall()
    books = [dict(id=str(r[0]), slug=r[1], title=r[2], lang=r[3], level=r[4]) for r in rows]
    if args.shard:
        index, count = (int(x) for x in args.shard.split("/"))
        books = books[index::count]
    return books[: args.limit] if args.limit else books


def load_sections(conn, book_id: str) -> list[tuple[str | None, list[str]]]:
    with conn.cursor() as cur:
        cur.execute(
            """select s.id, s.title from public.book_sections s
               where s.book_id = %s order by s.order_index""",
            (book_id,),
        )
        sections = cur.fetchall()
        result = []
        for section_id, title in sections:
            cur.execute(
                "select text from public.book_paragraphs where section_id = %s order by order_index",
                (section_id,),
            )
            result.append((title, [r[0] for r in cur.fetchall()]))
    return result


def save(conn, book: dict, data: dict) -> None:
    rng = random.Random(book["id"])
    by_level = {lvl["level"]: lvl["questions"] for lvl in data["levels"]}
    with conn.transaction(), conn.cursor() as cur:
        cur.execute("delete from public.book_quizzes where book_id = %s", (book["id"],))
        for level in LEVELS:
            questions = by_level[level]
            cur.execute(
                """insert into public.book_quizzes (book_id, level, question_count, generation_model)
                   values (%s, %s, %s, %s) returning id""",
                (book["id"], level, len(questions), MODEL),
            )
            quiz_id = cur.fetchone()[0]
            for index, q in enumerate(questions):
                options, correct = shuffled(q, rng)
                cur.execute(
                    """insert into public.book_quiz_questions
                       (quiz_id, order_index, kind, prompt, options, correct_index, explanation)
                       values (%s, %s, %s, %s, %s, %s, %s)""",
                    (quiz_id, index, q["kind"], q["prompt"].strip(), options, correct, q["explanation"].strip()),
                )


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--all", action="store_true")
    parser.add_argument("--limit", type=int)
    parser.add_argument("--slug", nargs="+")
    parser.add_argument("--force", action="store_true", help="Quizi olan kitabı yeniden üret")
    parser.add_argument("--shard", help="Paralel çalıştırma: '0/6' = 6 parçanın ilki")
    args = parser.parse_args()
    if not (args.all or args.limit or args.slug):
        parser.error("--all, --limit ya da --slug verin")

    load_dotenv(PIPELINE_ROOT / ".env")
    client = Anthropic()
    failed: list[str] = []
    with connect(load_settings().database_url) as conn:
        books = load_books(conn, args)
        print(f"{len(books)} kitap için quiz üretilecek")
        for n, book in enumerate(books, 1):
            print(f"[{n}/{len(books)}] {book['slug']} ({book['lang']}, {book['level']})")
            try:
                text = sample_text(load_sections(conn, book["id"]))
                save(conn, book, generate(client, book, text))
                # Her kitaptan SONRA kaydet (2026-10-07): eskiden bağlantı tek
                # açık işlemde kalıyor, quizler ancak iş bitince yazılıyordu --
                # süreç yarıda kesilirse ödenen bütün üretim kayboluyordu ve
                # açık işlem silinmek istenen kitap satırlarını kilitliyordu.
                conn.commit()
                print("    ✓ kaydedildi")
            except Exception as exc:  # noqa: BLE001 -- toplu işte bir kitap patlarsa diğerleri devam etsin
                conn.rollback()
                failed.append(book["slug"])
                print(f"    ✗ {exc}")
    print(f"\nBitti. Başarısız ({len(failed)}): {failed}")
    return 1 if failed else 0


if __name__ == "__main__":
    raise SystemExit(main())
