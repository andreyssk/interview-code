-- Tasks a user opened recently (the history popover in the header). One row per task; viewing it again just
-- moves it to the front. task_slug is plain text like attempts: tasks live in the content tables and may be deleted.
CREATE TABLE recent_tasks (
    user_id   BIGINT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    task_slug TEXT NOT NULL,
    viewed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (user_id, task_slug)
);
CREATE INDEX idx_recent_tasks_user ON recent_tasks (user_id, viewed_at DESC);
