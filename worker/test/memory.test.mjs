import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readMemory, saveMemory, deleteMemory } from '../src/memory.mjs';

test('memory is keyed by install and can be deleted', async () => {
  const rows = new Map();
  const db = { prepare(sql) { return { bind(id, value) { return {
    async first() { return rows.has(id) ? { summary: rows.get(id) } : null; },
    async run() { if (sql.startsWith('DELETE')) rows.delete(id); else rows.set(id, value); },
  }; } }; } };
  await saveMemory(db, 'one', '  A hard week  ');
  assert.equal(await readMemory(db, 'one'), 'A hard week');
  assert.equal(await readMemory(db, 'two'), null);
  await deleteMemory(db, 'one');
  assert.equal(await readMemory(db, 'one'), null);
  await assert.rejects(saveMemory(db, 'one', ' '), /CHAT_MEMORY_INVALID/);
});
