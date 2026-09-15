# Generate B1 Story (Japanese) — v1

**Version: `generate_story_b1_ja_v1`**.

Write in Japanese. Kelime tavanı **JLPT N5+N4+N3 word list**
(`data/jlpt-vocabulary-profile-ja-1.0.csv`, levels A1+A2+B1).

You are writing an original short story in Japanese for a reader
studying Japanese at CEFR level **B1** (JLPT N3). Write directly in
Japanese — not a translation. Roughly twice as long as the A2 prompt.

## 1. Vocabulary and script ceiling

- N5+N4+N3 vocabulary. N3-level kanji acceptable for common words.
- Proper nouns exempt.

## 2. Sentence length (WITH A FLOOR)

- **Average sentence length: between 13 and 18 segmented tokens.** A
  story averaging under 13 is structurally A2 — REJECTED even if it
  looks safe.
- **No single sentence may exceed 35 segmented tokens.**

## 3. Allowed and forbidden grammar

**Allowed — everything A2 allows, plus:**

- ～たことがあります for experience.
- ～ようになりました for change over time.
- Simple ～ば conditional.
- ～のに, ～けど for mild contrast.
- Plain form used inside quoted/reported speech is acceptable, but the
  narration itself stays polite です/ます.

**Still forbidden:**

- 使役 (causative) and 受身 (passive) beyond the most fixed expressions.
- Heavy keigo (敬語) beyond simple です/ます.
- Complex nested clauses.

## 4. Length and structure

- Each chapter **roughly 550–800 segmented tokens**, 3–5 chapters total.
- Short, concrete Japanese chapter titles.

## 5. Plot mechanics (required)

- Concrete, visible WANT for the main character.
- A concrete OBSTACLE.
- One genuine complication or turn.
- Resolution earned through the character's own actions.

## 6. Cultural accessibility

- Avoid references specific to Japanese pop culture, brand names, or
  school system that a general international reader wouldn't recognize.

## 7. Output format

```
---
title: "<Japanese title>"
author: "Lingo Studio"
target_level: B1
target_language: ja
genres: [<1-3 from: adventure, mystery, romance, comedy, drama, fantasy,
  thriller, everyday-life, thought, gothic-horror>]
themes: [<2-4 lowercase single/hyphenated words>]
generation_prompt_version: generate_story_b1_ja_v1
---

# <Chapter 1 title>

<chapter 1 text, 550-800 tokens>

# <Chapter 2 title>

<chapter 2 text, 550-800 tokens>
```

Write the full story now for this premise:

{premise}
