"""MP3 sure olcumunun testleri.

NEDEN BU TESTLER VAR: bu fonksiyonun ciktisi dogrudan kelime vurgusunun
hizalamasina giriyor. Yanlis bir sure, sesle vurgunun birbirinden
kaymasi demek — ve o hata sessiz, hicbir yerde patlamiyor. Onceki
"tahmin" yaklasimi tam olarak boyle fark edilmeden birikmisti.

Kareler elle uretiliyor: gercek bir mp3 dosyasi depoya koymak hem gereksiz
hem de neyin test edildigini gizlerdi.
"""

from __future__ import annotations

import pytest

from src.mp3_duration import Mp3ParseError, mp3_duration_seconds


def mpeg1_frame(bitrate_kbps: int = 128, sample_rate: int = 44100, padding: int = 0) -> bytes:
    """Tek bir MPEG1 Layer III karesi (baslik + sifir govde)."""
    bitrates = (0, 32, 40, 48, 56, 64, 80, 96, 112, 128, 160, 192, 224, 256, 320, 0)
    rates = (44100, 48000, 32000)

    bitrate_index = bitrates.index(bitrate_kbps)
    sample_rate_index = rates.index(sample_rate)

    byte1 = 0xFF
    byte2 = 0xE0 | (0x03 << 3) | (0x01 << 1) | 0x01  # MPEG1, Layer III, CRC yok
    byte3 = (bitrate_index << 4) | (sample_rate_index << 2) | (padding << 1)
    byte4 = 0xC0  # kanal modu: mono

    frame_length = (144 * bitrate_kbps * 1000) // sample_rate + padding
    return bytes([byte1, byte2, byte3, byte4]) + b"\x00" * (frame_length - 4)


def test_tek_kare_suresi():
    # MPEG1 Layer III karesi 1152 ornek tasiyor: 1152/44100 = 0,026122 sn.
    assert mp3_duration_seconds(mpeg1_frame()) == pytest.approx(1152 / 44100)


def test_kareler_toplaniyor():
    data = mpeg1_frame() * 100
    assert mp3_duration_seconds(data) == pytest.approx(100 * 1152 / 44100)


def test_id3_etiketi_atlaniyor():
    # ID3v2: "ID3" + surum(2) + bayrak(1) + senkron-guvenli boyut(4).
    tag_body = b"\x00" * 50
    header = b"ID3\x04\x00\x00" + bytes([0, 0, 0, len(tag_body)])
    data = header + tag_body + mpeg1_frame() * 10
    assert mp3_duration_seconds(data) == pytest.approx(10 * 1152 / 44100)


def test_degisken_bit_hizi_dogru_toplaniyor():
    # VBR: sure bit hizina degil, kare basina ornege bagli — ikisi de ayni
    # sureyi vermeli.
    data = mpeg1_frame(bitrate_kbps=128) + mpeg1_frame(bitrate_kbps=192)
    assert mp3_duration_seconds(data) == pytest.approx(2 * 1152 / 44100)


def test_dolgu_bayti_kare_uzunlugunu_kaydirmiyor():
    # Dolgulu kare 1 bayt daha uzun; yanlis hesaplanirsa sonraki karenin
    # basligi kacirilir ve sure eksik cikar.
    data = mpeg1_frame(padding=1) * 20
    assert mp3_duration_seconds(data) == pytest.approx(20 * 1152 / 44100)


def test_farkli_ornekleme_hizi():
    data = mpeg1_frame(sample_rate=32000) * 10
    assert mp3_duration_seconds(data) == pytest.approx(10 * 1152 / 32000)


def test_gecersiz_veri_sessizce_sifir_donmuyor():
    # Sessizce 0 donmek, otelemeyi 0 yapip TUM zamanlamalari bozardi ve
    # bunu kimse fark etmezdi. Yuksek sesle hata vermesi gerekiyor.
    with pytest.raises(Mp3ParseError):
        mp3_duration_seconds(b"bu bir mp3 degil" * 10)
