// The endpoint must authenticate the install and independently verify paid
// entitlement before calling these functions. Crisis text must never be saved.
export async function readMemory(db, installId) {
  const row = await db.prepare('SELECT summary FROM chat_memory WHERE install_id = ?').bind(installId).first();
  return row?.summary ?? null;
}

export async function saveMemory(db, installId, summary) {
  if (typeof summary !== 'string' || !summary.trim() || summary.length > 1000) throw new Error('CHAT_MEMORY_INVALID');
  await db.prepare('INSERT INTO chat_memory (install_id, summary) VALUES (?, ?) ON CONFLICT(install_id) DO UPDATE SET summary = excluded.summary')
    .bind(installId, summary.trim()).run();
}

export async function deleteMemory(db, installId) {
  await db.prepare('DELETE FROM chat_memory WHERE install_id = ?').bind(installId).run();
}
