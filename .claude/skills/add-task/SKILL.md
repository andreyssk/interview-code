---
name: add-task
description: Add a new coding problem to the interview-prep app from screenshots (statement and starter code), with English/Russian translations, tests and a reference solution. No web lookups. Use when the user sends screenshots of a task (e.g. from a LeetCode-like site) and asks to add it.
---

# Add a task from screenshots

The frontend uses Feature-Sliced Design with i18next. A task is a folder of four JSON files in
`frontend/src/entities/task/data/<slug>/`, discovered automatically (nothing to register). There is no database;
the backend only runs Go code. The starter code and the Go test harness are **generated** from `task.json` and
`tests.json`, so never write Go files for a task. Use `data/sorted-squares/` as the reference.

```
data/<slug>/
  task.json     difficulty, categories, companies (slugs), signature, complexity (leetcodeUrl is optional, user-provided only)
  tests.json    test cases (shown on the Tests tab and run by the backend)
  solution.go   reference solution (Solution tab); only if the user provided one
  ru.json       title, description and solution notes (original language)
  en.json       same keys, English
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

## 3. Companies

Slugs, colors and names are defined once, so a tag looks the same in every language: colors in `frontend/src/entities/task/model/companies.ts` (vk blue, yandex red, yellow-bank yellow, ozon indigo, avito green) and display names in `frontend/src/shared/i18n/locales/{en,ru}.json` under `companies`. For a company not there yet, add its slug, a color class (add a `neon-*` class in `app/styles/index.css` if none fits) and both names; ask the user which color they want.

## 4. Categories

Never choose or infer a category yourself. Use only what the input says: the user's message, or a category/course name visible in the screenshots or pasted text. Slugs live in `frontend/src/entities/category/model/categories.ts` (Algorithms: arrays, two-pointers, hash-map, stack, sliding-window, trees, graphs; Golang: strings, concurrency, slices, interfaces; SQL: sql). A category's `section` decides where its tile is shown on the Problems page. If the input gives no category, ask the user before creating the task. For a category that is not in the list, add it there and add `categories.<slug>.name` to both `frontend/src/shared/i18n/locales/{en,ru}.json`, but ask the user first.

## 5. Create the folder `frontend/src/entities/task/data/<slug>/`

The folder name is the slug (kebab-case, unique).

**task.json**
```json
{
  "number": 10,
  "difficulty": "easy",
  "categories": ["two-pointers"],
  "companies": ["vk", "yandex"],
  "complexity": { "time": "O(n)", "space": "O(1)" },
  "signature": { "name": "sortedSquares", "params": [{ "name": "nums", "type": "[]int" }], "returns": "[]int" }
}
```
- `number` is the task's unique id shown as #N: take the highest `number` among the existing `data/*/task.json` and add 1 (starts at 1, never reuse or renumber).
- `params[].type` and `returns` are Go types and must be JSON-representable: `int`, `string`, `bool`, `float64`, slices, nested slices, maps, and `[]rune` (written in tests as an array of one-character strings, e.g. `["a","b"]`). Types such as linked-list nodes or trees need a custom harness and are not supported yet; tell the user instead of improvising.
- For in-place tasks (the function returns nothing and modifies an argument) omit `returns` and set `"mutates": "<param name>"`; `expected` is then that parameter's final value.
- When the statement says the answer may be returned in any order (e.g. groups of anagrams), add `"compare": "unordered"` to the signature: the generated tests then sort every array, at every depth, before comparing, so a solution built from a Go map doesn't fail at random. Without it results are compared exactly. Write `expected` in any order.
- The starter code is generated from the signature. Only set `"template"` to override it when the screenshot shows something different (e.g. named results).

**tests.json**: an array of `{ "name": "...", "input": { "<param>": value }, "expected": value }`.
- Input keys must match the parameter names. Use the examples from the statement first (`example 1`, `example 2`), then edge cases: minimum size, duplicates, negatives, extremes, already-sorted/reversed input, empty values when the constraints allow them.
- Tests are public: they are shown on the Tests tab. Keep each test small and readable, and verify every `expected` value by hand or with a reference solution. Never put a backtick in test data.

**solution.go** (only when the user provided a solution): their code, **verbatim**. You may only reformat it (`gofmt -w`); do not rename, rewrite, add or remove logic or comments, and do not "improve" it. Keep its Russian comments as they are. If the user did not provide a solution, do **not** write one: create no `solution.go`, no `complexity` and no `solution` notes (the tab then says there is no reference solution yet). Take `complexity` in `task.json` from the user's complexity text.

**ru.json / en.json**: `{ "title", "description": [blocks] }`, plus `"solution": [blocks]` only when the user provided solution text. `solution` is **only** the text the user gave (typically the «Оценка сложности» heading with its Время/Память bullets, and any note after it), laid out in the site's style and not extended with your own explanation, approach, pitfalls or edge cases. Keep the original language in `ru.json` and give a faithful translation in `en.json` (translate, don't add). Blocks are `{ "p": "…" }`, `{ "h": "…" }`, `{ "pre": "line1\nline2" }`, `{ "ul": ["…"] }`, and `{ "note": "…" }` for the site's blue info box (e.g. «Частая ошибка: …»). Inline markup is limited to `<code>…</code>` and `<b>…</b>`; write `>=` and `<` as plain characters.

## 6. Verify (do not skip)

1. `cd frontend && npx tsc -b && npx oxlint` must pass (a missing file throws "Task … is missing …json" at startup).
2. `cd frontend && npm run verify` must print `✓ <slug>` for the new task (or `- <slug>: no reference solution yet` when none was provided): it runs `solution.go` through the generated harness against `tests.json`. Never edit the user's solution to make it pass. If it fails, decide by hand whether a test's expected value is wrong and fix the test; if the user's solution itself seems wrong, tell the user instead of changing it.
3. Check the starter code is not accidentally a passing solution: the generated template is an empty function, so it should fail to compile or fail the tests.
4. Optionally open `/tasks/<slug>?lng=en` and `?lng=ru` and the Tests tab.

## 7. Report

Tell the user: what was added, the categories used and where they came from, the test cases written (they are mine unless the screenshots showed them), whether a reference solution was provided (and, if so, that it was kept verbatim), the English translation of the statement and of the notes (so they can correct it), and anything cut off in the screenshots or that differs between them (for example a parameter name in the statement versus the starter code).
