# -*- coding: utf-8 -*-
"""assets/*.svg dosyalarını RN'in okuyabileceği TS modüllerine gömer.

NEDEN BU BETİK VAR: Metro, `.svg` dosyalarını bileşene çeviren bir
dönüştürücü (react-native-svg-transformer + metro.config.js) olmadan
içeri alamıyor. Onu eklemek yeni bir derleme adımı ve yeni bir bağımlılık
demek; bir avuç küçük dosya için `react-native-svg`in zaten taşıdığı
`SvgXml` yetiyor. Bu betik, kaynak SVG'ler ile gömülü kopyaları arasındaki
bağı elle kopyalamaya bırakmıyor.

KULLANIM: assets/ altındaki bir SVG değişince ya da yenisi eklenince

    python scripts/embed-svg-icons.py

Üretilen dosyalar elle DÜZENLENMEZ; kaynak her zaman assets/.
"""

import io
import json
import os
import re

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ASSETS = os.path.join(ROOT, "assets")

# (çıktı dosyası, dışa aktarılan ad, {anahtar: svg dosya adı}, başlık yorumu)
BUNDLES = [
    (
        os.path.join("src", "features", "onboarding", "levelIconXml.ts"),
        "levelIconXml",
        [("A1", "leaf"), ("A2", "sun"), ("B1", "book"), ("B2", "bubble-chat"),
         ("C1", "compass"), ("C2", "trophy")],
        "Seviye satırlarındaki illüstrasyonlar (bkz. OnboardingLevelStep).",
    ),
    (
        os.path.join("src", "features", "onboarding", "goalIconXml.ts"),
        "goalIconXml",
        [("m5", "leaf2"), ("m10", "calendar"), ("m15", "thunder"),
         ("m20", "launch"), ("m30", "trophy-star")],
        "Günlük hedef satırlarındaki illüstrasyonlar (bkz. OnboardingDailyGoalStep).",
    ),
]

HEADER = """/**
 * {title}
 *
 * BU DOSYA ÜRETİLDİ -- elle düzenlemeyin. Kaynak: `assets/*.svg`.
 * Yeniden üretmek için: `python scripts/embed-svg-icons.py`
 * (gerekçe betiğin kendi başlığında).
 */
"""


def clean(raw):
    """XML bildirimi, yorumlar ve DOCTYPE atılıyor; gerisi aynen kalıyor."""
    raw = re.sub(r"<\?xml[^>]*\?>", "", raw)
    raw = re.sub(r"<!--.*?-->", "", raw, flags=re.S)
    raw = re.sub(r"<!DOCTYPE[^>]*>", "", raw)
    return re.sub(r"\s+", " ", raw).strip()


def build(out_path, export_name, entries, title):
    lines = [HEADER.format(title=title)]
    lines.append("export const %s: Record<string, string> = {" % export_name)
    for key, name in entries:
        path = os.path.join(ASSETS, name + ".svg")
        with io.open(path, encoding="utf-8", errors="replace") as handle:
            xml = clean(handle.read())
        lines.append("  /* assets/%s.svg */" % name)
        lines.append("  %s: %s," % (key, json.dumps(xml, ensure_ascii=False)))
    lines.append("};")

    target = os.path.join(ROOT, out_path)
    with io.open(target, "w", encoding="utf-8") as handle:
        handle.write("\n".join(lines) + "\n")
    print("%s (%d bytes)" % (out_path, os.path.getsize(target)))


for out_path, export_name, entries, title in BUNDLES:
    build(out_path, export_name, entries, title)
