"""Doğrudan Postgres bağlantısı (psycopg3) ve toplu yazma yardımcıları.

Supabase MCP / REST API / supabase-py buradan hiç kullanılmaz — 70.000
kelimelik bir kitabı satır satır REST ile yüklemek saatler sürüyordu
(gerçek ölçüm: 5 kitabın 1'er bölümü ~2 saat). COPY ile aynı veri
saniyeler içinde yazılır.
"""

from __future__ import annotations

from collections.abc import Iterable, Iterator, Sequence
from contextlib import contextmanager
from typing import Any

import psycopg
from tqdm import tqdm

CHUNK_SIZE = 1000


@contextmanager
def connect(database_url: str) -> Iterator[psycopg.Connection]:
    with psycopg.connect(database_url, autocommit=False) as conn:
        yield conn


def copy_rows(
    conn: psycopg.Connection,
    table: str,
    columns: Sequence[str],
    rows: Iterable[tuple[Any, ...]],
    chunk_size: int = CHUNK_SIZE,
    show_progress: bool = False,
    label: str = "",
) -> int:
    """table adı ve columns güvenilir (kod içi sabit) kaynaklardan geldiği
    için f-string ile birleştirilir — kullanıcı girdisi buraya asla
    geçirilmemeli."""
    col_list = ", ".join(columns)
    count = 0
    rows_iter = tqdm(rows, desc=label, unit="row", disable=not show_progress)

    with conn.cursor() as cur, cur.copy(f"COPY {table} ({col_list}) FROM STDIN") as copy:
        buffer: list[tuple[Any, ...]] = []
        for row in rows_iter:
            buffer.append(row)
            count += 1
            if len(buffer) >= chunk_size:
                for buffered_row in buffer:
                    copy.write_row(buffered_row)
                buffer.clear()
        for buffered_row in buffer:
            copy.write_row(buffered_row)

    return count


def delete_book_content(conn: psycopg.Connection, book_id: str) -> None:
    """Yeniden yayınlama idempotent olsun diye önceki içerik satırlarını
    siler (book_sections cascade ile book_paragraphs'ı da siler).
    book_lemmas ayrı silinir (book_sections'a değil, doğrudan book_id'ye
    bağlı)."""
    with conn.cursor() as cur:
        cur.execute("delete from public.book_lemmas where book_id = %s", (book_id,))
        cur.execute("delete from public.book_sections where book_id = %s", (book_id,))
