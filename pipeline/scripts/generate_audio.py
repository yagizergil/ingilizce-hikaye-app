"""Ozgun hikayeler icin Google Cloud TTS ile seslendirme + kelime zamanlamasi uretir.

KAPSAM: yalnizca `is_original = true` kitaplar (63 kitap, 207 bolum,
654.244 karakter). Klasikler BILEREK disarida:

  - 12,79M karakter hicbir ucretsiz kotaya sigmiyor.
  - Metinlerin telifi bize ait degil; kamu mali olmasi seslendirmesini
    uretip dagitmamizi engellemez ama 20 kat maliyet karsiliginda 46
    kitaba ses uretmek bu asamada gerekcelendirilemez.
  - Klasikler cihaz-ustu TTS ile (ADR-011) calismaya devam ediyor.

MALIYET (dogrulandi, cloud.google.com/text-to-speech/pricing):
  Konusulan metin              654.244 karakter
  <speak> sarmalayici (5.611)  ~84.000 karakter
  <mark> etiketleri            0 — Google `<mark>`'i FATURALANDIRMIYOR
  Toplam faturalanabilir       ~738.000
  WaveNet ucretsiz kotasi      1.000.000 / ay
  => Tek seferlik is, aylik tekrar yok. Maliyet 0.

SES SECIMI: WaveNet.
  Chirp 3 HD daha iyi ses veriyor AMA desteklenen SSML etiketleri arasinda
  `<mark>` YOK ve timepointing desteklemiyor — yani kelime kelime vurgu
  imkansiz. Uygulamanin ayirt edici ozelligi "okurken takip edebilmek"
  oldugu icin vurgu feda edilmedi. Neural2 de muhtemelen calisir ama
  ucretsiz kotasi kaynakla dogrulanamadi; WaveNet'in 1M kotasi teyitli.
  Degistirmek icin tek sabit: VOICE_NAME.

KIMLIK DOGRULAMA: servis hesabi anahtari YOK.
  Kurulus politikasi (iam.disableServiceAccountKeyCreation) anahtar
  uretimini engelliyor ve bu dogru bir politika. Google'in yerel
  gelistirme icin onerdigi yontem zaten kullanici kimligi:

      gcloud auth application-default login

  Betik ADC'yi (Application Default Credentials) kendiliginden buluyor;
  depoda ya da diskte hicbir sir dosyasi tutulmuyor.

Kullanim:
    # Once dogrula (API cagrisi YOK, kota harcamaz):
    pipeline/.venv/Scripts/python.exe pipeline/scripts/generate_audio.py --dry-run

    # Tek kitapla dene:
    pipeline/.venv/Scripts/python.exe pipeline/scripts/generate_audio.py --slug the-new-boy

    # Tamami:
    pipeline/.venv/Scripts/python.exe pipeline/scripts/generate_audio.py
"""

from __future__ import annotations

import argparse
import json
import os
import re
import sys
import time
from dataclasses import dataclass, field
from pathlib import Path

import httpx
from dotenv import load_dotenv

ROOT = Path(__file__).resolve().parents[1]
load_dotenv(ROOT / ".env")

SUPABASE_URL = os.environ["SUPABASE_URL"].rstrip("/")
SERVICE_KEY = os.environ["SUPABASE_SERVICE_ROLE_KEY"]

BUCKET = "book-audio"

# Ses. Kadin, ABD Ingilizcesi, Neural2.
#
# NEDEN NEURAL2, CHIRP3 DEGIL: Chirp3 ve Studio sesleri belirgin sekilde
# daha iyi ama KELIME ZAMANLAMASI VEREMIYOR. Test edildi:
#   - Studio acikca reddediyor: "`<mark>` tags are not currently supported
#     by Studio voices" (400).
#   - Chirp3 hata VERMIYOR ama 0 zaman damgasi donduruyor — sessizce
#     calismiyor, ki bu daha tehlikeli: ses uretilir, uygulamada vurgu hic
#     hareket etmez, fark edilmez.
# Uygulamanin ayirt edici ozelligi "okurken takip edebilmek" oldugu icin
# vurgu feda edilmedi.
#
# MALIYET NOTU: WaveNet'in 1M/ay ucretsiz kotasi kaynakla teyitli;
# Neural2'ninki dogrulanamadi. En kotu senaryo (hic ucretsiz kota yoksa)
# 706.286 karakter x $16/1M = ~$11 tek seferlik. Neural2 de ayni kotayi
# paylasiyorsa 0. Ucuz kalmasi sart olursa VOICE_NAME'i
# "en-US-Wavenet-F" yapmak yeterli — baska hicbir sey degismez.
VOICE_NAME = "en-US-Neural2-F"
LANGUAGE_CODE = "en-US"

# Diger hedef diller (2026-10-06). Hepsi WaveNet: `<mark>` + timepointing
# destekliyor (kelime vurgusu). Ucretsiz kota (2026-10-06, fiyat sayfasi):
# WaveNet+Standard ortak 4M/ay, Neural2 ayri 1M/ay.
# Ingilizce mevcut 207 bolumle tutarli kalsin diye Neural2-F olarak kaldi.
VOICES: dict[str, tuple[str, str]] = {
    "en": ("en-US", "en-US-Neural2-F"),
    "de": ("de-DE", "de-DE-Wavenet-G"),
    "fr": ("fr-FR", "fr-FR-Wavenet-F"),
    "es": ("es-ES", "es-ES-Wavenet-F"),
    "it": ("it-IT", "it-IT-Wavenet-E"),
    "ru": ("ru-RU", "ru-RU-Wavenet-E"),
    "tr": ("tr-TR", "tr-TR-Wavenet-C"),
    "ar": ("ar-XA", "ar-XA-Wavenet-D"),
    "zh": ("cmn-CN", "cmn-CN-Wavenet-A"),
    "ja": ("ja-JP", "ja-JP-Wavenet-A"),
}
SPEAKING_RATE = 0.92  # Dil ogrenen icin biraz yavas; 1.0 anadili hizi.

# Google'in sert siniri: istek basina 5.000 BAYT (karakter degil).
# `<mark>` etiketleri faturalandirilmiyor ama BAYT sinirina dahil, o yuzden
# guvenlik payi birakiliyor.
MAX_REQUEST_BYTES = 4500

from src.mp3_duration import mp3_duration_seconds

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")


# --------------------------------------------------------------------------
# SSML uretimi
# --------------------------------------------------------------------------

import unicodedata


def _is_word_char(ch: str) -> bool:
    return unicodedata.category(ch)[0] in ("L", "N")


class _Match:
    def __init__(self, text: str, start: int, end: int) -> None:
        self._text, self._start, self._end = text, start, end

    def start(self) -> int:
        return self._start

    def end(self) -> int:
        return self._end

    def group(self, _: int = 0) -> str:
        return self._text[self._start : self._end]


class _WordRe:
    """Uygulamanin tokenizer'inin (`src/features/reader/text/tokenizer.js`)
    BIREBIR kopyasi: herhangi bir Unicode harf/rakam dizisi; kesme isareti
    yalnizca ardindan harf geliyorsa kelimenin parcasi. Eskiden yalnizca
    Latin harflerini taniyordu -- Kiril, Arap, Japon metninde isaret
    uretilmez, vurgu hic calismazdi. Isaret baslangiclari istemcinin kelime
    baslangiclariyla eslesmek ZORUNDA (mapTimingsToPage).
    """

    def finditer(self, text: str):
        i, n = 0, len(text)
        while i < n:
            if not _is_word_char(text[i]):
                i += 1
                continue
            j = i + 1
            while j < n:
                c = text[j]
                if _is_word_char(c):
                    j += 1
                    continue
                if c in ("'", "\u2019") and j + 1 < n and _is_word_char(text[j + 1]):
                    j += 2
                    continue
                break
            yield _Match(text, i, j)
            i = j


WORD_RE = _WordRe()


def escape_ssml(text: str) -> str:
    """XML'de anlam tasiyan karakterleri kacir."""
    return text.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")


@dataclass
class WordRef:
    """SSML'e konan bir isaretin hangi paragrafin hangi kelimesi oldugu."""

    mark: str
    paragraph_index: int
    char_start: int
    char_end: int


@dataclass
class Chunk:
    """Tek bir API istegi: SSML govdesi ve icindeki kelime referanslari."""

    ssml: str
    words: list[WordRef] = field(default_factory=list)

    @property
    def byte_size(self) -> int:
        return len(self.ssml.encode("utf-8"))


SENTENCE_END_RE = re.compile(r"[.!?\u3002\uff01\uff1f\u061f]+[\"'\u201d\u2019\u00bb)]*\s*")


def _units(paragraphs: list[tuple[int, str]]):
    """(paragraf, metin, paragraf icindeki baslangic) birimleri.

    Tek basina 5.000 bayt sinirini asan paragraf (Kiril/Arap harfleri 2
    bayt, her kelimenin `<mark>` etiketi de bayta dahil) cumle sinirlarindan
    bolunur. Isaret konumlari paragrafa gore kalir (`base` eklenir), yani
    uygulamadaki eslesme degismez.
    """
    budget = MAX_REQUEST_BYTES - 200  # <speak>/<p> sarmalayicilari icin pay

    def size(t: str) -> int:
        # Metin baytlari + her kelimenin isareti (~24 bayt) + kacis payi.
        return len(t.encode("utf-8")) + 24 * sum(1 for _ in WORD_RE.finditer(t)) + 40

    for para_index, text in paragraphs:
        if size(text) <= budget:
            yield para_index, text, 0
            continue
        start = 0
        cut = 0
        for match in SENTENCE_END_RE.finditer(text):
            if size(text[start : match.end()]) > budget and cut > start:
                yield para_index, text[start:cut], start
                start = cut
            cut = match.end()
        if start < len(text):
            yield para_index, text[start:], start


def build_chunks(paragraphs: list[tuple[int, str]]) -> list[Chunk]:
    """Paragraflari 5.000 baytlik siniri asmayan SSML parcalarina boler.

    Her kelimenin ONUNE bir `<mark>` konuyor; Google bu isaretlerin ses
    icindeki zamanini geri donduruyor. Boylece hizalama TAHMIN degil OLCUM
    oluyor — cihaz-ustu TTS'te de ayni ilke gecerliydi (ADR-011).

    Paragraf sinirlari korunuyor: bir paragraf asla iki parcaya bolunmuyor,
    cunku parcalar ayri ayri sentezlenip birlestiriliyor ve bolme noktasinda
    dogal olmayan bir duraklama olusuyor.
    """
    chunks: list[Chunk] = []
    current_body: list[str] = []
    current_words: list[WordRef] = []
    counter = 0

    def flush() -> None:
        nonlocal current_body, current_words
        if not current_body:
            return
        chunks.append(
            Chunk(ssml="<speak>" + "".join(current_body) + "</speak>", words=current_words)
        )
        current_body = []
        current_words = []

    for para_index, text, base in _units(paragraphs):
        pieces: list[str] = []
        words: list[WordRef] = []
        cursor = 0

        for match in WORD_RE.finditer(text):
            mark = f"w{counter}"
            counter += 1
            pieces.append(escape_ssml(text[cursor : match.start()]))
            pieces.append(f'<mark name="{mark}"/>')
            pieces.append(escape_ssml(match.group(0)))
            words.append(
                WordRef(
                    mark=mark,
                    paragraph_index=para_index,
                    char_start=base + match.start(),
                    char_end=base + match.end(),
                )
            )
            cursor = match.end()

        pieces.append(escape_ssml(text[cursor:]))
        # `<p>` paragraflar arasina dogal bir duraklama koyuyor.
        body = "<p>" + "".join(pieces) + "</p>"

        candidate = "<speak>" + "".join(current_body + [body]) + "</speak>"
        if current_body and len(candidate.encode("utf-8")) > MAX_REQUEST_BYTES:
            flush()

        current_body.append(body)
        current_words.extend(words)

    flush()
    return chunks


# --------------------------------------------------------------------------
# Supabase
# --------------------------------------------------------------------------


def supabase_headers() -> dict[str, str]:
    return {"Authorization": f"Bearer {SERVICE_KEY}", "apikey": SERVICE_KEY}


def fetch_sections(
    client: httpx.Client, slug: str | None, force: bool = False, lang: str = "en"
) -> list[dict]:
    """Seslendirilecek bolumleri, paragraflariyla birlikte getirir.

    NEDEN VARSAYILAN OLARAK ATLIYOR (`force=False`): bu is 207 bolum ve
    ~738.000 faturalanabilir karakter, aylik 1M ucretsiz kotanin buyuk
    kismi. Is yarida kesilirse (ag hatasi, makine kapanmasi) betigi
    yeniden calistirmak KALDIGI YERDEN degil BASTAN uretirdi ve kotayi
    ikinci kez harcardi -- yani bir kesinti dogrudan faturaya donerdi.
    Zaten sesi ve zamanlamasi olan bolum atlanir; yeniden uretmek icin
    `--force`.
    """
    params = {
        "select": "id,order_index,title,book_id,audio_url,audio_timings_url,books!inner(slug,title,is_original,status,target_language)",
        "books.is_original": "eq.true",
        "books.target_language": f"eq.{lang}",
        "books.status": "eq.published",
        "order": "book_id,order_index",
    }
    if slug:
        params["books.slug"] = f"eq.{slug}"

    response = client.get(f"{SUPABASE_URL}/rest/v1/book_sections", params=params, headers=supabase_headers())
    response.raise_for_status()
    sections = response.json()

    if not force:
        before = len(sections)
        sections = [s for s in sections if not (s.get("audio_url") and s.get("audio_timings_url"))]
        skipped = before - len(sections)
        if skipped:
            print(f"  {skipped} bolum zaten sesli, atlaniyor (--force ile yeniden uretilir)")

    # Paragraflar ATLAMADAN SONRA getiriliyor: atlanan bolum icin istek
    # atmak yuzlerce gereksiz round-trip demekti.
    for section in sections:
        paragraphs = client.get(
            f"{SUPABASE_URL}/rest/v1/book_paragraphs",
            params={
                "select": "order_index,text",
                "section_id": f"eq.{section['id']}",
                "order": "order_index",
            },
            headers=supabase_headers(),
        )
        paragraphs.raise_for_status()
        section["paragraphs"] = [(p["order_index"], p["text"]) for p in paragraphs.json()]

    return sections


def ensure_bucket(client: httpx.Client) -> None:
    response = client.post(
        f"{SUPABASE_URL}/storage/v1/bucket",
        headers={**supabase_headers(), "Content-Type": "application/json"},
        json={"id": BUCKET, "name": BUCKET, "public": True},
    )
    if response.status_code < 300:
        print(f"  '{BUCKET}' bucket'i olusturuldu")
    elif "already exists" not in response.text.lower() and response.status_code != 409:
        response.raise_for_status()


def upload(client: httpx.Client, path: str, data: bytes, content_type: str) -> str:
    response = client.post(
        f"{SUPABASE_URL}/storage/v1/object/{BUCKET}/{path}",
        content=data,
        headers={
            **supabase_headers(),
            "Content-Type": content_type,
            "x-upsert": "true",
            "Cache-Control": "public, max-age=31536000",
        },
    )
    response.raise_for_status()
    return f"{SUPABASE_URL}/storage/v1/object/public/{BUCKET}/{path}"


# --------------------------------------------------------------------------
# Ana akis
# --------------------------------------------------------------------------


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--dry-run", action="store_true", help="API cagirmadan dogrula")
    parser.add_argument("--slug", help="Yalnizca bu kitap")
    parser.add_argument("--limit", type=int, help="En fazla bu kadar bolum isle")
    parser.add_argument("--lang", default="en", choices=sorted(VOICES), help="Hedef dil")
    parser.add_argument(
        "--max-chars",
        type=int,
        default=0,
        help="Bu calistirmada en fazla bu kadar faturalanabilir karakter",
    )
    parser.add_argument(
        "--force",
        action="store_true",
        help="Sesi zaten olan bolumleri de yeniden uret (kota harcar)",
    )
    args = parser.parse_args()

    with httpx.Client(timeout=180) as client:
        print("Bolumler getiriliyor...")
        sections = fetch_sections(client, args.slug, force=args.force, lang=args.lang)
        language_code, voice_name = VOICES[args.lang]
        if args.limit:
            sections = sections[: args.limit]
        if not sections:
            print("Uretilecek bolum kalmadi (hepsi zaten sesli).")
            return 0

        # --- Once tamamini olc: kota ve bayt siniri surprizi olmasin ---
        total_chunks = 0
        total_words = 0
        billable = 0
        oversize: list[str] = []

        plans: list[tuple[dict, list[Chunk]]] = []
        for section in sections:
            chunks = build_chunks(section["paragraphs"])
            # `<mark>` faturalandirilmiyor; onlari cikarip say.
            cost = sum(len(re.sub(r'<mark name="w\d+"/>', "", c.ssml)) for c in chunks)
            # Butce: bolum ya butun girer ya hic; yarim bolum yok.
            if args.max_chars and billable + cost > args.max_chars:
                break
            plans.append((section, chunks))
            total_chunks += len(chunks)
            billable += cost
            for chunk in chunks:
                total_words += len(chunk.words)
                if chunk.byte_size > 5000:
                    oversize.append(f"{section['books']['slug']} #{section['order_index']}")

        print(f"\n  kitap            {len({s['book_id'] for s, _ in plans})}")
        print(f"  bolum            {len(plans)} / {len(sections)}")
        print(f"  istek (parca)    {total_chunks}")
        print(f"  kelime           {total_words}")
        print(f"  faturalanabilir  {billable:,} karakter  (~{billable/1_000_000:.3f}M)")
        print(f"  WaveNet kotasi   4.000.000 / ay (Standard ile ortak; Neural2 ayrica 1M)")
        print(f"  ses              {voice_name}")

        if oversize:
            print(f"\n  HATA: {len(oversize)} parca 5.000 bayt sinirini asiyor:")
            for item in oversize[:5]:
                print(f"    {item}")
            return 1

        if billable > 1_000_000:
            print("\n  UYARI: faturalanabilir karakter ucretsiz kotayi asiyor.")

        if args.dry_run:
            print("\n--dry-run: API cagrilmadi, hicbir sey yazilmadi.")
            return 0

        # --- Gercek uretim ---
        from google.cloud import texttospeech_v1beta1 as tts

        tts_client = tts.TextToSpeechClient()
        voice = tts.VoiceSelectionParams(language_code=language_code, name=voice_name)
        audio_config = tts.AudioConfig(
            audio_encoding=tts.AudioEncoding.MP3, speaking_rate=SPEAKING_RATE
        )

        ensure_bucket(client)
        done = 0

        for section, chunks in plans:
            slug = section["books"]["slug"]
            label = f"{slug} #{section['order_index']}"

            audio = bytearray()
            timings: list[dict] = []
            offset_seconds = 0.0

            for chunk in chunks:
                request = tts.SynthesizeSpeechRequest(
                    input=tts.SynthesisInput(ssml=chunk.ssml),
                    voice=voice,
                    audio_config=audio_config,
                    enable_time_pointing=[tts.SynthesizeSpeechRequest.TimepointType.SSML_MARK],
                )
                response = tts_client.synthesize_speech(request=request)

                by_mark = {tp.mark_name: tp.time_seconds for tp in response.timepoints}
                for word in chunk.words:
                    seconds = by_mark.get(word.mark)
                    if seconds is None:
                        continue
                    timings.append(
                        {
                            "p": word.paragraph_index,
                            "s": word.char_start,
                            "e": word.char_end,
                            "t": round(offset_seconds + seconds, 3),
                        }
                    )

                audio.extend(response.audio_content)

                # Parcalar arka arkaya birlestiriliyor; sonraki parcanin
                # zamanlari bu parcanin TAM suresi kadar otelenmek zorunda.
                #
                # BURASI BIR ZAMANLAR TAHMINDI ve hata veriyordu: oteleme
                # "son <mark>'in zamani + 0,4 sn" diye hesaplaniyordu. Son
                # isaretten sonra o kelimenin soylenmesi ve sondaki sessizlik
                # geliyor; ikisi birlikte genelde 0,4 saniyeden uzun. Fark
                # her parca sinirinda tekrarlanip BIRIKIYORDU (bolum basina
                # 5-6 parca), sonuc olarak vurgu sesin onune geciyordu.
                #
                # Uygulama birlestirilmis dosyayi caliyor ve konumu o
                # dosyadan okuyor, dolayisiyla dogru oteleme baytlarin
                # GERCEK suresi. Kare basliklarindan olculuyor.
                offset_seconds += mp3_duration_seconds(response.audio_content)
                time.sleep(0.05)  # nazik ol

            audio_url = upload(client, f"{slug}/{section['order_index']}.mp3", bytes(audio), "audio/mpeg")
            timings_url = upload(
                client,
                f"{slug}/{section['order_index']}.json",
                json.dumps({"voice": voice_name, "words": timings}, ensure_ascii=False).encode("utf-8"),
                "application/json",
            )

            patch = client.patch(
                f"{SUPABASE_URL}/rest/v1/book_sections",
                params={"id": f"eq.{section['id']}"},
                json={"audio_url": audio_url, "audio_timings_url": timings_url},
                headers={**supabase_headers(), "Content-Type": "application/json", "Prefer": "return=minimal"},
            )
            patch.raise_for_status()

            done += 1
            print(f"  [{done}/{len(plans)}] {label}  {len(audio)//1024} KB, {len(timings)} kelime")

        # Kitap seviyesindeki bayrak.
        book_ids = {s["book_id"] for s, _ in plans}
        for book_id in book_ids:
            # Yalnizca TUM bolumleri sesli olan kitap isaretlenir: butceyle
            # yarim kalan kitap "sesli" diye listelenmesin.
            missing = client.get(
                f"{SUPABASE_URL}/rest/v1/book_sections",
                params={"select": "id", "book_id": f"eq.{book_id}", "audio_url": "is.null", "limit": "1"},
                headers=supabase_headers(),
            )
            missing.raise_for_status()
            if missing.json():
                continue
            client.patch(
                f"{SUPABASE_URL}/rest/v1/books",
                params={"id": f"eq.{book_id}"},
                json={"has_audio": True},
                headers={**supabase_headers(), "Content-Type": "application/json", "Prefer": "return=minimal"},
            )

        print(f"\n{done} bolum seslendirildi, {len(book_ids)} kitap isaretlendi.")
        return 0


if __name__ == "__main__":
    raise SystemExit(main())
