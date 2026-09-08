"""Seviyeli özgün hikâye üretimi — kapalı döngü.

NEDEN BU BETİK VAR
------------------
`prompts/generate_story_a2.md` yazılmıştı ama onu ÇALIŞTIRAN hiçbir şey
yoktu: 38 A2 hikâyesi elle üretilip `stories/` altına kopyalanmıştı. Bu,
katalog büyütmeyi tekrarlanamaz bir el işine bağlıyor ve her yeni seviye
için baştan başlamak demek.

Betik üç şeyi tek komutta yapıyor:

  1. Prompt dosyasını + bir konu özetini modele verip hikâyeyi üretiyor.
  2. Sonucu pipeline'ın KENDİ STRICT doğrulayıcısına sokuyor
     (`pipeline check`) — yani üretim, yayın kriterinin ta kendisiyle
     ölçülüyor, ayrı/gevşek bir kontrolle değil.
  3. Geçemezse doğrulayıcının GEREKÇELERİNİ modele geri verip yeniden
     yazdırıyor. Kapalı döngü olan kısım bu; tek atışlık üretimde
     hikâyelerin önemli bir kısmı eşiklere takılıyor ve elle düzeltilmesi
     gerekiyordu.

Geçen hikâyeler `stories/` altına, geçemeyenler
`work/rejected/` altına gerekçeleriyle yazılıyor. Betik hiçbir şeyi
veritabanına YAZMAZ — yayınlama ayrı ve bilinçli bir adım
(`pipeline ingest` + `pipeline run` + `pipeline publish`).

KULLANIM
--------
    cd pipeline
    .venv/Scripts/python.exe scripts/generate_stories.py --level B1 --count 22

    # tek bir konuyu denemek için
    .venv/Scripts/python.exe scripts/generate_stories.py --level B1 --count 1 --dry-run

API ANAHTARI: `pipeline/.env` içindeki `ANTHROPIC_API_KEY`. Bu dosya
gitignore'da ve service_role anahtarıyla aynı yerde yaşıyor — asla
uygulama tarafına kopyalanmaz (CLAUDE.md, ADR-005).
"""

from __future__ import annotations

import argparse
import json
import os
import re
import subprocess
import sys
import time
from dataclasses import dataclass
from pathlib import Path

from anthropic import Anthropic
from dotenv import load_dotenv

PIPELINE_ROOT = Path(__file__).resolve().parent.parent
PROMPTS_DIR = PIPELINE_ROOT / "prompts"
STORIES_DIR = PIPELINE_ROOT / "stories"
REJECTED_DIR = PIPELINE_ROOT / "work" / "rejected"

#: Hikâyelerin künyesindeki yazar adı — mevcut 38 A2 hikâyesiyle aynı.
AUTHOR = "İngilizce Hikaye Stüdyosu"

#: Varsayılan model. Katalog bu ürünün çekirdek varlığı; hikâye kalitesi
#: doğrudan ürün kalitesi demek. `--model claude-sonnet-5` ile daha ucuz
#: bir modele geçilebilir.
DEFAULT_MODEL = "claude-opus-5"

#: Doğrulayıcıya takılan bir hikâye kaç kez yeniden yazdırılsın.
#: 3'ten sonrası pratikte aynı hatayı tekrarlıyor; o hikâyeyi bırakıp
#: bir sonrakine geçmek daha verimli.
MAX_ATTEMPTS = 3

#: B1 hikâyeleri ~1.800-3.200 kelime (~4.500 token). Tavan bunun çok
#: üstünde çünkü DÜŞÜNME (thinking) tokenları da bu bütçeden harcanıyor.
#:
#: NEDEN ÖNEMLİ: ilk sürümde tavan 8.000'di ve model tamamını düşünmeye
#: harcayıp tek satır metin üretmeden `max_tokens`'a çarpıyordu — sonuç
#: boş bir hikâye dosyasıydı. Tavan ile düşünmenin harcadığı arasındaki
#: fark, hikâyenin sığacağı yerdir.
MAX_TOKENS = 32000

#: Düşünme derinliği. Sabit bir token bütçesi (`budget_tokens`) bu model
#: ailesinde KALDIRILDI — 400 döner; derinlik artık `output_config.effort`
#: ile ayarlanıyor. Kısıt yoğun bir görev (kelime tavanı + cümle uzunluğu +
#: dilbilgisi listesi) olduğu için varsayılan "high" korunuyor.
EFFORT = "high"


@dataclass(frozen=True)
class Brief:
    """Tek bir hikâyenin konu özeti.

    NEDEN ÖNCEDEN YAZILMIŞ KONULAR: modele yalnızca "bir B1 hikâyesi yaz"
    demek, 22 çağrıda birbirine çok benzeyen 22 hikâye üretiyor — aynı
    şehir, aynı aile yapısı, aynı kayıp-eşya kurgusu. Konular önden ve
    çeşitli verildiğinde katalog gerçekten çeşitleniyor.
    """

    slug: str
    premise: str
    genres: tuple[str, ...]
    themes: tuple[str, ...]


#: B1 konu havuzu. Hepsi kültürel olarak evrensel (prompt §5), hepsinde
#: somut bir istek + somut bir engel + bir dönüş noktası var (§7).
B1_BRIEFS: tuple[Brief, ...] = (
    Brief(
        "the-night-shift-key",
        "A young hotel night receptionist finds a guest's key in the "
        "lost-and-found drawer three days after the guest checked out — "
        "and the room has been locked from the inside ever since.",
        ("mystery", "drama"),
        ("courage", "truth"),
    ),
    Brief(
        "her-fathers-debt",
        "A woman returns to her hometown to sell her late father's small "
        "repair shop and discovers he owed money to half the street — and "
        "that most of them do not want it back.",
        ("drama", "family"),
        ("family", "forgiveness"),
    ),
    Brief(
        "the-wrong-bus-to-the-interview",
        "A man takes the wrong bus to the most important job interview of "
        "his life and has ninety minutes to get across a city he does not "
        "know, with a phone that is nearly dead.",
        ("drama",),
        ("perseverance", "chance"),
    ),
    Brief(
        "the-bread-that-came-back",
        "A baker starts leaving unsold bread on a shelf outside her shop "
        "at closing time. Someone starts leaving something in return, and "
        "she decides to find out who.",
        ("drama", "slice-of-life"),
        ("kindness", "community"),
    ),
    Brief(
        "two-names-on-the-lease",
        "Two strangers discover they have both signed a lease for the same "
        "flat, and neither can afford to lose the deposit.",
        ("drama", "comedy"),
        ("conflict", "friendship"),
    ),
    Brief(
        "the-river-that-moved",
        "A village's only bridge is closed for repairs and a teenager who "
        "has to reach school on the other side starts rowing people across "
        "for a small fee — until the river rises.",
        ("adventure", "drama"),
        ("responsibility", "courage"),
    ),
    Brief(
        "the-photograph-in-the-book",
        "A second-hand bookseller finds an old photograph inside a returned "
        "book and recognises the building in it as her own.",
        ("mystery", "drama"),
        ("memory", "identity"),
    ),
    Brief(
        "one-more-season",
        "An ageing football coach in a small town must decide whether to "
        "play his best player, who has just been offered a place at a club "
        "in the city, in the final match of the season.",
        ("drama", "sports"),
        ("loyalty", "growing-up"),
    ),
    Brief(
        "the-letter-she-did-not-send",
        "A retired teacher finds a letter she wrote thirty years ago and "
        "never posted, and sets out to deliver it by hand.",
        ("drama",),
        ("regret", "second-chances"),
    ),
    Brief(
        "the-market-stall-next-to-mine",
        "A fruit seller's takings drop the week a new stall opens beside "
        "hers — and then she learns why the new seller needs the money.",
        ("drama", "slice-of-life"),
        ("rivalry", "compassion"),
    ),
    Brief(
        "the-cat-that-belonged-to-everyone",
        "A stray cat that four flats have quietly been feeding falls ill, "
        "and the neighbours must finally speak to one another.",
        ("drama", "slice-of-life"),
        ("community", "responsibility"),
    ),
    Brief(
        "the-day-the-power-went-out",
        "A whole district loses power on the hottest night of the year and "
        "a pharmacy assistant has four hours to move the medicine that must "
        "stay cold.",
        ("drama", "adventure"),
        ("problem-solving", "community"),
    ),
    Brief(
        "the-boy-who-fixed-radios",
        "A boy who repairs old radios in his uncle's shop hears the same "
        "voice on three different sets and decides to trace the broadcast.",
        ("mystery", "adventure"),
        ("curiosity", "family"),
    ),
    Brief(
        "the-second-kitchen",
        "Two sisters inherit their mother's restaurant and cannot agree on "
        "a single item of the menu.",
        ("drama", "family"),
        ("family", "compromise"),
    ),
    Brief(
        "a-week-of-rain",
        "A farmer waits for rain that has not come in seven weeks, and when "
        "it finally arrives it does not stop.",
        ("drama",),
        ("patience", "nature"),
    ),
    Brief(
        "the-guest-who-never-left",
        "A guesthouse owner in the off-season has one long-staying guest "
        "who pays in cash and never goes out before dark.",
        ("mystery", "drama"),
        ("trust", "judgement"),
    ),
    Brief(
        "the-shortest-way-home",
        "A delivery driver takes a shortcut through a closed road to reach "
        "a birthday on time and gets stuck in a place with no signal.",
        ("adventure", "drama"),
        ("promises", "resourcefulness"),
    ),
    Brief(
        "the-neighbours-piano",
        "A student who works nights cannot sleep because of the piano next "
        "door — and discovers the player is preparing for something.",
        ("drama", "slice-of-life"),
        ("patience", "understanding"),
    ),
    Brief(
        "the-list-on-the-fridge",
        "A man following his wife's handwritten shopping list after her "
        "death finds an item on it he does not recognise.",
        ("drama", "family"),
        ("grief", "memory"),
    ),
    Brief(
        "the-borrowed-boat",
        "Two friends borrow a fishing boat without asking and lose the "
        "engine key at sea.",
        ("adventure",),
        ("friendship", "consequences"),
    ),
    Brief(
        "the-exam-nobody-passed",
        "When an entire class fails the same exam, one student notices "
        "something wrong with the paper itself.",
        ("drama", "mystery"),
        ("fairness", "courage"),
    ),
    Brief(
        "the-shop-that-opened-at-four",
        "A tailor who has opened at nine every morning for forty years "
        "starts opening at four in the afternoon, and his oldest customer "
        "wants to know why.",
        ("drama", "slice-of-life"),
        ("ageing", "friendship"),
    ),
    Brief(
        "the-name-on-the-parcel",
        "A parcel arrives at the wrong address with a name the family has "
        "not heard in years.",
        ("mystery", "family"),
        ("secrets", "family"),
    ),
    Brief(
        "the-last-bus-driver",
        "The driver of the last bus of the night keeps finding the same "
        "passenger asleep at the final stop.",
        ("drama",),
        ("kindness", "loneliness"),
    ),
)


#: B2 konu havuzu. B1'den farkı, her brief'in İKİ basınç taşıması (prompt
#: §7): somut bir hedef VE onunla çatışan bir bağlılık/bedel. Bu uzunlukta
#: (23-37 dk) tek hatlı bir gerilim gevşiyor.
#:
#: Ayrıca hepsi evrensel bir kurumda geçiyor — hastane, mahkeme, fabrika,
#: gazete, üniversite, liman. Bunlar her ülkede var; ulusal bir sınav ya da
#: yerel bir bayram yok (prompt §5).
B2_BRIEFS: tuple[Brief, ...] = (
    Brief(
        "the-witness-who-stayed",
        "A court interpreter realises the witness she is translating for "
        "is deliberately saying less than he knows — and that the man in "
        "the dock is her landlord, who forgave her rent for two years.",
        ("drama", "mystery"),
        ("truth", "loyalty"),
    ),
    Brief(
        "the-third-shift",
        "A factory safety inspector finds the fault that caused an "
        "accident, and traces the signature on the ignored report to the "
        "supervisor who trained her.",
        ("drama",),
        ("responsibility", "loyalty"),
    ),
    Brief(
        "the-correction",
        "A young newspaper editor must decide whether to print a "
        "correction that would clear a stranger's name and end her "
        "mentor's career, four days before he retires.",
        ("drama",),
        ("truth", "courage"),
    ),
    Brief(
        "the-night-ward",
        "A nurse on a long night shift is the only one who believes a "
        "patient's account of what happened, while the notes in the file "
        "were written by the colleague who covered her own mistake.",
        ("drama", "mystery"),
        ("trust", "responsibility"),
    ),
    Brief(
        "the-harbour-lease",
        "A woman returns to the port town she left at eighteen to sign "
        "away her father's boat lease, and discovers the buyer is the "
        "family her father blamed for losing it.",
        ("drama",),
        ("family", "forgiveness"),
    ),
    Brief(
        "the-second-marking",
        "A university tutor re-marks an exam and finds the failing script "
        "belongs to the student whose scholarship letter she signed.",
        ("drama",),
        ("responsibility", "fairness"),
    ),
    Brief(
        "the-unsent-application",
        "An architect discovers her firm's winning design was drawn by an "
        "intern who left without credit, and the intern is now the client "
        "reviewing the project.",
        ("drama",),
        ("truth", "ambition"),
    ),
    Brief(
        "the-quiet-carriage",
        "A train guard covers for a colleague's missed inspection, then "
        "has to explain a delay to a passenger whose mother is waiting at "
        "a hospital two hundred kilometres away.",
        ("drama",),
        ("responsibility", "kindness"),
    ),
    Brief(
        "the-inherited-debt",
        "A baker inherits her uncle's shop along with a debt to the "
        "neighbour who has fed the whole street on credit for a decade.",
        ("drama",),
        ("family", "community"),
    ),
    Brief(
        "the-missing-hour",
        "A hotel's security officer finds one hour cut from the corridor "
        "footage on the night a guest's case disappeared, and the only "
        "person with the access code is the one who reported the theft.",
        ("mystery", "drama"),
        ("trust", "truth"),
    ),
    Brief(
        "the-open-file",
        "A city archivist is asked to lose a planning document that would "
        "stop a development, by the councillor who saved the archive from "
        "closure.",
        ("drama",),
        ("truth", "community"),
    ),
    Brief(
        "the-return-flight",
        "A translator accompanying a delegation abroad realises the "
        "contract she is interpreting has a clause that will cost her own "
        "town its water rights.",
        ("drama",),
        ("responsibility", "home"),
    ),
)


BRIEFS: dict[str, tuple[Brief, ...]] = {"B1": B1_BRIEFS, "B2": B2_BRIEFS}


def load_prompt(level: str) -> str:
    path = PROMPTS_DIR / f"generate_story_{level.lower()}.md"
    if not path.exists():
        raise SystemExit(f"Prompt bulunamadı: {path}")
    return path.read_text(encoding="utf-8")


def build_user_message(brief: Brief, level: str) -> str:
    return (
        f"Write the story now.\n\n"
        f"Premise: {brief.premise}\n\n"
        f"Frontmatter values to use exactly:\n"
        f"  author: {AUTHOR}\n"
        f"  target_level: {level}\n"
        f"  genres: [{', '.join(brief.genres)}]\n"
        f"  themes: [{', '.join(brief.themes)}]\n\n"
        f"Choose your own title — do not reuse the premise text as the title.\n"
        f"Output only the markdown file contents, starting with `---`."
    )


def strip_code_fence(text: str) -> str:
    """Model bazen çıktıyı ``` içine alıyor; frontmatter ayrıştırıcısı bunu
    kabul etmez."""
    stripped = text.strip()
    if stripped.startswith("```"):
        stripped = re.sub(r"^```[a-zA-Z]*\n", "", stripped)
        stripped = re.sub(r"\n```$", "", stripped)
    return stripped.strip() + "\n"


def run_validator(md_path: Path) -> tuple[bool, str]:
    """Hikâyeyi pipeline'ın kendi STRICT doğrulayıcısından geçirir.

    Ayrı bir kontrol yazmıyoruz: yayın kriteri neyse üretim de ona göre
    ölçülmeli, yoksa "üretimde geçti, yayında takıldı" durumu doğar.
    """
    result = subprocess.run(
        [sys.executable, "-m", "src.cli", "check", "--file", str(md_path)],
        cwd=PIPELINE_ROOT,
        capture_output=True,
        text=True,
        encoding="utf-8",
        errors="replace",
    )
    return result.returncode == 0, (result.stdout or "") + (result.stderr or "")


def generate_one(
    client: Anthropic,
    model: str,
    system_prompt: str,
    brief: Brief,
    level: str,
    verbose: bool,
) -> tuple[bool, Path | None, str]:
    """Bir hikâyeyi üretir, doğrular, gerekirse gerekçelerle yeniden yazdırır."""
    user_message = build_user_message(brief, level)
    last_report = ""

    for attempt in range(1, MAX_ATTEMPTS + 1):
        # NEDEN STREAM: uzun üretimlerde tek parça (non-streaming) istek
        # zaman aşımına açık; SDK da büyük `max_tokens` için stream
        # öneriyor. `get_final_message()` yine tam mesajı veriyor.
        with client.messages.stream(
            model=model,
            max_tokens=MAX_TOKENS,
            system=system_prompt,
            thinking={"type": "adaptive"},
            output_config={"effort": EFFORT},
            messages=[{"role": "user", "content": user_message}],
        ) as stream:
            response = stream.get_final_message()

        blocks = [block.text for block in response.content if block.type == "text"]
        story = strip_code_fence("".join(blocks))

        # Model yalnızca düşünüp metin üretmeden tavana çarpmış olabilir.
        # Boş bir metni doğrulayıcıya ya da bir sonraki isteğe göndermek
        # anlamsız ve API tarafında hataya yol açıyor.
        if not story.strip():
            last_report = (
                f"Model metin üretmedi (stop_reason={response.stop_reason}, "
                f"output_tokens={response.usage.output_tokens}). "
                "MAX_TOKENS / EFFORT dengesine bak."
            )
            if verbose:
                print(f"    deneme {attempt}: boş yanıt — {last_report}")
            continue

        candidate = REJECTED_DIR / f"{brief.slug}.attempt{attempt}.md"
        candidate.parent.mkdir(parents=True, exist_ok=True)
        candidate.write_text(story, encoding="utf-8")

        passed, report = run_validator(candidate)
        last_report = report
        if verbose:
            print(f"    deneme {attempt}: {'GEÇTİ' if passed else 'takıldı'}")
            if not passed:
                for line in report.splitlines():
                    if line.strip().startswith("-"):
                        print(f"      {line.strip()}")

        if passed:
            final = STORIES_DIR / f"{brief.slug}.md"
            final.write_text(story, encoding="utf-8")
            candidate.unlink(missing_ok=True)
            # Aynı hikâyenin daha önceki başarısız denemelerini de temizle.
            for older in REJECTED_DIR.glob(f"{brief.slug}.attempt*.md"):
                older.unlink(missing_ok=True)
            return True, final, report

        if attempt == MAX_ATTEMPTS:
            break

        # Doğrulayıcının gerekçelerini modele geri ver. Genel bir "tekrar
        # dene" yerine SOMUT hata metnini vermek, ikinci denemenin başarı
        # oranını belirgin şekilde artırıyor.
        #
        # NEDEN ÇOK TURLU KONUŞMA DEĞİL DE TEK MESAJ: düşünme (thinking)
        # açıkken önceki asistan turunu geri göndermek, düşünme
        # bloklarının da korunmasını gerektiren bir kural setine giriyor.
        # Reddedilen metni yeni bir kullanıcı mesajının İÇİNE koymak aynı
        # bilgiyi taşıyor ve bu kuralın tamamen dışında kalıyor.
        user_message = (
            f"{build_user_message(brief, level)}\n\n"
            "---\n\n"
            "A previous draft did not pass the automated level validator. "
            "Here is that draft:\n\n"
            f"{story}\n\n"
            "---\n\n"
            "Here is the validator's exact output for it:\n\n"
            f"{report}\n\n"
            "Rewrite the whole story so it passes. Keep the same premise, "
            "characters and title. Fix what the validator complains about "
            "\u2014 if sentences are too long, split them; if vocabulary is "
            "over level, replace the specific words listed. Output only the "
            "markdown file contents, starting with `---`."
        )

    return False, None, last_report


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--level", default="B1", choices=sorted(BRIEFS))
    parser.add_argument("--count", type=int, default=22)
    parser.add_argument("--model", default=DEFAULT_MODEL)
    parser.add_argument("--start", type=int, default=0, help="Konu havuzunda başlangıç indeksi")
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Yalnızca ne üretileceğini yazdırır, API çağrısı yapmaz.",
    )
    parser.add_argument("--quiet", action="store_true")
    args = parser.parse_args()

    load_dotenv(PIPELINE_ROOT / ".env")
    api_key = os.environ.get("ANTHROPIC_API_KEY")
    if not api_key and not args.dry_run:
        raise SystemExit("ANTHROPIC_API_KEY tanımlı değil (pipeline/.env).")

    briefs = BRIEFS[args.level][args.start : args.start + args.count]
    if not briefs:
        raise SystemExit("Bu aralıkta konu yok — --start / --count değerlerini kontrol et.")

    STORIES_DIR.mkdir(parents=True, exist_ok=True)
    REJECTED_DIR.mkdir(parents=True, exist_ok=True)

    print(f"{args.level}: {len(briefs)} hikâye, model={args.model}")

    if args.dry_run:
        for index, brief in enumerate(briefs, 1):
            already = (STORIES_DIR / f"{brief.slug}.md").exists()
            note = " (dosya zaten var, atlanır)" if already else ""
            print(f"  {index:2}. {brief.slug}{note}")
        return 0

    system_prompt = load_prompt(args.level)
    client = Anthropic(api_key=api_key)

    passed: list[str] = []
    failed: list[tuple[str, str]] = []
    started = time.time()

    for index, brief in enumerate(briefs, 1):
        target = STORIES_DIR / f"{brief.slug}.md"
        if target.exists():
            print(f"  {index:2}/{len(briefs)} {brief.slug} — zaten var, atlanıyor")
            passed.append(brief.slug)
            continue

        print(f"  {index:2}/{len(briefs)} {brief.slug} …")
        try:
            ok, _, report = generate_one(
                client, args.model, system_prompt, brief, args.level, not args.quiet
            )
        except Exception as exc:  # noqa: BLE001 - tek bir hikâye tüm çalıştırmayı düşürmesin
            print(f"    HATA: {exc}")
            failed.append((brief.slug, str(exc)))
            continue

        if ok:
            passed.append(brief.slug)
        else:
            failed.append((brief.slug, report))
            (REJECTED_DIR / f"{brief.slug}.report.txt").write_text(report, encoding="utf-8")

    elapsed = time.time() - started
    print(f"\nGeçen: {len(passed)}  Geçemeyen: {len(failed)}  Süre: {elapsed / 60:.1f} dk")
    if failed:
        print("Geçemeyenler (gerekçeler work/rejected/*.report.txt içinde):")
        for slug, _ in failed:
            print(f"  - {slug}")

    summary = {
        "level": args.level,
        "model": args.model,
        "passed": passed,
        "failed": [slug for slug, _ in failed],
    }
    (REJECTED_DIR / "last_run.json").write_text(
        json.dumps(summary, ensure_ascii=False, indent=2), encoding="utf-8"
    )

    return 0 if not failed else 1


if __name__ == "__main__":
    raise SystemExit(main())
