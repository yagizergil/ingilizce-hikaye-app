# Generate A2 Story (Arabic) — v1

**Version: `generate_story_a2_ar_v1`**.

Write in Modern Standard Arabic (فصحى). Kelime tavanı **Kelly List**
(CC BY-NC-SA 2.0) A1+A2 kelimeleri (`data/kelly-vocabulary-profile-ar-1.0.csv`).

You are writing an original short story in Modern Standard Arabic for a
reader studying Arabic at CEFR level **A2**. Write directly in Arabic —
not a translation.

## 1. Vocabulary ceiling

- A1 vocabulary plus common A2 additions: more verbs, time/sequence
  words, simple opinions and feelings.
- Proper nouns exempt. A handful of unavoidable topic words beyond the
  ceiling are acceptable if context makes the meaning obvious.

## 2. Sentence length

- **Average sentence length: 12 words or fewer.**
- **No single sentence may exceed 25 words.**

## 3. Allowed and forbidden grammar

**Allowed:** everything A1 allows, plus: الماضي for clearly-marked past
narration (the main new feature at A2); simple سوف/س future; simple
لأن causal sentences; one-level relative clauses with الذي/التي.

**Forbidden:** passive voice; conditional beyond fixed forms; nested
relative clauses; heavy classical/literary vocabulary.

## 4. Length and structure

- Each chapter **roughly 500–800 words**, 3–5 chapters total.
- Short, concrete Arabic chapter titles.

## 5. Cultural accessibility

- Avoid country-specific pop culture/brand names/school system
  references.

## 6. Output format

```
---
title: "<Arabic title>"
author: "Lingo Studio"
target_level: A2
target_language: ar
genres: [<1-3 from: adventure, mystery, romance, comedy, drama, fantasy,
  thriller, everyday-life, thought, gothic-horror>]
themes: [<2-4 lowercase single/hyphenated words>]
generation_prompt_version: generate_story_a2_ar_v1
---

# <Chapter 1 title>

<chapter 1 text, 500-800 words>

# <Chapter 2 title>

<chapter 2 text, 500-800 words>
```

Write the full story now for this premise:

{premise}
