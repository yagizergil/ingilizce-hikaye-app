"""adapt_series_episode.py'nin ürettiği seri uyarlamalarını yayınlar.

Kitap yazımı publish_multilang.publish_file() ile aynı (çok dilli kitaplar
İngilizce doğrulayıcıdan/lemma sözlüğünden geçmez, bkz. o dosyanın notu);
farkı: slug dosya adıyla birebir (`<series-id>-eNN-<dil>`), kitap
`<series-id>-<dil>` koleksiyonuna doğru sırayla bağlanır ve frontmatter'daki
`description` kitaba yazılır.

KULLANIM
    cd pipeline
    .venv/Scripts/python.exe scripts/publish_series_multilang.py --slug kai-repair-files-b1-e01
    .venv/Scripts/python.exe scripts/publish_series_multilang.py --slug kai-repair-files-b1-e01 --lang de
"""

from __future__ import annotations

import argparse
import sys
from pathlib import Path
from types import SimpleNamespace

PIPELINE_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(PIPELINE_ROOT))
sys.path.insert(0, str(PIPELINE_ROOT / "scripts"))

import publish_multilang as pm  # noqa: E402

from src.db import connect  # noqa: E402
from src.publish import link_book_to_series  # noqa: E402
from src.settings import load_settings  # noqa: E402

ALL_LANGS = ["tr", "de", "fr", "it", "es", "ru", "ar", "zh", "ja"]


def _series_slug_from_filename(path: Path) -> tuple[str, None]:
    # "kai-repair-files-b1-e01-de" -> taban "kai-repair-files-b1-e01";
    # publish_file() dil sonekini kendisi geri ekliyor.
    return path.stem.rsplit("-", 1)[0], None


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--slug", required=True)
    parser.add_argument("--lang", nargs="+", default=["all"])
    args = parser.parse_args()
    langs = ALL_LANGS if args.lang == ["all"] else args.lang

    pm._slug_from_filename = _series_slug_from_filename
    failed: list[str] = []
    with connect(load_settings().database_url) as conn:
        for lang in langs:
            path = PIPELINE_ROOT / f"stories_{lang}" / f"{args.slug}-{lang}.md"
            if not path.exists():
                print(f"[{lang}] uyarlama yok, atlanıyor")
                continue
            extra = pm._read_extra_frontmatter(path)
            book_id = pm.publish_file(conn, path, lang)
            with conn.transaction():
                link_book_to_series(
                    conn,
                    book_id,
                    SimpleNamespace(series=extra["series"], series_index=extra.get("series_index")),
                )
                if extra.get("description"):
                    with conn.cursor() as cur:
                        cur.execute(
                            "update public.books set description = %s where id = %s",
                            (extra["description"], book_id),
                        )
            print(f"[{lang}] {path.stem} yayınlandı -> {extra['series']}")
    print(f"Bitti. Başarısız: {failed or 'yok'}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
