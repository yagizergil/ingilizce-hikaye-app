# Generate A2 Story (Spanish) — v1

**Version: `generate_story_a2_es_v1`** — pass this exact string as the
`generation_prompt_version` frontmatter field.

Kelime tavanı **ELELex** (CEFRLex, CC BY-NC-SA 4.0) A1+A2 kelimeleri
(`data/elelex-vocabulary-profile-es-1.0.csv`).

You are writing an original short story in **Spanish** for a reader
studying Spanish at CEFR level **A2**. Write directly in Spanish, an
original piece of fiction — not a translation.

## 1. Vocabulary ceiling

- Use only words an A2 Spanish learner would know (A1 vocabulary plus
  common A2 additions: more verbs, time/sequence words, opinions,
  feelings, simple comparisons).
- Proper nouns are exempt but keep them simple and pronounceable.
- A handful of unavoidable topic words beyond this ceiling are
  acceptable only if context makes the meaning obvious.

## 2. Sentence length (hard constraints)

- **Average sentence length: 12 words or fewer** (whitespace tokenization).
- **No single sentence may exceed 25 words.**
- Prefer simple and compound sentences (y, pero, o, porque). Avoid
  stacking more than one subordinate clause per sentence.

## 3. Allowed and forbidden grammar

**Allowed:**

- Presente de indicativo.
- Pretérito perfecto compuesto ("He comido.") for recent past.
- Pretérito indefinido for simple, clearly-marked past narration
  ("Ayer fui al mercado.") — the main new tense at A2.
- Ir a + infinitivo for near future.
- Simple comparatives (más...que, menos...que, tan...como).

**Explicitly forbidden:**

- Imperfecto (reserve for B1).
- Subjuntivo in any form.
- Any conditional.
- Passive voice, complex relative clauses.

## 4. Length and structure

- Each chapter (each `# ` section) should be **roughly 500–800 words**.
  A typical A2 story has 3–5 chapters.
- Give each chapter a short, concrete Spanish title.

## 5. Cultural accessibility

- Avoid references specific to one Spanish-speaking country's pop
  culture, brand names, or school system.
- Universal, concrete settings preferred. Use neutral, pan-Hispanic
  vocabulary — avoid voseo and strong regionalisms.

## 6. Output format

Output ONLY the story in this exact Markdown structure — no commentary
before or after:

```
---
title: "<Spanish title>"
author: "İngilizce Hikaye Stüdyosu"
target_level: A2
target_language: es
genres: [<1-3 from: adventure, mystery, romance, comedy, drama, fantasy,
  thriller, everyday-life, thought, gothic-horror>]
themes: [<2-4 lowercase single/hyphenated words>]
generation_prompt_version: generate_story_a2_es_v1
---

# <Chapter 1 title>

<chapter 1 text, 500-800 words>

# <Chapter 2 title>

<chapter 2 text, 500-800 words>
```

Write the full story now for this premise:

{premise}
