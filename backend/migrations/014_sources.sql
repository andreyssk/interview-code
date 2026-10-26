-- Sources: the platform / provider / knowledge base a problem, question or quiz originally came from.
CREATE TABLE sources (
    slug            TEXT PRIMARY KEY,
    name            TEXT NOT NULL,
    link            TEXT,
    icon            BYTEA,                  -- optional image, at most 100 KB (checked by the API)
    icon_type       TEXT,                   -- media type of icon
    icon_updated_at TIMESTAMPTZ
);

CREATE TABLE task_sources (
    task_id     BIGINT NOT NULL REFERENCES tasks (id) ON DELETE CASCADE,
    source_slug TEXT NOT NULL REFERENCES sources (slug) ON UPDATE CASCADE ON DELETE RESTRICT,
    PRIMARY KEY (task_id, source_slug)
);

CREATE TABLE question_sources (
    question_id BIGINT NOT NULL REFERENCES questions (id) ON DELETE CASCADE,
    source_slug TEXT NOT NULL REFERENCES sources (slug) ON UPDATE CASCADE ON DELETE RESTRICT,
    PRIMARY KEY (question_id, source_slug)
);

CREATE TABLE quiz_sources (
    quiz_id     BIGINT NOT NULL REFERENCES quizzes (id) ON DELETE CASCADE,
    source_slug TEXT NOT NULL REFERENCES sources (slug) ON UPDATE CASCADE ON DELETE RESTRICT,
    PRIMARY KEY (quiz_id, source_slug)
);
