# Generate B1 Story (Arabic) — v1

**Version: `generate_story_b1_ar_v1`**.

Write in Modern Standard Arabic (فصحى). Kelime tavanı **Kelly List**
A1+A2+B1 kelimeleri (`data/kelly-vocabulary-profile-ar-1.0.csv`).

You are writing an original short story in Modern Standard Arabic for a
reader studying Arabic at CEFR level **B1**. Write directly in Arabic —
not a translation. Roughly twice as long as the A2 prompt.

## 1. Vocabulary ceiling

- A1+A2 vocabulary plus common B1 additions: opinions, hypotheticals,
  more abstract everyday topics.
- Proper nouns exempt.

## 2. Sentence length (WITH A FLOOR)

- **Average sentence length: between 11 and 17 words.** A story averaging
  under 11 is structurally A2 — REJECTED even if it looks safe.
- **No single sentence may exceed 30 words.**

## 3. Allowed and forbidden grammar

**Allowed — everything A2 allows, plus:** الماضي المستمر (كان يفعل)
narration; simple إذا conditional sentences (فعل الشرط بسيط); one-level
nested relative clauses; simple لو for unreal past conditions (fixed
expressions).

**Forbidden:** heavy classical/literary register; passive voice beyond
the simplest fixed forms; complex إعراب-dependent constructions.

## 4. Length and structure

- Each chapter **roughly 500–800 words**, 3–5 chapters total.
- Short, concrete Arabic chapter titles.

## 5. Plot mechanics (required)

- Concrete, visible WANT for the main character.
- A concrete OBSTACLE.
- One genuine complication or turn.
- Resolution earned through the character's own actions.

## 6. Cultural accessibility

- Avoid country-specific pop culture/brand names/school system
  references.

## 7. Output format

```
---
title: "<Arabic title>"
author: "İngilizce Hikaye Stüdyosu"
target_level: B1
target_language: ar
genres: [<1-3 from: adventure, mystery, romance, comedy, drama, fantasy,
  thriller, everyday-life, thought, gothic-horror>]
themes: [<2-4 lowercase single/hyphenated words>]
generation_prompt_version: generate_story_b1_ar_v1
---

# <Chapter 1 title>

<chapter 1 text, 500-800 words>

# <Chapter 2 title>

<chapter 2 text, 500-800 words>
```

Write the full story now for this premise:

{premise}
