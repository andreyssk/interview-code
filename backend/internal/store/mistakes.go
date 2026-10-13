package store

import (
	"context"
	"errors"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
)

var (
	ErrAttemptPassed = errors.New("attempt passed")
	ErrDuplicate     = errors.New("already in the journal")
)

type MistakeType struct {
	ID          int64     `json:"id"`
	Title       string    `json:"title"`
	Description string    `json:"description"`
	Count       int       `json:"count"`
	CreatedAt   time.Time `json:"createdAt"`
}

type Mistake struct {
	ID        int64     `json:"id"`
	TypeID    int64     `json:"typeId"`
	AttemptID *int64    `json:"attemptId"`
	TaskSlug  string    `json:"taskSlug"`
	Code      string    `json:"code"`
	Status    string    `json:"status"`
	Output    string    `json:"output"`
	CreatedAt time.Time `json:"createdAt"`
}

// MistakeRef says which type an attempt was filed under.
type MistakeRef struct {
	ID        int64  `json:"id"`
	TypeID    int64  `json:"typeId"`
	TypeTitle string `json:"typeTitle"`
}

type MistakeTypeDetail struct {
	MistakeType
	Mistakes []Mistake `json:"mistakes"`
}

func (s *Store) ListMistakeTypes(ctx context.Context, userID int64) ([]MistakeType, error) {
	rows, err := s.pool.Query(ctx, `
		SELECT t.id, t.title, t.description, t.created_at, COUNT(m.id)
		FROM mistake_types t LEFT JOIN mistakes m ON m.type_id = t.id
		WHERE t.user_id = $1
		GROUP BY t.id ORDER BY t.created_at DESC, t.id DESC`, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := []MistakeType{}
	for rows.Next() {
		var t MistakeType
		if err := rows.Scan(&t.ID, &t.Title, &t.Description, &t.CreatedAt, &t.Count); err != nil {
			return nil, err
		}
		out = append(out, t)
	}
	return out, rows.Err()
}

func (s *Store) CreateMistakeType(ctx context.Context, userID int64, title, description string) (MistakeType, error) {
	t := MistakeType{Title: title, Description: description}
	err := s.pool.QueryRow(ctx,
		`INSERT INTO mistake_types (title, description, user_id) VALUES ($1, $2, $3) RETURNING id, created_at`,
		title, description, userID).Scan(&t.ID, &t.CreatedAt)
	return t, err
}

func (s *Store) DeleteMistakeType(ctx context.Context, userID, id int64) error {
	tag, err := s.pool.Exec(ctx, `DELETE FROM mistake_types WHERE id = $1 AND user_id = $2`, id, userID)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return ErrNotFound
	}
	return nil
}

func (s *Store) GetMistakeType(ctx context.Context, userID, id int64) (MistakeTypeDetail, error) {
	d := MistakeTypeDetail{Mistakes: []Mistake{}}
	err := s.pool.QueryRow(ctx,
		`SELECT id, title, description, created_at FROM mistake_types WHERE id = $1 AND user_id = $2`, id, userID).
		Scan(&d.ID, &d.Title, &d.Description, &d.CreatedAt)
	if errors.Is(err, pgx.ErrNoRows) {
		return d, ErrNotFound
	}
	if err != nil {
		return d, err
	}
	rows, err := s.pool.Query(ctx,
		`SELECT id, type_id, attempt_id, task_slug, code, status, output, created_at
		 FROM mistakes WHERE type_id = $1 ORDER BY created_at DESC, id DESC`, id)
	if err != nil {
		return d, err
	}
	defer rows.Close()
	for rows.Next() {
		var m Mistake
		if err := rows.Scan(&m.ID, &m.TypeID, &m.AttemptID, &m.TaskSlug, &m.Code, &m.Status, &m.Output, &m.CreatedAt); err != nil {
			return d, err
		}
		d.Mistakes = append(d.Mistakes, m)
	}
	d.Count = len(d.Mistakes)
	return d, rows.Err()
}

// AddMistake files a failed attempt under a type, copying its code and output.
func (s *Store) AddMistake(ctx context.Context, userID, attemptID, typeID int64) (Mistake, error) {
	var status string
	err := s.pool.QueryRow(ctx, `SELECT status FROM attempts WHERE id = $1 AND user_id = $2`, attemptID, userID).Scan(&status)
	if errors.Is(err, pgx.ErrNoRows) {
		return Mistake{}, ErrNotFound
	}
	if err != nil {
		return Mistake{}, err
	}
	if status == "passed" {
		return Mistake{}, ErrAttemptPassed
	}

	var m Mistake
	err = s.pool.QueryRow(ctx, `
		INSERT INTO mistakes (type_id, attempt_id, task_slug, code, status, output)
		SELECT t.id, a.id, a.task_slug, a.code, a.status, a.output
		FROM attempts a JOIN mistake_types t ON t.id = $1 AND t.user_id = $3
		WHERE a.id = $2 AND a.user_id = $3
		RETURNING id, type_id, attempt_id, task_slug, code, status, output, created_at`, typeID, attemptID, userID).
		Scan(&m.ID, &m.TypeID, &m.AttemptID, &m.TaskSlug, &m.Code, &m.Status, &m.Output, &m.CreatedAt)
	if errors.Is(err, pgx.ErrNoRows) { // the type is not this user's (or does not exist)
		return Mistake{}, ErrNotFound
	}
	var pgErr *pgconn.PgError
	if errors.As(err, &pgErr) {
		switch pgErr.Code {
		case "23503": // unknown type
			return Mistake{}, ErrNotFound
		case "23505": // attempt already filed
			return Mistake{}, ErrDuplicate
		}
	}
	return m, err
}

func (s *Store) DeleteMistake(ctx context.Context, userID, id int64) error {
	tag, err := s.pool.Exec(ctx, `DELETE FROM mistakes m USING mistake_types t WHERE m.id = $1 AND t.id = m.type_id AND t.user_id = $2`, id, userID)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return ErrNotFound
	}
	return nil
}

// UpdateMistakeType changes a type's title and description and returns it with its current count.
func (s *Store) UpdateMistakeType(ctx context.Context, userID, id int64, title, description string) (MistakeType, error) {
	var t MistakeType
	err := s.pool.QueryRow(ctx, `
		WITH updated AS (
			UPDATE mistake_types SET title = $2, description = $3 WHERE id = $1 AND user_id = $4
			RETURNING id, title, description, created_at
		)
		SELECT u.id, u.title, u.description, u.created_at, (SELECT COUNT(*) FROM mistakes WHERE type_id = u.id)
		FROM updated u`, id, title, description, userID).
		Scan(&t.ID, &t.Title, &t.Description, &t.CreatedAt, &t.Count)
	if errors.Is(err, pgx.ErrNoRows) {
		return t, ErrNotFound
	}
	return t, err
}

// MoveMistake files an existing mistake under another type.
func (s *Store) MoveMistake(ctx context.Context, userID, id, typeID int64) (Mistake, error) {
	var m Mistake
	err := s.pool.QueryRow(ctx, `
		UPDATE mistakes m SET type_id = $2
		WHERE m.id = $1
		  AND EXISTS (SELECT 1 FROM mistake_types src WHERE src.id = m.type_id AND src.user_id = $3)
		  AND EXISTS (SELECT 1 FROM mistake_types dst WHERE dst.id = $2 AND dst.user_id = $3)
		RETURNING m.id, m.type_id, m.attempt_id, m.task_slug, m.code, m.status, m.output, m.created_at`, id, typeID, userID).
		Scan(&m.ID, &m.TypeID, &m.AttemptID, &m.TaskSlug, &m.Code, &m.Status, &m.Output, &m.CreatedAt)
	if errors.Is(err, pgx.ErrNoRows) {
		return m, ErrNotFound
	}
	var pgErr *pgconn.PgError
	if errors.As(err, &pgErr) && pgErr.Code == "23503" { // unknown type
		return Mistake{}, ErrNotFound
	}
	return m, err
}
