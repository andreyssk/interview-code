# content/

Versioned copies of what is stored in the database (the database is the source of truth).

- `tasks/<slug>.json`, `articles/<slug>.json`: exactly the upload format of **Admin → Tasks / Articles → Upload JSON**
  (task numbers are assigned by the server and are not in the files). To rebuild an empty database, create the sections,
  categories and companies from `taxonomy.json` in **Admin → Sections & categories**, then upload these files.
- `taxonomy.json`: sections, categories and companies (reference only).
- The `add-task` and `add-article` skills write new files here.
