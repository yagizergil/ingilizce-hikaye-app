"""Wikidata üzerinden yazarın ölüm yılını çözer.

Üç adımda: (1) isim varyantlarıyla (doğal sıra + varsa file-as biçimi)
wbsearchentities ile aday QID'ler bulunur (2) her aday, wbgetentities ile
TEK istekte hem P31 (instance of) hem P570 (date of death) claim'leri
çekilerek İNSAN (P31=Q5) olduğu doğrulanır — arama sonucundaki ilk isabet
körü körüne güvenilmez (bkz. "London, Jack" araması Q103867999'a düşüyor —
bu bir yazı, Jack London'ın kendisi değil). (3) doğrulanan ilk insanın
P570'i alınır.

Wikimedia API politikası: tanımlayıcı bir User-Agent göndermeyen (veya
agresif istek atan) istemcileri 403/429 ile engeller — bkz.
https://meta.wikimedia.org/wiki/User-Agent_policy. Bu yüzden: (a) TEK bir
paylaşılan httpx.Client, politika uyumlu User-Agent ile (b) saniyede en
fazla 1 istek (c) sonuçlar data/wikidata_cache.json'a yazılır — 100
kitaplık bir pipeline'da aynı yazar defalarca sorgulanmamalı.

Her başarısızlık NEDENİYLE loglanır (403/429/aday bulunamadı/insan
doğrulanamadı/P570 yok) — sessiz None'lar 100+ kitapta elle araştırılamaz.
"""

from __future__ import annotations

import json
import logging
import threading
import time
from pathlib import Path
from typing import Any

import httpx

logger = logging.getLogger(__name__)

WIKIDATA_API_URL = "https://www.wikidata.org/w/api.php"

# Wikimedia User-Agent politikası: uygulama adı/sürüm + tanımlanabilir bir
# iletişim/kaynak URL'si gerektirir — jenerik ya da sahte bir iletişim
# (ör. "contact: pipeline@local") sessizce 403 ile engellenebiliyor.
_USER_AGENT = "ingilizce-hikaye-pipeline/0.1 (https://github.com/yagizergil/ingilizce-hikaye)"

_HUMAN_QID = "Q5"

# Wikimedia agresif istemcileri kalıcı engelleyebiliyor — saniyede en
# fazla 1 istek. Bu modülün TÜM ağ çağrıları (arama + entity) bu
# limitleyiciden geçer.
_MIN_REQUEST_INTERVAL = 1.0
_MAX_RETRIES_429 = 3

_CACHE_PATH = Path(__file__).resolve().parent.parent / "data" / "wikidata_cache.json"

_rate_limit_lock = threading.Lock()
_last_request_at: float = 0.0

_cache_lock = threading.Lock()
_cache: dict[str, int | None] | None = None


class WikidataBlockedError(RuntimeError):
    """403 — Wikimedia bu isteği/istemciyi engelledi (bkz. User-Agent politikası)."""


def _throttle() -> None:
    global _last_request_at
    with _rate_limit_lock:
        elapsed = time.monotonic() - _last_request_at
        wait = _MIN_REQUEST_INTERVAL - elapsed
        if wait > 0:
            time.sleep(wait)
        _last_request_at = time.monotonic()


def _load_cache() -> dict[str, int | None]:
    global _cache
    with _cache_lock:
        if _cache is not None:
            return _cache
        if _CACHE_PATH.exists():
            try:
                with open(_CACHE_PATH, encoding="utf-8") as f:
                    _cache = json.load(f)
            except (OSError, json.JSONDecodeError) as exc:
                logger.warning(
                    "wikidata_cache.json okunamadı, boş cache ile başlanıyor: %s", exc
                )
                _cache = {}
        else:
            _cache = {}
        return _cache


def _save_cache() -> None:
    with _cache_lock:
        if _cache is None:
            return
        _CACHE_PATH.parent.mkdir(parents=True, exist_ok=True)
        with open(_CACHE_PATH, "w", encoding="utf-8") as f:
            json.dump(_cache, f, ensure_ascii=False, indent=2, sort_keys=True)


def _get(params: dict[str, str | int], timeout: float) -> httpx.Response | None:
    """Rate-limitli, 429'da backoff'lu, 403'te WikidataBlockedError fırlatan
    tek merkezi GET fonksiyonu. Ağ hatasında (403 hariç) None döner."""
    for attempt in range(_MAX_RETRIES_429 + 1):
        _throttle()
        try:
            response = httpx.get(
                WIKIDATA_API_URL,
                params=params,
                headers={"User-Agent": _USER_AGENT},
                timeout=timeout,
                follow_redirects=True,
            )
        except httpx.HTTPError as exc:
            logger.warning("wikidata: ağ hatası: %s", exc)
            return None

        if response.status_code == 403:
            raise WikidataBlockedError(
                "Wikidata 403 döndü — User-Agent eksik/geçersiz ya da istemci engellendi "
                "(bkz. https://meta.wikimedia.org/wiki/User-Agent_policy)"
            )
        if response.status_code == 429:
            if attempt >= _MAX_RETRIES_429:
                logger.warning(
                    "wikidata: 429 (rate limit) — %d denemeden sonra vazgeçildi", attempt + 1
                )
                return None
            retry_after = response.headers.get("Retry-After")
            backoff = (
                float(retry_after) if retry_after and retry_after.isdigit() else 2.0**attempt
            )
            logger.info(
                "wikidata: 429 (rate limit), %.1fs bekleniyor (deneme %d)", backoff, attempt + 1
            )
            time.sleep(backoff)
            continue

        try:
            response.raise_for_status()
        except httpx.HTTPError as exc:
            logger.warning("wikidata: HTTP hatası: %s", exc)
            return None

        return response

    return None


def _parse_wikidata_time(time_value: str) -> int | None:
    # Biçim: "+1851-02-01T00:00:00Z" (MS) veya "-0750-01-01T00:00:00Z" (MÖ).
    if not time_value:
        return None
    sign = -1 if time_value.startswith("-") else 1
    digits = time_value.lstrip("+-").split("-", 1)[0]
    try:
        return sign * int(digits)
    except ValueError:
        return None


def _search_candidates(name: str, timeout: float) -> list[str]:
    """İsim için aday QID listesi döner (arama sırasına göre, en fazla 5)."""
    response = _get(
        {
            "action": "wbsearchentities",
            "search": name,
            "language": "en",
            "type": "item",
            "format": "json",
            "limit": 5,
        },
        timeout,
    )
    if response is None:
        logger.info("wikidata: '%s' için arama başarısız (ağ hatası/429)", name)
        return []

    try:
        results = response.json().get("search", [])
    except ValueError as exc:
        logger.warning("wikidata: '%s' arama yanıtı JSON değil: %s", name, exc)
        return []

    return [str(r["id"]) for r in results if "id" in r]


def _get_entity_claims(qid: str, timeout: float) -> dict[str, Any] | None:
    """wbgetentities ile TEK istekte tüm claim'leri çeker (P31 + P570 dahil)
    — QID başına iki ayrı wbgetclaims çağrısı yerine tek istek."""
    response = _get(
        {"action": "wbgetentities", "ids": qid, "props": "claims", "format": "json"},
        timeout,
    )
    if response is None:
        logger.info("wikidata: %s entity çekilemedi (ağ hatası/429)", qid)
        return None

    try:
        entity = response.json()["entities"][qid]
    except (ValueError, KeyError) as exc:
        logger.warning("wikidata: %s entity yanıtı ayrıştırılamadı: %s", qid, exc)
        return None

    claims = entity.get("claims")
    if not isinstance(claims, dict):
        return None
    return claims


def _is_human(claims: dict[str, Any]) -> bool:
    for claim in claims.get("P31", []):
        try:
            value = claim["mainsnak"]["datavalue"]["value"]
        except KeyError:
            continue
        if isinstance(value, dict) and value.get("id") == _HUMAN_QID:
            return True
    return False


def _extract_death_year(claims: dict[str, Any]) -> int | None:
    for claim in claims.get("P570", []):
        try:
            time_value = claim["mainsnak"]["datavalue"]["value"]["time"]
        except KeyError:
            continue
        year = _parse_wikidata_time(time_value)
        if year is not None:
            return year
    return None


def _resolve(author_name: str, alt_names: list[str] | None, timeout: float) -> int | None:
    names_to_try = [author_name] + [n for n in (alt_names or []) if n and n != author_name]

    for name in names_to_try:
        candidate_qids = _search_candidates(name, timeout)
        if not candidate_qids:
            logger.info("wikidata: '%s' için aday QID bulunamadı", name)
            continue

        for qid in candidate_qids:
            claims = _get_entity_claims(qid, timeout)
            if claims is None:
                continue
            if not _is_human(claims):
                logger.info(
                    "wikidata: %s ('%s' aramasından) insan değil (P31≠Q5), atlandı", qid, name
                )
                continue

            year = _extract_death_year(claims)
            if year is not None:
                return year

            logger.info(
                "wikidata: %s ('%s') insan doğrulandı ama P570 (ölüm tarihi) yok "
                "— hâlâ hayatta olabilir ya da veri eksik",
                qid,
                name,
            )
            break  # bu isim varyantında insan bulundu ama tarihsiz -> sıradaki isme geç

    logger.warning(
        "wikidata: '%s' için ölüm yılı çözülemedi (denenen isimler: %s)",
        author_name,
        names_to_try,
    )
    return None


def combine_death_years(resolved_years: list[int | None]) -> int | None:
    """Birden fazla katkıcının (yazarlar + varsa çevirmenler) çözülmüş
    ölüm yıllarını TEK bir "efektif" telif-gate yılına indirger:
    HERHANGİ biri çözülemediyse (None) sonuç None'dır (needs_review'a
    düşer — validate_author_death_year zaten None'ı "belirlenemedi"
    olarak reddediyor); hepsi çözüldüyse EN YÜKSEK (en geç ölen) yıl
    döner, çünkü telif süresi en geç ölen katkıcının ölüm yılına göre
    hesaplanır (June Moon: Ring Lardner öl. 1933, George S. Kaufman
    öl. 1961 -> efektif yıl 1961, kitap max_author_death_year=1956'yı
    aşar, reddedilir)."""
    if not resolved_years or any(year is None for year in resolved_years):
        return None
    return max(year for year in resolved_years if year is not None)


def lookup_author_death_year(
    author_name: str | None,
    alt_names: list[str] | None = None,
    timeout: float = 15.0,
    use_cache: bool = True,
) -> int | None:
    """author_name (EPUB dc:creator, doğal sıra, ör. "Jack London") ve
    varsa alt_names (ör. file-as biçimi "London, Jack") sırayla denenir.
    Sonuç (bulunamama dahil) data/wikidata_cache.json'a yazılır — aynı
    yazar tekrar sorgulanmaz (100 kitaplık pipeline'da aynı yazarın
    birden fazla kitabı olacak). 403 alınırsa WikidataBlockedError
    fırlatılır (istemci engellendi, tekrar denemek anlamsız — çağıran
    kod override'a düşmeli)."""
    if not author_name:
        logger.warning("wikidata: author_name boş, arama yapılmadı")
        return None

    cache = _load_cache() if use_cache else {}
    if use_cache and author_name in cache:
        logger.info("wikidata: '%s' cache'ten okundu", author_name)
        return cache[author_name]

    year = _resolve(author_name, alt_names, timeout)

    if use_cache:
        cache[author_name] = year
        _save_cache()

    return year
