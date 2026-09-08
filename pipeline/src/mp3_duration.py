"""MP3 baytlarinin suresini, kare basliklarini okuyarak OLCER.

NEDEN VAR (2026-09-08 hatasi): bolum sesi 5.000 baytlik SSML sinirindan
dolayi parcalar halinde sentezlenip birlestiriliyor. Her parcanin
zamanlari, kendinden onceki parcalarin toplam suresi kadar otelenmek
zorunda. `generate_audio.py` bu sureyi "son <mark>'in zamani + 0,4 saniye"
diye TAHMIN ediyordu.

Tahmin sistematik olarak KUCUKTU: son isaretten sonra o kelimenin
soylenmesi ve sondaki sessizlik geliyor, ikisi birlikte 0,4 saniyeden uzun.
Hata her parca sinirinda tekrarlaniyor ve BIRIKIYOR — bolum basina 5-6
parca oldugu icin sonlara dogru 1-2 saniyeye ulasiyor. Kullanicinin
gordugu: vurgu sesin onune geciyor ve sayfa ilerledikce aciliyor.

Cozum tahmini kaldirmak. Uygulama birlestirilmis dosyayi caliyor ve
`player.currentTime` o dosyadaki konumu veriyor; dolayisiyla oteleme
onceki baytlarin TAM suresi olmak zorunda. Kare basliklarini toplamak bunu
tam olarak veriyor.

NEDEN YENI BIR BAGIMLILIK YOK (mutagen vb.): ihtiyac duyulan sey MPEG
Layer III kare basligini okumak — tablolarla birlikte ~60 satir. Yeni bir
paket eklemek "Basitlik once gelir" ilkesine (CLAUDE.md) aykiri olurdu.
"""

from __future__ import annotations

#: Layer III bit hizlari (kbps). Indeks 0 "free", 15 "bad" — ikisi de gecersiz.
_BITRATES_MPEG1 = (0, 32, 40, 48, 56, 64, 80, 96, 112, 128, 160, 192, 224, 256, 320, 0)
_BITRATES_MPEG2 = (0, 8, 16, 24, 32, 40, 48, 56, 64, 80, 96, 112, 128, 144, 160, 0)

_SAMPLE_RATES = {
    3: (44100, 48000, 32000, 0),  # MPEG1
    2: (22050, 24000, 16000, 0),  # MPEG2
    0: (11025, 12000, 8000, 0),  # MPEG2.5
}


class Mp3ParseError(ValueError):
    """Baytlar gecerli bir MPEG Layer III akisi gibi gorunmuyor."""


def _skip_id3(data: bytes) -> int:
    """ID3v2 etiketi varsa ondan sonraki konumu doner."""
    if len(data) >= 10 and data[:3] == b"ID3":
        # Boyut 4 baytta, her baytin yalnizca alt 7 biti kullaniliyor
        # (senkronizasyon guvenli tamsayi).
        size = (data[6] << 21) | (data[7] << 14) | (data[8] << 7) | data[9]
        return 10 + size
    return 0


def mp3_duration_seconds(data: bytes) -> float:
    """Baytlarin toplam calma suresi (saniye).

    Kareler tek tek toplaniyor: ornekleme hizi ya da bit hizi akis
    icinde degisse bile (VBR) sonuc dogru kaliyor.
    """
    position = _skip_id3(data)
    total_seconds = 0.0
    frames = 0
    length = len(data)

    while position + 4 <= length:
        header = data[position : position + 4]

        # Senkronizasyon: 11 bit 1.
        if header[0] != 0xFF or (header[1] & 0xE0) != 0xE0:
            position += 1
            continue

        version_id = (header[1] >> 3) & 0x03  # 3=MPEG1, 2=MPEG2, 0=MPEG2.5
        layer = (header[1] >> 1) & 0x03  # 1 = Layer III
        bitrate_index = (header[2] >> 4) & 0x0F
        sample_rate_index = (header[2] >> 2) & 0x03
        padding = (header[2] >> 1) & 0x01

        if version_id == 1 or layer != 1 or sample_rate_index == 3:
            position += 1
            continue

        table = _BITRATES_MPEG1 if version_id == 3 else _BITRATES_MPEG2
        bitrate = table[bitrate_index] * 1000
        sample_rate = _SAMPLE_RATES[version_id][sample_rate_index]
        if bitrate == 0 or sample_rate == 0:
            position += 1
            continue

        if version_id == 3:
            samples_per_frame = 1152
            frame_length = (144 * bitrate) // sample_rate + padding
        else:
            samples_per_frame = 576
            frame_length = (72 * bitrate) // sample_rate + padding

        if frame_length <= 4:
            position += 1
            continue

        total_seconds += samples_per_frame / sample_rate
        frames += 1
        position += frame_length

    if frames == 0:
        raise Mp3ParseError("MPEG Layer III karesi bulunamadi")

    return total_seconds
