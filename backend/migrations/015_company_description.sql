-- Optional text shown on the company's own page.
ALTER TABLE companies ADD COLUMN description TEXT NOT NULL DEFAULT '';
