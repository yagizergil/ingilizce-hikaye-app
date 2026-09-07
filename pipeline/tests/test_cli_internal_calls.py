"""`run()` diğer typer komutlarını (extract/profile/validate/lemmas/publish)
düz Python fonksiyonu olarak çağırıyor — Typer'ın CLI parse katmanından
GEÇMEDEN. Bu durumda atlanan bir parametrenin varsayılanı `bool`/`None`
değil, `typer.Option(...)` NESNESİNİN KENDİSİ olur — ve bu nesne truthy
olduğu için (ör. `explain_offlist_flag`), atlanan bir bayrak "her zaman
True" gibi davranabilir (bkz. profile()'ın run() içinden çağrılırken
`explain_offlist_flag` unutulması — ~18s'lik off-list analizi bayrak hiç
verilmese bile her `pipeline run`'da çalışıyordu).

Bu test, run()'ın çağırdığı her komutun TÜM parametrelerinin run()'ın
kaynak kodunda anahtar kelime argümanı olarak GEÇTİĞİNİ statik olarak
doğrular — bu sınıf bug'ın gelecekte sessizce geri gelmesini önler."""

from __future__ import annotations

import inspect

from src import cli


def _called_kwargs_in_source(source: str, func_name: str) -> set[str]:
    """`func_name(...)` çağrısının parantez içindeki anahtar kelime
    argümanlarını (basit metin taraması ile) çıkarır."""
    marker = f"{func_name}("
    start = source.index(marker) + len(marker)
    depth = 1
    end = start
    while depth > 0:
        if source[end] == "(":
            depth += 1
        elif source[end] == ")":
            depth -= 1
        end += 1
    call_args = source[start : end - 1]
    return {part.split("=")[0].strip() for part in call_args.split(",") if "=" in part}


def test_run_passes_every_parameter_explicitly_to_internal_commands():
    run_source = inspect.getsource(cli.run)

    for command in (cli.extract, cli.profile, cli.validate, cli.lemmas, cli.publish):
        func_name = command.__name__
        expected_params = set(inspect.signature(command).parameters.keys())
        actual_kwargs = _called_kwargs_in_source(run_source, func_name)
        missing = expected_params - actual_kwargs
        assert not missing, (
            f"run() içindeki {func_name}(...) çağrısı şu parametreleri eksik "
            f"geçiyor: {missing}. Typer komutları düz fonksiyon olarak "
            f"çağrıldığında eksik parametreler typer.Option(...) nesnesine "
            f"düşer (bool False değil) ve truthy olabilir — HER parametre "
            f"açıkça geçilmeli."
        )
