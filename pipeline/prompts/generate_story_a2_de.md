# Generate A2 Story (German) — v1

**Version: `generate_story_a2_de_v1`** — pass this exact string as the
`generation_prompt_version` frontmatter field.

Kelime tavanı **DAFlex** (CEFRLex, CC BY-NC-SA 4.0) A1+A2 kelimeleri
(`data/daflex-vocabulary-profile-de-1.0.csv`).

You are writing an original short story in **German** for a reader
studying German at CEFR level **A2**. Write directly in German, an
original piece of fiction — not a translation.

## 1. Vocabulary ceiling

- Use only words an A2 German learner would know (A1 vocabulary plus
  common A2 additions: more verbs, time/sequence words, opinions,
  feelings, simple comparisons).
- Proper nouns are exempt but keep them simple and pronounceable.
- Avoid long invented compound nouns beyond common everyday ones.
- A handful of unavoidable topic words beyond this ceiling are
  acceptable only if context makes the meaning obvious.

## 2. Sentence length (hard constraints)

- **Average sentence length: 12 words or fewer** (whitespace tokenization).
- **No single sentence may exceed 25 words.**
- Prefer simple and compound sentences (und, aber, oder, denn). Use at
  most one subordinate clause (weil/dass/wenn) per sentence.

## 3. Allowed and forbidden grammar

**Allowed:**

- Präsens.
- Perfekt for clearly-marked past narration ("Gestern bin ich auf den
  Markt gegangen.") — the main new tense at A2.
- Near future with present tense + time word.
- Simple comparatives (größer als, so groß wie).
- One subordinate clause per sentence with weil/dass/wenn.

**Explicitly forbidden:**

- Präteritum for regular narration (reserve for B1), except the very
  common irregular forms (war, hatte) which are acceptable at A2.
- Konjunktiv in any form.
- Passive voice (Passiv).
- Complex or nested subordinate clauses.

## 4. Length and structure

- Each chapter (each `# ` section) should be **roughly 500–800 words**.
  A typical A2 story has 3–5 chapters.
- Give each chapter a short, concrete German title.

## 5. Cultural accessibility

- Avoid references specific to one German-speaking country's pop
  culture, brand names, or school system.
- Universal, concrete settings preferred. Use neutral, standard German
  (Hochdeutsch) — avoid dialect words.

## 6. Output format

Output ONLY the story in this exact Markdown structure — no commentary
before or after:

```
---
title: "<German title>"
author: "İngilizce Hikaye Stüdyosu"
target_level: A2
target_language: de
genres: [<1-3 from: adventure, mystery, romance, comedy, drama, fantasy,
  thriller, everyday-life, thought, gothic-horror>]
themes: [<2-4 lowercase single/hyphenated words>]
generation_prompt_version: generate_story_a2_de_v1
---

# <Chapter 1 title>

<chapter 1 text, 500-800 words>

# <Chapter 2 title>

<chapter 2 text, 500-800 words>
```

Write the full story now for this premise:

{premise}
