# Generate B1 Story (French) — v1

**Version: `generate_story_b1_fr_v1`**.

Kelime tavanı **FLELex** (CEFRLex, CC BY-NC-SA 4.0) A1+A2+B1 kelimeleri
(`data/flelex-vocabulary-profile-fr-1.0.csv`).

You are writing an original short story in **French** for a reader
studying French at CEFR level **B1**. Write directly in French — not a
translation. This is roughly twice as long as the A2 prompt and should
feel like a real step up, not a longer A2 story.

## 1. Vocabulary ceiling

- A1+A2 vocabulary plus common B1 additions: opinions and arguments,
  hypotheticals, more abstract everyday topics (work, relationships,
  plans, regrets).
- Proper nouns exempt. A handful of unavoidable topic words beyond the
  ceiling are acceptable if context makes the meaning obvious.

## 2. Sentence length (hard constraints, WITH A FLOOR)

- **Average sentence length: between 13 and 17 words.** There is a FLOOR
  here, not just a ceiling — a story averaging under 13 words is
  structurally an A2 story with harder vocabulary, and will be REJECTED
  even though it looks "safe". Join related clauses instead of splitting
  every idea into its own sentence.
- **No single sentence may exceed 30 words.**
- Vary sentence rhythm — mix shorter and longer sentences.

## 3. Allowed and forbidden grammar

**Allowed — everything A2 allows, plus:**

- Imparfait, alongside passé composé, with correct contrast
  (ongoing/habitual past vs. completed past action).
- Plus-que-parfait where the time order genuinely needs it.
- First conditional ("S'il pleut, nous resterons.").
- Simple relative clauses with qui/que/où.
- Simple passive voice with être.

**Still forbidden:**

- Subjonctif in any form (reserve for B2+).
- Second/third conditional.
- Complex nominalizations or literary/formal register.

## 4. Length and structure

- Each chapter **roughly 550–800 words**, 3–5 chapters total —
  **1,800–3,200 words** overall (13–23 minutes reading).
- Short, concrete French chapter titles.

## 5. Plot mechanics (required)

- The main character has a concrete, visible WANT.
- A concrete OBSTACLE (not just internal doubt).
- One genuine complication or turn — something the character believed
  turns out wrong, or the cost of the goal changes.
- Resolution earned through the character's own actions, by the final
  chapter.

## 6. Cultural accessibility

- Avoid country-specific pop culture/brand names/school system
  references. Neutral, standard French, no verlan or strong
  regionalisms.

## 7. Output format

```
---
title: "<French title>"
author: "İngilizce Hikaye Stüdyosu"
target_level: B1
target_language: fr
genres: [<1-3 from: adventure, mystery, romance, comedy, drama, fantasy,
  thriller, everyday-life, thought, gothic-horror>]
themes: [<2-4 lowercase single/hyphenated words>]
generation_prompt_version: generate_story_b1_fr_v1
---

# <Chapter 1 title>

<chapter 1 text, 550-800 words>

# <Chapter 2 title>

<chapter 2 text, 550-800 words>
```

Write the full story now for this premise:

{premise}
