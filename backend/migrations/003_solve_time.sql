-- Manual stopwatch reading attached to a passed attempt; NULL when no timer was running or the time was discarded.
ALTER TABLE attempts ADD COLUMN solve_time_ms BIGINT CHECK (solve_time_ms >= 0);
