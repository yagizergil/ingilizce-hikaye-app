# Generate A1 Story (Japanese) — v1

**Version: `generate_story_a1_ja_v1`**.

Write in **Japanese** (hiragana/katakana + common N5 kanji only). Kelime
tavanı **JLPT N5 word list** (elzup/jlpt-word-list, MIT license)
(`data/jlpt-vocabulary-profile-ja-1.0.csv`, level A1).

You are writing an original short story in Japanese for a reader
studying Japanese at CEFR level **A1** (JLPT N5). Write directly in
Japanese — not a translation.

## 1. Vocabulary and script ceiling

- Use only N5-level vocabulary: basic verbs (です, あります, います, 行きます,
  します, ほしいです...), everyday nouns (家, 家族, ご飯, 日, 水, 仕事...), common
  adjectives (いい, 大きい, 小さい, うれしい...).
- **Kanji: only the most common N5 kanji** (roughly the first ~100).
  When in doubt, prefer hiragana over an unfamiliar kanji. Always add
  furigana-free plain hiragana for any kanji outside this very basic set
  — better yet, just avoid it.
- Proper nouns (names) are exempt but keep them simple, written in
  katakana or simple hiragana.

## 2. Sentence length (hard constraints)

- **Average sentence length: 8 words (segmented tokens) or fewer.**
- **No single sentence may exceed 15 segmented tokens.**
- Use the polite です/ます form consistently and simple SOV structure.

## 3. Allowed and forbidden grammar

**Allowed only:**

- Present/future です/ます form (non-past).
- ～たいです for wants.
- Simple ～ましょう for suggestions.
- て-form only for the most basic connecting of two simple actions
  ("食べて、寝ます。"), used sparingly.

**Explicitly forbidden:**

- Past tense ました/でした — too advanced for A1; tell flashbacks as a new
  present-tense scene instead.
- Plain/casual form (だ/である) — stay polite throughout.
- Conditional forms (～ば, ～たら, ～と).
- Passive, causative, or potential forms.
- Complex particle combinations.

## 4. Length and structure

- Each chapter (each `# ` section) should be **roughly 250–400 segmented
  tokens**. A typical A1 story has 2–4 chapters.
- Give each chapter a short, concrete Japanese title.

## 5. Cultural accessibility

- Avoid references specific to Japanese pop culture, brand names, or
  school system that a general international reader wouldn't recognize.
- Universal, concrete details (weather, food, family, a market, a walk).

## 6. Output format

Output ONLY the story in this exact Markdown structure — no commentary
before or after:

```
---
title: "<Japanese title>"
author: "İngilizce Hikaye Stüdyosu"
target_level: A1
target_language: ja
genres: [<1-3 from: adventure, mystery, romance, comedy, drama, fantasy,
  thriller, everyday-life, thought, gothic-horror>]
themes: [<2-4 lowercase single/hyphenated words>]
generation_prompt_version: generate_story_a1_ja_v1
---

# <Chapter 1 title>

<chapter 1 text, 250-400 tokens>

# <Chapter 2 title>

<chapter 2 text, 250-400 tokens>
```

Write the full story now for this premise:

{premise}
