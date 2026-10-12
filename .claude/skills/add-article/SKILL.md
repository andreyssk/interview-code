---
name: add-article
description: Add a theory article to the interview-prep app from text the user pastes (Russian only, no English translation), with its category, source and links to tasks. Use when the user sends article text and asks to add it to the theory section.
---

# Add a theory article

The frontend uses Feature-Sliced Design with i18next. An article is a folder in
`frontend/src/entities/theory/model/data/<slug>/` that is registered by hand in `model/theory.ts`.
There is no database. Use `data/go-strings-basics/` as the reference (Russian only) and `data/two-pointers/`
for a note that has both languages.

```
data/<slug>/
  index.ts    the TheoryDef: slug, category, source, optional extra links; registers the texts
  ru.json     { title, summary, content: [blocks] }
```

**Articles are Russian only.** Do not write or ask for an English translation: `addTexts('theory', slug, { ru })` shows the Russian text in every interface language. Only add `en.json` if the user explicitly asks.

## 1. Collect what the article needs

From the user's message (ask for anything missing, never guess it):
- **Category.** One slug from `frontend/src/entities/category/model/categories.ts`; it decides the section (Algorithms, Golang, SQL) the article is listed under and where its "Practice" button leads. "Big category: Golang, sub category: Strings" means the slug `strings`. If the category does not exist, ask before adding it (add it to `categories.ts` with a `section`, and `categories.<slug>.name` to both `locales/{en,ru}.json`).
- **Title** (given by the user, keep it exactly) and the **text**.
- **Source**, e.g. `algocode.io`. Ask if the user did not give one; leave it out only if they say there is none. A bare domain gets the url `https://<domain>`; mention that you did this.
- **Links to tasks** (optional): extra categories (`categories`) or individual tasks (`tasks`, task slugs from `entities/task/data/`) the article should be suggested on. The main category is always included automatically. Do not invent links; only add what the user asked for.

## 2. Slug

kebab-case and unique, specific enough that several articles of the same kind don't collide: `go-strings-basics`, not `basics`.

## 3. ru.json

```json
{
  "title": "Основы строк",
  "summary": "One sentence for the card in the theory list.",
  "content": [ { "p": "…" }, { "h": "…" }, { "pre": "line1\nline2" }, { "ul": ["…"] }, { "note": "…" } ]
}
```
- Keep the user's wording. Reformat only: split into blocks, turn section titles into `{ "h" }`, code into `{ "pre" }` (use `\n` and `\t`), and the closing remark or warning into `{ "note" }`. Do not add your own explanations, examples or sections. Typos can be fixed; if something looks factually wrong, leave it and tell the user.
- Code samples go in verbatim, including comments.
- A "В этом уроке ты…" goals list becomes a `{ "p" }` intro plus a `{ "ul" }`.
- Inline markup is limited to `<code>…</code>` and `<b>…</b>`. Everything else is plain text, **not HTML**: write `<`, `>` and `&` as plain characters, never `&lt;` or `&amp;`.
- `summary` is the only text you write yourself: one short sentence in Russian, built from the article's own content. Show it to the user in the report.

## 4. index.ts

```ts
import { addTexts } from '@/shared/i18n'
import type { TheoryDef } from '../../types'
import ru from './ru.json'

addTexts('theory', 'go-strings-basics', { ru })

export const goStringsBasics: TheoryDef = {
  slug: 'go-strings-basics',
  category: 'strings',
  source: { name: 'algocode.io', url: 'https://algocode.io' },
  // categories: ['slices'],        // optional: also suggest it on these categories' tasks
  // tasks: ['reverse-string'],     // optional: and on these individual tasks
}
```

## 5. Register it

In `frontend/src/entities/theory/model/theory.ts` import the note and add it to the `theory` array. Nothing else needs touching: the list page groups it by the section of its category, and the task page's ⓘ popover picks it up for matching tasks.

## 6. Verify (do not skip)

1. `cd frontend && npx tsc --noEmit -p tsconfig.app.json && npx vite build` must pass (a missing `ru.json` or a JSON typo fails here).
2. Open `/theory` (the article is under the right section), `/theory/<slug>` (source shown, code blocks intact, no literal `&lt;`) and, if it is linked to tasks, one of those tasks to see the ⓘ button in the editor header.

## 7. Report

Tell the user: the slug, the category and section it landed in, the source (and the url you derived), any task or category links added, the `summary` you wrote, and anything in the text you changed or were unsure about.
