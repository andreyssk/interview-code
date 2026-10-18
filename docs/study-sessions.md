# Study sessions

A **session** is a drill over interview questions or quizzes. Press **Play** on the Questions or Quizzes page, choose
how many items, (for questions) which categories, and how to pick them. For every item you see the prompt without the
answer, press **Show answer** and rate yourself:

| Rating    | Key | Stored | Score |
|-----------|-----|--------|-------|
| Correct   | 1   | 3      | 100   |
| Almost    | 2   | 2      | 67    |
| Bad       | 3   | 1      | 33    |
| Very bad  | 4   | 0      | 0     |

A quiz is rated once, after its last stage. Space/Enter on the focused button reveals; the session summary shows the
score (the average of the scores above) and the rating of every item.

## Rules

- **Count.** Asking for more than exists gives everything that exists ("Max" fills in the pool size). Counts are
  clamped on the server too (1–1000 requested).
- **Empty pool.** No questions at all, none in the chosen categories, or no quizzes: the dialog shows an error and Start
  is disabled; the API answers `400` with the same message.
- **Categories** apply to questions only (`uncategorized` = questions without a category). Quizzes have no categories
  yet, so a quiz session only takes a count.
- **History.** A session is stored the moment it starts (`study_sessions`, `study_session_items`), each rating is saved
  immediately, and `finished_at` is set when the last item is rated. A session left midway stays in **History** as
  unfinished and can be continued. Items keep a snapshot of the title, so history survives deleted content.

## Picking items

The server picks the items (`backend/internal/store/srs.go`), because SRS needs the user's history.

**Pure random** gives every item in the pool the same chance.

**SRS-weighted** draws without replacement, with the chance of an item proportional to its weight
(Efraimidis–Spirakis: each item gets the key `u^(1/weight)` with `u` uniform in (0,1); the `n` largest keys win).
The picked items are then shuffled, so the order does not reveal the weights.

The weight depends on the **latest rating** of that item by that user (any earlier session of the same kind), and on how
long ago it was given:

| Latest rating  | Base weight |
|----------------|-------------|
| never rated    | 6           |
| Very bad       | 10          |
| Bad            | 7           |
| Almost         | 3           |
| Correct        | 1           |

```
weight = base × (1 + 3 × min(days since rated, 30) / 30)       (rated items only)
```

So an item rated Correct today has weight 1, the same item untouched for a month weighs 4 (like a never-seen item
nearly), and one rated Very bad a month ago weighs 40. Never-seen items are not aged. Ratings only matter once
given, so unfinished sessions still feed the weights with what was rated.

Example: with a Correct-today item (1) and a Very-bad-today item (10), the weak one is picked first about 91% of the time.

This is a lightweight stand-in for a real SRS scheduler (no intervals or ease factors); the constants are at the top of
`srs.go` and the behavior is covered by `srs_test.go`.
