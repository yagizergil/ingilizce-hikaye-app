from __future__ import annotations

from pathlib import Path
from typing import Any

import yaml

from src.models import BookMetrics, ValidationResult
from src.settings import THRESHOLDS_PATH

__all__ = [
    "ValidationResult",
    "load_thresholds",
    "validate_author_death_year",
    "validate_book",
]

# profiler.py'nin CEFR_ORDER'ıyla aynı sıra — burada tekrar tanımlanıyor
# çünkü profiler.py zaten validator.py'yi import ediyor (load_thresholds
# için); tersten bir import döngüsel olurdu.
_CEFR_ORDER = ["A1", "A2", "B1", "B2", "C1", "C2"]
_CEFR_RANK = {level: i for i, level in enumerate(_CEFR_ORDER)}
_TOP_OVERLEVEL_WORDS_LIMIT = 30


def load_thresholds(path: Path = THRESHOLDS_PATH) -> dict[str, Any]:
    with open(path, encoding="utf-8") as f:
        result: dict[str, Any] = yaml.safe_load(f)
        return result


def validate_book(
    metrics: BookMetrics,
    thresholds: dict[str, Any],
    target_level: str | None = None,
    is_adaptation: bool = True,
    total_xhtml_bytes: int | None = None,
    content_type: str = "novel",
    is_original: bool = False,
) -> ValidationResult:
    """İKİ TAMAMEN AYRI denetim modu — karıştırılırlarsa DÖNGÜSEL bir hataya
    düşülür (bir kitabın seviyesi kendi ölçümlerinden TAHMİN edilip, sonra
    o TAHMİN edilen seviyenin KABUL eşiklerine karşı test edilmesi —
    örneğin ham bir kitap B2 olarak tespit edilip sonra "B2 için" tanımlı
    %95 kapsam/60 kelimelik cümle ceza eşiklerine çarpar; hiçbir ham
    klasik metin böyle sıkı bir uyum eşiğini tutturamaz).

    is_adaptation=True: KALİTE denetimi. Metin bilerek bir hedef CEFR
    seviyesi için adapte/basitleştirilmiş — bu durumda hedef seviyenin
    kapsam (`levels.<level>.min_coverage`) ve cümle uzunluğu ceza
    eşiklerini (`max_avg_sentence_length`, `max_sentence_length`)
    TUTTURMASI beklenir; tutturmazsa adaptasyon başarısız demektir,
    REDDEDİLİR. off_list_ratio eşiği de sıkıdır (uyarı %3, red %5).

    is_adaptation=False: YAYINLANABİLİRLİK denetimi. Metin ham bir kaynak
    (klasik roman vb.) — `inferred_level` sadece kitabın METADATA'sında
    hangi seviye etiketiyle gösterileceğine dair bir TAHMİNDİR, bir KABUL
    kriteri DEĞİLDİR; bu yüzden bu modda `levels.*` (kapsam/cümle uzunluğu)
    hiç uygulanmaz. Sadece şunlar kontrol edilir: dialect_ratio (≤%3 ok,
    >%8 otomatik red), off_list_ratio (ham metin için gevşek: ≤%8 sorunsuz,
    %8-12 uyarı, >%12 GÜVENLİK AĞI olarak yine de RED — bozuk parse veya
    gerçekten okunamayacak kadar zor bir metnin işareti), ve metnin boş
    olmadığı (word_count>0, paragraph_count>0 — parse'ın gerçekten
    çalıştığının en temel kanıtı). author_death_year kontrolü her iki
    modda da ayrı bir fonksiyonla (validate_author_death_year) uygulanır —
    bu kalite tercihi değil, telif meselesidir."""
    level = target_level or metrics.inferred_level
    reasons: list[str] = []
    warnings: list[str] = []
    common = thresholds["common"]

    auto_rejected = metrics.dialect_ratio > common["dialect_ratio_auto_reject"]
    if auto_rejected:
        reasons.append(
            f"dialect_ratio %{metrics.dialect_ratio:.2f} > otomatik red eşiği "
            f"%{common['dialect_ratio_auto_reject']} (öğrenciye yanlış İngilizce öğretir)"
        )
    elif metrics.dialect_ratio > common["max_dialect_ratio"]:
        max_allowed = common["max_dialect_ratio"]
        reasons.append(
            f"dialect_ratio %{metrics.dialect_ratio:.2f} > "
            f"izin verilen %{max_allowed}"
        )

    if is_original:
        off_list_key = "original"
        mode_label = "orijinal (üretilmiş) metin"
    elif is_adaptation:
        off_list_key = "adaptation"
        mode_label = "adapte metin"
    else:
        off_list_key = "raw"
        mode_label = "ham kaynak metin"
    off_list_cfg = common["off_list"][off_list_key]
    off_list_max = off_list_cfg["off_list_max"]
    off_list_warn = off_list_cfg["off_list_warn"]

    if metrics.off_list_ratio > off_list_max:
        # Güvenlik ağı — is_adaptation=False olsa bile bunu aşan bir
        # kitap REDDEDİLİR. Ham metinlerde bile %12'nin üzerinde
        # off-list, zengin kelime dağarcığı ile açıklanamayacak kadar
        # yüksektir; bozuk parse veya gerçekten çok zor bir metnin
        # işaretidir.
        reasons.append(
            f"off_list_ratio %{metrics.off_list_ratio:.2f} > izin verilen "
            f"%{off_list_max} ({mode_label})"
        )
    elif metrics.off_list_ratio > off_list_warn:
        warnings.append(
            f"off_list_ratio %{metrics.off_list_ratio:.2f}, %{off_list_warn}'in üzerinde "
            f"(kabul edilebilir üst sınır: %{off_list_max}, {mode_label})"
        )

    # SAĞLIK KONTROLÜ (health check) — is_adaptation'dan BAĞIMSIZ, her iki
    # modda da uygulanır. Amaç: parse'ın SESSİZCE eksik çalıştığı
    # durumları yakalamak (ör. oyun/drama EPUB'larında diyalogun <table>
    # içinde olması, eski <p>-only selector'ün neredeyse hiçbir şeyi
    # yakalamaması — bkz. Lady Windermere's Fan bug'ı). word_count>0
    # kontrolü (aşağıda, is_adaptation=False dalında) bunu YAKALAMAZ,
    # çünkü birkaç yüz kelime bile >0'dır.
    #
    # 1) MUTLAK TABAN: gerçek bir kitap (oyun dahil) bu kadar az kelime
    #    içeremez; altındaysa parse kırık demektir. is_original=True İÇİN
    #    ATLANIR: bu taban (3000 kelime) EPUB tabanlı tam kitaplar/oyunlar
    #    için bir "parse kırık mı" sağlık kontrolü — orijinal, tek
    #    oturumda üretilen bir A1/A2/B1 hikaye (bkz. Task 4 prompt'u,
    #    ~600-900 kelime/bölüm x birkaç bölüm) meşru şekilde 3000
    #    kelimenin altında olabilir; parse'ın kırıldığına dair bir sinyal
    #    değildir (markdown parse'ı zaten yapısal olarak basit/güvenilir,
    #    EPUB'daki gizli <table>/selector kaçırma riskleri burada yok).
    if not is_original:
        min_total_words = common["min_total_word_count"]
        if metrics.word_count < min_total_words:
            reasons.append(
                f"word_count {metrics.word_count} < mutlak taban {min_total_words} "
                "(parse muhtemelen eksik/kırık çalıştı)"
            )

    # 2) ORAN KONTROLÜ: kelime sayısı, EPUB'ın sıkıştırılmamış XHTML
    #    boyutuna göre çok düşükse (kural: her 10KB XHTML metni için en
    #    az min_words_per_10kb_xhtml kelime beklenir), extraction'ın
    #    içeriğin büyük bir kısmını (ör. <table> tabanlı oyun diyaloğu)
    #    ATLADIĞININ işaretidir. total_xhtml_bytes verilmemişse (ör. eski
    #    cache'lenmiş bir ExtractedBook, ya da birim testlerinde
    #    isteğe bağlı) bu kontrol atlanır.
    if total_xhtml_bytes is not None and total_xhtml_bytes > 0:
        min_words_per_10kb = (
            common["min_words_per_10kb_xhtml_play"]
            if content_type == "play"
            else common["min_words_per_10kb_xhtml"]
        )
        expected_min_words = (total_xhtml_bytes / 10_000) * min_words_per_10kb
        if metrics.word_count < expected_min_words:
            reasons.append(
                f"word_count {metrics.word_count}, XHTML boyutuna göre beklenenin "
                f"çok altında (beklenen en az {expected_min_words:.0f}, "
                f"{total_xhtml_bytes} byte XHTML için) — extraction içeriğin bir "
                "kısmını atlamış olabilir (ör. <table> tabanlı oyun diyaloğu)"
            )

    top_overlevel_words: list[tuple[str, str, int]] = []

    if is_adaptation or is_original:
        # KALİTE denetimi: hedef seviyenin yapısal kabul eşikleri
        # (kapsam/cümle uzunluğu) adapte edilmiş VEYA orijinal
        # (is_original) metinlerde uygulanır — ham metinde bunlar sadece
        # TESPİT girdisidir, aşağıdaki else dalına bakın.
        level_cfg = thresholds["levels"].get(level)
        if level_cfg is not None:
            coverage = metrics.cumulative_coverage.get(level, 0.0)
            if coverage < level_cfg["min_coverage"]:
                reasons.append(
                    f"{level} kümülatif kapsamı %{coverage:.2f} < "
                    f"gereken %{level_cfg['min_coverage']} "
                    f"(gerçek: {coverage:.2f}, gereken: {level_cfg['min_coverage']})"
                )
            if metrics.sentence_length.mean > level_cfg["max_avg_sentence_length"]:
                reasons.append(
                    f"ortalama cümle uzunluğu {metrics.sentence_length.mean:.1f} > "
                    f"{level} için izin verilen {level_cfg['max_avg_sentence_length']} "
                    f"(gerçek: {metrics.sentence_length.mean:.1f}, "
                    f"gereken: <= {level_cfg['max_avg_sentence_length']})"
                )
            if metrics.sentence_length.max > level_cfg["max_sentence_length"]:
                reasons.append(
                    f"maksimum cümle uzunluğu {metrics.sentence_length.max} > "
                    f"{level} için izin verilen {level_cfg['max_sentence_length']} "
                    f"(gerçek: {metrics.sentence_length.max}, "
                    f"gereken: <= {level_cfg['max_sentence_length']})"
                )
        # level_cfg None (C1/C2 gibi üst düzey tanımlı değilse): yapısal
        # üst sınır yok, sadece ortak eşikler (off_list, dialect) uygulanır.

        if is_original:
            # Task 3: hedef seviyenin ÜZERİNDEKİ (rank'ı daha yüksek) en
            # sık 30 lemma, gerçek CEFR seviyesiyle birlikte, sıklığa göre
            # azalan sırada — validation raporunun "hangi kelimeler
            # sorunlu" sorusuna somut cevap vermesi için. Off-list
            # (CEFR sözlüğünde hiç olmayan) kelimeler burada AYRICA
            # sayılmaz — onlar zaten off_list_ratio kontrolüyle kapsanıyor.
            target_rank = _CEFR_RANK.get(level)
            if target_rank is not None:
                overlevel = [
                    (lemma, lvl, metrics.lemma_counts.get(lemma, 0))
                    for lemma, lvl in metrics.lemma_levels.items()
                    if lvl is not None and _CEFR_RANK.get(lvl, -1) > target_rank
                ]
                overlevel.sort(key=lambda item: item[2], reverse=True)
                top_overlevel_words = overlevel[:_TOP_OVERLEVEL_WORDS_LIMIT]
    else:
        # YAYINLANABİLİRLİK denetimi: kapsam/cümle uzunluğu burada asla
        # kontrol edilmez (inferred_level'ı üretmek için zaten kullanıldı,
        # tekrar aynı ölçümlere karşı test etmek döngüsel olurdu). Sadece
        # parse'ın gerçekten çalıştığının temel kanıtı kontrol edilir.
        if metrics.word_count <= 0:
            reasons.append(
                "kitapta hiç kelime yok (word_count=0) — parse başarısız olmuş olabilir"
            )
        if metrics.paragraph_count <= 0:
            reasons.append(
                "kitapta hiç paragraf yok (paragraph_count=0) — "
                "parse başarısız olmuş olabilir"
            )

    passed = not reasons and not auto_rejected
    return ValidationResult(
        passed=passed,
        level=level,
        reasons=reasons,
        auto_rejected=auto_rejected,
        warnings=warnings,
        top_overlevel_words=top_overlevel_words,
    )


def validate_author_death_year(
    author_death_year: int | None, thresholds: dict[str, Any]
) -> list[str]:
    reasons: list[str] = []
    max_year = thresholds["copyright"]["max_author_death_year"]
    if author_death_year is None:
        reasons.append(
            "author_death_year belirlenemedi — telif durumu doğrulanamadan yayınlanamaz"
        )
    elif author_death_year > max_year:
        reasons.append(
            f"yazar {author_death_year} yılında öldü, {max_year} sınırının üzerinde "
            "(TR/AB ölüm+70 kuralı) — public domain değil, reddedildi"
        )
    return reasons
