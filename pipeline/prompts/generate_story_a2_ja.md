# Generate A2 Story (Japanese) — v1

**Version: `generate_story_a2_ja_v1`**.

Write in **Japanese** (hiragana/katakana + common N4 kanji). Kelime
tavanı **JLPT N5+N4 word list** (elzup/jlpt-word-list, MIT license)
(`data/jlpt-vocabulary-profile-ja-1.0.csv`, levels A1+A2).

You are writing an original short story in Japanese for a reader
studying Japanese at CEFR level **A2** (JLPT N4). Write directly in
Japanese — not a translation.

## 1. Vocabulary and script ceiling

- N5+N4 level vocabulary. More verbs, time/sequence words, opinions and
  feelings than A1.
- Kanji: N5 kanji freely, N4 kanji for common words. Prefer hiragana
  over an unfamiliar kanji when in doubt.
- Proper nouns exempt but keep them simple.

## 2. Sentence length

- **Average sentence length: 12 segmented tokens or fewer.**
- **No single sentence may exceed 25 segmented tokens.**

## 3. Allowed and forbidden grammar

**Allowed — everything A1 allows, plus:**

- Past tense ました/でした for clearly-marked past narration — the main
  new feature at A2.
- ～ことができます for ability.
- Simple て-form chains linking up to two actions.
- Simple comparisons with ～より.

**Still forbidden:**

- Conditional forms (～ば, ～たら, ～と) beyond the most fixed expressions.
- Passive, causative, or potential forms (beyond できる).
- Plain/casual form — stay polite throughout.

## 4. Length and structure

- Each chapter **roughly 500–800 segmented tokens**, 3–5 chapters total.
- Short, concrete Japanese chapter titles.

## 5. Cultural accessibility

- Avoid references specific to Japanese pop culture, brand names, or
  school system that a general international reader wouldn't recognize.

## 6. Output format

```
---
title: "<Japanese title>"
author: "İngilizce Hikaye Stüdyosu"
target_level: A2
target_language: ja
genres: [<1-3 from: adventure, mystery, romance, comedy, drama, fantasy,
  thriller, everyday-life, thought, gothic-horror>]
themes: [<2-4 lowercase single/hyphenated words>]
generation_prompt_version: generate_story_a2_ja_v1
---

# <Chapter 1 title>

<chapter 1 text, 500-800 tokens>

# <Chapter 2 title>

<chapter 2 text, 500-800 tokens>
```

Write the full story now for this premise:

{premise}
