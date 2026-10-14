---
name: add-task
description: Add a new coding problem to the interview-prep app from screenshots (statement and starter code) as an upload JSON for the admin panel, with tests and an optional reference solution. No web lookups. Use when the user sends screenshots of a task (e.g. from a LeetCode-like site) and asks to add it.
---

# Add a task from screenshots

Tasks live in the **database** (tables `tasks`, `task_categories`, `task_companies`), managed through the admin panel
(`/admin/tasks`). There are no per-task files in the repo any more and no translations: the text is stored once, in the
language it was written in (usually Russian). The starter code and the Go test harness are **generated** by the frontend
from `signature` + `tests`, so never write Go test files.

You produce **one JSON file** in the upload format and save it as `content/tasks/<slug>.json` in the repo (a versioned
copy of what was added). The user imports it with **Admin → Tasks → Upload task JSON** (or you import it yourself, see step 6).
The server assigns the unique `number`; never put one in the file.

```json
{
  "slug": "sorted-squares",
  "title": "Квадраты отсортированного массива",
  "difficulty": "easy",
  "categories": ["two-pointers"],
  "companies": ["vk", "yandex"],
  "leetcodeUrl": null,
  "description": [ { "p": "…" }, { "h": "Пример 1:" }, { "pre": "Ввод: …\nВывод: …" } ],
  "signature": { "name": "sortedSquares", "params": [{ "name": "nums", "type": "[]int" }], "returns": "[]int" },
  "tests": [ { "name": "example 1", "input": { "nums": [-4, -1, 0, 3, 10] }, "expected": [0, 1, 9, 16, 100] } ],
  "solution": "package main\n…",
  "solutionNotes": [ { "h": "Оценка сложности" }, { "ul": ["Время: O(n)", "Память: O(1)"] } ],
  "commonMistakes": [ { "ul": ["…"] } ],
  "complexity": { "time": "O(n)", "space": "O(1)" },
  "template": null
}
```

## 1. Extract from the screenshots

Read every image and collect:
- **Title** (original language, usually Russian) and an English translation
- **Difficulty**: легко/easy, средне/medium, сложно/hard
- **Company tags** (`# вк`, `# яндекс`, …): map each to a company slug (вк → `vk`, яндекс → `yandex`, желтый банк → `yellow-bank`, озон → `ozon`, авито → `avito`). Ignore the `# решено` tag; solved state is stored in the browser.
- **Statement**: paragraphs, inline code (`nums`), examples (Ввод/Вывод), constraints
- **Starter code** from the editor panel: this gives the function name, parameter names/types and return type
- **Reference solution**, only if the user sent it (the site's «Решение» tab or pasted text): the Go code, the «Оценка сложности» text (time/space) and any note under it. Pasted text often carries the language-picker labels (C#, C++, Go, Java, Python, JavaScript) or code in other languages: ignore everything that is not Go

Copy text faithfully. If a screenshot is cut off (e.g. the constraints list), include only what is visible and tell the user what is missing. Never invent constraints or examples.

## 2. Don't look for the problem on LeetCode

Do not search the web or LeetCode for the task, and do not fetch anything for it; the screenshots are the only source. Leave `leetcodeUrl` out of `task.json` unless the user hands you the link.

## 3. Companies and categories

Slugs, names and colors are **data in the database**, not code. Read the current ones before choosing:

```sh
cd backend && curl -s -c /tmp/jar -X POST 127.0.0.1:8080/api/auth/login -H 'Content-Type: application/json' \
  -d "{\"username\":\"$ADMIN_USERNAME\",\"password\":\"$ADMIN_PASSWORD\"}" >/dev/null   # values from the repo's .env
curl -s -b /tmp/jar 127.0.0.1:8080/api/content | python3 -c "import json,sys;c=json.load(sys.stdin);print([x['slug'] for x in c['categories']],[x['slug'] for x in c['companies']])"
```

- **Companies** (`# вк`, `# яндекс`, …): map each tag to an existing slug (вк → `vk`, яндекс → `yandex`, желтый банк → `yellow-bank`, озон → `ozon`, авито → `avito`). Ignore `# решено`. A company, category or section that does not exist yet is **created automatically on import** (name derived from the slug, e.g. `hash-map` → "Hash Map", random glyph/color); the user can polish it later in the admin panel.
- **Categories**: never choose or infer one yourself. Use only what the input says (the user's message, or a category/course name visible in the screenshots or pasted text). If the input gives none, ask before creating the file. A new category goes into the section named by an optional top-level `"section": "<slug>"` in the JSON (created if missing), or into `other` when there is none; ask the user which section they want for a new category.

## 4. Build the JSON

- `slug`: kebab-case, unique (check `/api/content`); it is also the URL and what saved attempts are keyed by.
- `signature.params[].type` and `returns` are Go types and must be JSON-representable: `int`, `string`, `bool`, `float64`, slices, nested slices, maps, and `[]rune` (written in tests as an array of one-character strings, e.g. `["a","b"]`). Types such as linked-list nodes or trees need a custom harness and are not supported yet; tell the user instead of improvising.
- In-place tasks (the function returns nothing and modifies an argument): omit `returns` and set `"mutates": "<param name>"`; `expected` is then that parameter's final value.
- When the statement says the answer may be returned in any order (e.g. groups of anagrams) add `"compare": "unordered"` to the signature.
- `template` stays `null` (starter code is generated from the signature) unless the screenshot shows something different (e.g. named results).
- **tests**: may be an empty list `[]` (then the task is visible and its code can be run, but not submitted until tests are added). When there are tests, input keys must match the parameter names exactly (the server rejects missing or extra ones). Use the statement's examples first, then edge cases (minimum size, duplicates, negatives, extremes, empty values when the constraints allow them). Tests are public (shown on the Tests tab): keep them small and verify every `expected` by hand. Never put a backtick in test data.
- **timeLimitSec** (optional): how many seconds a run of the user's program may take, 1 to 30; leave it out (or `null`) for the server default of 5. Set it only when the user asked for a limit or the screenshot states one. It is shown to users on the task page.
- **solution**: only when the user provided one: their code **verbatim** (you may only `gofmt` it; keep its Russian comments; never "improve" it). Otherwise `null`, and also no `complexity` and no `solutionNotes`.
- **solutionNotes**: only the text the user gave (typically «Оценка сложности» with its Время/Память bullets and any note after it), in the site's style, not extended with your own explanation. `complexity` comes from the same text.
- **commonMistakes**: optional block list shown as its own «Типичные ошибки» section on the solution tab (works without a reference solution). Only the mistakes the user listed. Otherwise `null`.
- **description / solutionNotes / commonMistakes blocks**: `{ "p": "…" }`, `{ "h": "…" }`, `{ "pre": "line1\nline2" }`, `{ "ul": ["…"] }`, `{ "note": "…" }` (the site's blue box, e.g. «Частая ошибка: …»). Each block has exactly one key. Inline markup is limited to `<code>…</code>` and `<b>…</b>`; the text is **not HTML**: write `<`, `>` and `&` as plain characters, never `&lt;`.
- Copy text faithfully from the screenshots. Never invent constraints or examples.

## 5. Check

1. The file is valid JSON and matches the shape above (`python3 -m json.tool content/tasks/<slug>.json`).
2. If there is a solution: it must pass the tests. In the admin form the **Verify solution against tests** button does exactly this; you can also run the solution yourself with a throwaway Go `main` that embeds the tests. Never edit the user's solution to make it pass; if a test's `expected` is wrong fix the test, and if the solution itself looks wrong tell the user.
3. The generated starter code must not accidentally be a passing solution (it is an empty function, so it should fail).

## 6. Import

Either tell the user to upload `content/tasks/<slug>.json` in **Admin → Tasks**, or import it yourself (only when the user asked you to, and only against the local backend):

```sh
curl -s -b /tmp/jar -X PUT 127.0.0.1:8080/api/admin/tasks/<slug> -H 'Content-Type: application/json' -d @content/tasks/<slug>.json
```

A 204 means saved; a 400 carries a readable validation message. An existing slug is replaced (its number is kept).

## 7. Report

Tell the user: the file written and whether it is imported, the categories used and where they came from, the test cases you wrote (they are yours unless the screenshots showed them), whether a reference solution was provided (and kept verbatim), and anything cut off in the screenshots or differing between them (for example a parameter name in the statement versus the starter code).
