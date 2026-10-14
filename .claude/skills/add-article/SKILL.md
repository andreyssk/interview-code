---
name: add-article
description: Add a theory article to the interview-prep app from text the user pastes, as an upload JSON for the admin panel, with its category, source and links to tasks. Use when the user sends article text and asks to add it to the theory section.
---

# Add a theory article

Articles live in the **database** (table `articles` plus `article_categories` and `article_tasks`), managed through the admin
panel (`/admin/articles`). There are no per-article files in the repo and no translations: the text is stored once, as
written (usually Russian).

You produce **one JSON file** in the upload format and save it as `content/articles/<slug>.json` in the repo (a versioned
copy of what was added). The user imports it with **Admin → Articles → Upload article JSON** (or you import it yourself, see step 4).

```json
{
  "slug": "go-strings-basics",
  "title": "Основы строк",
  "summary": "One sentence for the card in the theory list.",
  "content": [ { "p": "…" }, { "h": "…" }, { "pre": "line1\nline2" }, { "ul": ["…"] }, { "note": "…" } ],
  "sourceName": "algocode.io",
  "sourceUrl": "https://algocode.io",
  "category": "strings",
  "categories": [],
  "tasks": []
}
```

## 1. Collect what the article needs

From the user's message (ask for anything missing, never guess it):
- **Category.** One slug of an existing category (list them in step 2); it decides the section (Algorithms, Golang, SQL) the article is listed under and where its "Practice" button leads. "Big category: Golang, sub category: Strings" means the slug `strings`. If the category does not exist it is created automatically on import (name from the slug) in the section given by an optional top-level `"section"` in the JSON, or in `other`; ask the user which section they want for a new category.
- **Title** (given by the user, keep it exactly) and the **text**.
- **Source**, e.g. `algocode.io`. Ask if the user did not give one; leave it out only if they say there is none. A bare domain gets the url `https://<domain>`; mention that you did this.
- **Links to tasks** (optional): extra categories (`categories`) or individual tasks (`tasks`, task slugs from `/api/content`) the article should be suggested on. The main category is always included automatically. Do not invent links; only add what the user asked for.

## 2. Slug

kebab-case and unique, specific enough that several articles of the same kind don't collide: `go-strings-basics`, not `basics`. Check the existing slugs and categories:

```sh
cd backend && curl -s -c /tmp/jar -X POST 127.0.0.1:8080/api/auth/login -H 'Content-Type: application/json' \
  -d "{\"username\":\"$ADMIN_USERNAME\",\"password\":\"$ADMIN_PASSWORD\"}" >/dev/null   # values from the repo's .env
curl -s -b /tmp/jar 127.0.0.1:8080/api/content | python3 -c "import json,sys;c=json.load(sys.stdin);print([x['slug'] for x in c['articles']],[x['slug'] for x in c['categories']],[x['slug'] for x in c['tasks']])"
```

## 3. Build the JSON

- Keep the user's wording. Reformat only: split into blocks, turn section titles into `{ "h" }`, code into `{ "pre" }` (use `\n` and `\t`), and the closing remark or warning into `{ "note" }`. Do not add your own explanations, examples or sections. Typos can be fixed; if something looks factually wrong, leave it and tell the user.
- Code samples go in verbatim, including comments.
- A "В этом уроке ты…" goals list becomes a `{ "p" }` intro plus a `{ "ul" }`.
- Each block has exactly one key. Inline markup is limited to `<code>…</code>` and `<b>…</b>`; the text is **not HTML**: write `<`, `>` and `&` as plain characters, never `&lt;` or `&amp;`.
- `summary` is the only text you write yourself: one short sentence, built from the article's own content, in the article's language. Show it to the user in the report.
- `category` decides the section the article is listed under and where "Practice" leads. `categories` / `tasks` (task slugs) list extra places the article is suggested on a task's ⓘ popover; leave them empty unless the user asked.
- Never put the article in a category or link a task that does not exist (the server rejects unknown ones).

## 4. Import and check

1. `python3 -m json.tool content/articles/<slug>.json` must pass.
2. Either tell the user to upload the file in **Admin → Articles**, or (only when asked, and only against the local backend) import it:
   `curl -s -b /tmp/jar -X PUT 127.0.0.1:8080/api/admin/articles/<slug> -H 'Content-Type: application/json' -d @content/articles/<slug>.json` (204 = saved, 400 carries a readable message; an existing slug is replaced).
3. Once imported, open `/theory` (the article is under the right section) and `/theory/<slug>` (source shown, code blocks intact, no literal `&lt;`).

## 5. Report

Tell the user: the file written and whether it is imported, the slug, the category and section it landed in, the source (and the url you derived from a bare domain), any task or category links, the `summary` you wrote, and anything in the text you changed or were unsure about.
