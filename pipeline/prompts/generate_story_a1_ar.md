# Generate A1 Story (Arabic) — v1

**Version: `generate_story_a1_ar_v1`**.

Write in **Modern Standard Arabic (فصحى)**, fully voweled where natural
comprehension needs it but not over-diacritized. Kelime tavanı **Kelly
List** (CC BY-NC-SA 2.0) A1 kelimeleri
(`data/kelly-vocabulary-profile-ar-1.0.csv`).

You are writing an original short story in Modern Standard Arabic for a
reader studying Arabic at CEFR level **A1**. Write directly in Arabic —
not a translation.

## 1. Vocabulary ceiling

- Use only the most basic, high-frequency Modern Standard Arabic words:
  basic verbs (كان, ذهب, فعل, أراد, استطاع, أحب...), everyday nouns (بيت,
  عائلة, طعام, يوم, ماء, عمل...), common adjectives (جيد, كبير, صغير,
  سعيد...).
- Proper nouns (names) are exempt but keep them simple and common.
- Avoid rare/classical vocabulary and idioms entirely at this level.

## 2. Sentence length (hard constraints)

- **Average sentence length: 8 words or fewer.**
- **No single sentence may exceed 15 words.**
- Short, simple sentences (verbal or nominal), minimal subordination.

## 3. Allowed and forbidden grammar

**Allowed only:**

- Simple present/habitual (المضارع) and simple past (الماضي) for basic
  narration, kept short.
- Simple nominal sentences (مبتدأ وخبر).
- سوف / س for simple future, sparingly.

**Explicitly forbidden:**

- Passive voice (المبني للمجهول).
- Conditional sentences (لو, إذا) beyond the simplest fixed forms.
- Complex relative clauses (الذي/التي chains) — use at most one, simply.
- Case-ending complexity beyond what a beginner reader needs — prioritize
  clarity over full classical إعراب precision.

## 4. Length and structure

- Each chapter (each `# ` section) should be **roughly 250–400 words**.
  A typical A1 story has 2–4 chapters.
- Give each chapter a short, concrete Arabic title.

## 5. Cultural accessibility

- Avoid references specific to one Arab country's pop culture, brand
  names, or school system.
- Universal, concrete details (weather, food, family, a market, a walk).

## 6. Output format

Output ONLY the story in this exact Markdown structure — no commentary
before or after:

```
---
title: "<Arabic title>"
author: "Lingo Studio"
target_level: A1
target_language: ar
genres: [<1-3 from: adventure, mystery, romance, comedy, drama, fantasy,
  thriller, everyday-life, thought, gothic-horror>]
themes: [<2-4 lowercase single/hyphenated words>]
generation_prompt_version: generate_story_a1_ar_v1
---

# <Chapter 1 title>

<chapter 1 text, 250-400 words>

# <Chapter 2 title>

<chapter 2 text, 250-400 words>
```

Write the full story now for this premise:

{premise}
