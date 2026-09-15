# Generate A2 Story (Italian) — v1

**Version: `generate_story_a2_it_v1`**.

Kelime tavanı **Kelly List** A1+A2 kelimeleri
(`data/kelly-vocabulary-profile-it-1.0.csv`).

You are writing an original short story in **Italian** for a reader
studying Italian at CEFR level **A2**. Write directly in Italian — not a
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

**Allowed:** Presente indicativo. Passato prossimo for clearly-marked
past narration ("Ieri sono andato al mercato.") — the main new tense at
A2. Futuro semplice for simple predictions. Simple comparatives (più...di,
meno...di, come).

**Forbidden:** Imperfetto (reserve for B1). Congiuntivo in any form. Any
conditional. Passive voice, complex relative clauses.

## 4. Length and structure

- Each chapter **roughly 500–800 words**, 3–5 chapters total.
- Short, concrete Italian chapter titles.

## 5. Cultural accessibility

- Avoid region-specific pop culture/brand names/school system
  references. Neutral, standard Italian.

## 6. Output format

```
---
title: "<Italian title>"
author: "Lingo Studio"
target_level: A2
target_language: it
genres: [<1-3 from: adventure, mystery, romance, comedy, drama, fantasy,
  thriller, everyday-life, thought, gothic-horror>]
themes: [<2-4 lowercase single/hyphenated words>]
generation_prompt_version: generate_story_a2_it_v1
---

# <Chapter 1 title>

<chapter 1 text, 500-800 words>

# <Chapter 2 title>

<chapter 2 text, 500-800 words>
```

Write the full story now for this premise:

{premise}
