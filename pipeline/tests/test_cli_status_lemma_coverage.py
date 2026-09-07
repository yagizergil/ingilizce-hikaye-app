"""cli.py status komutunun DB lemma-kapsamı bloğunun regresyon testi.

HATA 2: `for row in rows` döngüsündeki `row` (dict) ve
`cur.fetchone()`'un döndürdüğü `row` (tuple) AYNI isimle yeniden
kullanılıyordu — mypy bunu "Incompatible types in assignment" olarak
işaretledi ve çalışma zamanında `row[0]`/bölme işlemi yanlış tipte
patlayabilirdi. Düzeltme: ikinci değişken `coverage_row` olarak
yeniden adlandırıldı. Bu test tam o kod yolunu (mock DB ile) çalıştırıp
TypeError olmadığını ve doğru yüzdenin hesaplandığını doğrular."""

from __future__ import annotations

from src import cli


class _FakeCursor:
    def __init__(self, fetchone_result):
        self._fetchone_result = fetchone_result

    def execute(self, *args, **kwargs):
        pass

    def fetchone(self):
        return self._fetchone_result

    def __enter__(self):
        return self

    def __exit__(self, *exc):
        return False


class _FakeConn:
    def __init__(self, cursor):
        self._cursor = cursor

    def cursor(self):
        return self._cursor

    def __enter__(self):
        return self

    def __exit__(self, *exc):
        return False


class _FakeSettings:
    database_url = "postgres://fake"


def test_status_with_book_reports_lemma_coverage(monkeypatch, capsys):
    monkeypatch.setattr(
        cli,
        "status_for_book",
        lambda slug: [
            {
                "book_slug": slug,
                "stage": "publish",
                "status": "done",
                "duration_seconds": 1.2,
                "detail": None,
            }
        ],
    )
    monkeypatch.setattr(cli, "load_settings", lambda: _FakeSettings())
    fake_conn = _FakeConn(_FakeCursor((100, 80)))
    monkeypatch.setattr(cli.psycopg, "connect", lambda *a, **k: fake_conn)

    cli.status(book="jack-london-the-call-of-the-wild")

    out = capsys.readouterr().out
    assert "100 lemma, 80 tr_gloss var" in out
    assert "%80" in out


def test_status_with_book_handles_zero_total_without_zero_division(monkeypatch, capsys):
    monkeypatch.setattr(
        cli,
        "status_for_book",
        lambda slug: [
            {
                "book_slug": slug,
                "stage": "extract",
                "status": "done",
                "duration_seconds": 0.5,
                "detail": None,
            }
        ],
    )
    monkeypatch.setattr(cli, "load_settings", lambda: _FakeSettings())
    fake_conn = _FakeConn(_FakeCursor((0, 0)))
    monkeypatch.setattr(cli.psycopg, "connect", lambda *a, **k: fake_conn)

    cli.status(book="empty-book")

    out = capsys.readouterr().out
    assert "lemma kapsamı alınamadı" not in out
    assert "lemma," not in out
