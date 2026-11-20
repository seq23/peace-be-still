#!/usr/bin/env python3
"""Build the app's two Bible files from the one committed source.

Reads content/bible/{kjv,rv1909}_vpl.txt.gz with the shared parser and 66-book list (audio/lib/text.py,
content/bible/books.json) and writes app/src/bible/data/{kjv,rv1909}.db: one SQLite file per
translation that the app opens lazily with expo-sqlite.

  verses(id, book, chapter, verse, text)   id = canonical order; (book, chapter, verse) is unique
  verses_fts                                FTS5 over verses.text, accents and case folded
  meta(key, value)                          'version' = hash of the source file + SCHEMA

The text is stored exactly as the source has it (the word-for-word rule). It also writes
app/src/bible/data/versions.json, which the app compares with meta.version to replace an old copy.
Run: python3 scripts/import-bibles.py
"""
from __future__ import annotations

import hashlib
import json
import sqlite3
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
from audio.lib.text import CODES, SCRIPTURE, TRANSLATION, load_bible  # noqa: E402

OUT = ROOT / "app/src/bible/data"
SCHEMA = 1
TRANSLATIONS = {"KJV": "en", "RV1909": "es"}


def build(name: str, lang: str) -> str:
    source = SCRIPTURE / TRANSLATION[lang][1]
    version = f"{SCHEMA}-{hashlib.sha256(source.read_bytes()).hexdigest()[:12]}"
    bible = load_bible(lang)
    if list(bible) != CODES:
        raise SystemExit(f"{name}: expected the 66 canonical books in order, found {len(bible)}")
    rows = []
    for book in CODES:
        for chapter, verses in bible[book].items():
            seen = set()
            for verse, text in verses:
                # RV1909 keeps a few numbered verses empty where its versification joins them to
                # the next verse (NUM 12:16 and 17 more); they are stored as the source has them.
                if verse in seen:
                    raise SystemExit(f"{name}: duplicate verse {book} {chapter}:{verse}")
                seen.add(verse)
                rows.append((book, chapter, verse, text))
    if len(rows) < 31000:
        raise SystemExit(f"{name}: only {len(rows)} verses")

    path = OUT / f"{name.lower()}.db"
    path.unlink(missing_ok=True)
    db = sqlite3.connect(path)
    db.executescript("""
        CREATE TABLE verses(id INTEGER PRIMARY KEY, book TEXT NOT NULL, chapter INTEGER NOT NULL,
                            verse INTEGER NOT NULL, text TEXT NOT NULL, UNIQUE(book, chapter, verse));
        CREATE VIRTUAL TABLE verses_fts USING fts5(text, content='verses', content_rowid='id',
                                                   tokenize='unicode61 remove_diacritics 2');
        CREATE TABLE meta(key TEXT PRIMARY KEY, value TEXT NOT NULL);
    """)
    db.executemany("INSERT INTO verses(book, chapter, verse, text) VALUES (?, ?, ?, ?)", rows)
    db.execute("INSERT INTO verses_fts(verses_fts) VALUES ('rebuild')")
    db.execute("INSERT INTO verses_fts(verses_fts) VALUES ('optimize')")
    db.executemany("INSERT INTO meta VALUES (?, ?)", [("version", version), ("translation", name)])
    db.commit()
    db.execute("VACUUM")
    db.close()
    print(f"{name}: {len(rows)} verses, {path.stat().st_size:,} bytes, version {version}")
    return version


if __name__ == "__main__":
    OUT.mkdir(parents=True, exist_ok=True)
    versions = {name: build(name, lang) for name, lang in TRANSLATIONS.items()}
    (OUT / "versions.json").write_text(json.dumps(versions, indent=2) + "\n")
