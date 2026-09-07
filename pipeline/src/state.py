from __future__ import annotations

import sqlite3
import time
from collections.abc import Iterator
from contextlib import contextmanager
from pathlib import Path

from src.settings import STATE_DB_PATH

STAGES = ("ingest", "extract", "profile", "validate", "lemmas", "publish")

_SCHEMA = """
create table if not exists book_stage_state (
  book_slug text not null,
  stage text not null,
  status text not null check (status in ('running', 'done', 'failed')),
  started_at real not null,
  finished_at real,
  duration_seconds real,
  detail text,
  primary key (book_slug, stage)
);

create table if not exists book_files (
  book_slug text primary key,
  source_path text not null,
  ingested_at real not null
);
"""


def _connect(db_path: Path = STATE_DB_PATH) -> sqlite3.Connection:
    conn = sqlite3.connect(db_path)
    conn.execute("pragma journal_mode=WAL")
    conn.executescript(_SCHEMA)
    return conn


@contextmanager
def state_db(db_path: Path = STATE_DB_PATH) -> Iterator[sqlite3.Connection]:
    conn = _connect(db_path)
    try:
        yield conn
        conn.commit()
    finally:
        conn.close()


def get_stage_status(book_slug: str, stage: str, db_path: Path = STATE_DB_PATH) -> str | None:
    with state_db(db_path) as conn:
        row = conn.execute(
            "select status from book_stage_state where book_slug = ? and stage = ?",
            (book_slug, stage),
        ).fetchone()
        return row[0] if row else None


def require_stage_done(book_slug: str, stage: str, db_path: Path = STATE_DB_PATH) -> None:
    status = get_stage_status(book_slug, stage, db_path)
    if status != "done":
        raise RuntimeError(
            f"'{stage}' aşaması '{book_slug}' için tamamlanmamış "
            f"(durum: {status or 'hiç çalıştırılmadı'}). Önce "
            f"`pipeline {stage} --book {book_slug}` çalıştır."
        )


@contextmanager
def stage_run(book_slug: str, stage: str, db_path: Path = STATE_DB_PATH) -> Iterator[None]:
    started = time.monotonic()
    started_wall = time.time()
    with state_db(db_path) as conn:
        conn.execute(
            "insert or replace into book_stage_state "
            "(book_slug, stage, status, started_at, finished_at, duration_seconds, detail) "
            "values (?, ?, 'running', ?, null, null, null)",
            (book_slug, stage, started_wall),
        )
    try:
        yield
    except Exception as exc:
        duration = time.monotonic() - started
        with state_db(db_path) as conn:
            conn.execute(
                "update book_stage_state set status='failed', finished_at=?, "
                "duration_seconds=?, detail=? where book_slug=? and stage=?",
                (time.time(), duration, str(exc), book_slug, stage),
            )
        raise
    else:
        duration = time.monotonic() - started
        with state_db(db_path) as conn:
            conn.execute(
                "update book_stage_state set status='done', finished_at=?, "
                "duration_seconds=? where book_slug=? and stage=?",
                (time.time(), duration, book_slug, stage),
            )


def record_ingested_file(book_slug: str, source_path: str, db_path: Path = STATE_DB_PATH) -> None:
    with state_db(db_path) as conn:
        conn.execute(
            "insert or replace into book_files (book_slug, source_path, ingested_at) "
            "values (?, ?, ?)",
            (book_slug, source_path, time.time()),
        )


def get_ingested_file(book_slug: str, db_path: Path = STATE_DB_PATH) -> str | None:
    with state_db(db_path) as conn:
        row = conn.execute(
            "select source_path from book_files where book_slug = ?", (book_slug,)
        ).fetchone()
        return row[0] if row else None


def all_status(db_path: Path = STATE_DB_PATH) -> list[dict[str, object]]:
    with state_db(db_path) as conn:
        rows = conn.execute(
            "select book_slug, stage, status, duration_seconds, detail "
            "from book_stage_state order by book_slug, started_at"
        ).fetchall()
    return [
        {
            "book_slug": r[0],
            "stage": r[1],
            "status": r[2],
            "duration_seconds": r[3],
            "detail": r[4],
        }
        for r in rows
    ]


def status_for_book(book_slug: str, db_path: Path = STATE_DB_PATH) -> list[dict[str, object]]:
    return [row for row in all_status(db_path) if row["book_slug"] == book_slug]
