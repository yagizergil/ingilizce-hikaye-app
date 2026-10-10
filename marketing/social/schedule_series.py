"""out/post02..post15'i her gün 20:00 (TR, 17:00 UTC) birer birer planlar; her posta farklı trend müzik."""
import datetime, json, os, pathlib, time
import pf

# Eğitim içeriğine uyan neşeli/sakin parçalar (TikTok ticari müzik kütüphanesinden, isimle seçilir).
WANT = ["Ok I Like It", "Fashionable + cute + city pop", "Casual Swinging", "Sunset in Girona",
        "Oceanside", "Jazz with a warm atmosphere", "Early afternoon, relaxing"]
pool = pf.call("GET", f"/social-media/{pf.LINGO}/tiktok-sounds")
sounds = [s["musicSoundId"] for w in WANT for s in pool if s["name"].startswith(w)]
start = datetime.date(2026, 10, 15)  # 8-14 Ekim: telefondan ısınma haftası (telefon-paketi)
for i, n in enumerate(range(8, 38)):
    d = pathlib.Path("out") / f"post{n:02d}"
    files = sorted(d.glob("s[0-9]*.jpg"), key=lambda p: int(p.stem[1:]))
    when = f"{start + datetime.timedelta(days=i)}T17:00:00Z"
    if n < int(os.environ.get("FROM", "0")):
        continue
    for attempt in range(5):  # ağ kopmalarında yeniden dene
        try:
            r = pf.post(files, (d / "caption.txt").read_text(encoding="utf-8").strip(), when, sounds[i % len(sounds)])
            break
        except OSError as e:
            print("retry", d.name, e, flush=True)
            time.sleep(5 * (attempt + 1))
    else:
        raise SystemExit(f"{d.name} planlanamadı")
    print(d.name, when, json.dumps(r), flush=True)
