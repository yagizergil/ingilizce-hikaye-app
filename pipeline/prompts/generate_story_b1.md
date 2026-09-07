# Generate B1 Story — v1

**Version: `generate_story_b1_v1`** — pass this exact string as the
`generation_prompt_version` frontmatter field (or via
`BookMeta.generation_prompt_version`) for any book generated with this
prompt, so `public.books.generation_prompt_version` records provenance.
If this prompt is ever materially changed, bump to `generate_story_b1_v2`
and keep this file's old contents in version control — never silently
rewrite v1 in place.

**Why this prompt exists.** The catalogue had a hard cliff at B1: 39
original levelled stories at A1/A2 (6–8 minutes each), then *zero*
original content at B1 and an immediate jump to unabridged classics
averaging 197 minutes. A reader who finished the A2 shelf had nowhere to
go but a three-hour novel. This prompt fills that step — the same
levelled-original discipline as `generate_story_a2.md`, one CEFR band up
and roughly twice as long.

You are writing an original short story in English for a Turkish reader
studying English at CEFR level **B1**. Follow every constraint below
exactly. This is not a graded reader excerpt or a simplification of an
existing story — it is a new, original piece of fiction.

## 1. Vocabulary ceiling

- Use only words from the **NGSL (New General Service List) first 2800
  words** as your headword vocabulary ceiling. This is roughly double the
  A2 prompt's ceiling and is what makes B1 feel like a real step up
  rather than a longer A2 story.
- Do not reach for a rarer synonym when a common one exists. "Big
  argument" beats "vociferous altercation" at every level, including this
  one.
- Proper nouns (character/place names) are exempt from the ceiling, but
  keep them pronounceable — no invented names that look like puzzles.
- A small number of unavoidable topic words outside the NGSL 2800 (a
  specific food, a trade, an object central to the plot) are acceptable
  **only if the surrounding sentence makes the meaning clear from
  context**, and only a handful in the entire story.
- **Hard gate:** the validator requires ≥95% cumulative B1 coverage and
  rejects an off-list ratio above 5% (warns above 3%). A story that
  reaches for literary vocabulary will fail this gate, not impress it.

## 2. Sentence length (hard constraints)

- **Average sentence length across the whole story: between 13 and 16
  words.** Both ends of that range matter — see the floor below.
- **No single sentence may exceed 35 words.** If a sentence would run
  longer, split it.

**There is a FLOOR, not just a ceiling.** The A2 prompt's ceiling is 12
words per sentence. A B1 story that averages under 13 is, structurally, an
A2 story with harder vocabulary — it will pass the validator (which only
checks the ceiling) and still fail the reader, who gets no sense of
progression. The first draft written against this prompt averaged 9.4
words per sentence; that is the failure mode to avoid.

Concretely, this means: join clauses that belong together instead of
splitting every idea into its own sentence. Use the relative clauses,
conditionals and time clauses that §3 unlocks — they exist precisely so a
B1 sentence can carry two connected ideas.

The published thresholds for B1 are avg ≤ 19 and max ≤ 45
(`pipeline/config/thresholds.yaml`). The 16 above is deliberately tighter
so a story that drifts while being written still passes rather than
landing exactly on the line. Do not treat the published threshold as the
target.

Vary the rhythm: B1 prose should mix short sentences with longer ones. A
story where every sentence is the same length reads like a worksheet,
even when every individual sentence is correct.

## 3. Allowed and forbidden grammar

**Allowed at B1 — everything A2 allows, plus:**
- Present perfect ("She has lived here for six years.") and present
  perfect continuous, used sparingly
- Past continuous ("He was waiting when the bus finally came.")
- Past perfect, but only where the time order genuinely needs it
- *will* future and future continuous, alongside *going to*
- The full common modal set: *should*, *could*, *might*, *would*, *have
  to*, *need to*
- First and second conditionals ("If it rains, we will stay." / "If I had
  more time, I would help.")
- Defining and non-defining relative clauses (*who*, *which*, *that*,
  *where*)
- Simple passive voice ("The shop was closed in the spring.")
- Reported speech with normal backshift

**Still out of scope at B1:**
- Third conditional and mixed conditionals ("If she had left earlier, she
  would have caught it.")
- Inversion for emphasis ("Never had he seen...", "Only then did she...")
- Subjunctive forms ("I suggest that he be told.")
- Participle clauses used as sentence openers ("Having finished the
  letter, she...")
- Heavy nominalisation — prefer "they decided quickly" over "the rapidity
  of their decision-making"

If the plot seems to require a forbidden structure, restructure the scene
instead of reaching for it.

## 4. Length and structure

- Each chapter (each `# ` section) should be **roughly 550–800 words**.
- A story for this prompt has **3–5 chapters**, for a total of roughly
  **1,800–3,200 words** — about 13–23 minutes of reading.
- This length is the point of the prompt. An 800-word B1 story would
  leave the A2→classics gap exactly where it was.
- Give each chapter a short, concrete title (not "Chapter 1" — a title
  that hints at what happens, e.g. "The Second Letter").

## 5. Cultural accessibility for Turkish readers

- Do not rely on US/UK insider cultural references (TV shows, school
  systems, sports leagues, festivals, brand names, idioms rooted in
  American or British life) that a Turkish B1 learner would not
  recognise.
- Settings, foods, family structures, and everyday routines should make
  sense to a general international reader.
- Universal, concrete details (weather, food, a workplace, a market, a
  long bus ride, a family dinner, a small debt) travel well.
- B1 readers can handle a slightly wider world than A2 — a workplace, a
  small town's politics, a family business, a move to another city — but
  the *reference points* must stay universal.

## 6. What NOT to do

- **No clichéd openings.** Never "Once upon a time", "Many years ago",
  "In a small town, there lived...". Start in a scene, with something
  happening.
- **No artificial textbook dialogue.** Every line must reveal character,
  move the plot, or create tension. Dialogue that exists to demonstrate a
  grammar point is a failure even if the grammar is correct.
- **No repetitive sentence patterns.** Vary openings and rhythm.
- **No pure-emotion-narration scenes with zero action.** Emotion is shown
  through action, dialogue, or a concrete detail — never stated in a
  vacuum ("She was sad. She was very sad.").
- **No "A2 story, but longer."** B1 is not A2 with more pages. The
  sentences carry more than one idea, the timeline can move, characters
  can want two things at once. If the draft would pass the A2 validator
  unchanged, it is not a B1 story.

## 7. Plot mechanics (required)

- The main character must have a **concrete WANT** — a specific, visible
  goal (find something, fix something, reach somewhere, protect someone),
  not a vague internal state.
- There must be a **concrete OBSTACLE** — a real plot mechanic (a locked
  door, a missing document, a rival, a debt, a deadline, a broken
  promise), not just internal doubt.
- **B1 addition:** the story needs one genuine **complication or turn** —
  a point where what the character believed turns out to be wrong, or the
  cost of the goal changes. A2 stories can run straight; a B1 story that
  runs straight feels thin at this length.
- The want/obstacle resolves by the final chapter, through the
  character's own actions. The resolution does not have to be a happy
  one, but it must be earned rather than lucky.

## 8. Output format (must match exactly)

Output **only** the story in the following Markdown ingest format — this
is parsed by `pipeline/src/markdown/parser.py` (`pipeline ingest --file
story.md`). No extra commentary before or after.

```
---
title: <story title>
author: <author name to credit — ask the operator if unspecified>
target_level: B1
genres: [<comma-separated genre list, e.g. adventure, mystery>]
themes: [<comma-separated theme list, e.g. friendship, courage>]
series: <slug>       # OPTIONAL — omit entirely if not part of a series
series_index: <n>    # OPTIONAL — 1-indexed position in the series
generation_prompt_version: generate_story_b1_v1
---

# <Chapter 1 title>

<Paragraph one. Plain prose, no markdown formatting inside — no bold,
italic, or links. Blank line between paragraphs.>

<Paragraph two.>

# <Chapter 2 title>

<...>
```

Rules for the format itself:
- YAML frontmatter is **required** — malformed or missing frontmatter, or
  a missing/invalid `title`/`author`/`target_level`, will be rejected by
  the parser with a specific error (`MarkdownFrontmatterError`).
  `target_level` must be exactly `B1` for output generated with this
  prompt.
- Each chapter starts with a single `# ` (H1) heading line.
- Paragraphs are separated by a single blank line. Do not use markdown
  emphasis, links, or inline code inside paragraph text — plain prose
  only (the parser flattens it anyway, so it is wasted effort).
- Do not use dialogue-table or drama formatting — this is prose fiction.

## 9. Self-check before returning output

Before returning the story, verify:
- [ ] Every structure used is on the B1 allowed list — no third
      conditionals, no inversion, no participle openers.
- [ ] No sentence exceeds 35 words, AND the average lands between 13 and
      16 — under 13 means the story is structurally A2, which is the
      single most likely way to fail this prompt.
- [ ] Sentence length actually varies — not every sentence the same size.
- [ ] Vocabulary stays inside NGSL 2800 apart from a handful of
      context-clear topic words.
- [ ] The story is 1,800–3,200 words across 3–5 chapters.
- [ ] The opening is not a cliché, and no scene is pure emotion with
      nothing happening.
- [ ] The want and the obstacle are concrete, and there is one real
      complication or turn.
- [ ] The output is valid frontmatter + `# ` headings + blank-line
      paragraphs, nothing else.
