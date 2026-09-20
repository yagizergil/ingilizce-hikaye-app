# "Kelimelerim" ekranı yeniden tasarımı + özel desteler (1.0.3)

## Amaç

Bugün "Kelimelerim" yalnızca kitaplardan kaydedilen kelimelerin düz bir
listesi (`all/due/known` filtresi + SRS "tekrar et" CTA'sı). Kullanıcı
kendi kelime destesini oluşturamıyor, ekranın kendisi de referans
tasarım sistemine göre en az güncellenmiş yüzeylerden biri.

Bu round üç şeyi birden yapıyor:

1. Kullanıcının kendi kelime destelerini oluşturup çalışabilmesi
   (tamamen ücretsiz — ürün ilkesi #2).
2. Ekranın baştan, profesyonel bir bilgi mimarisiyle tasarlanması.
3. Üç yeni premium vaat: hazır konu desteleri, özel kelimeye AI örnek
   cümle, haftalık "unuttuğun kelimeler" kartı.

## Kapsam dışı / dokunulmayan

- Mevcut kitap-kelimesi SRS akışı (`user_lemma_state`, `srs_reviews`,
  `/review` ekranı) — **değişmiyor**, yalnızca genişletiliyor (aşağıya
  bak).
- Kelime telaffuzu — ADR-012 gereği her zaman ücretsiz; özel kelimelerde
  de aynı `expo-speech` motoruyla ücretsiz çalışacak. Premium olan
  yalnızca AI örnek cümlesi.

## Veri modeli (migration 045)

İki yeni tablo, kitap kelimelerinin SRS altyapısına DOKUNMADAN:

```sql
custom_decks (
  id uuid pk,
  user_id uuid references auth.users,
  name text not null,
  color_key text not null,        -- önceden tanımlı 8 renkten biri (rozet/ikon)
  source text not null default 'user',  -- 'user' | 'pack' (bkz. aşağı)
  pack_template_id uuid null references deck_pack_templates(id),
  created_at timestamptz default now()
)

custom_deck_cards (
  id uuid pk,
  deck_id uuid references custom_decks on delete cascade,
  surface text not null,           -- kullanıcının yazdığı kelime/ifade
  meaning text not null,           -- karşılık (kullanıcı yazıyor, serbest metin)
  example_sentence text null,      -- premium AI üretimi ya da kullanıcı kendi yazabilir
  -- SRS zamanlaması KİTAP kelimelerinden BAĞIMSIZ, kendi SM-2 durumu:
  ease_factor real not null default 2.5,
  interval_days int not null default 0,
  repetitions int not null default 0,
  due_at timestamptz not null default now(),
  created_at timestamptz default now()
)
```

**Neden ayrı tablo, `user_lemma_state`'e entegre değil:** o tablo gerçek
sözlük lemma'larına (`lemmas.lemma`) bağlı ve zaten bilinen bir
belirsizliği var (aynı lemma iki `pos`'ta iki state'e düşebiliyor, bkz.
CLAUDE.md "HÂLÂ AÇIK"). Kullanıcının serbest yazdığı bir ifadeyi
("get the hang of it" gibi çok kelimeli bir deyim de olabilir) o şemaya
zorlamak hem bu belirsizliği büyütür hem de var olan SRS'i riske atar.
Ayrı tablo + `/review` ekranının iki kaynağı UNION ile birleştirmesi
("kitap kelimeleri" + "deste kartları", her ikisi de kendi `due_at`'ine
göre sıralanıp aynı oturumda karşına geliyor) daha güvenli.

**RLS:** her iki tablo da `user_id`/`deck_id` üzerinden `auth.uid()`
kapsamlı select/insert/update/delete policy'leriyle geliyor — ADR-009'un
"tek yazar" deseni burada geçerli DEĞİL, çünkü bu tamamen kullanıcının
kendi içeriği (ödeme/yetki değil).

### Hazır paketler (Faz 2)

```sql
deck_pack_templates (
  id uuid pk,
  slug text unique,
  title_key text not null,        -- i18n anahtarı (paket adı 10 dilde)
  description_key text not null,
  color_key text not null,
  is_premium boolean not null default true,
  target_language text not null,  -- hangi hedef dilde (ADR-013 uyumlu)
  created_at timestamptz default now()
)

deck_pack_template_words (
  id uuid pk,
  pack_id uuid references deck_pack_templates on delete cascade,
  surface text not null,
  meaning_key text not null,      -- karşılık da i18n'den (10 dilde önceden çevrilmiş)
  example_sentence text null,
  order_index int not null
)
```

Bir pakete "Ekle" basınca `custom_decks` altında `source='pack'` yeni bir
deste açılıp `deck_pack_template_words` kopyalanıyor (kullanıcı sonradan
düzenleyebiliyor/silebiliyor — kendi kopyası, şablon değişse de
etkilenmiyor).

## Ekran mimarisi

Üst segment kontrolü üç sekmeye çıkıyor (şu anki iki filtre yerine):

```
[ Kelimelerim ]  [ Destelerim ]  [ Keşfet ]
```

- **Kelimelerim**: bugünkü ekranın kendisi (kitap kelimeleri, all/due/known
  alt-filtresi kayboluyor, üç ayrı çip yerine tek bir küçük filtre
  satırında kalıyor).
- **Destelerim**: kullanıcının oluşturduğu desteler, kart görünümünde
  (renk rozeti, kelime sayısı, "bugün N kelime hazır" rozeti). Sağ altta
  FAB (+) → "Yeni Deste" modalı (isim + renk seç). Bir desteye dokununca
  deste detayına gidiliyor: kelime listesi + "Kelime Ekle" (kelime,
  karşılık, opsiyonel örnek cümle alanı — boşsa ve premiumsa "AI ile
  öner" düğmesi) + "Bu desteyi çalış" (yalnızca bu destenin kartlarını
  SRS'e sokan filtrelenmiş review).
- **Keşfet**: `deck_pack_templates` listesi, kart görünümü, kilitli
  paketlerde küçük bir "Premium" rozeti (kilit ikonu YOK — CLAUDE.md'nin
  "kilitli görünen düğme" yasağı reader'a özel ama burada da aynı ruhu
  koruyoruz: rozet bilgilendirici, dokununca doğrudan paywall'a gidiyor,
  arızalıymış gibi durmuyor).

Üstte, sekmelerin üzerinde tek bir istatistik şeridi kalıyor (toplam
kelime + bugün tekrar + varsa "unuttuğun kelimeler" premium kartı —
Faz 4).

## Fazlar

1. **Faz 1 (bu round, hemen):** migration 045 (`custom_decks`,
   `custom_deck_cards`), deste CRUD ekranları, deste içi kelime
   ekleme/düzenleme/silme, deste-taramalı SRS review, üç sekmeli yeniden
   tasarım, 10 dilde i18n, testler.
2. **Faz 2:** `deck_pack_templates` şeması + gerçek içerik (en az 5 paket,
   her biri 30-50 kelime, hedef dile göre) + Keşfet sekmesi + premium
   kapı + "pakete ekle" akışı.
3. **Faz 3:** özel kart eklerken AI örnek cümle üretimi (var olan
   `translate-sentence` edge function'ının deseni tekrar kullanılıyor,
   premium kotasına bağlı).
4. **Faz 4:** haftalık "en çok unuttuğun kelimeler" kartı (SRS geçmişinden
   türetilen salt-okunur bir özet, premium).

Faz 1'i şimdi kodluyorum. Faz 2 gerçek içerik üretimi gerektirdiği için
(paket başına 30-50 gerçek kelime + 10 dilde çeviri) ayrı bir adım —
iskeleti kurup içerik doldurmayı senin onayınla ilerleteceğim.
