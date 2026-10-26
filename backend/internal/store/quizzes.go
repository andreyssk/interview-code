package store

import (
	"context"
	"errors"

	"github.com/jackc/pgx/v5"
)

// QuizStage is one step of a quiz: a code snippet, the output (or behavior) it produces, and a short why.
type QuizStage struct {
	Code        string `json:"code"`
	Answer      string `json:"answer"`
	Explanation string `json:"explanation"`
}

// Quiz is an ordered list of stages, each revealed by the user on demand.
type Quiz struct {
	ID        int64       `json:"id"`
	Title     string      `json:"title"` // optional prompt
	Language  string      `json:"language"`
	Stages    []QuizStage `json:"stages"`
	Companies []string    `json:"companies"`
	Sources   []string    `json:"sources"`
}

func (s *Store) Quizzes(ctx context.Context) ([]Quiz, error) {
	rows, err := s.pool.Query(ctx, `
		SELECT q.id, q.title, q.language,
		       COALESCE((SELECT array_agg(company_slug ORDER BY company_slug) FROM quiz_companies WHERE quiz_id = q.id), '{}'),
		       COALESCE((SELECT array_agg(source_slug ORDER BY source_slug) FROM quiz_sources WHERE quiz_id = q.id), '{}')
		FROM quizzes q ORDER BY q.id`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := []Quiz{}
	byID := map[int64]int{}
	for rows.Next() {
		var q Quiz
		if err := rows.Scan(&q.ID, &q.Title, &q.Language, &q.Companies, &q.Sources); err != nil {
			return nil, err
		}
		q.Stages = []QuizStage{}
		byID[q.ID] = len(out)
		out = append(out, q)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	srows, err := s.pool.Query(ctx, `SELECT quiz_id, code, answer, explanation FROM quiz_stages ORDER BY quiz_id, position`)
	if err != nil {
		return nil, err
	}
	defer srows.Close()
	for srows.Next() {
		var id int64
		var st QuizStage
		if err := srows.Scan(&id, &st.Code, &st.Answer, &st.Explanation); err != nil {
			return nil, err
		}
		if i, ok := byID[id]; ok {
			out[i].Stages = append(out[i].Stages, st)
		}
	}
	return out, srows.Err()
}

// SaveQuiz creates a quiz (ID 0) or replaces an existing one, and returns its ID.
func (s *Store) SaveQuiz(ctx context.Context, q Quiz) (int64, error) {
	id := q.ID
	err := pgx.BeginFunc(ctx, s.pool, func(tx pgx.Tx) error {
		if id == 0 {
			if err := tx.QueryRow(ctx,
				`INSERT INTO quizzes (title, language) VALUES ($1, $2) RETURNING id`,
				q.Title, q.Language).Scan(&id); err != nil {
				return err
			}
		} else {
			tag, err := tx.Exec(ctx,
				`UPDATE quizzes SET title = $2, language = $3, updated_at = now() WHERE id = $1`,
				id, q.Title, q.Language)
			if err != nil {
				return err
			}
			if tag.RowsAffected() == 0 {
				return ErrNotFound
			}
		}
		if _, err := tx.Exec(ctx, `DELETE FROM quiz_stages WHERE quiz_id = $1`, id); err != nil {
			return err
		}
		for i, st := range q.Stages {
			if _, err := tx.Exec(ctx,
				`INSERT INTO quiz_stages (quiz_id, position, code, answer, explanation) VALUES ($1, $2, $3, $4, $5)`,
				id, i, st.Code, st.Answer, st.Explanation); err != nil {
				return err
			}
		}
		if _, err := tx.Exec(ctx, `DELETE FROM quiz_companies WHERE quiz_id = $1`, id); err != nil {
			return err
		}
		if _, err := tx.Exec(ctx, `INSERT INTO quiz_companies (quiz_id, company_slug) SELECT $1, unnest($2::text[])`, id, q.Companies); err != nil {
			return err
		}
		if _, err := tx.Exec(ctx, `DELETE FROM quiz_sources WHERE quiz_id = $1`, id); err != nil {
			return err
		}
		_, err := tx.Exec(ctx, `INSERT INTO quiz_sources (quiz_id, source_slug) SELECT $1, unnest($2::text[])`, id, q.Sources)
		return err
	})
	if errors.Is(err, ErrNotFound) {
		return 0, err
	}
	return id, refError(err)
}

func (s *Store) DeleteQuiz(ctx context.Context, id int64) error {
	tag, err := s.pool.Exec(ctx, `DELETE FROM quizzes WHERE id = $1`, id)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return ErrNotFound
	}
	return nil
}
