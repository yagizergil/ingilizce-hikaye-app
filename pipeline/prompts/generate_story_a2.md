# Generate A2 Story — v1

**Version: `generate_story_a2_v1`** — pass this exact string as the
`generation_prompt_version` frontmatter field (or via
`BookMeta.generation_prompt_version`) for any book generated with this
prompt, so `public.books.generation_prompt_version` records provenance.
If this prompt is ever materially changed, bump to `generate_story_a2_v2`
and keep this file's old contents in version control — never silently
rewrite v1 in place.

You are writing an original short story in English for a Turkish reader
studying English at CEFR level **A2**. Follow every constraint below
exactly. This is not a graded reader excerpt or a simplification of an
existing story — it is a new, original piece of fiction.

## 1. Vocabulary ceiling

- Use only words from the **NGSL (New General Service List) first 1500
  words** as your headword vocabulary ceiling. Do not reach for a rarer
  synonym when a common one exists.
- Proper nouns (character/place names) are exempt from the ceiling, but
  keep them simple and pronounceable — no invented names that look like
  puzzles to a beginner reader.
- A small number of unavoidable topic words outside the NGSL 1500 (e.g.
  a specific food, a specific object central to the plot) are acceptable
  only if the surrounding sentence makes the meaning clear from context.
  Keep this to an absolute minimum — a handful of words in the entire
  story, not per chapter.

## 2. Sentence length (hard constraints)

- **Average sentence length across the whole story: 12 words or fewer.**
- **No single sentence may exceed 25 words.** If a sentence would run
  longer, split it into two.
- Prefer simple and compound sentences (joined with *and*, *but*, *so*,
  *or*). Avoid stacking more than one subordinate clause per sentence.
- These numbers are not a suggestion — a generated story that violates
  either will be **rejected** by `pipeline validate` / `pipeline check`
  (see `pipeline/src/validator.py`, STRICT mode, A2 row: avg ≤ 12,
  max ≤ 25, coverage ≥ 95%, off-list ratio ≤ 3%).

## 3. Allowed and forbidden grammar

**Allowed tenses/structures only:**
- Present simple ("She walks to school every day.")
- Present continuous ("She is walking to school now.")
- Past simple ("She walked to school yesterday.")
- Going-to future ("She is going to walk to school tomorrow.")
- Modal verbs *can* and *must* only (no *should*, *might*, *would*,
  *could* as a hypothetical, etc.)

**Explicitly forbidden:**
- Any present perfect ("She has walked...", "She has been...")
- Any conditional sentence, of any type ("If she walked...", "If she
  had walked...", "She would walk if...")
- Passive voice, relative clauses with *whom/whose*, and reported speech
  with tense-backshifting are also out of scope for A2 — keep sentences
  active and direct.

If the plot seems to require a forbidden structure (e.g. a flashback that
would naturally use present perfect), restructure the scene instead —
tell it as a new past-simple scene, don't reach for the forbidden tense.

## 4. Length and structure

- Each chapter (each `# ` section in the output) should be **roughly
  600–900 words**. A typical story for this prompt has 3–6 chapters.
- Give each chapter a short, concrete title (not "Chapter 1" — a title
  that hints at what happens, e.g. "The Locked Door").

## 5. Cultural accessibility for Turkish readers

- Do not rely on US/UK insider cultural references (specific TV shows,
  school systems, sports leagues, festivals, brand names, idioms rooted
  in American or British life) that a Turkish A2 learner would not
  recognize.
- Settings, foods, family structures, and everyday routines should be
  written so they make sense to a general international reader — avoid
  anything that assumes background knowledge specific to US/UK culture.
- Universal, concrete details (weather, food, a school day, a market, a
  bus ride, a family dinner) travel well. When in doubt, choose the more
  universal option.

## 6. What NOT to do

- **No clichéd openings.** Never start with "Once upon a time", "Many
  years ago", "In a small town, there lived...", or any equivalent
  fairy-tale framing device. Start in a scene, with something happening.
- **No artificial textbook dialogue.** Do not write dialogue that exists
  only to demonstrate a grammar point ("What is your name?" "My name is
  Ali. What is your name?"). Every line of dialogue must do real work in
  the scene — reveal character, move the plot, or create tension.
- **No repetitive sentence patterns.** Do not fall into "She did X. She
  did Y. She did Z." for paragraph after paragraph. Vary sentence
  openings and rhythm within the allowed grammar.
- **No pure-emotion-narration scenes with zero action.** Do not write a
  paragraph that only describes how a character feels ("She was sad. She
  was very sad. She felt alone.") with nothing happening. Emotion must be
  shown through action, dialogue, or a concrete detail — not stated in a
  vacuum.

## 7. Plot mechanics (required)

- The main character must have a **concrete WANT** — a specific, visible
  goal they are pursuing (find something, fix something, reach somewhere,
  win something, protect someone), not a vague internal state ("she
  wanted to be happy").
- There must be a **concrete OBSTACLE** standing between the character
  and that want — a real plot mechanic (a locked door, a missing map, a
  rival, a storm, a lost train, a broken promise), not just internal
  doubt.
- The story should resolve the want/obstacle by the final chapter,
  through the character's own actions.

## 8. Output format (must match exactly)

Output **only** the story in the following Markdown ingest format — this
is parsed by `pipeline/src/markdown/parser.py` (`pipeline ingest --file
story.md`). No extra commentary before or after.

```
---
title: <story title>
author: <author name to credit — ask the operator if unspecified>
target_level: A2
genres: [<comma-separated genre list, e.g. adventure, mystery>]
themes: [<comma-separated theme list, e.g. friendship, courage>]
series: <slug>       # OPTIONAL — omit entirely if not part of a series
series_index: <n>    # OPTIONAL — 1-indexed position in the series
generation_prompt_version: generate_story_a2_v1
---

# <Chapter 1 title>

<Paragraph one. Plain prose, no markdown formatting inside — no bold,
italic, or links. Blank line between paragraphs.>

<Paragraph two.>

# <Chapter 2 title>

<...>
```

Rules for the format itself:
- YAML frontmatter is **required** — malformed or missing frontmatter,
  or a missing/invalid `title`/`author`/`target_level`, will be rejected
  by the parser with a specific error (`MarkdownFrontmatterError`).
  `target_level` must be exactly `A2` for output generated with this
  prompt.
- Each chapter starts with a single `# ` (H1) heading line.
- Paragraphs are separated by a single blank line. Do not use markdown
  emphasis, links, or inline code inside paragraph text — write plain
  prose only (any such formatting would be flattened to plain text by
  the parser anyway, so including it is wasted effort).
- Do not use dialogue-table or drama formatting — this is prose fiction.

## 9. Self-check before returning output

Before returning the story, verify:
- [ ] Every sentence is present simple, present continuous, past simple,
      going-to future, or *can*/*must* modal — nothing else.
- [ ] No sentence exceeds 25 words; the average across the story is at
      or under 12 words per sentence (count roughly, err on the side of
      shorter).
- [ ] No word outside the NGSL first 1500 appears more than a handful of
      times total in the whole story.
- [ ] The opening is not a cliché ("Once upon a time...").
- [ ] Every scene has something happening — no pure-emotion paragraphs.
- [ ] The main character's want and the obstacle are both concrete and
      stated (implicitly, through the story) by the end of chapter one.
- [ ] The output is valid frontmatter + `# ` headings + blank-line
      paragraphs, nothing else.
