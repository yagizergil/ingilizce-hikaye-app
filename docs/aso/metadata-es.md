# App Store Metadata — İspanyolca (es)

**Tarih:** 15 Eylül 2026
**Pazar:** App Store İspanya **ve** Latin Amerika (MX, AR, CO, CL…)

---

## 0. Tek metin, iki pazar — bilinçli karar

App Store `es-ES` (İspanya) ve `es-MX` (Latin Amerika) için **ayrı**
lokalizasyon kabul ediyor. İlk sürümde **tek bir `es` metni** kullanılacak
ve aşağıdaki metin **nötr İspanyolca** ile yazıldı:

- `vosotros` kullanılmadı (yalnızca İspanya'da doğal).
- `ordenador` / `computadora` gibi bölgesel ayrışan kelimelerden kaçınıldı.
- `móvil` / `celular` ikilemi hiç kullanılmadı (cihaz adı geçmiyor).
- Fiiller `tú` çekiminde — her iki pazarda da doğal.

Latin Amerika ayrı bir lokalizasyona ayrıldığında `es-MX` için
`historias` yerine `cuentos` tercihi ve fiyat noktası ayrıca test edilmeli.

---

## 1. Anahtar kelime araştırması — es pazarına özgü

1. **`aprender inglés` İspanyolca'da başlık normunun ta kendisi.** Ölçüldü:
   Beelinguapp İspanya'da başlığını `Beelinguapp: Aprende Inglés y+` diye
   yeniden yazmış — aynı uygulama Fransa'da "apprendre langues" (genel)
   diyor. İspanyol pazarı da İtalya gibi **özellikle İngilizce** arıyor.
2. **Aksan yazılmıyor.** `inglés` → `ingles` mobilde çok yaygın. İkisi ayrı
   terim gibi davranıyor; alanda aksansız form ayrıca yazıldı.
3. **`lectura graduada`** İspanyolca dil öğretiminde yerleşik terim ve
   neredeyse boş.

| Terim                 | Rekabet                                   | Alaka | Karar                       |
| --------------------- | ----------------------------------------- | ----- | --------------------------- |
| `aprender inglés`     | Aşırı                                     | 0,70  | Kısmen — `aprende` başlıkta |
| `leer en inglés`      | Çok düşük                                 | 1,00  | **Başlıkta**                |
| `lecturas graduadas`  | Neredeyse boş                             | 1,00  | **Altyazıda**               |
| `historias en inglés` | Düşük                                     | 1,00  | Alan                        |
| `vocabulario inglés`  | Orta                                      | 0,85  | Alan                        |
| `diccionario`         | Yüksek                                    | 0,85  | Alan                        |
| `clásicos`            | Düşük                                     | 1,00  | Alan                        |
| `aprender idiomas`    | Aşırı (Busuu, Duolingo, Memrise başlıkta) | 0,60  | **Hedeflenmiyor**           |

---

## 2. Başlık — 30 karakter

```
Inglés: lee y aprende
```

**21/30 karakter.**

## 3. Altyazı — 30 karakter

```
Lecturas graduadas y traducir
```

**29/30 karakter.**

## 4. Anahtar kelime alanı — 100 karakter

```
lectura,historias,cuentos,vocabulario,diccionario,clasicos,novela,nivel,ingles,a1,a2,b1,b2,c1,audio
```

**99/100 karakter.**

- `ingles` **aksansız** olarak ayrıca yazıldı (başlıktaki `Inglés`
  aksanlıdır ve ayrı eşleşiyor).
- `clasicos` da bilinçli aksansız.
- `cuentos` Latin Amerika'da `historias`tan daha doğal — ikisi de var.

## 5. Promosyon metni — 170 karakter

```
Ahora en 10 idiomas. Lee una historia en inglés, toca la palabra que no conozcas y ve su significado en español. Todos los libros son gratis y no hay anuncios al leer.
```

**167/170 karakter.**

## 6. Açıklama — 4000 karakter sınırı

```
Una app de lectura para quien aprende inglés.
Toca una palabra que no conozcas y su significado se abre al instante.
Mantén pulsada una frase y verás la traducción completa.

EMPIEZA EN TU NIVEL
Si estás empezando, hay historias cortas de nivel A1 y A2 que terminas de
una sentada: 6-8 minutos cada una, escritas para esta app. Después vienen
historias B1 de unos 20 minutos y desde ahí los clásicos de la literatura.
El escalón no se rompe en ningún punto. Una breve prueba de vocabulario al
principio te dice por dónde empezar.

APRENDER LEYENDO
Toca una palabra y aparece su significado. Escuchar la pronunciación de
una palabra siempre es gratis. Guarda las palabras que quieras conservar:
la app te las devuelve el día en que empiezas a olvidarlas, junto con la
frase en la que las encontraste. Recordar, no memorizar.

LOS LIBROS SIEMPRE SON GRATIS
Todos los libros, todos los capítulos, lectura ilimitada. Sin anuncios.
Mientras lees nunca verás una interrupción, un banner ni una oferta de
suscripción.

QUÉ INCLUYE LA VERSIÓN GRATIS
- Los 119 libros, lectura ilimitada
- 15 traducciones de palabras al día
- 10 traducciones de frases con IA al día
- Un cuaderno de 100 palabras
- Repetición espaciada, ilimitada
- Estadísticas de lectura
- Pronunciación de palabras, ilimitada
- Lectura sin conexión

QUÉ AÑADE PREMIUM
- Narración de estudio en 63 historias originales, con la palabra hablada
  resaltada en el texto. Los clásicos no tienen narración.
- Traducciones de palabras ilimitadas (desaparece el límite de 15 al día)
- Un cuaderno de palabras ilimitado
- 200 traducciones de frases con IA al día
- Un segundo par de idiomas (el primer par siempre es gratis)

EN 10 IDIOMAS
La interfaz y los significados funcionan en español, inglés, turco,
alemán, francés, italiano, ruso, árabe, chino y japonés. Sea cual sea el
idioma que ya sabes, puedes leer inglés a través de él.

QUÉ HAY DENTRO
- 119 libros e historias
- 63 de ellas historias originales por nivel (A1, A2 y B1)
- 56 obras clásicas (de B1 a C2)
- Un diccionario de inglés de 26.000 palabras
- Traducción de frases
- Lectura sin conexión
- Tema oscuro, tipo y tamaño de letra ajustables

Las obras clásicas provienen de fuentes cuyos derechos han expirado y que
cualquiera puede usar libremente. Las historias por nivel se escribieron
para esta app.
```

## 7. "Yenilikler" — ilk sürüm

```
Primera versión. 119 libros, un diccionario de 26.000 palabras y
63 historias originales de A1 a B1 para empezar en tu nivel.
```

## 8. Kategori ve yaş

| Alan              | Değer     |
| ----------------- | --------- |
| Birincil kategori | Educación |
| İkincil kategori  | Libros    |
| Yaş sınırı        | 4+        |

## 9. Dürüstlük sınırları

- Seslendirme 63 özgün hikâyede, klasiklerde YOK — açıkça yazıldı.
- SRS, istatistik ve telaffuz ücretsiz listede.
- "10 idiomas" arayüz/karşılık dili; "10 dilde kitap" denmedi.
- Sosyal kanıt ve sayısal etkinlik iddiası yok.
- Metin nötr İspanyolca; `es-MX` ayrıldığında yeniden yazılmalı.
