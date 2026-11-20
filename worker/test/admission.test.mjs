import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import { reserveMessage } from '../src/admission.mjs';

function setup() {
  const sql = new DatabaseSync(':memory:');
  sql.exec(readFileSync(new URL('../migrations/0001_admission.sql', import.meta.url), 'utf8'));
  return { sql, db: { prepare(query) { return { bind(...values) { return { async run() { sql.prepare(query).run(...values); } }; } }; } } };
}
const base = { day: '2026-11-20', device: 'device', conversation: 'one', ipHash: 'hash', paid: false, ipLimit: 200, globalLimit: 1000 };
test('reserves free messages atomically and keeps one conversation', async () => {
  const { db, sql } = setup();
  assert.equal((await reserveMessage(db, base)).allowed, true);
  assert.equal((await reserveMessage(db, { ...base, conversation: 'two' })).code, 'CHAT_CONVERSATION_LIMIT');
  for (let i = 1; i < 10; i++) assert.equal((await reserveMessage(db, base)).allowed, true);
  assert.equal((await reserveMessage(db, base)).code, 'CHAT_DEVICE_LIMIT');
  assert.equal(sql.prepare('SELECT messages FROM chat_global_day').get().messages, 10);
  assert.equal(sql.prepare('SELECT count(*) AS n FROM chat_admission').get().n, 0);
});
test('enforces paid, IP and global limits without consuming other counters on failure', async () => {
  const { db, sql } = setup();
  for (let i = 0; i < 100; i++) assert.equal((await reserveMessage(db, { ...base, paid: true, conversation: String(i) })).allowed, true);
  assert.equal((await reserveMessage(db, { ...base, paid: true })).code, 'CHAT_DEVICE_LIMIT');
  assert.equal((await reserveMessage(db, { ...base, device: 'other', ipLimit: 100 })).code, 'CHAT_IP_LIMIT');
  assert.equal((await reserveMessage(db, { ...base, device: 'other', ipHash: 'other', globalLimit: 100 })).code, 'CHAT_GLOBAL_LIMIT');
  assert.equal(sql.prepare('SELECT count(*) AS n FROM chat_device_day').get().n, 1);
});
