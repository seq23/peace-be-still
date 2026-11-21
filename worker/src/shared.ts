// The app's own modules, imported (never copied): one book list and reference parser
// (content/bible/books.json + app/src/bible/core.ts, lane 2A), one banned-word list
// (app/src/quality/banned.json), the request vocabulary (app/src/model.ts) and the chat limits
// (app/src/gates). The Worker and the app cannot drift apart because there is one copy.
export { parseReference, formatReference, fold, bookCode, type Reference, type Translation } from '../../app/src/bible/core';
export { FREE_CHAT_MESSAGES, PAID_CHAT_MESSAGES } from '../../app/src/gates/index';
export type { Door, Voice } from '../../app/src/model';
export { default as banned } from '../../app/src/quality/banned.json';
export { providers, excludedTerritories } from './providers.mjs';
