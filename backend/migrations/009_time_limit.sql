-- Per-task limit on how long the user's program may run, in seconds. NULL = the server default.
ALTER TABLE tasks ADD COLUMN time_limit_sec INTEGER CHECK (time_limit_sec BETWEEN 1 AND 30);
