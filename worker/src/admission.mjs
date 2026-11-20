// The caller must authenticate the install and verify paid entitlement before
// calling this function; neither device identity nor paid status comes from chat text.
export async function reserveMessage(db, { day, device, conversation, ipHash, paid, ipLimit, globalLimit }) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day) || !device || !conversation || !ipHash ||
      typeof paid !== 'boolean' || !Number.isSafeInteger(ipLimit) || ipLimit < 1 ||
      !Number.isSafeInteger(globalLimit) || globalLimit < 1) throw new Error('CHAT_ADMISSION_CONFIG');
  try {
    await db.prepare('INSERT INTO chat_admission VALUES (?, ?, ?, ?, ?, ?, ?)')
      .bind(day, device, conversation, ipHash, paid ? 1 : 0, ipLimit, globalLimit).run();
    return { allowed: true };
  } catch (error) {
    const code = /CHAT_(?:GLOBAL|IP|DEVICE|CONVERSATION)_LIMIT/.exec(String(error))?.[0];
    if (code) return { allowed: false, code };
    throw error;
  }
}
