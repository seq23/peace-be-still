#!/usr/bin/env python3
"""Build the bundled Bible indexes from the committed eBible verse-per-line sources."""
import gzip
import json
import sys
from pathlib import Path

root = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(root))
from audio.lib.text import CODES, parse_vpl

for name, source in [('KJV', 'kjv'), ('RV1909', 'rv1909')]:
    with gzip.open(root / 'content/bible' / f'{source}_vpl.txt.gz', 'rt', encoding='utf-8-sig') as f:
        parsed = parse_vpl(f)
    if set(parsed) != set(CODES):
        raise ValueError(f'{name}: expected all 66 canonical books')
    books = {}
    for book, chapters in parsed.items():
        books[book] = {}
        for chapter, verses in chapters.items():
            index = {}
            for verse, text in verses:
                if str(verse) in index:
                    raise ValueError(f'{name}: duplicate verse {book} {chapter}:{verse}')
                index[str(verse)] = text
            books[book][str(chapter)] = index
    if sum(len(c) for b in books.values() for c in b.values()) < 30000:
        raise ValueError(f'{name}: incomplete Bible')
    (root / 'app/src/bible' / f'{name}.json').write_text(json.dumps(books, ensure_ascii=False, separators=(',', ':')) + '\n')
