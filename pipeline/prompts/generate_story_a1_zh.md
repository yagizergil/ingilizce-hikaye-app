# Generate A1 Story (Chinese) — v1

**Version: `generate_story_a1_zh_v1`**.

Write in **Simplified Chinese** (简体中文). Kelime tavanı **Kelly List**
(CC BY-NC-SA 2.0) A1 kelimeleri (`data/kelly-vocabulary-profile-zh-1.0.csv`).

You are writing an original short story in Simplified Chinese for a
reader studying Chinese at CEFR level **A1** (roughly HSK 1-2). Write
directly in Chinese — not a translation.

## 1. Vocabulary ceiling

- Use only the most basic, high-frequency words and characters (HSK 1-2
  range): basic verbs (是, 有, 去, 做, 想, 会, 喜欢...), everyday nouns
  (家, 人, 饭, 天, 水, 工作...), common adjectives (好, 大, 小, 高兴...).
- Proper nouns (names) are exempt but keep them simple.
- Avoid rare characters and idioms (成语) entirely at this level.

## 2. Sentence length (hard constraints)

- **Average sentence length: 8 words (segmented tokens) or fewer.**
- **No single sentence may exceed 15 segmented tokens.**
- Short, simple SVO sentences. Avoid complex clause combinations.

## 3. Allowed and forbidden grammar

**Allowed only:**

- Simple present/habitual statements (Chinese verbs don't conjugate for
  tense — use time words like 现在/今天 for context).
- 了 for a single completed action, used sparingly and simply.
- 要/想 + verb for wants/near future.
- Simple questions with 吗/什么/谁/哪儿.

**Explicitly forbidden:**

- Complex aspect markers (着, 过 combined with other structures).
- 把-construction and 被-construction (passive).
- Complex complement structures (结果补语, 可能补语) beyond the simplest.
- Multi-clause sentences with subordination.

## 4. Length and structure

- Each chapter (each `# ` section) should be **roughly 250–400 segmented
  tokens** (Chinese doesn't use spaces; count meaningful words, not
  characters). A typical A1 story has 2–4 chapters.
- Give each chapter a short, concrete Chinese title.

## 5. Cultural accessibility

- Avoid references specific to one Chinese-speaking region's pop
  culture, brand names, or school system.
- Universal, concrete details (weather, food, family, a market, a walk).

## 6. Output format

Output ONLY the story in this exact Markdown structure — no commentary
before or after:

```
---
title: "<Chinese title>"
author: "Lingo Studio"
target_level: A1
target_language: zh
genres: [<1-3 from: adventure, mystery, romance, comedy, drama, fantasy,
  thriller, everyday-life, thought, gothic-horror>]
themes: [<2-4 lowercase single/hyphenated words>]
generation_prompt_version: generate_story_a1_zh_v1
---

# <Chapter 1 title>

<chapter 1 text, 250-400 tokens>

# <Chapter 2 title>

<chapter 2 text, 250-400 tokens>
```

Write the full story now for this premise:

{premise}
