"""İçerik uygunluk kontrolü (2026-10-06).

NEDEN: katalogda tek tek bakılmadan yayına girmiş, App Store'da ret ve
hukuki risk taşıyan kitaplar bulundu (çocuk istismarı anlatan bir roman,
erotik klasikler, sözlük/ders kitabı gibi okuma kitabı olmayan eserler).
Yayın artık bu kontrolden geçmeden olmuyor.

İKİ KATMAN:
  1. `heuristic_flags`: başlık/yazar üzerinde ücretsiz, deterministik ön
     eleme. Bir eşleşme tek başına reddetmez ama LLM'e "dikkat" notu olarak
     gider; kesin kara listedeki yazar/başlık ise doğrudan reddedilir.
  2. `llm_review`: kitabın başı/ortası/sonundan alınan örnek metni Claude
     okur ve JSON karar verir.

KAPALI HATA (fail closed): LLM çağrısı yapılamazsa ya da cevap
çözümlenemezse kitap YAYINA GİRMEZ (`needs_review`). Şüphede kalan içerik
için doğru varsayılan "henüz değil"dir.
"""

from __future__ import annotations

import json
import os
import re
from dataclasses import dataclass, field

MODEL = "claude-sonnet-5"

# Kesin ret: bu yazar/başlık kalıpları uygulamaya giremez.
BLOCK_PATTERNS = [
    r"\bsade\b.*marquis|marquis de sade|\bsade, marquis",
    r"sacher-masoch",
    r"mutzenbacher",
    r"erotika|erotic|érotique|erotisch|erotico|erótic|エロ|情色",
    r"sexualtheorie|sexual theory|sexualité|sessualità|sexualidad",
    r"kama ?sutra|ars amatoria|arte de amar|art d'aimer|arte di amare",
]

# Dikkat: okuma kitabı olmayabilir ya da hassas olabilir -> LLM'e not.
WATCH_PATTERNS = {
    "reference_work": r"dictionar|diccionario|dizionario|wörterbuch|dictionnaire|grammar|gramática|grammaire|"
    r"physiologie|physiology|lehrbuch|manual|handbuch|textbook|journal de la|"
    r"storia degli|vol\. ?\d+ \(di \d+\)|band \d|tome [ivx]+$|\(\d/\d\)|相対性理論|relativit",
    "sensitive": r"suicid|自殺|selbstmord|suicide|nackt|tout nu|amoureuse|libertin|manifest",
}


@dataclass
class ContentDecision:
    suitable: bool
    category: str
    reasons: list[str] = field(default_factory=list)


def heuristic_flags(title: str, author: str | None) -> tuple[bool, list[str]]:
    """(kesin_ret, notlar)"""
    text = f"{title} {author or ''}".lower()
    for pattern in BLOCK_PATTERNS:
        if re.search(pattern, text):
            return True, [f"blocklist: {pattern}"]
    notes = [name for name, pattern in WATCH_PATTERNS.items() if re.search(pattern, text)]
    return False, notes


SYSTEM = """You review public-domain books for a language-learning reading app on the Apple App Store (age rating 12+). Readers are adults and teenagers learning a language by reading stories.

Decide if the book is SUITABLE. Mark it UNSUITABLE if ANY of these apply:
- sexual content involving minors in any form (always unsuitable)
- explicit or pornographic sexual content, erotica, or works whose main subject is sex/sexual practices
- content that glorifies or instructs suicide, self-harm, or violence; hate speech or propaganda glorifying war/violence/discrimination
- not a readable narrative/literary work: dictionaries, glossaries, textbooks, scientific treatises, encyclopedic histories, periodicals, catalogues, commentary volumes, or a later volume of a multi-volume work that cannot be read on its own

Classic literature with mature themes (crime, war, death, romance, non-explicit sensuality, religion, philosophy, poetry, drama) IS suitable when not explicit.

Reply with ONLY a JSON object: {"suitable": true|false, "category": "ok"|"sexual_minors"|"sexual_explicit"|"harmful"|"not_narrative", "reason": "<one sentence>"}"""


def llm_review(title: str, author: str | None, sample: str, notes: list[str]) -> ContentDecision:
    try:
        from anthropic import Anthropic

        client = Anthropic(api_key=os.environ["ANTHROPIC_API_KEY"])
        user = (
            f"Title: {title}\nAuthor: {author or 'unknown'}\n"
            f"Heuristic notes: {', '.join(notes) or 'none'}\n\n"
            f"Text sample (beginning, middle, end):\n{sample[:12000]}"
        )
        response = client.messages.create(
            model=MODEL,
            max_tokens=300,
            system=SYSTEM,
            messages=[{"role": "user", "content": user}],
        )
        raw = "".join(getattr(block, "text", "") for block in response.content).strip()
        match = re.search(r"\{.*\}", raw, re.S)
        if not match:
            # Model metni incelemeyi reddettiyse bu da bir sinyal: yayına girmesin.
            return ContentDecision(False, "unreviewable", [f"no JSON verdict: {raw[:120]}"])
        data = json.loads(match.group(0))
        return ContentDecision(
            bool(data.get("suitable")),
            str(data.get("category", "unknown")),
            [str(data.get("reason", ""))],
        )
    except Exception as error:  # noqa: BLE001 -- kapalı hata: her arıza "yayınlama" demek
        return ContentDecision(False, "check_failed", [f"{type(error).__name__}: {error}"])


def build_sample(paragraphs: list[str], words_per_part: int = 600) -> str:
    """Kitabın başından, ortasından ve sonundan kısa örnekler."""
    if not paragraphs:
        return ""
    parts = []
    for start in (0, len(paragraphs) // 2, max(0, len(paragraphs) - 40)):
        chunk, count = [], 0
        for p in paragraphs[start:]:
            chunk.append(p)
            count += len(p.split())
            if count >= words_per_part:
                break
        parts.append(" ".join(chunk))
    return "\n\n[...]\n\n".join(parts)


def check_book(title: str, author: str | None, paragraphs: list[str]) -> ContentDecision:
    blocked, notes = heuristic_flags(title, author)
    if blocked:
        return ContentDecision(False, "blocklist", notes)
    return llm_review(title, author, build_sample(paragraphs), notes)
