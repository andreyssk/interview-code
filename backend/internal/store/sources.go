package store

import (
	"context"
	"errors"

	"github.com/jackc/pgx/v5"
)

// MaxIconBytes caps an uploaded source icon.
const MaxIconBytes = 100 * 1024

type Source struct {
	Slug string  `json:"slug"`
	Name string  `json:"name"`
	Link *string `json:"link"`
	// IconURL is where the image is served (versioned, so it can be cached); nil when the source has no icon.
	IconURL *string `json:"iconUrl"`
}

func (s *Store) Sources(ctx context.Context) ([]Source, error) {
	rows, err := s.pool.Query(ctx, `
		SELECT slug, name, link,
		       CASE WHEN icon IS NULL THEN NULL
		            ELSE '/api/sources/' || slug || '/icon?v=' || floor(extract(epoch FROM icon_updated_at))::bigint END
		FROM sources ORDER BY name`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := []Source{}
	for rows.Next() {
		var x Source
		if err := rows.Scan(&x.Slug, &x.Name, &x.Link, &x.IconURL); err != nil {
			return nil, err
		}
		out = append(out, x)
	}
	return out, rows.Err()
}

// SaveSource creates or updates name and link; the icon is managed separately and kept as it is.
func (s *Store) SaveSource(ctx context.Context, x Source) error {
	_, err := s.pool.Exec(ctx, `
		INSERT INTO sources (slug, name, link) VALUES ($1, $2, $3)
		ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name, link = EXCLUDED.link`, x.Slug, x.Name, x.Link)
	return refError(err)
}

func (s *Store) DeleteSource(ctx context.Context, slug string) error {
	return s.deleteBySlug(ctx, "sources", slug)
}

// SetSourceIcon stores the image; ErrNotFound when there is no such source.
func (s *Store) SetSourceIcon(ctx context.Context, slug, mediaType string, data []byte) error {
	tag, err := s.pool.Exec(ctx, `UPDATE sources SET icon = $2, icon_type = $3, icon_updated_at = now() WHERE slug = $1`, slug, data, mediaType)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return ErrNotFound
	}
	return nil
}

func (s *Store) ClearSourceIcon(ctx context.Context, slug string) error {
	tag, err := s.pool.Exec(ctx, `UPDATE sources SET icon = NULL, icon_type = NULL, icon_updated_at = NULL WHERE slug = $1`, slug)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return ErrNotFound
	}
	return nil
}

// SourceIcon returns the stored image; ErrNotFound when the source has none.
func (s *Store) SourceIcon(ctx context.Context, slug string) (mediaType string, data []byte, err error) {
	err = s.pool.QueryRow(ctx, `SELECT icon_type, icon FROM sources WHERE slug = $1 AND icon IS NOT NULL`, slug).Scan(&mediaType, &data)
	if errors.Is(err, pgx.ErrNoRows) {
		return "", nil, ErrNotFound
	}
	return mediaType, data, err
}
