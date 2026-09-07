"""GERÇEK Wikidata API'sine karşı çalışan testler (bkz. conftest.py —
varsayılan olarak skip edilir, `RUN_NETWORK_TESTS=1 pytest` ile çalışır).

Bu testler var çünkü curl ile doğrulanan "API çalışıyor" bilgisi
`lookup_author_death_year`'ın GERÇEKTEN doğru sonucu ürettiğini
kanıtlamaz — regresyon (ör. yanlış dc:creator elementinin seçilmesi,
yanlış isim varyantının denenmesi, insan doğrulamasının atlanması,
403/429 engellemesi) sadece uçtan uca bir ağ testiyle yakalanır.

Her testte src.wikidata'nın modül-seviyesi cache'i, GERÇEK
data/wikidata_cache.json'a dokunmadan izole bir sıfır cache ile
değiştirilir (monkeypatch) — testler birbirinden ve geliştiricinin
lokal cache dosyasından bağımsız çalışsın diye.
"""

from __future__ import annotations

import pytest

from src import wikidata
from src.wikidata import lookup_author_death_year

pytestmark = pytest.mark.network


@pytest.fixture(autouse=True)
def _isolated_cache(monkeypatch, tmp_path):
    monkeypatch.setattr(wikidata, "_cache", None)
    monkeypatch.setattr(wikidata, "_CACHE_PATH", tmp_path / "wikidata_cache.json")


def test_jack_london():
    assert lookup_author_death_year("Jack London") == 1916


def test_jack_london_with_file_as_alt_name():
    # file-as biçimi ("London, Jack") tek başına yanlış bir entity'ye
    # düşebiliyor (Q103867999 — insan değil) — doğal isim birincil
    # varyant olarak denendiği sürece bu sorun olmamalı.
    assert lookup_author_death_year("Jack London", alt_names=["London, Jack"]) == 1916


def test_hg_wells():
    assert lookup_author_death_year("H. G. Wells") == 1946


def test_charlotte_perkins_gilman():
    assert lookup_author_death_year("Charlotte Perkins Gilman") == 1935


def test_robert_louis_stevenson():
    assert lookup_author_death_year("Robert Louis Stevenson") == 1894


def test_charles_dickens():
    assert lookup_author_death_year("Charles Dickens") == 1870


def test_cache_avoids_second_network_call(monkeypatch):
    call_count = 0
    original_search = wikidata._search_candidates

    def counting_search(name: str, timeout: float) -> list[str]:
        nonlocal call_count
        call_count += 1
        return original_search(name, timeout)

    monkeypatch.setattr(wikidata, "_search_candidates", counting_search)

    first = lookup_author_death_year("Jack London")
    second = lookup_author_death_year("Jack London")

    assert first == 1916
    assert second == 1916
    assert call_count == 1, "cache çalışıyorsa ikinci çağrı ağa gitmemeli"
