# Generate A1 Story (Italian) — v1

**Version: `generate_story_a1_it_v1`** — pass this exact string as the
`generation_prompt_version` frontmatter field.

Kelime tavanı **Kelly List** (ssharoff.github.io/kelly, CC BY-NC-SA 2.0)
A1 kelimeleri (`data/kelly-vocabulary-profile-it-1.0.csv`).

You are writing an original short story in **Italian** for a reader
studying Italian at CEFR level **A1**. Write directly in Italian, an
original piece of fiction — not a translation.

## 1. Vocabulary ceiling

- Use only words a true A1 Italian learner would know: basic verbs
  (essere, avere, andare, fare, volere, potere, piacere...), everyday
  nouns (casa, famiglia, cibo, giorno, acqua, lavoro...), common
  adjectives/adverbs (buono, grande, piccolo, felice, molto, qui...).
- Proper nouns are exempt but keep them simple and pronounceable.
- A handful of unavoidable topic words beyond this ceiling are
  acceptable only if context makes the meaning obvious.

## 2. Sentence length (hard constraints)

- **Average sentence length: 8 words or fewer** (whitespace tokenization).
- **No single sentence may exceed 15 words.**
- Short, simple sentences. Avoid subordinate clauses almost entirely.

## 3. Allowed and forbidden grammar

**Allowed only:**

- Presente indicativo (essere, avere, verbi regolari -are/-ere/-ire, and
  the most common irregular verbs: andare, fare, volere, potere, dovere).
- Stare + gerundio sparingly for actions in progress ("Sta mangiando.").
- Futuro semplice avoided; use present + time word for near future
  ("Domani va al mercato.").
- Simple imperativo for commands if natural ("Vieni qui.").

**Explicitly forbidden:**

- Passato prossimo, imperfetto, or any other past tense — too advanced
  for A1.
- Congiuntivo in any form.
- Any conditional.
- Passive voice, relative clauses beyond simple "che".

If the plot seems to require a forbidden tense (e.g. a flashback), tell it
as a new present-tense scene instead.

## 4. Length and structure

- Each chapter (each `# ` section) should be **roughly 250–400 words**.
  A typical A1 story has 2–4 chapters.
- Give each chapter a short, concrete Italian title.

## 5. Cultural accessibility

- Avoid references specific to one Italian region's pop culture, brand
  names, or school system.
- Universal, concrete details (weather, food, family, a market, a walk)
  are ideal. Use neutral, standard Italian — avoid regional dialect.

## 6. Output format

Output ONLY the story in this exact Markdown structure — no commentary
before or after:

```
---
title: "<Italian title>"
author: "Lingo Studio"
target_level: A1
target_language: it
genres: [<1-3 from: adventure, mystery, romance, comedy, drama, fantasy,
  thriller, everyday-life, thought, gothic-horror>]
themes: [<2-4 lowercase single/hyphenated words>]
generation_prompt_version: generate_story_a1_it_v1
---

# <Chapter 1 title>

<chapter 1 text, 250-400 words>

# <Chapter 2 title>

<chapter 2 text, 250-400 words>
```

Write the full story now for this premise:

{premise}
