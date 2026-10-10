"""PostFast yardımcıları: görsel yükle + carousel planla.

Anahtar dosyada TUTULMAZ: POSTFAST_API_KEY ortam değişkeninden okunur.
Kullanım: python pf.py <post klasörü> [scheduledAt ISO, UTC]
"""
import datetime
import json
import os
import pathlib
import sys
import urllib.error
import urllib.request

LINGO = "8798b9d1-d929-47e2-a1e8-5022bed36868"  # @lingo.ingilizce
API = "https://api.postfa.st"


def call(method, path, body=None):
    req = urllib.request.Request(
        API + path,
        method=method,
        data=json.dumps(body).encode() if body is not None else None,
        headers={"pf-api-key": os.environ["POSTFAST_API_KEY"], "Content-Type": "application/json"},
    )
    try:
        with urllib.request.urlopen(req) as r:
            return json.loads(r.read() or b"null")
    except urllib.error.HTTPError as e:
        raise SystemExit(f"{e.code} {e.read().decode()}")


def upload(files):
    urls = call("POST", "/file/get-signed-upload-urls", {"contentType": "image/jpeg", "count": len(files)})
    keys = []
    for f, u in zip(files, urls):
        req = urllib.request.Request(u["signedUrl"], method="PUT", data=pathlib.Path(f).read_bytes(),
                                     headers={"Content-Type": "image/jpeg"})
        urllib.request.urlopen(req).read()
        keys.append(u["key"])
    return keys


def post(files, caption, when=None, sound=None):
    keys = upload(files)
    when = when or (datetime.datetime.now(datetime.timezone.utc) + datetime.timedelta(minutes=2)).strftime("%Y-%m-%dT%H:%M:%SZ")
    body = {"posts": [{"socialMediaId": LINGO, "content": caption, "scheduledAt": when,
                       "mediaItems": [{"key": k, "type": "IMAGE", "sortOrder": i} for i, k in enumerate(keys)]}]}
    # TikTok ayarları istek düzeyinde (PostFast dokümanı: controls tüm posts[]'a uygulanır).
    body["controls"] = {"tiktokBrandOrganic": True, "tiktokAllowComments": True,
                        "tiktokAllowDuet": True, "tiktokAllowStitch": True}
    if sound:
        body["controls"]["tiktokMusicSoundId"] = sound
    return call("POST", "/social-posts", body)


if __name__ == "__main__":
    d = pathlib.Path(sys.argv[1])
    when = sys.argv[2] if len(sys.argv) > 2 else None
    files = sorted(d.glob("s[0-9]*.jpg"), key=lambda p: int(p.stem[1:]))
    caption = (d / "caption.txt").read_text(encoding="utf-8").strip()
    print(json.dumps(post(files, caption, when), ensure_ascii=False))
