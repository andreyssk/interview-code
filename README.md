# Interview Prep

LeetCode-style practice for software interview prep, with a neon Tokyo look.

- `frontend/` – React + TypeScript + Vite, React Router, TanStack Query, Tailwind v4
- `backend/` – Go (`net/http`, `pgx`): runs Go code and records every attempt in PostgreSQL
- `docker-compose.yml` – PostgreSQL 17 (bound to 127.0.0.1:5432)

Tasks are static data in `frontend/src/entities/task/`. The backend stores **attempts**: each run of a task saves
the code, the result (passed / failed / compile error / timeout), the output and the duration. A task counts as solved
once any attempt passed; the solved and failed counters and the **Submissions** tab (every past solution, with a
button to restore its code into the editor) are derived from that table. Only the editor's current draft stays in the
browser (localStorage).

## Run

```sh
make db        # PostgreSQL in Docker (data lives in the pgdata volume)
make backend   # API on 127.0.0.1:8080 (needs the Go toolchain); DATABASE_URL and ADDR override the defaults
make frontend  # UI on :5173, proxies /api to the backend
```

## Themes

Six themes, picked from a header dropdown and remembered in the browser: **Apple** and **Android** (light, system-style looks), **JetBrains** (IDE-style dark with Darcula syntax colors), **Tokyo** (neon, the default; two 80s cars with nitro flames along the bottom) and **Depressive** (flat black / gray / white
with a single dimmed-red accent, square corners and rain) and **Cozy** (light, warm paper with hand-drawn outlines and type, and a countryside sketch
background from `frontend/public/countryside.svg`). A theme is just a set of CSS variables in `frontend/src/app/styles/index.css`, selected by
`<html data-theme="...">`; no component knows which theme is active. To add one, add its name to `shared/lib/theme.ts` and a
`:root[data-theme='name']` block that overrides the variables. Background decor is the fixed `body::after` layer (SVGs in `frontend/public`).

## Frontend architecture

Feature-Sliced Design under `frontend/src` (alias `@` = `src`; a layer only imports from layers below it):

```
app/        providers, routing, global styles
pages/      login, change-password, problems, problem-list, task, theory-list, theory, mistakes, admin
widgets/    header, category-grid, task-browser, task-workspace, stats-sidebar, mistakes-popover, task-theory-popover
features/   auth/user-menu, filter-tasks, run-code, solve-timer, attempt-history, switch-theme, switch-language, ...
entities/   task, category, theory, mistake
shared/     api, auth, content, i18n, lib, ui (CodeEditor, RichBlocks, Modal, Popover, Spinner)
```

Each slice exposes its public API through `index.ts`.

## Content lives in the database

Tasks, theory articles, sections, categories and companies are stored in PostgreSQL and served by `GET /api/content` in one
response (the app waits for it once at startup, see `shared/content`). Their text is stored once, in the language it was
written in. Managed in the **admin panel** (`/admin`, admins only):

- **Tasks / Articles**: list, create (form), edit, delete, export as JSON, and **upload a JSON file** (one object or an array; an
  existing slug is replaced). The form can verify a reference solution against the tests by running it in the sandbox.
  Task numbers (`#N`) come from a database sequence: unique, starting at 1, never reused. The `add-task` and `add-article` skills
  produce these upload files (versioned copies go in `content/tasks/` and `content/articles/`).
- **Questions** and **Question categories**: interview questions (title, companies, a rich-text answer, optional category). Users browse them on the **Questions** page (category tiles, search, company filter, answers open in place). Deleting a category keeps its questions; they become uncategorized.
- **Sections & categories** and **Companies**: Algorithms / Golang / SQL, their categories, and the company tags. A task or article uploaded with a category, section (optional top-level `"section"` field) or company that does not exist creates it automatically, with a name derived from the slug and a stable pseudo-random glyph/color; new categories go to `other` unless `section` is given.
- **Users & access**: the sign-up switch and password resets.

The starter code and the Go test harness of a task are generated in the browser from its `signature` + `tests`
(`entities/task/lib/buildTemplate.ts`, `buildHarness.ts`).

## i18n

`i18next` + `react-i18next`, languages `en` and `ru` (switch in the header; saved in localStorage; `?lng=ru` overrides).
Only the **interface** is translated (`shared/i18n/locales/{en,ru}.json`); content from the database is not. The admin panel is English only.

## Mistakes journal

On a task's **Submissions** tab every failed attempt has an **Add to mistakes** button. It asks for a type of mistake: pick an
existing one or create a new one (title and description). The **Mistakes** page lists the types, and each type page lists
its mistakes with the code and output that failed. A type can be edited (title and description), and each mistake can be moved to another type, existing or new. A mistake keeps its own copy of the code, so it stays even if you later delete
the submission it came from.

## API

- `POST /api/run` `{taskSlug, code, harness}`: compiles and runs the code, saves the attempt, returns the result
- `GET /api/stats`: `[{taskSlug, passed, failed, lastAttemptAt}]`
- `GET /api/tasks/{slug}/attempts?limit=50`: saved attempts with code, newest first
- `DELETE /api/attempts/{id}`: delete one saved attempt (counters are recomputed)
- `GET /api/mistake-types`, `POST /api/mistake-types {title, description}`: types of mistakes (with how many mistakes each holds)
- `GET /api/mistake-types/{id}`: one type with its mistakes; `PATCH` changes its title and description; `DELETE` removes it and its mistakes
- `POST /api/mistakes {attemptId, typeId}`: file a failed attempt under a type (copies its code and output); `PATCH /api/mistakes/{id} {typeId}` moves it to another type; `DELETE /api/mistakes/{id}`

- `GET /api/content`: sections, categories, companies, tasks, articles, question categories and questions
- `POST /api/auth/{signup,login,logout,password}`, `GET /api/auth/{me,config}`: accounts (see Accounts below)
- `PUT|DELETE /api/admin/{tasks,articles,sections,categories,companies,question-categories}/{slug}`, `POST /api/admin/questions`, `PUT|DELETE /api/admin/questions/{id}`: content management (admin only)
- `GET /api/admin/users`, `POST /api/admin/users/{id}/reset-password`, `GET|PUT /api/admin/settings`: users and the sign-up switch (admin only)

## How running works

The frontend sends `{taskSlug, code, harness}` (the generated harness embeds the JSON tests); the backend writes both to a temp dir as one `package main`,
runs `go build` (30 s limit) then the binary (5 s limit, 64 KB output cap), saves the attempt and returns the output.
It executes arbitrary code with your user's permissions, so it binds to localhost only.

## Accounts

Everything except the login screen needs an account (username + password). Attempts and the mistakes journal are per user.

- The first admin is created at startup from `ADMIN_USERNAME` / `ADMIN_PASSWORD` in `.env` (copy `.env.example`). It is created only if it does not exist yet, so changing the password in the app sticks. Data that existed before accounts is given to this admin.
- **Sign-up is closed by default.** An admin opens or closes it with a switch (`GET/PUT /api/admin/settings`, `signupEnabled`).
- A forgotten password is reset by an admin: `POST /api/admin/users/{id}/reset-password` returns a temporary password once; the user must replace it at the next login.
- Sessions are an HttpOnly cookie (30 days); failed logins are rate-limited per username and IP.
