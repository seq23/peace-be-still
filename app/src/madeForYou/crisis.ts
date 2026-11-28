import type { Language } from '../i18n';
import ko from '../../../worker/src/replies.ko.json';
import zhHans from '../../../worker/src/replies.zh-Hans.json';
import zhHant from '../../../worker/src/replies.zh-Hant.json';

/** The chat's own fixed 988 reply (worker/src/replies.ts lifeline; Korean and Chinese from the Worker's own reply
 *  files), for the web preview's crisis screen in every screen language. */
export const previewCrisisText: Record<Language, string> = {
  en: 'Please reach out right now to the 988 Suicide & Crisis Lifeline. Call or text 988, any time, day or night.',
  es: 'Por favor, comunícate ahora con la Línea 988 de Prevención del Suicidio y Crisis. Llama al 988 y oprime 2 para español, o envía un mensaje de texto al 988, a cualquier hora.',
  ko: ko.lifeline,
  'zh-Hans': zhHans.lifeline,
  'zh-Hant': zhHant.lifeline,
};
