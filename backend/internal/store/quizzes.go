package store

import (
	"context"
	"errors"

	"github.com/jackc/pgx/v5"
)

// Quiz is a code snippet with the output (or behavior) it produces, revealed by the user on demand.
type Quiz struct {
	ID          int64    `json:"id"`
	Title       string   `json:"title"` // optional prompt
	Language    string   `json:"language"`
	Code        string   `json:"code"`
	Answer      string   `json:"answer"`
	Explanation string   `json:"explanation"`
	Category    *string  `json:"category"` // optional, one of the task categories
	Companies   []string `json:"companies"`
}

func (s *Store) Quizzes(ctx context.Context) ([]Quiz, error) {
	rows, err := s.pool.Query(ctx, `
		SELECT q.id, q.title, q.language, q.code, q.answer, q.explanation, q.category_slug,
		       COALESCE((SELECT array_agg(company_slug ORDER BY company_slug) FROM quiz_companies WHERE quiz_id = q.id), '{}')
		FROM quizzes q ORDER BY q.id`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := []Quiz{}
	for rows.Next() {
		var q Quiz
		if err := rows.Scan(&q.ID, &q.Title, &q.Language, &q.Code, &q.Answer, &q.Explanation, &q.Category, &q.Companies); err != nil {
			return nil, err
		}
		out = append(out, q)
	}
	return out, rows.Err()
}

// SaveQuiz creates a quiz (ID 0) or replaces an existing one, and returns its ID.
func (s *Store) SaveQuiz(ctx context.Context, q Quiz) (int64, error) {
	id := q.ID
	err := pgx.BeginFunc(ctx, s.pool, func(tx pgx.Tx) error {
		if id == 0 {
			if err := tx.QueryRow(ctx,
				`INSERT INTO quizzes (title, language, code, answer, explanation, category_slug) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
				q.Title, q.Language, q.Code, q.Answer, q.Explanation, q.Category).Scan(&id); err != nil {
				return err
			}
		} else {
			tag, err := tx.Exec(ctx,
				`UPDATE quizzes SET title = $2, language = $3, code = $4, answer = $5, explanation = $6, category_slug = $7, updated_at = now() WHERE id = $1`,
				id, q.Title, q.Language, q.Code, q.Answer, q.Explanation, q.Category)
			if err != nil {
				return err
			}
			if tag.RowsAffected() == 0 {
				return ErrNotFound
			}
		}
		if _, err := tx.Exec(ctx, `DELETE FROM quiz_companies WHERE quiz_id = $1`, id); err != nil {
			return err
		}
		_, err := tx.Exec(ctx, `INSERT INTO quiz_companies (quiz_id, company_slug) SELECT $1, unnest($2::text[])`, id, q.Companies)
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
