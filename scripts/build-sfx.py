"""Uygulama ses efektlerini matematikle üretir (numpy, dış örnek yok).

Çıktı: assets/sfx/*.wav (44.1 kHz, mono, 16 bit). Yeniden üretmek için:
    python scripts/build-sfx.py

Tasarım: yumuşak, sıcak, kısa (<0.9 sn). Sert kare dalga yok; her nota
hızlı atak + üstel sönüm zarfı, hafif harmonik (çan/marimba hissi).
Tepe seviyesi -6 dBFS: telefon hoparlöründe rahatsız etmesin.
"""

from pathlib import Path
import wave

import numpy as np

SR = 44100
OUT = Path(__file__).resolve().parent.parent / "assets" / "sfx"


def t_axis(dur: float) -> np.ndarray:
    return np.arange(int(SR * dur)) / SR


def env(dur: float, attack: float = 0.005, decay: float = 6.0) -> np.ndarray:
    t = t_axis(dur)
    a = np.clip(t / attack, 0, 1)
    return a * np.exp(-decay * t)


def bell(freq: float, dur: float, decay: float = 6.0) -> np.ndarray:
    """Marimba/çan: temel + 2. ve 4. harmonik (daha hızlı sönen)."""
    t = t_axis(dur)
    tone = (
        np.sin(2 * np.pi * freq * t) * env(dur, decay=decay)
        + 0.35 * np.sin(2 * np.pi * freq * 2 * t) * env(dur, decay=decay * 1.8)
        + 0.12 * np.sin(2 * np.pi * freq * 4 * t) * env(dur, decay=decay * 3)
    )
    return tone


def place(buf: np.ndarray, sig: np.ndarray, at: float) -> None:
    i = int(SR * at)
    end = min(len(buf), i + len(sig))
    buf[i:end] += sig[: end - i]


def note(n: str) -> float:
    names = {"C": 0, "D": 2, "E": 4, "F": 5, "G": 7, "A": 9, "B": 11}
    semis = names[n[0]] + (int(n[1:]) - 4) * 12 - 9
    return 440.0 * 2 ** (semis / 12)


def correct() -> np.ndarray:
    buf = np.zeros(int(SR * 0.6))
    place(buf, bell(note("E6"), 0.45, 7), 0.0)
    place(buf, bell(note("A6"), 0.5, 6), 0.09)
    return buf


def wrong() -> np.ndarray:
    # İki alçalan, yumuşak üçgen ton: "olmadı" der, cezalandırmaz.
    buf = np.zeros(int(SR * 0.5))
    for i, f in enumerate((note("E4"), note("C4"))):
        t = t_axis(0.22)
        tri = 2 / np.pi * np.arcsin(np.sin(2 * np.pi * f * t))
        place(buf, tri * env(0.22, attack=0.01, decay=9) * 0.8, i * 0.13)
    return buf


def tap() -> np.ndarray:
    # Kısa "pop": hızla aşağı kayan sinüs.
    dur = 0.07
    t = t_axis(dur)
    freq = 900 * np.exp(-30 * t) + 500
    phase = 2 * np.pi * np.cumsum(freq) / SR
    return np.sin(phase) * env(dur, attack=0.002, decay=55)


def save() -> np.ndarray:
    # Yukarı kayan "bloop" + küçük parıltı.
    dur = 0.25
    t = t_axis(dur)
    freq = 500 + 700 * (1 - np.exp(-18 * t))
    phase = 2 * np.pi * np.cumsum(freq) / SR
    buf = np.sin(phase) * env(dur, attack=0.004, decay=14)
    sparkle = np.zeros_like(buf)
    place(sparkle, bell(note("E7"), 0.15, 20) * 0.25, 0.08)
    return buf + sparkle


def complete() -> np.ndarray:
    # Yükselen arpej + son akorda tutma: kutlama.
    buf = np.zeros(int(SR * 1.0))
    seq = ["C5", "E5", "G5", "C6"]
    for i, n in enumerate(seq):
        place(buf, bell(note(n), 0.4, 6), i * 0.08)
    for n in ("C6", "E6", "G6"):
        place(buf, bell(note(n), 0.65, 4) * 0.5, 0.34)
    return buf


def write(name: str, sig: np.ndarray) -> None:
    fade = min(len(sig), int(SR * 0.01))
    sig = sig.copy()
    sig[-fade:] *= np.linspace(1, 0, fade)
    sig = sig / np.max(np.abs(sig)) * 10 ** (-6 / 20)
    data = (sig * 32767).astype("<i2").tobytes()
    with wave.open(str(OUT / f"{name}.wav"), "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes(data)
    print(name, f"{len(sig) / SR:.2f}s")


if __name__ == "__main__":
    OUT.mkdir(parents=True, exist_ok=True)
    for name, fn in {
        "correct": correct,
        "wrong": wrong,
        "tap": tap,
        "save": save,
        "complete": complete,
    }.items():
        write(name, fn())
