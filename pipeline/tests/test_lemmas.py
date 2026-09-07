from __future__ import annotations

from types import SimpleNamespace
from unittest.mock import MagicMock

from src.lemmas import FailedBatch, generate_glosses_streaming


def _make_tool_use_response(
    glosses: list[dict], input_tokens: int = 100, output_tokens: int = 50
) -> SimpleNamespace:
    block = SimpleNamespace(type="tool_use", name="submit_glosses", input={"glosses": glosses})
    return SimpleNamespace(
        content=[block],
        usage=SimpleNamespace(input_tokens=input_tokens, output_tokens=output_tokens),
        stop_reason="tool_use",
    )


def _make_truncated_response(
    input_tokens: int = 100, output_tokens: int = 16000
) -> SimpleNamespace:
    # max_tokens'ta kesilmiş: stop_reason="max_tokens" belirleyici sinyal.
    block = SimpleNamespace(type="tool_use", name="submit_glosses", input={"glosses": []})
    return SimpleNamespace(
        content=[block],
        usage=SimpleNamespace(input_tokens=input_tokens, output_tokens=output_tokens),
        stop_reason="max_tokens",
    )


def test_max_tokens_truncation_produces_explicit_error_not_json_error():
    """Regresyon: eskiden max_tokens'ta kesilen yanıt json.loads içinde
    'Unterminated string' hatası olarak GİZLENİYORDU. Artık stop_reason
    açıkça kontrol edilip anlamlı bir hata üretilmeli."""
    candidates = [("word1", "noun"), ("word2", "noun")]
    client = MagicMock()
    client.messages.create.return_value = _make_truncated_response()

    def on_batch_success(*args: object) -> None:
        raise AssertionError("başarısız batch için on_batch_success çağrılmamalı")

    stats, failed = generate_glosses_streaming(
        client, candidates, on_batch_success, batch_size=2, max_retries=1
    )

    assert stats.generated == 0
    assert len(failed) == 1
    assert isinstance(failed[0], FailedBatch)
    assert "max_tokens" in failed[0].error or "kesildi" in failed[0].error


def test_partial_progress_preserved_when_later_batch_fails():
    """Kritik senaryo: iki batch, biri başarılı, diğeri max_tokens'ta
    kesiliyor. Başarılı batch'in sonucu KAYBOLMAMALI (on_batch_success
    çağrılmış olmalı — çağıran taraf bunu hemen DB'ye yazar), başarısız
    batch FailedBatch olarak raporlanmalı, aşamanın TAMAMI durmamalı.

    generate_glosses_streaming artık PARALEL çalıştığı için (thread pool)
    hangi worker'ın önce tamamlanacağı garanti değil — bu yüzden
    side_effect sabit bir liste yerine, isteğin İÇERİĞİNE (hangi lemma
    istendiğine) bakan bir fonksiyon kullanılıyor. Böylece test thread
    zamanlamasından bağımsız, deterministik kalıyor."""
    batch1 = [("apple", "noun"), ("banana", "noun")]
    batch2 = [("cherry", "noun"), ("date", "noun")]
    candidates = batch1 + batch2

    success_response = _make_tool_use_response(
        [
            {"lemma": "apple", "pos": "noun", "tr_gloss": "elma"},
            {"lemma": "banana", "pos": "noun", "tr_gloss": "muz"},
        ]
    )
    truncated_response = _make_truncated_response()

    def side_effect(**kwargs: object) -> SimpleNamespace:
        content = str(kwargs["messages"])
        if "apple" in content:
            return success_response
        return truncated_response

    client = MagicMock()
    client.messages.create.side_effect = side_effect

    received_batches: list[tuple[int, list]] = []

    def on_batch_success(
        results: list, batch_index: int, total_batches: int, batch_in: int, batch_out: int
    ) -> None:
        received_batches.append((batch_index, results))

    stats, failed = generate_glosses_streaming(
        client, candidates, on_batch_success, batch_size=2, max_retries=1
    )

    # apple/banana batch'inin sonucu korunmuş (callback çağrılmış, DB'ye
    # yazılabilir).
    assert len(received_batches) == 1
    assert {r.lemma for r in received_batches[0][1]} == {"apple", "banana"}
    assert stats.generated == 2

    # cherry/date batch'i başarısız raporlanmış, kaybolmamış
    # (FailedBatch.candidates'ta duruyor, tekrar çalıştırılınca üretilir).
    assert len(failed) == 1
    assert set(failed[0].candidates) == set(batch2)


def test_max_tokens_error_is_not_retried():
    """max_tokens hatası retry edilmemeli — aynı girdi aynı sınıra tekrar
    çarpar, zaman/para israfı olur. create() tam 1 kez çağrılmalı
    (max_retries=3 olsa bile)."""
    candidates = [("word1", "noun")]
    client = MagicMock()
    client.messages.create.return_value = _make_truncated_response()

    def on_batch_success(*args: object) -> None:
        pass

    generate_glosses_streaming(client, candidates, on_batch_success, batch_size=5, max_retries=3)

    assert client.messages.create.call_count == 1


def test_malformed_tool_response_produces_meaningful_error():
    """tool_use bloğu hiç yoksa (model tool çağırmadıysa) anlamlı bir
    hata mesajı üretilmeli, ham bir parse hatası değil."""
    candidates = [("word1", "noun")]
    text_only_response = SimpleNamespace(
        content=[SimpleNamespace(type="text", text="oops, no tool call")],
        usage=SimpleNamespace(input_tokens=10, output_tokens=5),
        stop_reason="end_turn",
    )
    client = MagicMock()
    client.messages.create.return_value = text_only_response

    def on_batch_success(*args: object) -> None:
        raise AssertionError("başarısız batch için çağrılmamalı")

    stats, failed = generate_glosses_streaming(
        client, candidates, on_batch_success, batch_size=5, max_retries=1
    )
    assert len(failed) == 1
    assert "tool_use" in failed[0].error


def test_all_batches_succeed_calls_callback_for_each():
    batch1 = [("apple", "noun")]
    batch2 = [("banana", "noun")]
    candidates = batch1 + batch2

    apple_response = _make_tool_use_response(
        [{"lemma": "apple", "pos": "noun", "tr_gloss": "elma"}]
    )
    banana_response = _make_tool_use_response(
        [{"lemma": "banana", "pos": "noun", "tr_gloss": "muz"}]
    )

    def side_effect(**kwargs: object) -> SimpleNamespace:
        content = str(kwargs["messages"])
        return apple_response if "apple" in content else banana_response

    client = MagicMock()
    client.messages.create.side_effect = side_effect

    call_count = 0

    def on_batch_success(*args: object) -> None:
        nonlocal call_count
        call_count += 1

    stats, failed = generate_glosses_streaming(
        client, candidates, on_batch_success, batch_size=1, max_retries=1
    )

    assert call_count == 2
    assert failed == []
    assert stats.generated == 2
    assert stats.batches == 2


def test_prompt_caching_marks_system_and_tool_as_ephemeral():
    """Regresyon: sistem prompt'u/tool şeması cache_control ile
    işaretlenmezse her batch'te tam fiyata tekrar gönderilir (gerçek
    ölçüm: 100 batch, $3.34 — caching olmadan)."""
    candidates = [("word1", "noun")]
    client = MagicMock()
    client.messages.create.return_value = _make_tool_use_response(
        [{"lemma": "word1", "pos": "noun", "tr_gloss": "kelime"}]
    )

    def on_batch_success(*args: object) -> None:
        pass

    generate_glosses_streaming(client, candidates, on_batch_success, batch_size=5, max_retries=1)

    _, kwargs = client.messages.create.call_args
    assert kwargs["system"][0]["cache_control"] == {"type": "ephemeral"}
    assert kwargs["tools"][0]["cache_control"] == {"type": "ephemeral"}


def test_cache_tokens_accumulated_in_stats():
    candidates = [("word1", "noun")]
    client = MagicMock()
    response = _make_tool_use_response(
        [{"lemma": "word1", "pos": "noun", "tr_gloss": "kelime"}],
        input_tokens=20,
        output_tokens=10,
    )
    response.usage.cache_creation_input_tokens = 250
    response.usage.cache_read_input_tokens = 0
    client.messages.create.return_value = response

    def on_batch_success(*args: object) -> None:
        pass

    stats, failed = generate_glosses_streaming(
        client, candidates, on_batch_success, batch_size=5, max_retries=1
    )
    assert failed == []
    assert stats.cache_creation_tokens == 250
    assert stats.cache_read_tokens == 0
