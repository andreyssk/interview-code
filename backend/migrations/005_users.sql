-- Accounts: username + password only. Attempts and the mistakes journal become per-user.
CREATE TABLE users (
    id                   BIGSERIAL PRIMARY KEY,
    username             TEXT NOT NULL,
    password_hash        TEXT NOT NULL,
    role                 TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin')),
    must_change_password BOOLEAN NOT NULL DEFAULT false,
    created_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX idx_users_username ON users (lower(username));

-- The cookie holds a random token; only its SHA-256 is stored.
CREATE TABLE sessions (
    token_hash TEXT PRIMARY KEY,
    user_id    BIGINT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    expires_at TIMESTAMPTZ NOT NULL
);
CREATE INDEX idx_sessions_user ON sessions (user_id);

CREATE TABLE settings (
    key   TEXT PRIMARY KEY,
    value TEXT NOT NULL
);
-- Sign-up is closed until an admin opens it.
INSERT INTO settings (key, value) VALUES ('signup_enabled', 'false');

-- Existing rows have no owner yet; the first admin created at startup claims them.
ALTER TABLE attempts      ADD COLUMN user_id BIGINT REFERENCES users (id) ON DELETE CASCADE;
ALTER TABLE mistake_types ADD COLUMN user_id BIGINT REFERENCES users (id) ON DELETE CASCADE;
CREATE INDEX idx_attempts_user ON attempts (user_id, task_slug, created_at DESC);
CREATE INDEX idx_mistake_types_user ON mistake_types (user_id);
