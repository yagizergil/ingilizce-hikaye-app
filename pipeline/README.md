# Content Pipeline

Python 3.12 pipeline that turns public-domain English texts into story
records the app reads from Supabase. Kept fully separate from the app: no
import boundary crosses between `pipeline/` and `app/` / `src/`.

**Still not implemented — this is still the skeleton commit.** `pyproject.toml`,
`.env.example`, and an empty `src/__init__.py` exist; there is no scraping,
cleaning, leveling, or upload code yet. Planned stages live in
`docs/ROADMAP.md` step 4.

## The 5 books currently in Supabase did not come from this pipeline

As of the reader-screen work session, the live `hikaye` Supabase project has
5 real books (`Frankenstein`, `Pride and Prejudice`, `The Count of Monte
Cristo`, `Meditations`, `The Odyssey`) with real, unmodified public-domain
text (fetched from GITenberg/Project Gutenberg mirrors) for **only their
first section each** (paragraphs + sentences, fully populated). This content
was loaded by a one-off ad-hoc Python script run outside this package
(scratch, not committed) plus manual `INSERT` statements executed directly
against Supabase — not by anything in `pipeline/`. `book_tokens` (word-tap
data) and `lemmas` (Turkish translations) are still completely empty (0
rows) for all 5 books, so word-tap lookup doesn't work anywhere yet; only
plain reading and sentence long-press do.

Treat that data as a placeholder to develop the reader UI against, not as
proof this pipeline works. Building the real pipeline still needs to:

- fetch full texts (all chapters, not just chapter 1) from a public-domain
  source,
- strip source boilerplate (license headers/footers),
- split into `book_sections` → `book_paragraphs` → `book_sentences` →
  `book_tokens` with correct character offsets,
- tokenize and lemmatize properly (the placeholder data lemmatizes with a
  naive `surface.lower()`, no real POS tagging),
- populate `lemmas.tr_gloss` with actual Turkish translations,
- estimate CEFR level per book instead of the placeholder metadata
  currently in `books` (all 5 books are seeded at a flat `C2` with
  identical placeholder `genres`/`content_warnings` — not computed),
- write everything via `service_role`, and
- do all of the above for full books, not just an opening excerpt.

## Setup

```bash
cd pipeline
python3 -m venv .venv
source .venv/bin/activate
pip install -e .
cp .env.example .env  # fill in SUPABASE_SERVICE_ROLE_KEY, never commit it
```
