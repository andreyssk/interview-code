package store

import "context"

// maxRecentTasks is how many tasks of history a user keeps; the popover shows fewer.
const maxRecentTasks = 30

// RecordRecentTask marks a task as just viewed and trims the history to the newest maxRecentTasks.
func (s *Store) RecordRecentTask(ctx context.Context, userID int64, slug string) error {
	if _, err := s.pool.Exec(ctx, `
		INSERT INTO recent_tasks (user_id, task_slug) VALUES ($1, $2)
		ON CONFLICT (user_id, task_slug) DO UPDATE SET viewed_at = now()`, userID, slug); err != nil {
		return err
	}
	_, err := s.pool.Exec(ctx, `
		DELETE FROM recent_tasks WHERE user_id = $1 AND task_slug NOT IN (
			SELECT task_slug FROM recent_tasks WHERE user_id = $1 ORDER BY viewed_at DESC, task_slug LIMIT $2)`, userID, maxRecentTasks)
	return err
}

// RecentTasks returns the slugs a user viewed, newest first.
func (s *Store) RecentTasks(ctx context.Context, userID int64) ([]string, error) {
	rows, err := s.pool.Query(ctx, `SELECT task_slug FROM recent_tasks WHERE user_id = $1 ORDER BY viewed_at DESC, task_slug LIMIT $2`, userID, maxRecentTasks)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := []string{}
	for rows.Next() {
		var s string
		if err := rows.Scan(&s); err != nil {
			return nil, err
		}
		out = append(out, s)
	}
	return out, rows.Err()
}

func (s *Store) ClearRecentTasks(ctx context.Context, userID int64) error {
	_, err := s.pool.Exec(ctx, `DELETE FROM recent_tasks WHERE user_id = $1`, userID)
	return err
}
