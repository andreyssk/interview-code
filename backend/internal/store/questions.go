package store

import (
	"context"
	"encoding/json"
	"errors"

	"github.com/jackc/pgx/v5"
)

type QuestionCategory struct {
	Slug     string `json:"slug"`
	Name     string `json:"name"`
	Position int    `json:"position"`
}

// QuestionSubcategory is the second (and last) level under a question category.
type QuestionSubcategory struct {
	Slug     string `json:"slug"`
	Category string `json:"category"`
	Name     string `json:"name"`
	Position int    `json:"position"`
}

type Question struct {
	ID        int64           `json:"id"`
	Title     string          `json:"title"`
	Category  *string         `json:"category"`    // optional
	Subcat    *string         `json:"subcategory"` // optional, only together with a category
	Companies []string        `json:"companies"`
	Answer    json.RawMessage `json:"answer"` // rich blocks
}

func (s *Store) QuestionCategories(ctx context.Context) ([]QuestionCategory, error) {
	rows, err := s.pool.Query(ctx, `SELECT slug, name, position FROM question_categories ORDER BY position, slug`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := []QuestionCategory{}
	for rows.Next() {
		var c QuestionCategory
		if err := rows.Scan(&c.Slug, &c.Name, &c.Position); err != nil {
			return nil, err
		}
		out = append(out, c)
	}
	return out, rows.Err()
}

func (s *Store) QuestionSubcategories(ctx context.Context) ([]QuestionSubcategory, error) {
	rows, err := s.pool.Query(ctx, `SELECT slug, category_slug, name, position FROM question_subcategories ORDER BY position, slug`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := []QuestionSubcategory{}
	for rows.Next() {
		var c QuestionSubcategory
		if err := rows.Scan(&c.Slug, &c.Category, &c.Name, &c.Position); err != nil {
			return nil, err
		}
		out = append(out, c)
	}
	return out, rows.Err()
}

func (s *Store) Questions(ctx context.Context) ([]Question, error) {
	rows, err := s.pool.Query(ctx, `
		SELECT q.id, q.title, q.category_slug, q.subcategory_slug, q.answer,
		       COALESCE((SELECT array_agg(company_slug ORDER BY company_slug) FROM question_companies WHERE question_id = q.id), '{}')
		FROM questions q ORDER BY q.id`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := []Question{}
	for rows.Next() {
		var q Question
		if err := rows.Scan(&q.ID, &q.Title, &q.Category, &q.Subcat, &q.Answer, &q.Companies); err != nil {
			return nil, err
		}
		out = append(out, q)
	}
	return out, rows.Err()
}

func (s *Store) SaveQuestionCategory(ctx context.Context, c QuestionCategory) error {
	_, err := s.pool.Exec(ctx, `
		INSERT INTO question_categories (slug, name, position) VALUES ($1, $2, $3)
		ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name, position = EXCLUDED.position`, c.Slug, c.Name, c.Position)
	return refError(err)
}

func (s *Store) DeleteQuestionCategory(ctx context.Context, slug string) error {
	return s.deleteBySlug(ctx, "question_categories", slug)
}

// SaveQuestionSubcategory creates or updates a subcategory. Moving one to another category moves its questions' link too,
// so those questions are first detached (they stay in their old category, in its "Other").
func (s *Store) SaveQuestionSubcategory(ctx context.Context, c QuestionSubcategory) error {
	err := pgx.BeginFunc(ctx, s.pool, func(tx pgx.Tx) error {
		if _, err := tx.Exec(ctx, `UPDATE questions SET subcategory_slug = NULL
			WHERE subcategory_slug = $1 AND category_slug IS DISTINCT FROM $2`, c.Slug, c.Category); err != nil {
			return err
		}
		_, err := tx.Exec(ctx, `
			INSERT INTO question_subcategories (slug, category_slug, name, position) VALUES ($1, $2, $3, $4)
			ON CONFLICT (slug) DO UPDATE SET category_slug = EXCLUDED.category_slug, name = EXCLUDED.name, position = EXCLUDED.position`,
			c.Slug, c.Category, c.Name, c.Position)
		return err
	})
	return refError(err)
}

func (s *Store) DeleteQuestionSubcategory(ctx context.Context, slug string) error {
	return s.deleteBySlug(ctx, "question_subcategories", slug)
}

// SaveQuestion creates a question (ID 0) or replaces an existing one, and returns its ID.
func (s *Store) SaveQuestion(ctx context.Context, q Question) (int64, error) {
	id := q.ID
	err := pgx.BeginFunc(ctx, s.pool, func(tx pgx.Tx) error {
		if id == 0 {
			if err := tx.QueryRow(ctx,
				`INSERT INTO questions (title, answer, category_slug, subcategory_slug) VALUES ($1, $2, $3, $4) RETURNING id`,
				q.Title, q.Answer, q.Category, q.Subcat).Scan(&id); err != nil {
				return err
			}
		} else {
			tag, err := tx.Exec(ctx,
				`UPDATE questions SET title = $2, answer = $3, category_slug = $4, subcategory_slug = $5, updated_at = now() WHERE id = $1`,
				id, q.Title, q.Answer, q.Category, q.Subcat)
			if err != nil {
				return err
			}
			if tag.RowsAffected() == 0 {
				return ErrNotFound
			}
		}
		if _, err := tx.Exec(ctx, `DELETE FROM question_companies WHERE question_id = $1`, id); err != nil {
			return err
		}
		_, err := tx.Exec(ctx, `INSERT INTO question_companies (question_id, company_slug) SELECT $1, unnest($2::text[])`, id, q.Companies)
		return err
	})
	if errors.Is(err, ErrNotFound) {
		return 0, err
	}
	return id, refError(err)
}

func (s *Store) DeleteQuestion(ctx context.Context, id int64) error {
	tag, err := s.pool.Exec(ctx, `DELETE FROM questions WHERE id = $1`, id)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return ErrNotFound
	}
	return nil
}
