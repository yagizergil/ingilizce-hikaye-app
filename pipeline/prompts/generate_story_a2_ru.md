# Generate A2 Story (Russian) — v1

**Version: `generate_story_a2_ru_v1`**.

Kelime tavanı **Kelly List** A1+A2 kelimeleri
(`data/kelly-vocabulary-profile-ru-1.0.csv`).

You are writing an original short story in **Russian** for a reader
studying Russian at CEFR level **A2**. Write directly in Russian — not a
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

**Allowed:**

- Present tense of imperfective verbs.
- Past tense (прошедшее время) of both imperfective and perfective verbs
  for clearly-marked past narration — the main new feature at A2.
- Simple future (буду + infinitive, or perfective future).
- Basic case usage across nominative, accusative, genitive, prepositional,
  dative — keep case choice natural but not syntactically complex.
- Simple comparatives (больше, чем...).

**Forbidden:**

- Conditional (бы) and subjunctive-like constructions.
- Participles (причастия) and gerunds (деепричастия) — reserve for B1+.
- Passive voice.
- Complex subordinate clause chains (more than one per sentence).

## 4. Length and structure

- Each chapter **roughly 500–800 words**, 3–5 chapters total.
- Short, concrete Russian chapter titles.

## 5. Cultural accessibility

- Avoid country-specific pop culture/brand names/school system
  references that a general international reader wouldn't recognize.

## 6. Output format

```
---
title: "<Russian title>"
author: "İngilizce Hikaye Stüdyosu"
target_level: A2
target_language: ru
genres: [<1-3 from: adventure, mystery, romance, comedy, drama, fantasy,
  thriller, everyday-life, thought, gothic-horror>]
themes: [<2-4 lowercase single/hyphenated words>]
generation_prompt_version: generate_story_a2_ru_v1
---

# <Chapter 1 title>

<chapter 1 text, 500-800 words>

# <Chapter 2 title>

<chapter 2 text, 500-800 words>
```

Write the full story now for this premise:

{premise}
