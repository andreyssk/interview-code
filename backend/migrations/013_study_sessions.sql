-- Study sessions: a user drills a random or SRS-weighted selection of questions or quizzes, reveals each answer
-- and rates how well they knew it. Every session is kept as history.
CREATE TABLE study_sessions (
    id           BIGSERIAL PRIMARY KEY,
    user_id      BIGINT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    kind         TEXT NOT NULL CHECK (kind IN ('question', 'quiz')),
    mode         TEXT NOT NULL CHECK (mode IN ('random', 'srs')),
    -- Question category slugs the session was limited to ('uncategorized' = no category); empty = no limit.
    categories   TEXT[] NOT NULL DEFAULT '{}',
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    finished_at  TIMESTAMPTZ                      -- set when the last item is rated
);
CREATE INDEX idx_study_sessions_user ON study_sessions (user_id, created_at DESC);

-- item_id points at questions / quizzes without a foreign key (they may be deleted later); title keeps what it was called.
CREATE TABLE study_session_items (
    session_id BIGINT NOT NULL REFERENCES study_sessions (id) ON DELETE CASCADE,
    position   INT NOT NULL,
    item_id    BIGINT NOT NULL,
    title      TEXT NOT NULL,
    rating     SMALLINT CHECK (rating BETWEEN 0 AND 3),  -- 0 very bad, 1 bad, 2 almost, 3 correct; NULL = not rated yet
    rated_at   TIMESTAMPTZ,
    PRIMARY KEY (session_id, position)
);
-- SRS looks up the latest rating of an item across the user's sessions.
CREATE INDEX idx_study_session_items_item ON study_session_items (item_id) WHERE rating IS NOT NULL;
