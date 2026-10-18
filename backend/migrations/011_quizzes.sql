-- Quizzes: a code snippet and what it prints / what happens, shown behind a spoiler.
CREATE TABLE quizzes (
    id            BIGSERIAL PRIMARY KEY,
    title         TEXT NOT NULL DEFAULT '',     -- optional prompt, e.g. "What will be printed?"
    language      TEXT NOT NULL DEFAULT 'go' CHECK (language IN ('go', 'java')),
    code          TEXT NOT NULL,
    answer        TEXT NOT NULL,                -- plain text: the output, or what happens
    explanation   TEXT NOT NULL DEFAULT '',     -- optional short why
    -- Deleting a category keeps its quizzes; they just lose the category.
    category_slug TEXT REFERENCES categories (slug) ON UPDATE CASCADE ON DELETE SET NULL,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_quizzes_category ON quizzes (category_slug);

CREATE TABLE quiz_companies (
    quiz_id      BIGINT NOT NULL REFERENCES quizzes (id) ON DELETE CASCADE,
    company_slug TEXT NOT NULL REFERENCES companies (slug) ON UPDATE CASCADE ON DELETE RESTRICT,
    PRIMARY KEY (quiz_id, company_slug)
);
