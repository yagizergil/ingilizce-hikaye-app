"""Japonca kamu malı metinleri 青空文庫 (Aozora Bunko) üzerinden indirir.

NEDEN GUTENBERG DEĞİL: Project Gutenberg'in Japonca rafı ABD hukukuna göre
derlenmiş ve indirdiğimiz 15 kitabın 10'u Tanizaki (ö. 1965), Mushanokōji
(ö. 1976), Nagai Kafū (ö. 1959) gibi yazarlara aitti -- Türkiye ve AB'de
hâlâ telifli. Hepsi `vet_classics.py` tarafından elendi ve Japonca rafımız
tek kitapla kaldı. Aozora ise JAPON hukukuna göre çalışıyor ve her eser
için açık bir telif bayrağı yayımlıyor.

TELİF FİLTRESİ (bu betiğin en önemli parçası): Aozora'nın kendi uyarısı
şunu söylüyor -- "著作権保護期間が終了しておらず、クリエイティブ・コモンズ・
ライセンス等による許諾の元で再配布されているファイルも含まれています"
(koruma süresi BİTMEMİŞ, yalnızca CC lisansıyla dağıtılan dosyalar da
var). Yani Aozora'da olması kamu malı olduğu anlamına GELMİYOR. Bu betik
yalnızca `作品著作権フラグ == "なし"` (telif yok) olanları alıyor ve ek
olarak yazarın ölüm yılını + 70 kuralıyla bir kez daha doğruluyor.

YAZI SİSTEMİ FİLTRESİ: yalnızca `新字新仮名` (modern karakter + modern
kana) alınıyor. `旧字旧仮名` metinler savaş öncesi imlayla yazılmış ve
bugünkü Japoncayı öğrenen biri için okunabilir değil -- Çince tarafında
klasik Çinceyi elediğimiz gerekçenin aynısı.

BİÇİM: Aozora metinleri Shift_JIS kodlu (HTTP başlığı utf-8 dese bile) ve
kendi işaretleme dilini taşıyor: ruby okunuşları `｜漢字《かんじ》`,
editör notları `［＃...］`, başlık/altbilgi blokları. Hepsi temizleniyor;
ruby okunuşları ATILIYOR, kanji BIRAKILIYOR (öğrenci kanjiyi görmeli,
okunuşu uygulamanın kendi sözlüğü veriyor).

ÇALIŞTIRMA:
    .venv/Scripts/python.exe scripts/fetch_aozora.py --count 40
"""

from __future__ import annotations

import argparse
import csv
import datetime
import io
import json
import re
import sys
import time
import zipfile
from pathlib import Path

if sys.stdout.encoding and sys.stdout.encoding.lower() != "utf-8":
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")

import httpx

PIPELINE_ROOT = Path(__file__).resolve().parent.parent
INDEX_URL = "https://www.aozora.gr.jp/index_pages/list_person_all_extended_utf8.zip"
HEADERS = {"User-Agent": "lingo-pipeline/1.0 (public-domain corpus builder)"}

COPYRIGHT_TERM_YEARS = 70
#: Çok kısa metinler (şiir, tek sayfalık deneme) okuma pratiği için
#: yetersiz; çok uzunlar da bölümlendirmeyi zorluyor.
MIN_CHARS = 4000
MAX_CHARS = 400_000


def download_index() -> list[dict[str, str]]:
    print("Aozora dizini indiriliyor...")
    with httpx.Client(headers=HEADERS, follow_redirects=True, timeout=120.0) as client:
        response = client.get(INDEX_URL)
        response.raise_for_status()

    with zipfile.ZipFile(io.BytesIO(response.content)) as archive:
        name = archive.namelist()[0]
        with archive.open(name) as handle:
            text = io.TextIOWrapper(handle, encoding="utf-8-sig")
            rows = list(csv.DictReader(text))
    print(f"  {len(rows)} kayıt.")
    return rows


def text_url_for(zip_url: str) -> str | None:
    """Aozora'nın zip adresini, açılmış metni sunan aynası ile eşleştirir.

    Aozora'nın kendi sunucusu metinleri YALNIZCA zip içinde veriyor;
    `aozorahack` aynası aynı dosyaları açılmış hâlde tutuyor (günde bir
    kez eşitleniyor). Zip indirip açmak yerine aynayı kullanmak, her kitap
    için bir zip çözme adımını ortadan kaldırıyor.
    """
    match = re.search(r"/cards/(\d+)/files/([^/]+)\.zip$", zip_url or "")
    if not match:
        return None
    person_id, file_id = match.group(1), match.group(2)
    return f"https://aozorahack.org/aozorabunko_text/cards/{person_id}/files/{file_id}/{file_id}.txt"


def clean_aozora_markup(raw: str) -> str:
    """Aozora işaretlemesini ayıklar."""
    text = raw

    # Başlık bloğu ile gövde arasındaki ayraç: 50+ ─ karakteri.
    parts = re.split(r"-{20,}", text)
    if len(parts) >= 3:
        # [başlık, açıklama bloğu, gövde...] -- gövdeden devam.
        text = "-".join(parts[2:]) if len(parts) > 3 else parts[2]

    # Altbilgi: 底本（kaynak kitap künyesi）ve sonrası.
    text = re.split(r"\n底本[：:]", text)[0]

    # Ruby okunuşları: ｜漢字《かんじ》 -> 漢字 ; 漢字《かんじ》 -> 漢字
    text = re.sub(r"[｜|]([^《]+)《[^》]*》", r"\1", text)
    text = re.sub(r"《[^》]*》", "", text)

    # Editör notları: ［＃...］
    text = re.sub(r"［＃[^］]*］", "", text)

    # Aozora satırları sabit genişlikte sarmıyor; paragraf sınırı boş satır.
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text.strip()


def slugify(person_id: str, file_id: str) -> str:
    return f"aozora-{person_id}-{file_id}"


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--count", type=int, default=40)
    args = parser.parse_args()

    this_year = datetime.date.today().year
    out_dir = PIPELINE_ROOT / "classics_ja"
    out_dir.mkdir(exist_ok=True)

    rows = download_index()

    eligible: list[dict[str, str]] = []
    for row in rows:
        # TELİF: Aozora'nın kendi bayrağı. "なし" = koruma süresi bitmiş.
        if row.get("作品著作権フラグ") != "なし":
            continue
        # YAZI SİSTEMİ: yalnızca modern imla.
        if row.get("文字遣い種別") != "新字新仮名":
            continue
        if not text_url_for(row.get("テキストファイルURL", "")):
            continue

        # İKİNCİ KONTROL: yazarın ölüm yılı + 70. Aozora Japon kuralına
        # göre işaretliyor; bizim kullanıcılarımız AB/Türkiye'de.
        death = (row.get("没年月日") or "")[:4]
        if not death.isdigit():
            continue
        if int(death) + COPYRIGHT_TERM_YEARS >= this_year:
            continue

        eligible.append(row)

    print(f"Uygun eser: {len(eligible)} (telifsiz + modern imla + ölüm+70 geçmiş)")

    downloaded = 0
    with httpx.Client(headers=HEADERS, follow_redirects=True, timeout=60.0) as client:
        for row in eligible:
            if downloaded >= args.count:
                break

            zip_url = row["テキストファイルURL"]
            url = text_url_for(zip_url)
            match = re.search(r"/cards/(\d+)/files/([^/]+)\.zip$", zip_url)
            assert match and url
            slug = slugify(match.group(1), match.group(2))

            txt_path = out_dir / f"{slug}.txt"
            if txt_path.exists():
                continue

            title = row.get("作品名", "").strip()
            author = f"{row.get('姓', '')}{row.get('名', '')}".strip()
            print(f"  indiriliyor: {title} / {author}")

            try:
                response = client.get(url)
            except httpx.TransportError as error:
                print(f"    ATLA: ağ hatası ({error})")
                continue
            if response.status_code != 200:
                print(f"    ATLA: HTTP {response.status_code}")
                continue

            # Başlık utf-8 diyor ama dosya Shift_JIS (aynanın kendi notu).
            raw = response.content.decode("shift_jis", errors="replace")
            body = clean_aozora_markup(raw)

            if not (MIN_CHARS <= len(body) <= MAX_CHARS):
                print(f"    ATLA: uzunluk uygun değil ({len(body)} karakter)")
                continue

            txt_path.write_text(body, encoding="utf-8")
            (out_dir / f"{slug}.json").write_text(
                json.dumps(
                    {
                        "title": title,
                        "author": author,
                        "author_death_year": int((row.get("没年月日") or "")[:4]),
                        "source_url": row.get("図書カードURL", ""),
                        "license": "Public Domain (Aozora Bunko, 著作権フラグ: なし)",
                        "orthography": row.get("文字遣い種別", ""),
                    },
                    ensure_ascii=False,
                    indent=2,
                ),
                encoding="utf-8",
            )
            downloaded += 1
            # Aozora gönüllü bir arşiv; ardışık isteklerin arasına boşluk.
            time.sleep(0.5)

    print(f"\n{downloaded} eser indirildi -> {out_dir}")


if __name__ == "__main__":
    main()
