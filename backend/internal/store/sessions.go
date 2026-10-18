package store

import (
	"context"
	"errors"
	"math/rand/v2"
	"time"

	"github.com/jackc/pgx/v5"
)

// ErrEmptyPool means nothing matches the requested session, so it cannot start.
var ErrEmptyPool = errors.New("no items to play")

// UncategorizedSlug stands for "questions without a category" in a session's category filter.
const UncategorizedSlug = "uncategorized"

// SessionParams describes a session to start. Count is a wish: a smaller pool gives fewer items.
type SessionParams struct {
	Kind       string // question | quiz
	Mode       string // random | srs
	Count      int
	Categories []string // questions only; empty = all
}

type SessionItem struct {
	Position int        `json:"position"`
	ItemID   int64      `json:"itemId"`
	Title    string     `json:"title"`
	Rating   *int       `json:"rating"`
	RatedAt  *time.Time `json:"ratedAt"`
}

// Session is one study session. Items are only filled in by GetSession.
type Session struct {
	ID         int64         `json:"id"`
	Kind       string        `json:"kind"`
	Mode       string        `json:"mode"`
	Categories []string      `json:"categories"`
	CreatedAt  time.Time     `json:"createdAt"`
	FinishedAt *time.Time    `json:"finishedAt"`
	Total      int           `json:"total"`
	Counts     [4]int        `json:"counts"` // items per rating, indexed by rating
	Items      []SessionItem `json:"items,omitempty"`
}

// candidates loads the pool a session draws from, with the user's latest rating of each item.
func (s *Store) candidates(ctx context.Context, userID int64, p SessionParams) ([]candidate, error) {
	var source string
	args := []any{userID, p.Kind}
	switch p.Kind {
	case "quiz":
		source = `SELECT id, CASE WHEN title <> '' THEN title ELSE 'Quiz #' || id END AS title FROM quizzes`
	default:
		source = `SELECT id, title FROM questions`
		if len(p.Categories) > 0 {
			source += ` WHERE COALESCE(category_slug, 'uncategorized') = ANY($3)`
			args = append(args, p.Categories)
		}
	}
	rows, err := s.pool.Query(ctx, `
		SELECT src.id, src.title, last.rating, last.rated_at
		FROM (`+source+`) src
		LEFT JOIN LATERAL (
			SELECT i.rating, i.rated_at
			FROM study_session_items i JOIN study_sessions ss ON ss.id = i.session_id
			WHERE ss.user_id = $1 AND ss.kind = $2 AND i.item_id = src.id AND i.rating IS NOT NULL
			ORDER BY i.rated_at DESC LIMIT 1
		) last ON true`, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []candidate
	for rows.Next() {
		var c candidate
		var rated *time.Time
		if err := rows.Scan(&c.ID, &c.Title, &c.Last, &rated); err != nil {
			return nil, err
		}
		if rated != nil {
			c.SeenAt = *rated
		}
		out = append(out, c)
	}
	return out, rows.Err()
}

// StartSession picks the items and stores the session. It returns ErrEmptyPool when nothing matches.
func (s *Store) StartStudySession(ctx context.Context, userID int64, p SessionParams) (int64, error) {
	cands, err := s.candidates(ctx, userID, p)
	if err != nil {
		return 0, err
	}
	picked := pickCandidates(cands, p.Count, p.Mode == "srs", time.Now(), rand.New(rand.NewPCG(rand.Uint64(), rand.Uint64())))
	if len(picked) == 0 {
		return 0, ErrEmptyPool
	}
	if p.Categories == nil {
		p.Categories = []string{}
	}
	var id int64
	err = pgx.BeginFunc(ctx, s.pool, func(tx pgx.Tx) error {
		if err := tx.QueryRow(ctx,
			`INSERT INTO study_sessions (user_id, kind, mode, categories) VALUES ($1, $2, $3, $4) RETURNING id`,
			userID, p.Kind, p.Mode, p.Categories).Scan(&id); err != nil {
			return err
		}
		for i, c := range picked {
			if _, err := tx.Exec(ctx,
				`INSERT INTO study_session_items (session_id, position, item_id, title) VALUES ($1, $2, $3, $4)`,
				id, i, c.ID, c.Title); err != nil {
				return err
			}
		}
		return nil
	})
	return id, err
}

const sessionSelect = `
	SELECT s.id, s.kind, s.mode, s.categories, s.created_at, s.finished_at,
	       count(i.position),
	       count(*) FILTER (WHERE i.rating = 0), count(*) FILTER (WHERE i.rating = 1),
	       count(*) FILTER (WHERE i.rating = 2), count(*) FILTER (WHERE i.rating = 3)
	FROM study_sessions s LEFT JOIN study_session_items i ON i.session_id = s.id`

func scanSession(row pgx.Row) (Session, error) {
	var x Session
	err := row.Scan(&x.ID, &x.Kind, &x.Mode, &x.Categories, &x.CreatedAt, &x.FinishedAt, &x.Total,
		&x.Counts[0], &x.Counts[1], &x.Counts[2], &x.Counts[3])
	return x, err
}

// Sessions lists a user's sessions, newest first, without items.
func (s *Store) Sessions(ctx context.Context, userID int64) ([]Session, error) {
	rows, err := s.pool.Query(ctx, sessionSelect+` WHERE s.user_id = $1 GROUP BY s.id ORDER BY s.created_at DESC, s.id DESC`, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := []Session{}
	for rows.Next() {
		x, err := scanSession(rows)
		if err != nil {
			return nil, err
		}
		out = append(out, x)
	}
	return out, rows.Err()
}

// GetSession returns one of the user's sessions with its items in order.
func (s *Store) GetSession(ctx context.Context, userID, id int64) (Session, error) {
	x, err := scanSession(s.pool.QueryRow(ctx, sessionSelect+` WHERE s.id = $1 AND s.user_id = $2 GROUP BY s.id`, id, userID))
	if errors.Is(err, pgx.ErrNoRows) {
		return x, ErrNotFound
	}
	if err != nil {
		return x, err
	}
	rows, err := s.pool.Query(ctx, `SELECT position, item_id, title, rating, rated_at FROM study_session_items WHERE session_id = $1 ORDER BY position`, id)
	if err != nil {
		return x, err
	}
	defer rows.Close()
	x.Items = []SessionItem{}
	for rows.Next() {
		var it SessionItem
		if err := rows.Scan(&it.Position, &it.ItemID, &it.Title, &it.Rating, &it.RatedAt); err != nil {
			return x, err
		}
		x.Items = append(x.Items, it)
	}
	return x, rows.Err()
}

// RateSessionItem stores a rating (re-rating overwrites it) and closes the session once every item is rated.
func (s *Store) RateSessionItem(ctx context.Context, userID, id int64, position, rating int) error {
	return pgx.BeginFunc(ctx, s.pool, func(tx pgx.Tx) error {
		tag, err := tx.Exec(ctx, `
			UPDATE study_session_items i SET rating = $4, rated_at = now()
			FROM study_sessions s
			WHERE i.session_id = s.id AND s.id = $1 AND s.user_id = $2 AND i.position = $3`, id, userID, position, rating)
		if err != nil {
			return err
		}
		if tag.RowsAffected() == 0 {
			return ErrNotFound
		}
		_, err = tx.Exec(ctx, `
			UPDATE study_sessions SET finished_at = now()
			WHERE id = $1 AND finished_at IS NULL
			  AND NOT EXISTS (SELECT 1 FROM study_session_items WHERE session_id = $1 AND rating IS NULL)`, id)
		return err
	})
}

func (s *Store) DeleteStudySession(ctx context.Context, userID, id int64) error {
	tag, err := s.pool.Exec(ctx, `DELETE FROM study_sessions WHERE id = $1 AND user_id = $2`, id, userID)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return ErrNotFound
	}
	return nil
}
