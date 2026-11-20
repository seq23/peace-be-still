// The caller loads the appropriate stored Bible; model-supplied text is never
// used as scripture. References must use the source's book-code notation.
export function scriptureIndex(vpl) {
  const verses = new Map();
  for (const line of vpl.split(/\r?\n/u)) {
    const match = /^([1-3]?[A-Z]{3}) (\d+:\d+) (.+)$/u.exec(line);
    if (match) verses.set(`${match[1]} ${match[2]}`, match[3]);
  }
  if (!verses.size) throw new Error('SCRIPTURE_EMPTY');
  return verses;
}

const normalize = text => text.toLocaleLowerCase().replace(/[\[\]]/gu, '').replace(/[^\p{L}\p{N}]+/gu, ' ').trim();

export function insertScripture(answer, verses) {
  if (!(verses instanceof Map) || !verses.size || !answer || typeof answer.text !== 'string' ||
      !Array.isArray(answer.references) || !answer.references.every(ref => typeof ref === 'string')) {
    return { ok: false, reason: 'SCRIPTURE_INVALID' };
  }
  // Long quotations may only reproduce text from the stored translation.
  for (const match of answer.text.matchAll(/[“"]([^”"\n]+)[”"]/gu)) {
    const quote = normalize(match[1]);
    if (quote.split(/\s+/u).length >= 6 && ![...verses.values()].some(verse => normalize(verse).includes(quote))) {
      return { ok: false, reason: 'SCRIPTURE_UNVERIFIED_QUOTE' };
    }
  }
  const references = [...new Set(answer.references)].filter(ref => verses.has(ref)).slice(0, 3);
  return { ok: true, answer: { text: answer.text, scripture: references.map(reference => ({ reference, text: verses.get(reference) })) } };
}
