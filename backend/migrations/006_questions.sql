-- Interview questions: optional categories, a title, company tags and a rich-text answer.
CREATE TABLE question_categories (
    slug     TEXT PRIMARY KEY,
    name     TEXT NOT NULL,
    position INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE questions (
    id            BIGSERIAL PRIMARY KEY,
    title         TEXT NOT NULL,
    answer        JSONB NOT NULL,           -- rich blocks
    -- Deleting a category keeps its questions; they just become uncategorized.
    category_slug TEXT REFERENCES question_categories (slug) ON UPDATE CASCADE ON DELETE SET NULL,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_questions_category ON questions (category_slug);

CREATE TABLE question_companies (
    question_id  BIGINT NOT NULL REFERENCES questions (id) ON DELETE CASCADE,
    company_slug TEXT NOT NULL REFERENCES companies (slug) ON UPDATE CASCADE ON DELETE RESTRICT,
    PRIMARY KEY (question_id, company_slug)
);
