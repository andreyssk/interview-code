-- A quiz is now a sequence of stages; each stage is one code snippet, its answer and an explanation.
CREATE TABLE quiz_stages (
    quiz_id     BIGINT NOT NULL REFERENCES quizzes (id) ON DELETE CASCADE,
    position    INT NOT NULL,
    code        TEXT NOT NULL,
    answer      TEXT NOT NULL,
    explanation TEXT NOT NULL DEFAULT '',
    PRIMARY KEY (quiz_id, position)
);

INSERT INTO quiz_stages (quiz_id, position, code, answer, explanation)
SELECT id, 0, code, answer, explanation FROM quizzes;

DROP INDEX idx_quizzes_category;
ALTER TABLE quizzes DROP COLUMN code, DROP COLUMN answer, DROP COLUMN explanation, DROP COLUMN category_slug;
