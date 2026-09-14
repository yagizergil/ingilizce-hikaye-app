# Generate B1 Story (German) — v1

**Version: `generate_story_b1_de_v1`**.

Kelime tavanı **DAFlex** (CEFRLex, CC BY-NC-SA 4.0) A1+A2+B1 kelimeleri
(`data/daflex-vocabulary-profile-de-1.0.csv`).

You are writing an original short story in **German** for a reader
studying German at CEFR level **B1**. Write directly in German — not a
translation. This is roughly twice as long as the A2 prompt and should
feel like a real step up, not a longer A2 story.

## 1. Vocabulary ceiling

- A1+A2 vocabulary plus common B1 additions: opinions and arguments,
  hypotheticals, more abstract everyday topics (work, relationships,
  plans, regrets).
- Proper nouns exempt. A handful of unavoidable topic words beyond the
  ceiling are acceptable if context makes the meaning obvious.
- Compound nouns beyond common everyday ones still discouraged.

## 2. Sentence length (hard constraints, WITH A FLOOR)

- **Average sentence length: between 13 and 17 words.** There is a FLOOR
  here, not just a ceiling — a story averaging under 13 words is
  structurally an A2 story with harder vocabulary, and will be REJECTED
  even though it looks "safe". Join related clauses (weil/dass/wenn/als)
  instead of splitting every idea into its own sentence.
- **No single sentence may exceed 30 words.**
- Vary sentence rhythm — mix shorter and longer sentences.

## 3. Allowed and forbidden grammar

**Allowed — everything A2 allows, plus:**

- Präteritum for narration, alongside Perfekt.
- Plusquamperfekt where the time order genuinely needs it.
- First conditional with wenn ("Wenn es regnet, bleiben wir zu Hause.").
- Relative clauses with der/die/das.
- Simple passive voice (Passiv).
- Nebensätze with weil/dass/wenn/als — up to two per sentence now.

**Still forbidden:**

- Konjunktiv II for hypotheticals beyond the most fixed expressions
  (reserve full use for B2+).
- Complex nominalizations or literary/formal register.
- Nested subordinate clauses beyond two levels.

## 4. Length and structure

- Each chapter **roughly 550–800 words**, 3–5 chapters total —
  **1,800–3,200 words** overall (13–23 minutes reading).
- Short, concrete German chapter titles.

## 5. Plot mechanics (required)

- The main character has a concrete, visible WANT.
- A concrete OBSTACLE (not just internal doubt).
- One genuine complication or turn — something the character believed
  turns out wrong, or the cost of the goal changes.
- Resolution earned through the character's own actions, by the final
  chapter.

## 6. Cultural accessibility

- Avoid country-specific pop culture/brand names/school system
  references. Standard German (Hochdeutsch), no dialect.

## 7. Output format

```
---
title: "<German title>"
author: "İngilizce Hikaye Stüdyosu"
target_level: B1
target_language: de
genres: [<1-3 from: adventure, mystery, romance, comedy, drama, fantasy,
  thriller, everyday-life, thought, gothic-horror>]
themes: [<2-4 lowercase single/hyphenated words>]
generation_prompt_version: generate_story_b1_de_v1
---

# <Chapter 1 title>

<chapter 1 text, 550-800 words>

# <Chapter 2 title>

<chapter 2 text, 550-800 words>
```

Write the full story now for this premise:

{premise}
