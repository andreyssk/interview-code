package store

import (
	"context"
	"hash/fnv"
	"strings"

	"github.com/jackc/pgx/v5"
)

// defaultSection receives new categories when the uploaded JSON does not say which section they belong to.
const defaultSection = "other"

var (
	glyphs = []string{"◆", "●", "■", "▲", "★", "✦", "◈", "⬡"}
	colors = []string{"var(--cyan)", "var(--pink)", "var(--amber)", "var(--violet)", "var(--green)", "var(--blue)"}
	tones  = []string{"neon-cyan", "neon-pink", "neon-amber", "neon-green", "neon-blue", "neon-red", "neon-yellow", "neon-indigo", "neon-violet"}
)

// nameFromSlug turns "hash-map" into "Hash Map".
func nameFromSlug(slug string) string {
	words := strings.Split(slug, "-")
	for i, w := range words {
		if w != "" {
			words[i] = strings.ToUpper(w[:1]) + w[1:]
		}
	}
	return strings.Join(words, " ")
}

// pick chooses an option from the slug, so the same slug always looks the same.
func pick[T any](slug string, options []T) T {
	h := fnv.New32a()
	_, _ = h.Write([]byte(slug))
	return options[int(h.Sum32())%len(options)]
}

// ensureTaxonomy creates, inside the caller's transaction, whatever of these a task or article refers to that does
// not exist yet. Names come from the slug; glyph, color and tag color are picked from the slug. New categories go
// into `section` (created if missing) or into "other" when none is given. Existing rows are never changed.
func ensureTaxonomy(ctx context.Context, tx pgx.Tx, section string, categories, companies []string) error {
	if len(categories) > 0 {
		var missing []string
		rows, err := tx.Query(ctx, `SELECT s FROM unnest($1::text[]) AS s WHERE s NOT IN (SELECT slug FROM categories)`, categories)
		if err != nil {
			return err
		}
		for rows.Next() {
			var s string
			if err := rows.Scan(&s); err != nil {
				rows.Close()
				return err
			}
			missing = append(missing, s)
		}
		rows.Close()
		if err := rows.Err(); err != nil {
			return err
		}
		if len(missing) > 0 {
			if section == "" {
				section = defaultSection
			}
			if _, err := tx.Exec(ctx, `
				INSERT INTO sections (slug, name, position)
				SELECT $1, $2, COALESCE(MAX(position), 0) + 1 FROM sections
				ON CONFLICT (slug) DO NOTHING`, section, nameFromSlug(section)); err != nil {
				return err
			}
			for _, slug := range missing {
				if _, err := tx.Exec(ctx, `
					INSERT INTO categories (slug, section_slug, name, glyph, color, jp, position)
					SELECT $1, $2, $3, $4, $5, '', COALESCE(MAX(position), 0) + 1 FROM categories
					ON CONFLICT (slug) DO NOTHING`, slug, section, nameFromSlug(slug), pick(slug, glyphs), pick(slug, colors)); err != nil {
					return err
				}
			}
		}
	}
	for _, slug := range companies {
		if _, err := tx.Exec(ctx, `INSERT INTO companies (slug, name, tone) VALUES ($1, $2, $3) ON CONFLICT (slug) DO NOTHING`,
			slug, nameFromSlug(slug), pick(slug, tones)); err != nil {
			return err
		}
	}
	return nil
}
