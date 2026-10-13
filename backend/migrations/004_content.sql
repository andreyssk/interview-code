-- An older, unused prototype schema (001_init.sql, no longer in the repo) left empty tables with the same names.
-- Drop them only when they are that legacy shape AND empty; otherwise stop so nothing is lost.
DO $$
DECLARE
    t TEXT;
    n BIGINT;
BEGIN
    IF to_regclass('public.tasks') IS NOT NULL
       AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'tasks' AND column_name = 'slug') THEN
        FOREACH t IN ARRAY ARRAY['article_assets', 'article_categories', 'task_categories', 'articles', 'tasks', 'categories'] LOOP
            IF to_regclass('public.' || t) IS NOT NULL THEN
                EXECUTE format('SELECT count(*) FROM public.%I', t) INTO n;
                IF n > 0 THEN
                    RAISE EXCEPTION 'legacy table % has % rows; move or drop it by hand before migrating', t, n;
                END IF;
            END IF;
        END LOOP;
        DROP TABLE IF EXISTS article_assets, article_categories, task_categories, articles, tasks, categories CASCADE;
    END IF;
END $$;

-- Content moves from files in the frontend to the database: sections, categories, companies, tasks and theory articles.
-- Texts are stored in a single language as written; the interface chrome stays translated in the frontend.
CREATE TABLE sections (
    slug     TEXT PRIMARY KEY,
    name     TEXT NOT NULL,
    position INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE categories (
    slug         TEXT PRIMARY KEY,
    section_slug TEXT NOT NULL REFERENCES sections (slug) ON UPDATE CASCADE ON DELETE RESTRICT,
    name         TEXT NOT NULL,
    glyph        TEXT NOT NULL DEFAULT '',
    color        TEXT NOT NULL DEFAULT 'var(--cyan)',
    jp           TEXT NOT NULL DEFAULT '',
    position     INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE companies (
    slug TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    tone TEXT NOT NULL DEFAULT 'neon-violet'
);

-- Task numbers are unique, 1-based and never reused: they come from a sequence.
CREATE SEQUENCE tasks_number_seq;

CREATE TABLE tasks (
    id             BIGSERIAL PRIMARY KEY,
    slug           TEXT NOT NULL UNIQUE,
    number         INTEGER NOT NULL UNIQUE DEFAULT nextval('tasks_number_seq'),
    title          TEXT NOT NULL,
    difficulty     TEXT NOT NULL CHECK (difficulty IN ('easy', 'medium', 'hard')),
    description    JSONB NOT NULL,          -- rich blocks
    solution_notes JSONB,                   -- rich blocks, only when a reference solution has notes
    solution       TEXT,                    -- reference solution (Go), optional
    signature      JSONB NOT NULL,
    tests          JSONB NOT NULL,
    complexity     JSONB,
    leetcode_url   TEXT,
    template       TEXT,                    -- overrides the generated starter code
    created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE task_categories (
    task_id       BIGINT NOT NULL REFERENCES tasks (id) ON DELETE CASCADE,
    category_slug TEXT NOT NULL REFERENCES categories (slug) ON UPDATE CASCADE ON DELETE RESTRICT,
    PRIMARY KEY (task_id, category_slug)
);

CREATE TABLE task_companies (
    task_id      BIGINT NOT NULL REFERENCES tasks (id) ON DELETE CASCADE,
    company_slug TEXT NOT NULL REFERENCES companies (slug) ON UPDATE CASCADE ON DELETE RESTRICT,
    PRIMARY KEY (task_id, company_slug)
);

CREATE TABLE articles (
    id            BIGSERIAL PRIMARY KEY,
    slug          TEXT NOT NULL UNIQUE,
    title         TEXT NOT NULL,
    summary       TEXT NOT NULL DEFAULT '',
    content       JSONB NOT NULL,           -- rich blocks
    source_name   TEXT,
    source_url    TEXT,
    category_slug TEXT REFERENCES categories (slug) ON UPDATE CASCADE ON DELETE SET NULL,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Extra categories / individual tasks an article is suggested on (besides its main category).
CREATE TABLE article_categories (
    article_id    BIGINT NOT NULL REFERENCES articles (id) ON DELETE CASCADE,
    category_slug TEXT NOT NULL REFERENCES categories (slug) ON UPDATE CASCADE ON DELETE CASCADE,
    PRIMARY KEY (article_id, category_slug)
);

CREATE TABLE article_tasks (
    article_id BIGINT NOT NULL REFERENCES articles (id) ON DELETE CASCADE,
    task_slug  TEXT NOT NULL REFERENCES tasks (slug) ON UPDATE CASCADE ON DELETE CASCADE,
    PRIMARY KEY (article_id, task_slug)
);
