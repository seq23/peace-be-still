-- The Worker's lookup copy of the ONE Bible source: rows are loaded by scripts/worker-bible-load.mjs
-- from app/src/bible/data/{kjv,rv1909}.db (built by scripts/import-bibles.py from content/bible/*.gz).
-- Book codes are the file codes in content/bible/books.json.
CREATE TABLE IF NOT EXISTS bible_verses (translation TEXT NOT NULL, book TEXT NOT NULL, chapter INTEGER NOT NULL, verse INTEGER NOT NULL, text TEXT NOT NULL,
  PRIMARY KEY (translation, book, chapter, verse)) WITHOUT ROWID;
CREATE TABLE IF NOT EXISTS bible_meta (translation TEXT PRIMARY KEY, version TEXT NOT NULL);

INSERT OR IGNORE INTO schema_version (migration) VALUES ('0003_bible');
