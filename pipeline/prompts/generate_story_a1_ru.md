# Generate A1 Story (Russian) — v1

**Version: `generate_story_a1_ru_v1`**.

Kelime tavanı **Kelly List** (CC BY-NC-SA 2.0) A1 kelimeleri
(`data/kelly-vocabulary-profile-ru-1.0.csv`).

You are writing an original short story in **Russian** for a reader
studying Russian at CEFR level **A1**. Write directly in Russian — not a
translation.

## 1. Vocabulary ceiling

- Use only words a true A1 Russian learner would know: basic verbs
  (быть, жить, идти, делать, хотеть, мочь, любить...), everyday nouns
  (дом, семья, еда, день, вода, работа...), common adjectives/adverbs
  (хороший, большой, маленький, счастливый, очень, здесь...).
- Proper nouns exempt but keep them simple and pronounceable.
- A handful of unavoidable topic words beyond the ceiling are acceptable
  only if context makes the meaning obvious.

## 2. Sentence length (hard constraints)

- **Average sentence length: 8 words or fewer** (whitespace tokenization).
- **No single sentence may exceed 15 words.**
- Short, simple sentences. Avoid subordinate clauses almost entirely.

## 3. Allowed and forbidden grammar

**Allowed only:**

- Present tense (настоящее время) of imperfective verbs.
- Simple future with "буду/будешь..." + infinitive, sparingly.
- Basic case usage: nominative, accusative, prepositional for location
  (в/на + prepositional) — keep case choice simple and consistent.
- Simple imperative for commands if natural ("Иди сюда.").

**Explicitly forbidden:**

- Past tense (прошедшее время) — too advanced for A1; if the plot needs
  a flashback, tell it as a new present-tense scene instead.
- Perfective aspect verbs (use only imperfective).
- Any conditional (бы).
- Passive voice, participles (причастия), gerunds (деепричастия).
- Genitive/dative/instrumental cases beyond the most fixed, common
  expressions (e.g. "у меня").

## 4. Length and structure

- Each chapter (each `# ` section) should be **roughly 250–400 words**.
  A typical A1 story has 2–4 chapters.
- Give each chapter a short, concrete Russian title.

## 5. Cultural accessibility

- Avoid references specific to one country's pop culture, brand names,
  or school system that a general international reader wouldn't
  recognize. Universal, concrete details preferred.

## 6. Output format

Output ONLY the story in this exact Markdown structure — no commentary
before or after:

```
---
title: "<Russian title>"
author: "Lingo Studio"
target_level: A1
target_language: ru
genres: [<1-3 from: adventure, mystery, romance, comedy, drama, fantasy,
  thriller, everyday-life, thought, gothic-horror>]
themes: [<2-4 lowercase single/hyphenated words>]
generation_prompt_version: generate_story_a1_ru_v1
---

# <Chapter 1 title>

<chapter 1 text, 250-400 words>

# <Chapter 2 title>

<chapter 2 text, 250-400 words>
```

Write the full story now for this premise:

{premise}
