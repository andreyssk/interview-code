-- One row per run of a task's solution. Solved/failed counts and the "solved" flag are derived from this.
CREATE TABLE attempts (
    id          BIGSERIAL PRIMARY KEY,
    task_slug   TEXT NOT NULL,
    code        TEXT NOT NULL,
    status      TEXT NOT NULL CHECK (status IN ('passed', 'failed', 'compile', 'timeout')),
    output      TEXT NOT NULL DEFAULT '',
    duration_ms INTEGER NOT NULL DEFAULT 0,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_attempts_task ON attempts (task_slug, created_at DESC);
