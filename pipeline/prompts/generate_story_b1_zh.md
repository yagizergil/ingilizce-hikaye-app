# Generate B1 Story (Chinese) — v1

**Version: `generate_story_b1_zh_v1`**.

Write in Simplified Chinese. Kelime tavanı **Kelly List** A1+A2+B1
kelimeleri (`data/kelly-vocabulary-profile-zh-1.0.csv`, roughly HSK 3-4).

You are writing an original short story in Simplified Chinese for a
reader studying Chinese at CEFR level **B1**. Write directly in Chinese
— not a translation. Roughly twice as long as the A2 prompt.

## 1. Vocabulary ceiling

- A1+A2 vocabulary plus common B1 additions: opinions, hypotheticals,
  more abstract everyday topics.
- Proper nouns exempt.

## 2. Sentence length (WITH A FLOOR)

- **Average sentence length: between 13 and 18 segmented tokens.** A
  story averaging under 13 is structurally A2 — REJECTED even if it
  looks safe.
- **No single sentence may exceed 33 segmented tokens.**

## 3. Allowed and forbidden grammar

**Allowed — everything A2 allows, plus:** 过 for past experience; 把-句
(把-construction) used simply; 虽然...但是 concessive sentences; 一边...一边
simultaneous actions; simple 被-construction (passive) when natural.

**Forbidden:** complex complement structures (可能补语 chains); heavy
literary/classical vocabulary (成语 beyond the most common).

## 4. Length and structure

- Each chapter **roughly 550–800 segmented tokens**, 3–5 chapters total.
- Short, concrete Chinese chapter titles.

## 5. Plot mechanics (required)

- Concrete, visible WANT for the main character.
- A concrete OBSTACLE.
- One genuine complication or turn.
- Resolution earned through the character's own actions.

## 6. Cultural accessibility

- Avoid region-specific pop culture/brand names/school system
  references.

## 7. Output format

```
---
title: "<Chinese title>"
author: "İngilizce Hikaye Stüdyosu"
target_level: B1
target_language: zh
genres: [<1-3 from: adventure, mystery, romance, comedy, drama, fantasy,
  thriller, everyday-life, thought, gothic-horror>]
themes: [<2-4 lowercase single/hyphenated words>]
generation_prompt_version: generate_story_b1_zh_v1
---

# <Chapter 1 title>

<chapter 1 text, 550-800 tokens>

# <Chapter 2 title>

<chapter 2 text, 550-800 tokens>
```

Write the full story now for this premise:

{premise}
