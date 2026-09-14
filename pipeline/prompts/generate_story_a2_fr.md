# Generate A2 Story (French) — v1

**Version: `generate_story_a2_fr_v1`** — pass this exact string as the
`generation_prompt_version` frontmatter field.

Kelime tavanı **FLELex** (CEFRLex, CC BY-NC-SA 4.0) A1+A2 kelimeleri
(`data/flelex-vocabulary-profile-fr-1.0.csv`).

You are writing an original short story in **French** for a reader
studying French at CEFR level **A2**. Write directly in French, an
original piece of fiction — not a translation.

## 1. Vocabulary ceiling

- Use only words an A2 French learner would know (A1 vocabulary plus
  common A2 additions: more verbs, time/sequence words, opinions,
  feelings, simple comparisons).
- Proper nouns are exempt but keep them simple and pronounceable.
- A handful of unavoidable topic words beyond this ceiling are
  acceptable only if context makes the meaning obvious.

## 2. Sentence length (hard constraints)

- **Average sentence length: 12 words or fewer** (whitespace tokenization).
- **No single sentence may exceed 25 words.**
- Prefer simple and compound sentences (et, mais, ou, parce que). Avoid
  stacking more than one subordinate clause per sentence.

## 3. Allowed and forbidden grammar

**Allowed:**

- Présent de l'indicatif.
- Passé composé for clearly-marked past narration ("Hier, je suis allé
  au marché.") — the main new tense at A2.
- Futur proche (aller + infinitif).
- Simple comparatives (plus...que, moins...que, aussi...que).

**Explicitly forbidden:**

- Imparfait (reserve for B1).
- Subjonctif in any form.
- Any conditional.
- Passive voice, complex relative clauses.

## 4. Length and structure

- Each chapter (each `# ` section) should be **roughly 500–800 words**.
  A typical A2 story has 3–5 chapters.
- Give each chapter a short, concrete French title.

## 5. Cultural accessibility

- Avoid references specific to one Francophone country's pop culture,
  brand names, or school system.
- Universal, concrete settings preferred. Use neutral, standard French
  — avoid verlan and strong regionalisms.

## 6. Output format

Output ONLY the story in this exact Markdown structure — no commentary
before or after:

```
---
title: "<French title>"
author: "İngilizce Hikaye Stüdyosu"
target_level: A2
target_language: fr
genres: [<1-3 from: adventure, mystery, romance, comedy, drama, fantasy,
  thriller, everyday-life, thought, gothic-horror>]
themes: [<2-4 lowercase single/hyphenated words>]
generation_prompt_version: generate_story_a2_fr_v1
---

# <Chapter 1 title>

<chapter 1 text, 500-800 words>

# <Chapter 2 title>

<chapter 2 text, 500-800 words>
```

Write the full story now for this premise:

{premise}
