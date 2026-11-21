import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { readFileSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';
import { DatabaseSync } from 'node:sqlite';
import versions from '../src/bible/data/versions.json';
import { BOOKS, bookCode, createBible, openCurrent, displayRuns, formatReference, parseReference, startsParagraph, type Translation, type Verse } from '../src/bible/core';

// The committed eBible files are the one source; the app's SQLite files must hold them exactly.
const sources: Record<Translation, string> = { KJV: 'kjv', RV1909: 'rv1909' };
const canon = new Set(BOOKS.map(book => book.code));
function source(translation: Translation): Map<string, string> {
  const lines = gunzipSync(readFileSync(`../content/bible/${sources[translation]}_vpl.txt.gz`)).toString('utf8').replace(/^﻿/, '').split('\n');
  const verses = new Map<string, string>();
  for (const line of lines) {
    const match = line.match(/^([1-4A-Z]{3}) (\d+):(\d+) ?(.*)$/);
    if (match && canon.has(match[1])) verses.set(`${match[1]} ${match[2]}:${match[3]}`, match[4].trim());
  }
  return verses;
}
function open(translation: Translation) {
  const db = new DatabaseSync(`src/bible/data/${sources[translation].toLowerCase()}.db`, { readOnly: true });
  return { db, bible: createBible({ all: async <T>(sql: string, params: (string | number)[]) => db.prepare(sql).all(...params) as T[] }) };
}

// A different 200 every run; the seed is printed so a failure can be replayed with PBS_SEED.
const seed = Number(process.env.PBS_SEED ?? Date.now() % 2 ** 31);
function random(state: number) { return () => { state = (state * 1103515245 + 12345) % 2 ** 31; return state / 2 ** 31; }; }

for (const translation of ['KJV', 'RV1909'] as const) {
  test(`${translation}: every verse of the source equals the stored text, 66 books only`, () => {
    const { db } = open(translation);
    const expected = source(translation);
    const rows = db.prepare('SELECT book, chapter, verse, text FROM verses ORDER BY id').all() as Verse[];
    assert.equal(expected.size, 31102);
    assert.equal(rows.length, expected.size);
    for (const row of rows) assert.equal(row.text, expected.get(`${row.book} ${row.chapter}:${row.verse}`), `${row.book} ${row.chapter}:${row.verse}`);
    const books = db.prepare('SELECT DISTINCT book FROM verses ORDER BY id').all() as { book: string }[];
    assert.deepEqual(books.map(row => row.book), BOOKS.map(book => book.code));
    assert.equal((db.prepare("SELECT value FROM meta WHERE key = 'version'").get() as { value: string }).value, versions[translation]);
  });

  test(`${translation}: 200 random verses read through the app's lookup equal the source (seed ${seed})`, async () => {
    const { bible } = open(translation);
    const expected = [...source(translation)];
    const next = random(seed + translation.length);
    for (let i = 0; i < 200; i++) {
      const [reference, text] = expected[Math.floor(next() * expected.length)];
      const [, book, chapter, verse] = reference.match(/^(\S+) (\d+):(\d+)$/)!;
      assert.equal((await bible.verse(book, Number(chapter), Number(verse)))?.text, text, `${reference} (PBS_SEED=${seed})`);
    }
  });
}

test('lookup takes names, USFM codes and file codes; unknown references return nothing', async () => {
  const kjv = open('KJV').bible;
  const john = '¶ For God so loved the world, that he gave his only begotten Son, that whosoever believeth in him should not perish, but have everlasting life.';
  for (const name of ['John', 'JHN', 'JOH', 'juan']) assert.equal((await kjv.verse(name, 3, 16))?.text, john, name);
  assert.equal(await kjv.verse('John', 3, 99), null);
  assert.equal(await kjv.verse('Tobit', 1, 1), null);
  assert.equal((await kjv.chapter('Psalm', 23)).length, 6);
  assert.deepEqual((await kjv.passage(parseReference('John 3:16-17')!)).map(v => v.verse), [16, 17]);
});

test('search ignores accents and case and ranks the closest verses first', async () => {
  const rv = open('RV1909').bible;
  const all = (await rv.search('corazon', 200)).map(v => v.text);
  assert.equal(all.length, 200);
  assert.ok(all.every(text => /coraz[oó]n/i.test(text)));
  assert.ok((await rv.search('Senor Jehova', 5)).every(v => /Señor/.test(v.text) && /Jehová/.test(v.text)));
  const kjv = open('KJV').bible;
  assert.equal((await kjv.search('loved world begotten', 1))[0]?.verse, 16);
  assert.deepEqual(await kjv.search('  "*()  '), []);
  await assert.doesNotReject(kjv.search('NEAR( OR NOT " ^', 3)); // typed text is never FTS5 syntax
});

test('without FTS5 (the web build) search scans text folded once per translation', async () => {
  const { db } = open('RV1909');
  const calls: string[] = [];
  const bible = createBible({ all: async <T>(sql: string, params: (string | number)[]) => {
    calls.push(sql);
    if (sql.includes('verses_fts')) throw new Error('no such module: fts5');
    return db.prepare(sql).all(...params) as T[];
  } });
  const found = await bible.search('corazon', 10);
  assert.equal(found.length, 10);
  assert.ok(found.every(v => /corazón/i.test(v.text)));
  const before = calls.length;
  const started = performance.now();
  const again = await bible.search('Senor Jehova', 5);
  const ms = performance.now() - started;
  assert.equal(calls.length, before, 'a second search reads nothing from SQLite');
  assert.ok(again.length === 5 && again.every(v => /señor/i.test(v.text) && /jehová/i.test(v.text)));
  console.log(`web fallback: second search ${ms.toFixed(1)} ms`);
});

test('a missing or older device copy is replaced before use; a current one is used as is', async () => {
  const run = async (start: string | null) => {
    const steps: string[] = [];
    let onDisk = start;
    const db = await openCurrent('2-new', {
      exists: () => onDisk !== null,
      install: async () => { steps.push('install'); onDisk = '2-new'; },
      open: async () => { steps.push('open'); return { version: onDisk }; },
      version: async db => db.version,
      close: async () => { steps.push('close'); },
    });
    assert.equal(db.version, '2-new');
    return steps;
  };
  assert.deepEqual(await run(null), ['install', 'open']);
  assert.deepEqual(await run('1-old'), ['open', 'close', 'install', 'open']);
  assert.deepEqual(await run('2-new'), ['open']);
  await assert.rejects(openCurrent('2-new', { exists: () => true, install: async () => {}, open: async () => ({}), version: async () => '1-old', close: async () => {} }), /expected 2-new/);
});

test('every book is found by its English name, Spanish name and USFM code, and no name is shared', () => {
  assert.equal(BOOKS.length, 66);
  for (const book of BOOKS) {
    for (const name of [book.en, book.es, book.usfm, book.code, book.en.toUpperCase()]) assert.equal(bookCode(name), book.code, name);
  }
  assert.equal(bookCode('1 John'), '1JO');
  assert.equal(bookCode('1 Juan'), '1JO');
  assert.equal(bookCode('II Kings'), '2KI');
  assert.equal(bookCode('Tobit'), null);
});

test('references parse in English, Spanish and USFM, and format back', () => {
  assert.deepEqual(parseReference('John 3:16'), { book: 'JOH', chapter: 3, verse: 16 });
  assert.deepEqual(parseReference('Juan 3:16'), { book: 'JOH', chapter: 3, verse: 16 });
  assert.deepEqual(parseReference('JHN 3:16'), { book: 'JOH', chapter: 3, verse: 16 });
  assert.deepEqual(parseReference('Primera de Juan 4:8'), { book: '1JO', chapter: 4, verse: 8 });
  assert.deepEqual(parseReference('Salmo 91:2'), { book: 'PSA', chapter: 91, verse: 2 });
  assert.deepEqual(parseReference('Psalm 23'), { book: 'PSA', chapter: 23 });
  assert.deepEqual(parseReference('Romans 8:28-30'), { book: 'ROM', chapter: 8, verse: 28, endVerse: 30 });
  assert.equal(parseReference('Romans 8:30-28'), null);
  assert.equal(parseReference('Hezekiah 1:1'), null);
  assert.equal(parseReference('John'), null);
  assert.equal(formatReference({ book: 'JOH', chapter: 3, verse: 16 }, 'es'), 'Juan 3:16');
  assert.equal(formatReference({ book: 'ROM', chapter: 8, verse: 28, endVerse: 30 }, 'en'), 'Romans 8:28-30');
});

test("the translators' supplied words show in italics without changing the stored text", async () => {
  const verse = await open('KJV').bible.verse('Genesis', 1, 2);
  assert.match(verse!.text, /darkness \[was\] upon the face/);
  const runs = displayRuns(verse!.text);
  assert.equal(runs.map(run => run.text).join(''), verse!.text.replace(/[[\]]/g, ''));
  assert.deepEqual(runs.filter(run => run.italic).map(run => run.text), ['was']);
  assert.deepEqual(displayRuns('No marks here.'), [{ text: 'No marks here.', italic: false }]);
  const john = (await open('KJV').bible.verse('John', 3, 16))!.text;
  assert.equal(startsParagraph(john), true);
  assert.match(displayRuns(john)[0].text, /^For God so loved/);
});
