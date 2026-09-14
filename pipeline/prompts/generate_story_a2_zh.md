# Generate A2 Story (Chinese) — v1

**Version: `generate_story_a2_zh_v1`**.

Write in **Simplified Chinese**. Kelime tavanı **Kelly List** A1+A2
kelimeleri (`data/kelly-vocabulary-profile-zh-1.0.csv`), roughly HSK 2-3.

You are writing an original short story in Simplified Chinese for a
reader studying Chinese at CEFR level **A2**. Write directly in Chinese
— not a translation.

## 1. Vocabulary ceiling

- A1 vocabulary plus common A2 additions: more verbs, time/sequence
  words, simple opinions and feelings.
- Proper nouns exempt. A handful of unavoidable topic words are
  acceptable if context makes the meaning obvious.

## 2. Sentence length

- **Average sentence length: 12 segmented tokens or fewer.**
- **No single sentence may exceed 25 segmented tokens.**

## 3. Allowed and forbidden grammar

**Allowed:** everything A1 allows, plus: 了 used more freely for
completed actions and change of state; 在/正在 for ongoing actions; simple
comparisons with 比; simple 因为...所以 causal sentences.

**Forbidden:** 把-construction and 被-construction; complex complement
structures; multi-level subordination.

## 4. Length and structure

- Each chapter **roughly 500–800 segmented tokens**, 3–5 chapters total.
- Short, concrete Chinese chapter titles.

## 5. Cultural accessibility

- Avoid region-specific pop culture/brand names/school system
  references.

## 6. Output format

```
---
title: "<Chinese title>"
author: "İngilizce Hikaye Stüdyosu"
target_level: A2
target_language: zh
genres: [<1-3 from: adventure, mystery, romance, comedy, drama, fantasy,
  thriller, everyday-life, thought, gothic-horror>]
themes: [<2-4 lowercase single/hyphenated words>]
generation_prompt_version: generate_story_a2_zh_v1
---

# <Chapter 1 title>

<chapter 1 text, 500-800 tokens>

# <Chapter 2 title>

<chapter 2 text, 500-800 tokens>
```

Write the full story now for this premise:

{premise}
