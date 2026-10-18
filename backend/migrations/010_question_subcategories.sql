-- One level of subcategories under a question category.
-- A question may have no category, a category only, or a category and one of its subcategories (never a subcategory alone;
-- the API enforces that). Slugs are unique across all subcategories, like categories.
CREATE TABLE question_subcategories (
    slug          TEXT PRIMARY KEY,
    category_slug TEXT NOT NULL REFERENCES question_categories (slug) ON UPDATE CASCADE ON DELETE CASCADE,
    name          TEXT NOT NULL,
    position      INTEGER NOT NULL DEFAULT 0,
    UNIQUE (category_slug, slug)
);

ALTER TABLE questions ADD COLUMN subcategory_slug TEXT;

-- The pair must exist together, so a question cannot point at another category's subcategory.
-- Deleting a subcategory keeps its questions in the category (they land in its implicit "Other").
ALTER TABLE questions
    ADD CONSTRAINT questions_subcategory_fkey FOREIGN KEY (category_slug, subcategory_slug)
    REFERENCES question_subcategories (category_slug, slug) ON UPDATE CASCADE ON DELETE SET NULL (subcategory_slug);
CREATE INDEX idx_questions_subcategory ON questions (subcategory_slug);

-- A subcategory never outlives its category on a question (e.g. when the category is deleted and the question is uncategorized).
CREATE FUNCTION questions_clear_orphan_subcategory() RETURNS trigger AS $$
BEGIN
    IF NEW.category_slug IS NULL THEN
        NEW.subcategory_slug := NULL;
    END IF;
    RETURN NEW;
END
$$ LANGUAGE plpgsql;

CREATE TRIGGER questions_subcategory_needs_category
    BEFORE INSERT OR UPDATE ON questions
    FOR EACH ROW EXECUTE FUNCTION questions_clear_orphan_subcategory();
