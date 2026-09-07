"""lemmas sözlük tablosunu genişletme (eksik tr_gloss üretimi) ve
book_lemmas yazımı.

lemmas tabloları kitaplar arası PAYLAŞILIR — zaten mevcut olan lemma'lar
atlanır, sadece eksikler için Anthropic API çağrılır. İkinci kitaptan
sonra maliyet düşer.

Yapılandırılmış çıktı (tool use) kullanılır — serbest metin JSON'ı
max_tokens sınırında kesilebiliyordu ve json.loads bunu anlamsız bir
parse hatası olarak gösteriyordu. tool_use ile: (a) model serbest metin
yerine şemaya zorlanır, (b) stop_reason == "max_tokens" açıkça ayırt
edilir.

PROMPT CACHING: sistem prompt'u ve tool şeması her batch'te AYNI —
cache_control ile işaretlenip Anthropic'in ephemeral cache'ine yazılır,
sonraki çağrılar bunu ~%90 daha ucuza okur. Gerçek ölçüm (caching YOKKEN,
batch=50, 100 çağrı): 205773 girdi token, $3.34 — sistem prompt'u/tool
şeması her çağrıda tam fiyata tekrar gönderiliyordu.

PARALELLİK: batch'ler thread pool ile eş zamanlı çalıştırılır (I/O-bound
— ağ çağrısı). DB YAZIMI ana thread'de, worker thread'lerde DEĞİL —
psycopg Connection thread-safe değildir, aynı conn'a birden fazla
thread'den eş zamanlı yazmak veri bozulmasına yol açabilir. Worker'lar
sadece Anthropic çağrısı yapar, sonucu ana thread'e döner; on_batch_success
(DB yazımı) SADECE ana thread'de, as_completed sırasına göre çağrılır.
"""

from __future__ import annotations

import time
from collections.abc import Callable
from concurrent.futures import ThreadPoolExecutor, as_completed
from dataclasses import dataclass, field
from typing import Any

import anthropic
import psycopg
from anthropic.types import (
    CacheControlEphemeralParam,
    MessageParam,
    TextBlockParam,
    ToolChoiceToolParam,
    ToolParam,
)

BATCH_SIZE = 50
MAX_CONCURRENT_BATCHES = 6
MODEL = "claude-sonnet-5"
# 50 kelime × ~40 token/kelime (lemma+pos+tr_gloss+JSON overhead) ≈
# 2000-3000 token gerçek ihtiyaç. 16000, ~5-8x güvenlik payı bırakır.
MAX_TOKENS = 16000

INPUT_COST_PER_MILLION_USD = 3.0
OUTPUT_COST_PER_MILLION_USD = 15.0
# Anthropic'in yayınladığı prompt caching çarpanları: cache YAZMA taban
# girdi fiyatının 1.25 katı (ilk çağrıda bir kerelik), cache OKUMA
# taban fiyatın %10'u (sonraki tüm çağrılarda).
CACHE_WRITE_MULTIPLIER = 1.25
CACHE_READ_MULTIPLIER = 0.10

# Dry-run maliyet tahmini için ortalamalar. Girdi/çıktı payload
# tahminleri gerçek ölçümden kalibre edildi (bkz. modül docstring'i);
# _AVG_OUTPUT_TOKENS_PER_LEMMA gerçek ölçülen ~36'dan düşük çünkü
# sistem prompt'una artık "2-4 kelime, kısa tut" talimatı eklendi —
# bir sonraki gerçek çalıştırmadan sonra bu sabit yeniden kalibre
# edilmeli (şu an bir HEDEF, ölçüm değil).
_AVG_INPUT_TOKENS_PER_LEMMA_PAYLOAD = 15.0
_AVG_OUTPUT_TOKENS_PER_LEMMA = 15.0
_SYSTEM_PROMPT_TOKENS_PER_BATCH = 250.0

_SYSTEM_PROMPT = (
    "You are a lexicographer producing concise Turkish glosses for English "
    "vocabulary used in a language-learning app. For each (lemma, part of "
    "speech) pair, output the single most common Turkish translation as it "
    "would appear in a compact bilingual dictionary. "
    "STRICT LENGTH LIMIT: tr_gloss must be 2-4 Turkish words MAXIMUM — no "
    "explanations, no multiple options, no example sentences, no "
    "punctuation beyond the word(s) itself. Call the submit_glosses tool "
    "with one entry per input, in the same order and count as the input. "
    "If a lemma is untranslatable or ambiguous without more context, give "
    "your best short guess — never leave tr_gloss empty, and never exceed "
    "4 words."
)

_TOOL_NAME = "submit_glosses"
_CACHE_CONTROL: CacheControlEphemeralParam = {"type": "ephemeral"}
_TOOL_SCHEMA: ToolParam = {
    "name": _TOOL_NAME,
    "description": "Submit Turkish glosses for a batch of English (lemma, part-of-speech) pairs.",
    "input_schema": {
        "type": "object",
        "properties": {
            "glosses": {
                "type": "array",
                "items": {
                    "type": "object",
                    "properties": {
                        "lemma": {"type": "string"},
                        "pos": {"type": "string"},
                        "tr_gloss": {"type": "string"},
                    },
                    "required": ["lemma", "pos", "tr_gloss"],
                },
            }
        },
        "required": ["glosses"],
    },
    "cache_control": _CACHE_CONTROL,
}


class MaxTokensExceededError(RuntimeError):
    """stop_reason == 'max_tokens' — yanıt kesildi. JSONDecodeError gibi
    anlamsız bir parse hatası olarak GİZLENMEMELİ; batch boyutunu
    düşürmek gerektiğini açıkça söyler."""


@dataclass
class LemmaGlossResult:
    lemma: str
    pos: str
    tr_gloss: str


@dataclass
class LemmaGenerationStats:
    requested: int
    generated: int
    batches: int
    input_tokens: int
    output_tokens: int
    cache_creation_tokens: int = 0
    cache_read_tokens: int = 0
    elapsed_seconds: float = 0.0


@dataclass
class FailedBatch:
    batch_index: int
    candidates: list[tuple[str, str]]
    error: str


@dataclass
class _BatchOutcome:
    batch_index: int
    results: list[LemmaGlossResult] | None
    input_tokens: int = 0
    output_tokens: int = 0
    cache_creation_tokens: int = 0
    cache_read_tokens: int = 0
    error: str | None = None
    failed_candidates: list[tuple[str, str]] = field(default_factory=list)


def get_existing_lemmas(
    conn: psycopg.Connection, candidates: list[tuple[str, str]]
) -> set[tuple[str, str]]:
    if not candidates:
        return set()
    # Postgres anonim composite dizisi ((lemma, pos) = any(%s)) kabul
    # etmiyor (FeatureNotSupported). İki paralel text[] dizisini
    # unnest ile eşleştiriyoruz.
    lemmas = [c[0] for c in candidates]
    poses = [c[1] for c in candidates]
    with conn.cursor() as cur:
        cur.execute(
            """
            select l.lemma, l.pos
            from public.lemmas l
            join unnest(%s::text[], %s::text[]) as t(lemma, pos)
              on l.lemma = t.lemma and l.pos = t.pos
            """,
            (lemmas, poses),
        )
        return {(row[0], row[1]) for row in cur.fetchall()}


def get_lemmas_with_gloss(
    conn: psycopg.Connection, candidates: list[tuple[str, str]]
) -> set[tuple[str, str]]:
    """get_existing_lemmas'tan farkı: satır VAR olması yetmez, tr_gloss
    da DOLU olmalı. publish'in yayın önkoşulu bunu kullanır — bir
    lemma satırı olması, çevirisi olduğu anlamına gelmez (ör. lemmas
    stage hiç çalıştırılmadıysa book_lemmas dolu ama lemmas boş kalır)."""
    if not candidates:
        return set()
    lemmas = [c[0] for c in candidates]
    poses = [c[1] for c in candidates]
    with conn.cursor() as cur:
        cur.execute(
            """
            select l.lemma, l.pos
            from public.lemmas l
            join unnest(%s::text[], %s::text[]) as t(lemma, pos)
              on l.lemma = t.lemma and l.pos = t.pos
            where l.tr_gloss is not null and l.tr_gloss <> ''
            """,
            (lemmas, poses),
        )
        return {(row[0], row[1]) for row in cur.fetchall()}


def estimate_cost(
    input_tokens: int,
    output_tokens: int,
    cache_creation_tokens: int = 0,
    cache_read_tokens: int = 0,
) -> float:
    return (
        input_tokens / 1_000_000 * INPUT_COST_PER_MILLION_USD
        + cache_creation_tokens / 1_000_000 * INPUT_COST_PER_MILLION_USD * CACHE_WRITE_MULTIPLIER
        + cache_read_tokens / 1_000_000 * INPUT_COST_PER_MILLION_USD * CACHE_READ_MULTIPLIER
        + output_tokens / 1_000_000 * OUTPUT_COST_PER_MILLION_USD
    )


def estimate_dry_run_cost(missing_count: int, batch_size: int = BATCH_SIZE) -> float:
    """Gerçek Anthropic çağrısı yapmadan (dry-run'da API hiç çağrılmaz)
    kaba bir maliyet tahmini. Prompt caching'i modelliyor: sistem
    prompt'u/tool şeması SADECE ilk çağrıda tam fiyata yazılır (cache
    creation), sonraki tüm çağrılarda ucuza okunur (cache read) —
    gerçek batch payload'ı (küçük, kelime listesi) her zaman tam
    fiyatlı normal girdi olarak sayılır."""
    if missing_count == 0:
        return 0.0
    batches = -(-missing_count // batch_size)  # ceil division
    payload_input = missing_count * _AVG_INPUT_TOKENS_PER_LEMMA_PAYLOAD
    cache_creation = _SYSTEM_PROMPT_TOKENS_PER_BATCH
    cache_read = _SYSTEM_PROMPT_TOKENS_PER_BATCH * max(batches - 1, 0)
    estimated_output = missing_count * _AVG_OUTPUT_TOKENS_PER_LEMMA
    return estimate_cost(
        input_tokens=int(payload_input),
        output_tokens=int(estimated_output),
        cache_creation_tokens=int(cache_creation),
        cache_read_tokens=int(cache_read),
    )


def _parse_tool_response(
    response: Any, expected: list[tuple[str, str]]
) -> list[LemmaGlossResult]:
    tool_blocks = [
        block
        for block in response.content
        if getattr(block, "type", None) == "tool_use" and getattr(block, "name", None) == _TOOL_NAME
    ]
    if not tool_blocks:
        raise ValueError(f"Anthropic yanıtında '{_TOOL_NAME}' tool_use bloğu yok")

    glosses = tool_blocks[0].input.get("glosses")
    if not isinstance(glosses, list):
        raise ValueError("tool_use input'unda 'glosses' bir dizi değil")

    results: list[LemmaGlossResult] = []
    for item in glosses:
        lemma = str(item["lemma"]).strip().lower()
        pos = str(item["pos"]).strip().lower()
        tr_gloss = str(item["tr_gloss"]).strip()
        if not tr_gloss:
            raise ValueError(f"Boş tr_gloss: {lemma}/{pos}")
        results.append(LemmaGlossResult(lemma=lemma, pos=pos, tr_gloss=tr_gloss))

    if len(results) != len(expected):
        raise ValueError(f"Anthropic {len(expected)} girdi için {len(results)} sonuç döndü")
    return results


def _backoff_delay(attempt: int, rate_limited: bool) -> float:
    if rate_limited:
        # Rate limit'te daha temkinli bekle — sunucunun kotası
        # birkaç saniyede dolabilir, agresif retry durumu kötüleştirir.
        return float(min(5.0 * (2**attempt), 30.0))
    return float(2**attempt)


def _call_batch(
    client: anthropic.Anthropic,
    batch: list[tuple[str, str]],
    batch_index: int,
    max_retries: int,
) -> _BatchOutcome:
    """Tek bir batch için Anthropic çağrısı + retry. DB'ye DOKUNMAZ —
    worker thread'de çalışır, sonucu ana thread'e döner (thread-safety
    için, bkz. modül docstring'i)."""
    payload_items = [{"lemma": lemma, "pos": pos} for lemma, pos in batch]
    last_error: Exception | None = None

    system_blocks: list[TextBlockParam] = [
        {
            "type": "text",
            "text": _SYSTEM_PROMPT,
            "cache_control": _CACHE_CONTROL,
        }
    ]
    tool_choice: ToolChoiceToolParam = {"type": "tool", "name": _TOOL_NAME}
    request_messages: list[MessageParam] = [
        {
            "role": "user",
            "content": f"Translate these {len(batch)} entries: {payload_items}",
        }
    ]

    for attempt in range(max_retries):
        try:
            # cache_control YERLEŞİMİ DOĞRULANDI: Anthropic'in prompt
            # caching dokümantasyonuna göre create()'in kendi parametresi
            # DEĞİL, system/tools listesindeki her content-block'un İÇİNE
            # konur (bkz. TextBlockParam.cache_control, ToolParam.cache_control
            # SDK stub'larında) — aşağıdaki kod tam olarak bunu yapıyor,
            # caching gerçekten çalışıyor.
            response = client.messages.create(
                model=MODEL,
                max_tokens=MAX_TOKENS,
                system=system_blocks,
                tools=[_TOOL_SCHEMA],
                tool_choice=tool_choice,
                messages=request_messages,
            )
            if response.stop_reason == "max_tokens":
                raise MaxTokensExceededError(
                    f"Yanıt max_tokens ({MAX_TOKENS}) sınırında kesildi "
                    f"(batch boyutu: {len(batch)}). Batch boyutunu düşür."
                )
            results = _parse_tool_response(response, batch)
            usage = response.usage
            return _BatchOutcome(
                batch_index=batch_index,
                results=results,
                input_tokens=usage.input_tokens,
                output_tokens=usage.output_tokens,
                cache_creation_tokens=getattr(usage, "cache_creation_input_tokens", 0) or 0,
                cache_read_tokens=getattr(usage, "cache_read_input_tokens", 0) or 0,
            )
        except MaxTokensExceededError as exc:
            # Retry faydasız — aynı girdi aynı sınıra çarpar.
            last_error = exc
            break
        except anthropic.RateLimitError as exc:
            last_error = exc
            if attempt < max_retries - 1:
                time.sleep(_backoff_delay(attempt, rate_limited=True))
        except Exception as exc:  # noqa: BLE001 - retry, sonda FailedBatch'e düşer
            last_error = exc
            if attempt < max_retries - 1:
                time.sleep(_backoff_delay(attempt, rate_limited=False))

    return _BatchOutcome(
        batch_index=batch_index,
        results=None,
        error=str(last_error),
        failed_candidates=batch,
    )


def generate_glosses_streaming(
    client: anthropic.Anthropic,
    missing: list[tuple[str, str]],
    on_batch_success: Callable[[list[LemmaGlossResult], int, int, int, int], None],
    batch_size: int = BATCH_SIZE,
    max_retries: int = 3,
    max_concurrency: int = MAX_CONCURRENT_BATCHES,
) -> tuple[LemmaGenerationStats, list[FailedBatch]]:
    """Batch'ler thread pool ile PARALEL çalıştırılır (I/O-bound ağ
    çağrıları, max_concurrency eş zamanlı). Her batch tamamlanır
    tamamlanmaz `on_batch_success` (results, batch_index, total_batches,
    batch_input_tokens, batch_output_tokens) ile bildirilir — ama bu
    callback SADECE ANA THREAD'de, as_completed sırasına göre çağrılır
    (worker thread'ler DB'ye dokunmaz, psycopg Connection thread-safe
    değildir). Bir batch tüm denemelerde başarısız olursa aşamanın
    tamamı durmaz: FailedBatch olarak toplanıp döner, kalan batch'lere
    devam edilir. max_tokens'ta kesilen bir yanıt retry edilmez."""
    started = time.monotonic()
    batches = [missing[i : i + batch_size] for i in range(0, len(missing), batch_size)]
    total_batches = len(batches)
    failed_batches: list[FailedBatch] = []

    total_generated = 0
    total_input_tokens = 0
    total_output_tokens = 0
    total_cache_creation_tokens = 0
    total_cache_read_tokens = 0

    with ThreadPoolExecutor(max_workers=max_concurrency) as executor:
        futures = {
            executor.submit(_call_batch, client, batch, batch_index, max_retries): batch_index
            for batch_index, batch in enumerate(batches, start=1)
        }
        for future in as_completed(futures):
            outcome = future.result()
            if outcome.results is None:
                failed_batches.append(
                    FailedBatch(
                        batch_index=outcome.batch_index,
                        candidates=outcome.failed_candidates,
                        error=outcome.error or "bilinmeyen hata",
                    )
                )
                continue

            total_generated += len(outcome.results)
            total_input_tokens += outcome.input_tokens
            total_output_tokens += outcome.output_tokens
            total_cache_creation_tokens += outcome.cache_creation_tokens
            total_cache_read_tokens += outcome.cache_read_tokens
            # Ana thread'deyiz — DB yazımı burada güvenli.
            on_batch_success(
                outcome.results,
                outcome.batch_index,
                total_batches,
                outcome.input_tokens,
                outcome.output_tokens,
            )

    stats = LemmaGenerationStats(
        requested=len(missing),
        generated=total_generated,
        batches=total_batches,
        input_tokens=total_input_tokens,
        output_tokens=total_output_tokens,
        cache_creation_tokens=total_cache_creation_tokens,
        cache_read_tokens=total_cache_read_tokens,
        elapsed_seconds=time.monotonic() - started,
    )
    return stats, failed_batches
