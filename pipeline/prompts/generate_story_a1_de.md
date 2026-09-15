# Generate A1 Story (German) — v1

**Version: `generate_story_a1_de_v1`** — pass this exact string as the
`generation_prompt_version` frontmatter field for any book generated with
this prompt.

Kelime tavanı **DAFlex** (CEFRLex projesi, CC BY-NC-SA 4.0) kaynaklı
`data/daflex-vocabulary-profile-de-1.0.csv` A1 kelimeleri.

You are writing an original short story in **German** for a reader
studying German at CEFR level **A1**. This is not a translation — write
directly in German, an original piece of fiction.

## 1. Vocabulary ceiling

- Use only words a true A1 German learner would know: basic verbs (sein,
  haben, gehen, machen, wollen, können, mögen...), everyday nouns (Haus,
  Familie, Essen, Tag, Wasser, Arbeit...), common adjectives/adverbs
  (gut, groß, klein, glücklich, sehr, hier...).
- Proper nouns are exempt but keep them simple and pronounceable.
- A handful of unavoidable topic words outside this ceiling are
  acceptable only if context makes the meaning obvious.
- **Avoid long compound nouns** (Komposita) beyond the most common,
  everyday ones (Wochenende, Geburtstag) — A1 readers cannot parse
  invented multi-part compounds like "Donaudampfschifffahrt".

## 2. Sentence length (hard constraints)

- **Average sentence length: 8 words or fewer** (whitespace tokenization).
- **No single sentence may exceed 15 words.**
- Short, simple sentences with normal (Subject-Verb-Object) word order.
  Avoid subordinate clauses (weil/dass/wenn) almost entirely — if used at
  all, only one per sentence and only the simplest kind.

## 3. Allowed and forbidden grammar

**Allowed only:**

- Präsens (sein, haben, regelmäßige Verben, and the most common irregular
  verbs: gehen, fahren, essen, sehen, wollen, können, müssen, mögen).
- Near future expressed with present tense + time word ("Morgen geht sie
  einkaufen.") rather than werden-future.
- Simple Imperativ for commands if natural ("Komm hierher.").

**Explicitly forbidden:**

- Präteritum, Perfekt, Plusquamperfekt — any past tense is too advanced
  for A1.
- Konjunktiv in any form.
- Passive voice (Passiv).
- Complex subordinate clause chains (more than one per sentence).

If the plot seems to require a forbidden tense (e.g. a flashback), tell it
as a new present-tense scene instead.

## 4. Length and structure

- Each chapter (each `# ` section) should be **roughly 250–400 words**.
  A typical A1 story has 2–4 chapters.
- Give each chapter a short, concrete German title.

## 5. Cultural accessibility

- Avoid references specific to one German-speaking country's pop culture,
  brand names, or school system that a general international reader
  wouldn't recognize.
- Universal, concrete details (weather, food, family, a market, a walk)
  are ideal.
- Use neutral, standard German (Hochdeutsch) — avoid dialect words.

## 6. Output format

Output ONLY the story in this exact Markdown structure — no commentary
before or after:

```
---
title: "<German title>"
author: "Lingo Studio"
target_level: A1
target_language: de
genres: [<1-3 from: adventure, mystery, romance, comedy, drama, fantasy,
  thriller, everyday-life, thought, gothic-horror>]
themes: [<2-4 lowercase single/hyphenated words>]
generation_prompt_version: generate_story_a1_de_v1
---

# <Chapter 1 title>

<chapter 1 text, 250-400 words>

# <Chapter 2 title>

<chapter 2 text, 250-400 words>
```

Write the full story now for this premise:

{premise}
