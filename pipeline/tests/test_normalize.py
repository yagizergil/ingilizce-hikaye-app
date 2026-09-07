from __future__ import annotations

import pytest

from src.normalize import load_normalization_maps, normalize_text, normalize_word


def test_bre_to_ame_our_suffix(norm_maps):
    normalized, category = normalize_word("colour", norm_maps)
    assert normalized == "color"
    assert category == "bre_ame"


def test_bre_to_ame_our_suffix_exception(norm_maps):
    normalized, category = normalize_word("hour", norm_maps)
    assert normalized == "hour"
    assert category is None


def test_bre_to_ame_ise_suffix(norm_maps):
    normalized, category = normalize_word("realise", norm_maps)
    assert normalized == "realize"
    assert category == "bre_ame"


def test_bre_to_ame_ise_suffix_exception(norm_maps):
    normalized, category = normalize_word("surprise", norm_maps)
    assert normalized == "surprise"
    assert category is None


def test_word_map_towards(norm_maps):
    normalized, category = normalize_word("towards", norm_maps)
    assert normalized == "toward"
    assert category == "bre_ame"


def test_word_map_cannot(norm_maps):
    normalized, category = normalize_word("cannot", norm_maps)
    assert normalized == "can not"
    assert category == "bre_ame"


def test_possessive_stripping(norm_maps):
    normalized, category = normalize_word("father's", norm_maps)
    assert normalized == "father"
    assert category == "possessive"


def test_plural_possessive_stripping(norm_maps):
    normalized, category = normalize_word("boys'", norm_maps)
    assert normalized == "boys"
    assert category == "possessive"


def test_contraction_dont(norm_maps):
    normalized, category = normalize_word("don't", norm_maps)
    assert normalized == "do not"
    assert category == "contraction"


def test_contraction_aint(norm_maps):
    normalized, category = normalize_word("ain't", norm_maps)
    assert normalized == "is not"
    assert category == "contraction"


def test_contraction_wed(norm_maps):
    normalized, category = normalize_word("we'd", norm_maps)
    assert normalized == "we would"
    assert category == "contraction"


def test_eye_dialect_goin(norm_maps):
    normalized, category = normalize_word("goin'", norm_maps)
    assert normalized == "going"
    assert category == "eye_dialect"


def test_eye_dialect_o(norm_maps):
    normalized, category = normalize_word("o'", norm_maps)
    assert normalized == "of"
    assert category == "eye_dialect"


def test_eye_dialect_em(norm_maps):
    normalized, category = normalize_word("'em", norm_maps)
    assert normalized == "them"
    assert category == "eye_dialect"


def test_eye_dialect_ast(norm_maps):
    normalized, category = normalize_word("ast", norm_maps)
    assert normalized == "asked"
    assert category == "eye_dialect"


def test_eye_dialect_knowed(norm_maps):
    normalized, category = normalize_word("knowed", norm_maps)
    assert normalized == "knew"
    assert category == "eye_dialect"


def test_eye_dialect_acrost(norm_maps):
    normalized, category = normalize_word("acrost", norm_maps)
    assert normalized == "across"
    assert category == "eye_dialect"


def test_eye_dialect_yor(norm_maps):
    normalized, category = normalize_word("yor", norm_maps)
    assert normalized == "your"
    assert category == "eye_dialect"


def test_eye_dialect_wile(norm_maps):
    normalized, category = normalize_word("w'ile", norm_maps)
    assert normalized == "while"
    assert category == "eye_dialect"


def test_unrecognized_word_passes_through(norm_maps):
    normalized, category = normalize_word("elephant", norm_maps)
    assert normalized == "elephant"
    assert category is None


def test_normalize_text_counts_dialect_hits(norm_maps):
    result = normalize_text("He was goin' to the store, ast his mother.", norm_maps)
    assert result.dialect_hits == 2
    assert "going" in result.text
    assert "asked" in result.text


def test_normalize_text_curly_apostrophe(norm_maps):
    result = normalize_text("It’s father’s book.", norm_maps)
    assert "it is" in result.text
    assert "father" in result.text


def test_normalize_text_preserves_leading_and_trailing_apostrophes_for_lookup(norm_maps):
    """Regresyon testi: eski tokenization regex'i kelime başı/sonu
    apostrofu (goin', 'em, o') sözlüğe bakmadan ÖNCE düşürüyordu, bu
    yüzden eye_dialect eşleşmesi hiç denenmiyordu ve dialect_ratio
    sistematik olarak düşük çıkıyordu (bkz. Gullible's Travels reddi)."""
    result = normalize_text("goin' o' 'em nothin'", norm_maps)
    assert "going" in result.text
    assert "of" in result.text
    assert "them" in result.text
    assert "nothing" in result.text
    assert result.dialect_hits == 4


def test_every_eye_dialect_dictionary_word_is_counted_via_normalize_text(norm_maps):
    """Sözlükten (normalize_word ile değil, gerçek normalize_text akışıyla)
    çevrilen HER eye_dialect kelimesi dialect_hits'e sayılmalı — bu,
    normalize_word'ün tek başına doğru çalışması yetmez, tokenization'ın
    da apostrofu sözlük eşleşmesine kadar koruması gerektiğini doğrular."""
    sample_words = ["goin'", "talkin'", "nothin'", "o'", "'em", "ast", "knowed", "hisself"]
    text = " ".join(sample_words)
    result = normalize_text(text, norm_maps)
    assert result.dialect_hits == len(sample_words)


def test_ing_apostrophe_fallback_for_words_not_in_dictionary(norm_maps):
    """Sözlükte tek tek girilmemiş bir "-in'" formu için genel kural
    devreye girmeli (sözlüğe her yeni ağız kelimesi eklemek zorunda
    kalınmasın)."""
    normalized, category = normalize_word("swimmin'", norm_maps)
    assert normalized == "swimming"
    assert category == "eye_dialect"


def test_dialect_heavy_sentence_reference_case(norm_maps):
    """Kullanıcının verdiği referans cümle: 6 ağız formu (goin', talkin',
    hisself, ast, knowed, nothin'), he'd bir contraction'dır ve dialect
    sayılmamalı."""
    text = (
        "He was goin' down the road, talkin' to hisself, ast his mother for money, "
        "and knowed he'd get nothin'."
    )
    result = normalize_text(text, norm_maps)
    assert result.dialect_hits == 6


def test_yaml_boolean_trap_word_map(tmp_path):
    bad_yaml = tmp_path / "bad.yaml"
    bad_yaml.write_text("word_map:\n  nay: no\n", encoding="utf-8")
    with pytest.raises(ValueError, match="boolean"):
        load_normalization_maps(path=bad_yaml)


def test_yaml_boolean_trap_top_level_key(tmp_path):
    bad_yaml = tmp_path / "bad2.yaml"
    bad_yaml.write_text("eye_dialect:\n  yes: something\n", encoding="utf-8")
    with pytest.raises(ValueError, match="boolean"):
        load_normalization_maps(path=bad_yaml)


def test_real_normalization_yaml_has_no_boolean_traps(norm_maps):
    # norm_maps fixture'ının başarıyla yüklenmesi zaten kanıt, ama sinyal
    # amaçlı: gerçek dosyada bilinen tuzak kelimeler artık doğru string.
    normalized, category = normalize_word("nay", norm_maps)
    assert normalized == "no"
    assert category == "eye_dialect"

    normalized, category = normalize_word("aye", norm_maps)
    assert normalized == "yes"
    assert category == "eye_dialect"


def test_word_map_direction_is_dialect_to_standard_not_reversed(norm_maps):
    """Yön testi: sözlükte 'yor: your' yazıyor (ağız formu -> standart
    form). normalize_word standart bir kelimeyi ("your") DEĞİŞTİRMEMELİ,
    sadece ağız formunu ("yor") standart forma çevirmeli. Bu ters
    dönseydi normalize_word("your") "yor" döndürürdü."""
    normalized, category = normalize_word("your", norm_maps)
    assert normalized == "your"
    assert category is None

    normalized, category = normalize_word("yor", norm_maps)
    assert normalized == "your"
    assert category == "eye_dialect"


def test_our_suffix_does_not_mangle_your(norm_maps):
    """Regresyon: 'your' -our-> 'yor' bug'ı. 'your' bir BrE -our eki
    değil, kelimenin kendisi tesadüfen 'our' ile bitiyor. -in' fallback
    kuralı ile aynı kategori hatası; istisna listesine 'your' eklendi."""
    normalized, category = normalize_word("your", norm_maps)
    assert normalized == "your"
    assert category is None


def test_ise_suffix_does_not_mangle_words_ending_in_ise_naturally(norm_maps):
    """Regresyon: rise->rize, arise->arize, raise->raize,
    enterprise->enterprize. Bunlar -ise BrE eki değil, kelimenin kendisi
    -ise ile bitiyor."""
    for word in ("rise", "arise", "raise", "enterprise"):
        normalized, category = normalize_word(word, norm_maps)
        assert normalized == word, f"{word} değişmemeliydi, {normalized} oldu"
        assert category is None


def test_bre_words_still_normalize_correctly_after_exception_additions(norm_maps):
    """Yeni istisnalar (your, rise, arise, raise, enterprise) gerçek BrE
    kelimelerini bozmamalı."""
    for word, expected in (
        ("realise", "realize"),
        ("honour", "honor"),
        ("labour", "labor"),
        ("favourite", "favorite"),
    ):
        normalized, category = normalize_word(word, norm_maps)
        assert normalized == expected
        assert category == "bre_ame"


def test_is_known_gate_rejects_suffix_result_not_in_dictionary(norm_maps):
    """is_known verilirse, suffix dönüşümü SADECE sonuç bilinen bir
    kelimeyse kabul edilir — bu, istisna listesi bakımı gerektirmeyen
    genel çözüm (BUG A/B'nin asıl kalıcı düzeltmesi)."""
    known_words = {"toward", "realize", "your"}

    def is_known(word: str) -> bool:
        return word in known_words

    # "yor" bilinmiyor -> "our"->"or" kuralı reddedilmeli, kelime
    # değişmeden dönmeli (aşağı akışta hâlâ off-list kalır, ama en
    # azından anlamsız bir kelimeye dönüştürülmez).
    normalized, category = normalize_word("yor", norm_maps, is_known)
    # "yor" zaten eye_dialect sözlüğünde birebir var, is_known suffix
    # kuralını hiç etkilemez (eye_dialect kontrolü daha önce yapılır).
    assert normalized == "your"
    assert category == "eye_dialect"

    # Sözlükte hiç olmayan uydurma bir "-our" kelimesi: sonuç bilinmediği
    # için dönüştürülmemeli.
    normalized, category = normalize_word("glamour", norm_maps, is_known)
    assert normalized == "glamour"  # zaten exceptions listesinde
    assert category is None
