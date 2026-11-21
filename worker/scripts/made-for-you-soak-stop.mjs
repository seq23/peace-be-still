// The soak's Rule 0 check, its own module so the unit test imports it without running a soak.
/** The named stop for a soak whose calls prove nothing: no model answered at all, or a provider family the run was
 * meant to use (all of them unless SOAK_RUNGS narrows it) never answered and only failed on a missing key. */
export function soakStop(calls, rungs = '') {
  if (!calls.some(c => c.outcome === 'ok')) return `MADE_FOR_YOU_SOAK_NO_MODEL: ${calls.length} calls, none answered`;
  const wanted = rungs ? rungs.split(',').map(x => x.trim()).filter(Boolean) : ['workers-ai', 'gemini', 'openrouter'];
  for (const family of wanted) {
    const mine = calls.filter(c => c.rung.startsWith(family));
    if (mine.length && !mine.some(c => c.outcome === 'ok') && mine.every(c => /MISSING|missing_key/.test(c.outcome))) {
      return `MADE_FOR_YOU_SOAK_${family.toUpperCase().replace(/-/g, '_')}_SKIPPED: every ${family} call failed on a missing key (${mine[0].outcome})`;
    }
  }
  return null;
}
