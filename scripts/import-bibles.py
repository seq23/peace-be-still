#!/usr/bin/env python3
"""Build the app's Bible files from the one committed source.

Reads content/bible/{kjv,rv1909,krv,cuvs,cuv}_vpl.txt.gz with the shared parser and 66-book list
(audio/lib/text.py, content/bible/books.json) and writes app/src/bible/data/<translation>.db: one SQLite
file per translation that the app opens lazily with expo-sqlite. KRV = 개역한글 (1961); CUVS / CUVT = the
1919 和合本 in Simplified / Traditional (never the 1988 edition). FTS5's word tokenizer cannot split
Chinese, so the Korean and Chinese files carry no verses_fts and the app searches them by scanning.

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
import gzip  # noqa: E402

from audio.lib.text import CODES, SCRIPTURE, parse_vpl  # noqa: E402

OUT = ROOT / "app/src/bible/data"
SCHEMA = 1
# name: (source file, has FTS5 word search)
TRANSLATIONS = {
    "KJV": ("kjv_vpl.txt.gz", True), "RV1909": ("rv1909_vpl.txt.gz", True),
    "KRV": ("krv_vpl.txt.gz", False), "CUVS": ("cuvs_vpl.txt.gz", False), "CUVT": ("cuv_vpl.txt.gz", False),
}


def build(name: str, file: str, fts: bool) -> str:
    source = SCRIPTURE / file
    version = f"{SCHEMA}-{hashlib.sha256(source.read_bytes()).hexdigest()[:12]}"
    with gzip.open(source, "rt", encoding="utf-8") as f:
        bible = parse_vpl(f)
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
    if len(rows) < 30900:
        raise SystemExit(f"{name}: only {len(rows)} verses")

    path = OUT / f"{name.lower()}.db"
    path.unlink(missing_ok=True)
    db = sqlite3.connect(path)
    db.executescript("""
        CREATE TABLE verses(id INTEGER PRIMARY KEY, book TEXT NOT NULL, chapter INTEGER NOT NULL,
                            verse INTEGER NOT NULL, text TEXT NOT NULL, UNIQUE(book, chapter, verse));
        CREATE TABLE meta(key TEXT PRIMARY KEY, value TEXT NOT NULL);
    """)
    db.executemany("INSERT INTO verses(book, chapter, verse, text) VALUES (?, ?, ?, ?)", rows)
    if fts:
        db.executescript("""
            CREATE VIRTUAL TABLE verses_fts USING fts5(text, content='verses', content_rowid='id',
                                                       tokenize='unicode61 remove_diacritics 2');
            INSERT INTO verses_fts(verses_fts) VALUES ('rebuild');
            INSERT INTO verses_fts(verses_fts) VALUES ('optimize');
        """)
    db.executemany("INSERT INTO meta VALUES (?, ?)", [("version", version), ("translation", name)])
    db.commit()
    db.execute("VACUUM")
    db.close()
    print(f"{name}: {len(rows)} verses, {path.stat().st_size:,} bytes, version {version}")
    return version


if __name__ == "__main__":
    OUT.mkdir(parents=True, exist_ok=True)
    versions = {name: build(name, file, fts) for name, (file, fts) in TRANSLATIONS.items()}
    (OUT / "versions.json").write_text(json.dumps(versions, indent=2) + "\n")
