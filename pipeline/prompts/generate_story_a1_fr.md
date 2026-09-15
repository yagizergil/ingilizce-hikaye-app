# Generate A1 Story (French) — v1

**Version: `generate_story_a1_fr_v1`** — pass this exact string as the
`generation_prompt_version` frontmatter field for any book generated with
this prompt.

Kelime tavanı **FLELex** (CEFRLex projesi, CC BY-NC-SA 4.0) kaynaklı
`data/flelex-vocabulary-profile-fr-1.0.csv` A1 kelimeleri.

You are writing an original short story in **French** for a reader
studying French at CEFR level **A1**. This is not a translation — write
directly in French, an original piece of fiction.

## 1. Vocabulary ceiling

- Use only words a true A1 French learner would know: basic verbs (être,
  avoir, aller, faire, vouloir, pouvoir, aimer...), everyday nouns
  (maison, famille, nourriture, jour, eau, travail...), common
  adjectives/adverbs (bon, grand, petit, content, très, ici...).
- Proper nouns are exempt but keep them simple and pronounceable.
- A handful of unavoidable topic words outside this ceiling are
  acceptable only if context makes the meaning obvious.

## 2. Sentence length (hard constraints)

- **Average sentence length: 8 words or fewer** (whitespace tokenization).
- **No single sentence may exceed 15 words.**
- Short, simple sentences. Avoid subordinate clauses almost entirely.

## 3. Allowed and forbidden grammar

**Allowed only:**

- Présent de l'indicatif (être, avoir, verbes réguliers -er/-ir, and the
  most common irregular verbs: aller, faire, vouloir, pouvoir, devoir).
- Futur proche (aller + infinitif) for near future ("Elle va manger.").
- Impératif for simple commands if natural ("Viens ici.").

**Explicitly forbidden:**

- Passé composé, imparfait, or any other past tense — too advanced for A1.
- Subjonctif in any form.
- Any conditional.
- Passive voice, relative clauses beyond simple "qui"/"que".

If the plot seems to require a forbidden tense (e.g. a flashback), tell it
as a new present-tense scene instead.

## 4. Length and structure

- Each chapter (each `# ` section) should be **roughly 250–400 words**.
  A typical A1 story has 2–4 chapters.
- Give each chapter a short, concrete French title.

## 5. Cultural accessibility

- Avoid references specific to one Francophone country's pop culture,
  brand names, or school system that a general international reader
  wouldn't recognize.
- Universal, concrete details (weather, food, family, a market, a walk)
  are ideal.
- Use neutral, standard French — avoid regional slang or verlan that
  would confuse a learner using a standard textbook register.

## 6. Output format

Output ONLY the story in this exact Markdown structure — no commentary
before or after:

```
---
title: "<French title>"
author: "Lingo Studio"
target_level: A1
target_language: fr
genres: [<1-3 from: adventure, mystery, romance, comedy, drama, fantasy,
  thriller, everyday-life, thought, gothic-horror>]
themes: [<2-4 lowercase single/hyphenated words>]
generation_prompt_version: generate_story_a1_fr_v1
---

# <Chapter 1 title>

<chapter 1 text, 250-400 words>

# <Chapter 2 title>

<chapter 2 text, 250-400 words>
```

Write the full story now for this premise:

{premise}
