// Package store persists task attempts in PostgreSQL.
package store

import (
	"context"
	"errors"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
)

var ErrNotFound = errors.New("not found")

type Store struct{ pool *pgxpool.Pool }

func New(pool *pgxpool.Pool) *Store { return &Store{pool: pool} }

type Attempt struct {
	ID         int64  `json:"id"`
	TaskSlug   string `json:"taskSlug"`
	Code       string `json:"code"`
	Status     string `json:"status"` // passed | failed | compile | timeout
	Output     string `json:"output"`
	DurationMs int    `json:"durationMs"`
	// Time on the user's own stopwatch when a passing attempt was submitted; nil when not timed or discarded.
	SolveTimeMs *int64    `json:"solveTimeMs"`
	CreatedAt   time.Time `json:"createdAt"`
	// Set when the attempt was filed in the mistakes journal.
	Mistake *MistakeRef `json:"mistake"`
}

type TaskStats struct {
	TaskSlug      string    `json:"taskSlug"`
	Passed        int       `json:"passed"`
	Failed        int       `json:"failed"` // every attempt that did not pass (wrong answer, compile error, timeout)
	LastAttemptAt time.Time `json:"lastAttemptAt"`
}

func (s *Store) AddAttempt(ctx context.Context, a Attempt) (Attempt, error) {
	err := s.pool.QueryRow(ctx,
		`INSERT INTO attempts (task_slug, code, status, output, duration_ms, solve_time_ms)
		 VALUES ($1, $2, $3, $4, $5, $6) RETURNING id, created_at`,
		a.TaskSlug, a.Code, a.Status, a.Output, a.DurationMs, a.SolveTimeMs).Scan(&a.ID, &a.CreatedAt)
	return a, err
}

func (s *Store) Stats(ctx context.Context) ([]TaskStats, error) {
	rows, err := s.pool.Query(ctx, `
		SELECT task_slug,
		       COUNT(*) FILTER (WHERE status = 'passed'),
		       COUNT(*) FILTER (WHERE status <> 'passed'),
		       MAX(created_at)
		FROM attempts GROUP BY task_slug ORDER BY task_slug`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := []TaskStats{}
	for rows.Next() {
		var t TaskStats
		if err := rows.Scan(&t.TaskSlug, &t.Passed, &t.Failed, &t.LastAttemptAt); err != nil {
			return nil, err
		}
		out = append(out, t)
	}
	return out, rows.Err()
}

// Attempts returns the newest attempts for a task, newest first.
func (s *Store) Attempts(ctx context.Context, slug string, limit int) ([]Attempt, error) {
	rows, err := s.pool.Query(ctx,
		`SELECT a.id, a.task_slug, a.code, a.status, a.output, a.duration_ms, a.solve_time_ms, a.created_at, m.id, m.type_id, t.title
		 FROM attempts a
		 LEFT JOIN mistakes m ON m.attempt_id = a.id
		 LEFT JOIN mistake_types t ON t.id = m.type_id
		 WHERE a.task_slug = $1 ORDER BY a.created_at DESC, a.id DESC LIMIT $2`, slug, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := []Attempt{}
	for rows.Next() {
		var a Attempt
		var mID, mType *int64
		var mTitle *string
		if err := rows.Scan(&a.ID, &a.TaskSlug, &a.Code, &a.Status, &a.Output, &a.DurationMs, &a.SolveTimeMs, &a.CreatedAt, &mID, &mType, &mTitle); err != nil {
			return nil, err
		}
		if mID != nil && mType != nil && mTitle != nil {
			a.Mistake = &MistakeRef{ID: *mID, TypeID: *mType, TypeTitle: *mTitle}
		}
		out = append(out, a)
	}
	return out, rows.Err()
}

func (s *Store) DeleteAttempt(ctx context.Context, id int64) error {
	tag, err := s.pool.Exec(ctx, `DELETE FROM attempts WHERE id = $1`, id)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return ErrNotFound
	}
	return nil
}

// ClearSolveTime discards the stopwatch reading of an attempt (the attempt itself stays).
func (s *Store) ClearSolveTime(ctx context.Context, id int64) error {
	tag, err := s.pool.Exec(ctx, `UPDATE attempts SET solve_time_ms = NULL WHERE id = $1`, id)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return ErrNotFound
	}
	return nil
}
