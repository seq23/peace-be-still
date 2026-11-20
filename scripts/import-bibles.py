#!/usr/bin/env python3
"""Build the bundled Bible indexes from the eBible verse-per-line archives."""
import json, re, sys, zipfile
from pathlib import Path

root = Path(__file__).resolve().parents[1]
sources = Path(sys.argv[1]) if len(sys.argv) > 1 else Path.home() / 'Work/codex-briefs/peace-be-still'
for name, archive, member in [('KJV', 'kjv/kjv_vpl.zip', 'eng-kjv_vpl.txt'), ('RV1909', 'rv1909/spaRV1909_vpl.zip', 'spaRV1909_vpl.txt')]:
    books = {}
    with zipfile.ZipFile(sources / archive) as z:
        for line in z.read(member).decode('utf-8-sig').splitlines():
            match = re.fullmatch(r'(\S+) (\d+):(\d+) (.*)', line)
            if not match:
                raise ValueError(f'{name}: invalid verse line: {line!r}')
            book, chapter, verse, text = match.groups()
            chapter_index = books.setdefault(book, {}).setdefault(chapter, {})
            if verse in chapter_index:
                raise ValueError(f'{name}: duplicate or empty verse {book} {chapter}:{verse}')
            chapter_index[verse] = text
    if sum(len(c) for b in books.values() for c in b.values()) < 30000:
        raise ValueError(f'{name}: incomplete Bible')
    (root / 'app/src/bible' / f'{name}.json').write_text(json.dumps(books, ensure_ascii=False, separators=(',', ':')) + '\n')
