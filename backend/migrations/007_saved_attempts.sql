-- A "saved" attempt stores code without running it (for tasks that have no tests, or code in a language that
-- cannot be run yet). It is never counted as passed or failed. The language says how to restore the code.
ALTER TABLE attempts DROP CONSTRAINT attempts_status_check;
ALTER TABLE attempts ADD CONSTRAINT attempts_status_check CHECK (status IN ('passed', 'failed', 'compile', 'timeout', 'saved'));
ALTER TABLE attempts ADD COLUMN language TEXT NOT NULL DEFAULT 'go' CHECK (language IN ('go', 'java'));
