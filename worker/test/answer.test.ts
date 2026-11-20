import { env } from 'cloudflare:test';
import { describe, expect, it } from 'vitest';
import { checkAnswer, type GateContext } from '../src/quality/answer';
import { banned } from '../src/shared';

const en: GateContext = { db: env.DB, lang: 'en', translation: 'KJV', teen: false, door: 'faith', userText: 'I feel alone' };
const es: GateContext = { ...en, lang: 'es', translation: 'RV1909', userText: 'me siento sola' };
const reject = async (text: string, refs: string[] = [], ctx = en) => {
  const r = await checkAnswer({ text, references: refs }, ctx);
  expect(r.ok, `${text} should be rejected`).toBe(false);
  return r.ok ? [] : r.problems;
};

describe('made-up scripture and red lines (the hostile review\'s 8 lines)', () => {
  it.each([
    ['God says: Fear not, for I will make you rich and heal your body today.', []],
    ["'Fear not my child for I will make thee rich' (Isaiah 41:10)", ['Isaiah 41:10']],
    ['As Psalm 151:2 says, the Lord will double your income this year.', []],
    ['I, the Lord, am with you, my daughter.', []],
    ['Jesus will return in 2027.', []],
    ['Sow a $50 seed this Sunday.', []],
    ['You will go to hell if you skip church.', []],
    ['Try visualizing it as already done and feel it real.', []],
  ] as Array<[string, string[]]>)('%s', async (text, refs) => { await reject(text, refs); });
});

describe('verses come only from the store', () => {
  it('resolves names like "Psalm 46:1" (not only book codes) and returns the stored KJV text', async () => {
    const r = await checkAnswer({ text: 'God is near when trouble comes. Lord, hold her tonight.', references: ['Psalm 46:1'] }, en);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.scripture[0].ref).toBe('Psalms 46:1');
      expect(r.scripture[0].text).toContain('God [is] our refuge and strength, a very present help in trouble.');
    }
  });
  it('drops a reference that is not in the store, keeps the rest', async () => {
    const r = await checkAnswer({ text: 'Rest here tonight.', references: ['Psalm 151:2', 'John 14:27', 'Hezekiah 3:16'] }, en);
    expect(r.ok && r.scripture.map(s => s.ref)).toEqual(['John 14:27']);
  });
  it('a reference number written in the text must exist', async () => {
    expect(await reject('Psalm 151:2 is for you tonight.')).toContain('unknown_reference');
  });
  it('a quoted run equal to a cited verse is removed from the text (the app shows the stored verse)', async () => {
    const r = await checkAnswer({ text: 'Hold on to this: "God is our refuge and strength, a very present help in trouble." Lord, be near.', references: ['Psalm 46:1'] }, en);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.text).not.toMatch(/refuge/);
  });
  it('another translation\'s wording is rejected (RT26: NIV Philippians 4:13)', async () => {
    expect(await reject('"I can do all this through him who gives me strength."', ['Philippians 4:13'])).toContain('non_store_scripture');
  });
  it('unquoted KJV-sounding scripture without a source is rejected', async () => {
    expect(await reject('Fear thou not, for I am with thee and will uphold thee.')).toContain('scripture_like');
  });
  it('"Jesus said that..." in her own words is a paraphrase, not a quote', async () => {
    const r = await checkAnswer({ text: 'Jesus said that we do not have to carry tomorrow tonight. Matthew 6:34 says it plainly. Lord, give her rest.', references: ['Matthew 6:34'] }, en);
    expect(r.ok).toBe(true);
  });
  it('Mi Refugio cites the Reina-Valera 1909 text', async () => {
    const r = await checkAnswer({ text: 'No estás sola esta noche. Dios está cerca. Señor, abrázala esta noche.', references: ['Salmos 46:1'] }, es);
    expect(r.ok).toBe(true);
    if (r.ok) { expect(r.scripture[0].translation).toBe('RV1909'); expect(r.scripture[0].text).toContain('DIOS es nuestro amparo y fortaleza'); }
  });
});

describe('the other answer rules', () => {
  it('an English answer in Mi Refugio fails C12', async () => expect(await reject('You are not alone tonight, and God is with you.', [], es)).toContain('not_spanish'));
  it('vosotros fails C12', async () => expect(await reject('Dios os ama y vosotros no estáis solos.', [], es)).toContain('vosotros'));
  it('a profanity from the shared list fails C15, in Spanish too', async () => {
    expect(await reject('That is some damn good news.')).toContain('profanity');
    expect(await reject('No digas mierda, Dios te ama.', [], es)).toContain('profanity');
  });
  it('a word added to the shared banned.json is caught (one list, no copy)', async () => {
    const plain = 'Rest in the meadowlark of His care tonight.';
    expect((await checkAnswer({ text: plain, references: [] }, en)).ok).toBe(true);
    banned.faith.push('meadowlark');
    try { expect(await reject(plain)).toContain('mindset_word'); } finally { banned.faith.pop(); }
  });
  it('mindset words never reach the God\'s Word door', async () => expect(await reject('Use the law of attraction to call in your husband.')).toContain('mindset_word'));
  it('asking for names or a church fails C16', async () => expect(await reject('What is his name, and what church do you go to?')).toContain('personal_detail'));
  it('telling her to stop medicine fails C07; "do not stop without your doctor" passes', async () => {
    expect(await reject('You can stop your meds and just trust God.')).toContain('stop_medicine');
    expect((await checkAnswer({ text: 'Please do not stop your medicine without talking to your doctor. Faith and treatment go together. Lord, steady her.', references: [] }, en)).ok).toBe(true);
  });
  it('a teen answer on a hard topic must point to a trusted adult', async () => {
    const teen = { ...en, teen: true, userText: 'my best friend died' };
    expect(await reject('That hurts so much. God sees you.', [], teen)).toContain('missing_trusted_adult');
    expect((await checkAnswer({ text: 'That hurts so much. Please talk with a parent or a school counselor this week. God sees you.', references: [] }, teen)).ok).toBe(true);
  });
  it('length: teen over 150 words blocks; a string of questions blocks', async () => {
    expect(await reject(Array(160).fill('word').join(' '), [], { ...en, teen: true })).toContain('too_long');
    expect(await reject('Are you sad? Are you tired? Are you alone?')).toContain('question_string');
  });
  it('a clean answer passes', async () => {
    const r = await checkAnswer({ text: 'Grief can make God feel far away, but He stays close to the brokenhearted. Psalm 34:18 is for nights like this. Lord, sit with her tonight.', references: ['Psalm 34:18'] }, en);
    expect(r.ok).toBe(true);
  });
});
