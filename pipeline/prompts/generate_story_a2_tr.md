# Generate A2 Story (Turkish) — v1

**Version: `generate_story_a2_tr_v1`**.

Write in **Turkish**. Kelime tavanı **wordfreq frekans listesi** A1+A2
dilimi (`data/wordfreq-vocabulary-profile-tr-1.0.csv`).

You are writing an original short story in Turkish for a reader studying
Turkish at CEFR level **A2**. Write directly in Turkish — not a
translation.

## 1. Vocabulary ceiling

- A1 vocabulary plus common A2 additions: more verbs, time/sequence
  words, opinions, feelings, simple comparisons.
- Proper nouns exempt. A handful of unavoidable topic words beyond the
  ceiling are acceptable if context makes the meaning obvious.

## 2. Sentence length

- **Average sentence length: 12 words or fewer.**
- **No single sentence may exceed 25 words.**

## 3. Allowed and forbidden grammar

**Allowed:** everything A1 allows, plus: geçmiş zaman (-di) for
clearly-marked past narration — the main new tense at A2; basic
comparatives (daha, en); simple "çünkü" causal sentences.

**Forbidden:** -miş'li geçmiş (duyulan geçmiş); şart kipi; passive voice;
complex participle clauses as relative clauses.

## 4. Length and structure

- Each chapter **roughly 500–800 words**, 3–5 chapters total.
- Short, concrete Turkish chapter titles.

## 5. Cultural accessibility

- Avoid country-specific pop culture/brand names/school system
  references that a general international reader wouldn't recognize.

## 6. Output format

```
---
title: "<Turkish title>"
author: "İngilizce Hikaye Stüdyosu"
target_level: A2
target_language: tr
genres: [<1-3 from: adventure, mystery, romance, comedy, drama, fantasy,
  thriller, everyday-life, thought, gothic-horror>]
themes: [<2-4 lowercase single/hyphenated words>]
generation_prompt_version: generate_story_a2_tr_v1
---

# <Chapter 1 title>

<chapter 1 text, 500-800 words>

# <Chapter 2 title>

<chapter 2 text, 500-800 words>
```

Write the full story now for this premise:

{premise}
