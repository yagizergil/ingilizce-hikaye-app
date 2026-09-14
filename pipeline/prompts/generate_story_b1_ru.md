# Generate B1 Story (Russian) — v1

**Version: `generate_story_b1_ru_v1`**.

Kelime tavanı **Kelly List** (CC BY-NC-SA 2.0) A1+A2+B1 kelimeleri
(`data/kelly-vocabulary-profile-ru-1.0.csv`).

You are writing an original short story in **Russian** for a reader
studying Russian at CEFR level **B1**. Write directly in Russian — not a
translation. Roughly twice as long as the A2 prompt, and should feel like
a real step up, not a longer A2 story.

## 1. Vocabulary ceiling

- A1+A2 vocabulary plus common B1 additions: opinions, hypotheticals,
  more abstract everyday topics (work, relationships, plans, regrets).
- Proper nouns exempt. A handful of unavoidable topic words beyond the
  ceiling are acceptable if context makes the meaning obvious.

## 2. Sentence length (hard constraints, WITH A FLOOR)

- **Average sentence length: between 13 and 17 words.** A story averaging
  under 13 is structurally A2 with harder vocabulary — REJECTED even if
  it looks safe. Join related clauses instead of splitting every idea.
- **No single sentence may exceed 30 words.**
- Vary sentence rhythm.

## 3. Allowed and forbidden grammar

**Allowed — everything A2 allows, plus:**

- Both aspects (perfective/imperfective) used naturally and contrastively
  in past and future.
- Genitive, dative, instrumental cases used more freely and naturally.
- Simple participial-free relative clauses with который.
- Short reported speech.

**Still forbidden:**

- Participles (причастия) and gerunds (деепричастия) — reserve for B2+.
- Conditional/subjunctive-like constructions with бы beyond the most
  fixed expressions.
- Passive voice with -ся beyond common fixed uses.

## 4. Length and structure

- Each chapter **roughly 550–800 words**, 3–5 chapters total —
  **1,800–3,200 words** overall.
- Short, concrete Russian chapter titles.

## 5. Plot mechanics (required)

- Concrete, visible WANT for the main character.
- A concrete OBSTACLE.
- One genuine complication or turn.
- Resolution earned through the character's own actions.

## 6. Cultural accessibility

- Avoid country-specific pop culture/brand names/school system
  references that a general international reader wouldn't recognize.

## 7. Output format

```
---
title: "<Russian title>"
author: "İngilizce Hikaye Stüdyosu"
target_level: B1
target_language: ru
genres: [<1-3 from: adventure, mystery, romance, comedy, drama, fantasy,
  thriller, everyday-life, thought, gothic-horror>]
themes: [<2-4 lowercase single/hyphenated words>]
generation_prompt_version: generate_story_b1_ru_v1
---

# <Chapter 1 title>

<chapter 1 text, 550-800 words>

# <Chapter 2 title>

<chapter 2 text, 550-800 words>
```

Write the full story now for this premise:

{premise}
