-- Mistakes journal: a failed attempt can be filed under a type of mistake.
CREATE TABLE mistake_types (
    id          BIGSERIAL PRIMARY KEY,
    title       TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- A mistake keeps its own copy of the code and output, so it survives deleting the attempt it came from.
CREATE TABLE mistakes (
    id         BIGSERIAL PRIMARY KEY,
    type_id    BIGINT NOT NULL REFERENCES mistake_types (id) ON DELETE CASCADE,
    attempt_id BIGINT REFERENCES attempts (id) ON DELETE SET NULL,
    task_slug  TEXT NOT NULL,
    code       TEXT NOT NULL,
    status     TEXT NOT NULL,
    output     TEXT NOT NULL DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- An attempt can be filed at most once.
CREATE UNIQUE INDEX idx_mistakes_attempt ON mistakes (attempt_id) WHERE attempt_id IS NOT NULL;
CREATE INDEX idx_mistakes_type ON mistakes (type_id, created_at DESC);
