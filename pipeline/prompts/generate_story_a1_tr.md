# Generate A1 Story (Turkish) — v1

**Version: `generate_story_a1_tr_v1`**.

Write in **Turkish**. Kelime tavanı **wordfreq frekans listesi** (MIT
lisans, rspeer/wordfreq) A1 dilimi
(`data/wordfreq-vocabulary-profile-tr-1.0.csv`) — bu, gerçek bir CEFR
listesi DEĞİL, en sık kullanılan ~1500 kelimeye dayalı bir yaklaşıklık.

You are writing an original short story in Turkish for a reader studying
Turkish at CEFR level **A1**. Write directly in Turkish — not a
translation.

## 1. Vocabulary ceiling

- Use only the most basic, high-frequency Turkish words: basic verbs
  (olmak, gitmek, yapmak, istemek, gelmek, sevmek...), everyday nouns
  (ev, aile, yemek, gün, su, iş...), common adjectives (iyi, büyük,
  küçük, mutlu...).
- Proper nouns (names) are exempt but keep them simple.
- Avoid rare/literary vocabulary entirely at this level.
- **Avoid long agglutinated word forms** — Turkish can stack many
  suffixes onto one word; at A1, prefer shorter, simpler suffix chains
  (e.g. "evimizdekiler" is too complex for A1).

## 2. Sentence length (hard constraints)

- **Average sentence length: 8 words or fewer** (whitespace tokenization).
- **No single sentence may exceed 15 words.**
- Short, simple SOV sentences. Avoid subordinate clauses almost entirely.

## 3. Allowed and forbidden grammar

**Allowed only:**

- Şimdiki zaman (-yor): "Eve gidiyor."
- Geniş zaman for habitual/general truths: "Her gün süt içer."
- Basit gelecek zaman (-ecek/-acak), sparingly.
- Var/yok, basic postpositions (için, ile, gibi).

**Explicitly forbidden:**

- Geçmiş zaman (-di, -miş) — too advanced for A1; tell flashbacks as a
  new present-tense scene instead.
- Şart kipi (-se/-sa) and dilek kipi.
- Passive voice (-il/-in).
- Complex participle clauses (-dığı, -acağı as relative clauses).

## 4. Length and structure

- Each chapter (each `# ` section) should be **roughly 250–400 words**.
  A typical A1 story has 2–4 chapters.
- Give each chapter a short, concrete Turkish title.

## 5. Cultural accessibility

- Avoid references specific to one country's pop culture, brand names,
  or school system that a general international reader wouldn't
  recognize. Universal, concrete details preferred.

## 6. Output format

Output ONLY the story in this exact Markdown structure — no commentary
before or after:

```
---
title: "<Turkish title>"
author: "İngilizce Hikaye Stüdyosu"
target_level: A1
target_language: tr
genres: [<1-3 from: adventure, mystery, romance, comedy, drama, fantasy,
  thriller, everyday-life, thought, gothic-horror>]
themes: [<2-4 lowercase single/hyphenated words>]
generation_prompt_version: generate_story_a1_tr_v1
---

# <Chapter 1 title>

<chapter 1 text, 250-400 words>

# <Chapter 2 title>

<chapter 2 text, 250-400 words>
```

Write the full story now for this premise:

{premise}
