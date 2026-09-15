# Generate A1 Story (Spanish) — v1

**Version: `generate_story_a1_es_v1`** — pass this exact string as the
`generation_prompt_version` frontmatter field for any book generated with
this prompt.

**Bu, dil çiftleri v2'nin (ADR-013) ilk PİLOT hedef dili için yazıldı.**
İngilizce'deki `generate_story_a2.md`nin aynı iskeleti, İspanyolca'ya ve A1
seviyesine uyarlanmış hâli. Kelime tavanı NGSL değil, **ELELex** (CEFRLex
projesi, CC BY-NC-SA 4.0) kaynaklı `data/elelex-vocabulary-profile-es-1.0.csv`
A1 kelimeleri.

You are writing an original short story in **Spanish** for a reader
studying Spanish at CEFR level **A1**. This is not a translation of an
English story — write directly in Spanish, an original piece of fiction.

## 1. Vocabulary ceiling

- Use only words that a true A1 Spanish learner would know: basic verbs
  (ser, estar, tener, ir, hacer, querer, poder, gustar...), everyday
  nouns (casa, familia, comida, día, agua, trabajo...), and the most
  common adjectives/adverbs (bueno, grande, pequeño, feliz, muy, aquí...).
- Proper nouns (character/place names) are exempt, but keep them simple
  and pronounceable.
- A handful of unavoidable topic words outside this ceiling are
  acceptable only if context makes the meaning obvious. Keep this to an
  absolute minimum.

## 2. Sentence length (hard constraints)

- **Average sentence length across the whole story: 8 words or fewer**
  (measured by whitespace tokenization, matching `pipeline/src/validator.py`
  A1 threshold).
- **No single sentence may exceed 15 words.**
- Use short, simple sentences. Avoid subordinate clauses almost entirely.

## 3. Allowed and forbidden grammar

**Allowed only:**

- Presente de indicativo (ser, estar, tener, verbos regulares -ar/-er/-ir)
- Pretérito perfecto compuesto for very recent/finished actions is
  **forbidden at A1** — use only presente and, sparingly, ir a + infinitivo
  for near future ("Va a comer.").
- Simple commands with usted/tú only if natural to the story ("Ven aquí.").

**Explicitly forbidden:**

- Pretérito indefinido and imperfecto (past tenses) — too advanced for A1.
- Subjuntivo in any form.
- Any conditional.
- Passive voice, relative clauses beyond simple "que".

If the plot seems to require a forbidden tense (e.g. a flashback), tell it
as a new present-tense scene instead.

## 4. Length and structure

- Each chapter (each `# ` section) should be **roughly 250–400 words**.
  A typical A1 story has 2–4 chapters (A1 stories are much shorter than
  A2/B1 — this matches the existing 4 original A1 stories in the catalog,
  ~3 minutes reading time).
- Give each chapter a short, concrete Spanish title.

## 5. Cultural accessibility

- Avoid references specific to one Spanish-speaking country's pop culture,
  brand names, or school system that a general international reader
  (including a Turkish A1 Spanish learner) wouldn't recognize.
- Universal, concrete details (weather, food, family, a market, a walk)
  are ideal.
- Use neutral, pan-Hispanic vocabulary where possible — avoid regional
  slang (voseo, regionalisms) that would confuse a learner using a
  standard textbook register.

## 6. Output format

Output ONLY the story in this exact Markdown structure — no commentary
before or after:

```
---
title: "<Spanish title>"
author: "Lingo Studio"
target_level: A1
target_language: es
genres: [<1-3 from: adventure, mystery, romance, comedy, drama, fantasy,
  thriller, everyday-life, thought, gothic-horror>]
themes: [<2-4 lowercase single/hyphenated words>]
generation_prompt_version: generate_story_a1_es_v1
---

# <Chapter 1 title>

<chapter 1 text, 250-400 words>

# <Chapter 2 title>

<chapter 2 text, 250-400 words>
```

Write the full story now for this premise:

{premise}
