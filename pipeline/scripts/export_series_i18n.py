"""Seri kartlarındaki başlık ve açıklamaları uygulamanın çeviri biçimine döker.

Yayın adımı her seri için `collections.<slug>.title` / `.description`
anahtarlı bir koleksiyon satırı oluşturur (bkz. src/publish.py
`link_book_to_series`). Bu anahtarların uygulamanın 10 dil dosyasında
(src/i18n/locales/*.json) karşılığı olmalı; yoksa ekranda ham anahtar
görünür. Pipeline uygulamadan izole olduğu için (CLAUDE.md) dosyalara
DOKUNMAZ; work/series_i18n.json yazar, uygulamaya elle birleştirilir.

Koleksiyon slug'ı dil başına: İngilizce `<series-id>`, diğerleri
`<series-id>-<dil>`. Her dilin uygulama dosyasına O DİLDEKİ başlık yazılır,
ama bütün slug'lar her dosyada bulunur (anahtar eşitliği testi için).

KULLANIM
    .venv/Scripts/python.exe scripts/export_series_i18n.py
"""

from __future__ import annotations

import json
from pathlib import Path

import yaml

PIPELINE_ROOT = Path(__file__).resolve().parent.parent
LANGS = ["tr", "en", "de", "fr", "it", "es", "ru", "ar", "zh", "ja"]


def main() -> int:
    out: dict[str, dict[str, dict[str, str]]] = {lang: {} for lang in LANGS}
    for card_path in sorted((PIPELINE_ROOT / "universe" / "series").glob("*.yaml")):
        card = yaml.safe_load(card_path.read_text(encoding="utf-8"))
        titles, descriptions = card.get("titles", {}), card.get("descriptions", {})
        slugs = [card["id"]] + [f"{card['id']}-{lang}" for lang in LANGS if lang != "en"]
        for lang in LANGS:
            for slug in slugs:
                out[lang][slug] = {
                    "title": titles.get(lang) or titles["en"],
                    "description": descriptions.get(lang) or descriptions["en"],
                }
    target = PIPELINE_ROOT / "work" / "series_i18n.json"
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(json.dumps(out, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"yazıldı: {target} ({len(out['en'])} koleksiyon anahtarı / dil)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
