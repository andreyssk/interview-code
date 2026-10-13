package store

import (
	"context"
	"errors"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
)

type User struct {
	ID                 int64     `json:"id"`
	Username           string    `json:"username"`
	Role               string    `json:"role"` // user | admin
	MustChangePassword bool      `json:"mustChangePassword"`
	CreatedAt          time.Time `json:"createdAt"`
}

// CreateUser adds an account; ErrDuplicate when the username is taken (case-insensitive).
func (s *Store) CreateUser(ctx context.Context, username, hash, role string, mustChange bool) (User, error) {
	u := User{Username: username, Role: role, MustChangePassword: mustChange}
	err := s.pool.QueryRow(ctx,
		`INSERT INTO users (username, password_hash, role, must_change_password) VALUES ($1, $2, $3, $4) RETURNING id, created_at`,
		username, hash, role, mustChange).Scan(&u.ID, &u.CreatedAt)
	var pgErr *pgconn.PgError
	if errors.As(err, &pgErr) && pgErr.Code == "23505" {
		return User{}, ErrDuplicate
	}
	return u, err
}

// UserByUsername returns the account and its password hash; ErrNotFound when there is none.
func (s *Store) UserByUsername(ctx context.Context, username string) (User, string, error) {
	var u User
	var hash string
	err := s.pool.QueryRow(ctx,
		`SELECT id, username, role, must_change_password, created_at, password_hash FROM users WHERE lower(username) = lower($1)`, username).
		Scan(&u.ID, &u.Username, &u.Role, &u.MustChangePassword, &u.CreatedAt, &hash)
	if errors.Is(err, pgx.ErrNoRows) {
		return u, "", ErrNotFound
	}
	return u, hash, err
}

// PasswordHash returns the stored hash of a user.
func (s *Store) PasswordHash(ctx context.Context, id int64) (string, error) {
	var hash string
	err := s.pool.QueryRow(ctx, `SELECT password_hash FROM users WHERE id = $1`, id).Scan(&hash)
	if errors.Is(err, pgx.ErrNoRows) {
		return "", ErrNotFound
	}
	return hash, err
}

// SetPassword replaces a password; mustChange forces the user to pick a new one at the next login.
func (s *Store) SetPassword(ctx context.Context, id int64, hash string, mustChange bool) error {
	tag, err := s.pool.Exec(ctx, `UPDATE users SET password_hash = $2, must_change_password = $3 WHERE id = $1`, id, hash, mustChange)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return ErrNotFound
	}
	return nil
}

// SetRole makes sure an account has the given role.
func (s *Store) SetRole(ctx context.Context, id int64, role string) error {
	_, err := s.pool.Exec(ctx, `UPDATE users SET role = $2 WHERE id = $1`, id, role)
	return err
}

func (s *Store) ListUsers(ctx context.Context) ([]User, error) {
	rows, err := s.pool.Query(ctx, `SELECT id, username, role, must_change_password, created_at FROM users ORDER BY created_at, id`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := []User{}
	for rows.Next() {
		var u User
		if err := rows.Scan(&u.ID, &u.Username, &u.Role, &u.MustChangePassword, &u.CreatedAt); err != nil {
			return nil, err
		}
		out = append(out, u)
	}
	return out, rows.Err()
}

func (s *Store) CreateSession(ctx context.Context, tokenHash string, userID int64, expires time.Time) error {
	_, err := s.pool.Exec(ctx, `INSERT INTO sessions (token_hash, user_id, expires_at) VALUES ($1, $2, $3)`, tokenHash, userID, expires)
	return err
}

// SessionUser returns the owner of a live session; expired sessions are removed.
func (s *Store) SessionUser(ctx context.Context, tokenHash string) (User, error) {
	var u User
	err := s.pool.QueryRow(ctx, `
		SELECT u.id, u.username, u.role, u.must_change_password, u.created_at
		FROM sessions s JOIN users u ON u.id = s.user_id
		WHERE s.token_hash = $1 AND s.expires_at > now()`, tokenHash).
		Scan(&u.ID, &u.Username, &u.Role, &u.MustChangePassword, &u.CreatedAt)
	if errors.Is(err, pgx.ErrNoRows) {
		return u, ErrNotFound
	}
	return u, err
}

func (s *Store) DeleteSession(ctx context.Context, tokenHash string) error {
	_, err := s.pool.Exec(ctx, `DELETE FROM sessions WHERE token_hash = $1`, tokenHash)
	return err
}

// DeleteUserSessions logs a user out everywhere, optionally keeping one session.
func (s *Store) DeleteUserSessions(ctx context.Context, userID int64, keepTokenHash string) error {
	_, err := s.pool.Exec(ctx, `DELETE FROM sessions WHERE user_id = $1 AND token_hash <> $2`, userID, keepTokenHash)
	return err
}

func (s *Store) PurgeSessions(ctx context.Context) error {
	_, err := s.pool.Exec(ctx, `DELETE FROM sessions WHERE expires_at <= now()`)
	return err
}

func (s *Store) Setting(ctx context.Context, key, fallback string) (string, error) {
	var v string
	err := s.pool.QueryRow(ctx, `SELECT value FROM settings WHERE key = $1`, key).Scan(&v)
	if errors.Is(err, pgx.ErrNoRows) {
		return fallback, nil
	}
	return v, err
}

func (s *Store) SetSetting(ctx context.Context, key, value string) error {
	_, err := s.pool.Exec(ctx, `INSERT INTO settings (key, value) VALUES ($1, $2) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value`, key, value)
	return err
}

// ClaimOrphans gives rows that existed before accounts (no owner) to a user.
func (s *Store) ClaimOrphans(ctx context.Context, userID int64) error {
	if _, err := s.pool.Exec(ctx, `UPDATE attempts SET user_id = $1 WHERE user_id IS NULL`, userID); err != nil {
		return err
	}
	_, err := s.pool.Exec(ctx, `UPDATE mistake_types SET user_id = $1 WHERE user_id IS NULL`, userID)
	return err
}
