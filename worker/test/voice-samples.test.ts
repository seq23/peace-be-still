import { env } from 'cloudflare:test';
import { describe, expect, it } from 'vitest';
import { parseReference } from '../src/shared';
import { checkAnswer } from '../src/quality/answer';
import { SAMPLES, type SampleSet } from '../src/voice/samples';

// The voice samples are shown to the model as earlier answers, so each one must be an answer the
// gate would let through (hostile review of 25c474f, F1/F7). The test Bible holds only a sample of
// verses, so a reference is checked by parsing here, not by lookup.
const ctxFor = (set: SampleSet, q: string) => ({
  db: env.DB, userText: q,
  lang: set === 'spanish' || set === 'teen-es' || set === 'mindset-es' ? 'es' as const : 'en' as const,
  translation: set === 'spanish' || set === 'teen-es' ? 'RV1909' as const : 'KJV' as const,
  teen: set === 'teen' || set === 'teen-es',
  door: set === 'mindset' || set === 'mindset-es' ? 'mindset' as const : 'faith' as const,
});

describe('voice samples', () => {
  it('8 to 12 per voice (6 for teen Spanish, 4 for Mindset in Spanish), none of them a red-team question', async () => {
    const { default: rt } = await import('./fixtures/redteam.json');
    const asked = new Set((rt as Array<{ prompt?: string }>).map(i => i.prompt));
    for (const [set, list] of Object.entries(SAMPLES)) {
      expect(list.length, set).toBeGreaterThanOrEqual(set === 'teen-es' ? 6 : set === 'mindset-es' ? 4 : 8);
      expect(list.length, set).toBeLessThanOrEqual(12);
      for (const s of list) expect(asked.has(s.q)).toBe(false);
    }
  });
  for (const [set, list] of Object.entries(SAMPLES) as Array<[SampleSet, typeof SAMPLES.plain]>) {
    it(`every ${set} sample passes the answer gate`, async () => {
      for (const s of list) {
        const r = await checkAnswer({ text: s.text, references: s.references }, ctxFor(set, s.q));
        const problems = r.ok ? [] : r.problems.filter(p => p !== 'unknown_reference');
        expect(problems, `${set}: ${s.text.slice(0, 50)}`).toEqual([]);
        for (const ref of s.references) expect(parseReference(ref), ref).not.toBeNull();
        if (set.startsWith('mindset')) expect(s.text).not.toMatch(/\b(?:God|Lord|pray\w*|verse|Scripture|Bible|church|pastor|Dios|Señor|orar|oración|Biblia|iglesia)\b/);
      }
    });
  }
  it('no two samples in one voice open or close with the same three words', () => {
    for (const list of Object.values(SAMPLES)) {
      const open = list.map(s => s.text.split(/\s+/).slice(0, 3).join(' '));
      const close = list.map(s => s.text.split(/(?<=[.!?])\s+/).at(-1)!.split(/\s+/).slice(0, 3).join(' '));
      expect(new Set(open).size).toBe(open.length);
      expect(new Set(close).size).toBe(close.length);
    }
  });
});
