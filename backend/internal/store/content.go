package store

import (
	"context"
	"encoding/json"
	"errors"
	"strings"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
)

// Content is everything the frontend needs to render problems and theory; it is small, so it is served in one piece.
type Content struct {
	Sections   []Section  `json:"sections"`
	Categories []Category `json:"categories"`
	Companies  []Company  `json:"companies"`
	Tasks      []Task     `json:"tasks"`
	Articles   []Article  `json:"articles"`
}

type Section struct {
	Slug     string `json:"slug"`
	Name     string `json:"name"`
	Position int    `json:"position"`
}

type Category struct {
	Slug     string `json:"slug"`
	Section  string `json:"section"`
	Name     string `json:"name"`
	Glyph    string `json:"glyph"`
	Color    string `json:"color"`
	JP       string `json:"jp"`
	Position int    `json:"position"`
}

type Company struct {
	Slug string `json:"slug"`
	Name string `json:"name"`
	Tone string `json:"tone"`
}

// Task is the full definition of a problem. The JSON fields are passed through as they are stored.
type Task struct {
	Slug          string          `json:"slug"`
	Number        int             `json:"number"` // 0 on create = take the next one
	Title         string          `json:"title"`
	Difficulty    string          `json:"difficulty"`
	Categories    []string        `json:"categories"`
	Companies     []string        `json:"companies"`
	LeetcodeURL   *string         `json:"leetcodeUrl"`
	Description   json.RawMessage `json:"description"`
	SolutionNotes json.RawMessage `json:"solutionNotes"`
	Solution      *string         `json:"solution"`
	Signature     json.RawMessage `json:"signature"`
	Tests         json.RawMessage `json:"tests"`
	Complexity    json.RawMessage `json:"complexity"`
	Template      *string         `json:"template"`
	// Section is only read on save: where to put categories this task mentions that do not exist yet.
	Section string `json:"section,omitempty"`
}

type Article struct {
	Slug       string          `json:"slug"`
	Title      string          `json:"title"`
	Summary    string          `json:"summary"`
	Content    json.RawMessage `json:"content"`
	SourceName *string         `json:"sourceName"`
	SourceURL  *string         `json:"sourceUrl"`
	Category   *string         `json:"category"`
	Categories []string        `json:"categories"`
	Tasks      []string        `json:"tasks"`
	// Section is only read on save: where to put categories this article mentions that do not exist yet.
	Section string `json:"section,omitempty"`
}

func (s *Store) Content(ctx context.Context) (Content, error) {
	c := Content{Sections: []Section{}, Categories: []Category{}, Companies: []Company{}, Tasks: []Task{}, Articles: []Article{}}

	rows, err := s.pool.Query(ctx, `SELECT slug, name, position FROM sections ORDER BY position, slug`)
	if err != nil {
		return c, err
	}
	for rows.Next() {
		var x Section
		if err := rows.Scan(&x.Slug, &x.Name, &x.Position); err != nil {
			rows.Close()
			return c, err
		}
		c.Sections = append(c.Sections, x)
	}
	rows.Close()
	if err := rows.Err(); err != nil {
		return c, err
	}

	rows, err = s.pool.Query(ctx, `SELECT slug, section_slug, name, glyph, color, jp, position FROM categories ORDER BY position, slug`)
	if err != nil {
		return c, err
	}
	for rows.Next() {
		var x Category
		if err := rows.Scan(&x.Slug, &x.Section, &x.Name, &x.Glyph, &x.Color, &x.JP, &x.Position); err != nil {
			rows.Close()
			return c, err
		}
		c.Categories = append(c.Categories, x)
	}
	rows.Close()
	if err := rows.Err(); err != nil {
		return c, err
	}

	rows, err = s.pool.Query(ctx, `SELECT slug, name, tone FROM companies ORDER BY name`)
	if err != nil {
		return c, err
	}
	for rows.Next() {
		var x Company
		if err := rows.Scan(&x.Slug, &x.Name, &x.Tone); err != nil {
			rows.Close()
			return c, err
		}
		c.Companies = append(c.Companies, x)
	}
	rows.Close()
	if err := rows.Err(); err != nil {
		return c, err
	}

	rows, err = s.pool.Query(ctx, `
		SELECT t.slug, t.number, t.title, t.difficulty, t.leetcode_url, t.description, t.solution_notes, t.solution,
		       t.signature, t.tests, t.complexity, t.template,
		       COALESCE((SELECT array_agg(category_slug ORDER BY category_slug) FROM task_categories WHERE task_id = t.id), '{}'),
		       COALESCE((SELECT array_agg(company_slug ORDER BY company_slug) FROM task_companies WHERE task_id = t.id), '{}')
		FROM tasks t ORDER BY t.number`)
	if err != nil {
		return c, err
	}
	for rows.Next() {
		var x Task
		if err := rows.Scan(&x.Slug, &x.Number, &x.Title, &x.Difficulty, &x.LeetcodeURL, &x.Description, &x.SolutionNotes, &x.Solution,
			&x.Signature, &x.Tests, &x.Complexity, &x.Template, &x.Categories, &x.Companies); err != nil {
			rows.Close()
			return c, err
		}
		c.Tasks = append(c.Tasks, x)
	}
	rows.Close()
	if err := rows.Err(); err != nil {
		return c, err
	}

	rows, err = s.pool.Query(ctx, `
		SELECT a.slug, a.title, a.summary, a.content, a.source_name, a.source_url, a.category_slug,
		       COALESCE((SELECT array_agg(category_slug ORDER BY category_slug) FROM article_categories WHERE article_id = a.id), '{}'),
		       COALESCE((SELECT array_agg(task_slug ORDER BY task_slug) FROM article_tasks WHERE article_id = a.id), '{}')
		FROM articles a ORDER BY a.id`)
	if err != nil {
		return c, err
	}
	defer rows.Close()
	for rows.Next() {
		var x Article
		if err := rows.Scan(&x.Slug, &x.Title, &x.Summary, &x.Content, &x.SourceName, &x.SourceURL, &x.Category, &x.Categories, &x.Tasks); err != nil {
			return c, err
		}
		c.Articles = append(c.Articles, x)
	}
	return c, rows.Err()
}

func (s *Store) UpsertSection(ctx context.Context, x Section) error {
	_, err := s.pool.Exec(ctx, `
		INSERT INTO sections (slug, name, position) VALUES ($1, $2, $3)
		ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name, position = EXCLUDED.position`, x.Slug, x.Name, x.Position)
	return err
}

func (s *Store) UpsertCategory(ctx context.Context, x Category) error {
	_, err := s.pool.Exec(ctx, `
		INSERT INTO categories (slug, section_slug, name, glyph, color, jp, position) VALUES ($1, $2, $3, $4, $5, $6, $7)
		ON CONFLICT (slug) DO UPDATE SET section_slug = EXCLUDED.section_slug, name = EXCLUDED.name, glyph = EXCLUDED.glyph,
		  color = EXCLUDED.color, jp = EXCLUDED.jp, position = EXCLUDED.position`,
		x.Slug, x.Section, x.Name, x.Glyph, x.Color, x.JP, x.Position)
	return err
}

func (s *Store) UpsertCompany(ctx context.Context, x Company) error {
	_, err := s.pool.Exec(ctx, `
		INSERT INTO companies (slug, name, tone) VALUES ($1, $2, $3)
		ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name, tone = EXCLUDED.tone`, x.Slug, x.Name, x.Tone)
	return err
}

// UpsertTask creates or replaces a task by slug. A zero Number takes the next one (an update keeps its number).
func (s *Store) UpsertTask(ctx context.Context, t Task) error {
	return pgx.BeginFunc(ctx, s.pool, func(tx pgx.Tx) error {
		var number *int
		if t.Number > 0 {
			number = &t.Number
		}
		var id int64
		err := tx.QueryRow(ctx, `
			INSERT INTO tasks (slug, number, title, difficulty, description, solution_notes, solution, signature, tests, complexity, leetcode_url, template)
			VALUES ($1, COALESCE($2::int, nextval('tasks_number_seq')), $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
			ON CONFLICT (slug) DO UPDATE SET
			  number = COALESCE($2::int, tasks.number), title = EXCLUDED.title, difficulty = EXCLUDED.difficulty,
			  description = EXCLUDED.description, solution_notes = EXCLUDED.solution_notes, solution = EXCLUDED.solution,
			  signature = EXCLUDED.signature, tests = EXCLUDED.tests, complexity = EXCLUDED.complexity,
			  leetcode_url = EXCLUDED.leetcode_url, template = EXCLUDED.template, updated_at = now()
			RETURNING id`,
			t.Slug, number, t.Title, t.Difficulty, t.Description, nilIfNull(t.SolutionNotes), t.Solution, t.Signature, t.Tests,
			nilIfNull(t.Complexity), t.LeetcodeURL, t.Template).Scan(&id)
		if err != nil {
			return err
		}
		if err := ensureTaxonomy(ctx, tx, t.Section, t.Categories, t.Companies); err != nil {
			return err
		}
		if _, err := tx.Exec(ctx, `DELETE FROM task_categories WHERE task_id = $1`, id); err != nil {
			return err
		}
		if _, err := tx.Exec(ctx, `INSERT INTO task_categories (task_id, category_slug) SELECT $1, unnest($2::text[])`, id, t.Categories); err != nil {
			return err
		}
		if _, err := tx.Exec(ctx, `DELETE FROM task_companies WHERE task_id = $1`, id); err != nil {
			return err
		}
		if _, err := tx.Exec(ctx, `INSERT INTO task_companies (task_id, company_slug) SELECT $1, unnest($2::text[])`, id, t.Companies); err != nil {
			return err
		}
		// Keep the sequence ahead of any explicit number so the next automatic one is unused.
		_, err = tx.Exec(ctx, `SELECT setval('tasks_number_seq', GREATEST((SELECT max(number) FROM tasks), (SELECT last_value FROM tasks_number_seq)))`)
		return err
	})
}

// UpsertArticle creates or replaces an article by slug.
func (s *Store) UpsertArticle(ctx context.Context, a Article) error {
	return pgx.BeginFunc(ctx, s.pool, func(tx pgx.Tx) error {
		cats := a.Categories
		if a.Category != nil {
			cats = append([]string{*a.Category}, cats...)
		}
		if err := ensureTaxonomy(ctx, tx, a.Section, cats, nil); err != nil {
			return err
		}
		var id int64
		err := tx.QueryRow(ctx, `
			INSERT INTO articles (slug, title, summary, content, source_name, source_url, category_slug)
			VALUES ($1, $2, $3, $4, $5, $6, $7)
			ON CONFLICT (slug) DO UPDATE SET title = EXCLUDED.title, summary = EXCLUDED.summary, content = EXCLUDED.content,
			  source_name = EXCLUDED.source_name, source_url = EXCLUDED.source_url, category_slug = EXCLUDED.category_slug, updated_at = now()
			RETURNING id`, a.Slug, a.Title, a.Summary, a.Content, a.SourceName, a.SourceURL, a.Category).Scan(&id)
		if err != nil {
			return err
		}
		if _, err := tx.Exec(ctx, `DELETE FROM article_categories WHERE article_id = $1`, id); err != nil {
			return err
		}
		if _, err := tx.Exec(ctx, `INSERT INTO article_categories (article_id, category_slug) SELECT $1, unnest($2::text[])`, id, a.Categories); err != nil {
			return err
		}
		if _, err := tx.Exec(ctx, `DELETE FROM article_tasks WHERE article_id = $1`, id); err != nil {
			return err
		}
		_, err = tx.Exec(ctx, `INSERT INTO article_tasks (article_id, task_slug) SELECT $1, unnest($2::text[])`, id, a.Tasks)
		return err
	})
}

// nilIfNull turns a JSON "null" or empty value into SQL NULL.
func nilIfNull(m json.RawMessage) any {
	if len(m) == 0 || string(m) == "null" {
		return nil
	}
	return []byte(m)
}

// ErrInUse: the row is still referenced (e.g. a category that tasks belong to).
var ErrInUse = errors.New("still in use")

// ErrBadReference: a link points at something that does not exist; Detail names the missing kind.
type ErrBadReference struct{ Detail string }

func (e ErrBadReference) Error() string { return "unknown " + e.Detail }

// refError translates foreign-key violations into typed errors.
func refError(err error) error {
	var pgErr *pgconn.PgError
	if !errors.As(err, &pgErr) {
		return err
	}
	switch pgErr.Code {
	case "23503": // foreign key violation
		c := pgErr.ConstraintName
		switch {
		case strings.Contains(c, "category") || strings.Contains(c, "section"):
			if strings.HasPrefix(pgErr.Message, "update or delete") {
				return ErrInUse
			}
			return ErrBadReference{Detail: "category or section"}
		case strings.Contains(c, "company"):
			if strings.HasPrefix(pgErr.Message, "update or delete") {
				return ErrInUse
			}
			return ErrBadReference{Detail: "company"}
		case strings.Contains(c, "task"):
			return ErrBadReference{Detail: "task"}
		}
	case "23505":
		return ErrDuplicate
	}
	return err
}

func (s *Store) deleteBySlug(ctx context.Context, table, slug string) error {
	tag, err := s.pool.Exec(ctx, `DELETE FROM `+table+` WHERE slug = $1`, slug)
	if err != nil {
		return refError(err)
	}
	if tag.RowsAffected() == 0 {
		return ErrNotFound
	}
	return nil
}

func (s *Store) DeleteSection(ctx context.Context, slug string) error {
	return s.deleteBySlug(ctx, "sections", slug)
}
func (s *Store) DeleteCategory(ctx context.Context, slug string) error {
	return s.deleteBySlug(ctx, "categories", slug)
}
func (s *Store) DeleteCompany(ctx context.Context, slug string) error {
	return s.deleteBySlug(ctx, "companies", slug)
}
func (s *Store) DeleteTask(ctx context.Context, slug string) error {
	return s.deleteBySlug(ctx, "tasks", slug)
}
func (s *Store) DeleteArticle(ctx context.Context, slug string) error {
	return s.deleteBySlug(ctx, "articles", slug)
}

// SaveSection, SaveCategory, ... are the admin-facing upserts: same as the Upsert* helpers, with typed reference errors.
func (s *Store) SaveSection(ctx context.Context, x Section) error {
	return refError(s.UpsertSection(ctx, x))
}
func (s *Store) SaveCategory(ctx context.Context, x Category) error {
	return refError(s.UpsertCategory(ctx, x))
}
func (s *Store) SaveCompany(ctx context.Context, x Company) error {
	return refError(s.UpsertCompany(ctx, x))
}
func (s *Store) SaveTask(ctx context.Context, x Task) error { return refError(s.UpsertTask(ctx, x)) }
func (s *Store) SaveArticle(ctx context.Context, x Article) error {
	return refError(s.UpsertArticle(ctx, x))
}

// TaskExists reports whether a task with this slug exists.
func (s *Store) TaskExists(ctx context.Context, slug string) (bool, error) {
	var ok bool
	err := s.pool.QueryRow(ctx, `SELECT EXISTS (SELECT 1 FROM tasks WHERE slug = $1)`, slug).Scan(&ok)
	return ok, err
}
