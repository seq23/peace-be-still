import { i18n } from '../i18n';
import type { Language } from '../model';

const en = {
  title: 'Made for you',
  locked: 'A whispered session, about 12 minutes, made from what you write. Included with a subscription.',
  description: 'A whispered session, about 12 minutes, made from what you write.',
  shelf: 'Your sessions',
  new: 'New',
  plans: 'See subscription plans',
  note: 'What’s on your mind tonight?',
  privacy: 'Free AI providers read what you write and may use it for training. Leave out names and private details.',
  submit: 'Make my session',
  sending: 'Sending your request…',
  loading: 'Checking your sessions…',
  // The promise, always the real time in her phone's time zone.
  readyStatus: 'Ready %{when}',
  formPromise: 'Send it now and it will be ready %{when}.',
  whenToday: 'by %{time}',
  whenTomorrow: 'by %{time} tomorrow',
  whenDay: 'by %{time} %{weekday}',
  pendingDetail: 'We make it on our own computer overnight. It will be here when it’s ready.',
  retrying: 'The first try didn’t work, so we’re trying again.',
  late: 'This one is taking longer than we said. We’re still making it.',
  stopped: 'We couldn’t make your last session, and your note was erased.',
  expired: 'We couldn’t make your last session in time, and your note was erased.',
  usedToday: 'You can ask for another tomorrow.',
  crisisNothingSaved: 'Nothing you wrote was saved or sent on.',
  writeAgain: 'Write something else',
  full: 'Tonight and tomorrow night are full. Please try again tomorrow.',
  preview: 'This is a preview. Your request was not sent.',
  refresh: 'Check again',
  limit: 'You can request one session a day. Come back tomorrow.',
  error: 'We couldn’t load your sessions. Try again.',
  failed: 'We couldn’t send your request. Try again.',
  counter: '%{count} / 500',
  aiLabel: 'Written and voiced with AI',
  report: 'Report this session',
  reportAsk: 'What is wrong with it?',
  reasonHurtful: 'Hurtful or unkind',
  reasonWrongFaith: 'Wrong about the Bible',
  reasonWrongMindset: 'Wrong or misleading',
  reasonUnsafe: 'Unsafe advice',
  reasonOther: 'Something else',
  reported: 'Thank you. A person will review this report, and the session is gone from your list.',
  reportFailed: 'The report didn’t go through. Try again.',
  delete: 'Delete this session',
  deleteAsk: 'Delete it? This can’t be undone.',
  deleteYes: 'Delete',
  deleteNo: 'Keep it',
  deleteFailed: 'We couldn’t delete it. Try again.',
  settingsDelete: 'Delete my made-for-you sessions',
  settingsAsk: 'Delete every session made for you? This can’t be undone.',
  settingsDone: 'Your made-for-you sessions were deleted.',
} as const;

const es: Record<keyof typeof en, string> = {
  title: 'Para ti',
  locked: 'Una sesión susurrada de unos 12 minutos, inspirada en lo que escribes. Incluida con una suscripción.',
  description: 'Una sesión susurrada de unos 12 minutos, inspirada en lo que escribes.',
  shelf: 'Tus sesiones',
  new: 'Nueva',
  plans: 'Ver planes de suscripción',
  note: '¿Qué tienes en mente esta noche?',
  privacy: 'Los proveedores gratuitos de IA leen lo que escribes y pueden usarlo para entrenar sus modelos. Omite nombres y datos privados.',
  submit: 'Preparar mi sesión',
  sending: 'Enviando tu solicitud…',
  loading: 'Buscando tus sesiones…',
  readyStatus: 'Estará lista %{when}',
  formPromise: 'Si la envías ahora, estará lista %{when}.',
  whenToday: 'antes de las %{time}',
  whenTomorrow: 'mañana antes de las %{time}',
  whenDay: 'el %{weekday} antes de las %{time}',
  pendingDetail: 'La preparamos en nuestra propia computadora durante la noche. Aparecerá aquí cuando esté lista.',
  retrying: 'El primer intento no funcionó, así que lo estamos intentando de nuevo.',
  late: 'Esta sesión está tardando más de lo que dijimos. Seguimos preparándola.',
  stopped: 'No pudimos preparar tu última sesión, y tu nota se borró.',
  expired: 'No pudimos preparar tu última sesión a tiempo, y tu nota se borró.',
  usedToday: 'Puedes pedir otra mañana.',
  crisisNothingSaved: 'No se guardó ni se envió nada de lo que escribiste.',
  writeAgain: 'Escribir otra cosa',
  full: 'Esta noche y mañana por la noche ya no hay lugar. Inténtalo de nuevo mañana.',
  preview: 'Esta es una vista previa. Tu solicitud no se envió.',
  refresh: 'Volver a consultar',
  limit: 'Puedes pedir una sesión al día. Vuelve mañana.',
  error: 'No pudimos cargar tus sesiones. Inténtalo de nuevo.',
  failed: 'No pudimos enviar tu solicitud. Inténtalo de nuevo.',
  counter: '%{count} / 500',
  aiLabel: 'Escrita y narrada con IA',
  report: 'Reportar esta sesión',
  reportAsk: '¿Qué tiene de malo?',
  reasonHurtful: 'Hiriente o poco amable',
  reasonWrongFaith: 'Equivocada sobre la Biblia',
  reasonWrongMindset: 'Equivocada o engañosa',
  reasonUnsafe: 'Consejo peligroso',
  reasonOther: 'Otra cosa',
  reported: 'Gracias. Una persona revisará este reporte, y la sesión ya no aparece en tu lista.',
  reportFailed: 'El reporte no se envió. Inténtalo de nuevo.',
  delete: 'Borrar esta sesión',
  deleteAsk: '¿Borrarla? No se puede deshacer.',
  deleteYes: 'Borrar',
  deleteNo: 'Conservarla',
  deleteFailed: 'No pudimos borrarla. Inténtalo de nuevo.',
  settingsDelete: 'Borrar mis sesiones de Para ti',
  settingsAsk: '¿Borrar todas las sesiones preparadas para ti? No se puede deshacer.',
  settingsDone: 'Se borraron tus sesiones de Para ti.',
};

i18n.store({ en: { madeForYou: en }, es: { madeForYou: es } });

export type CopyKey = keyof typeof en;
export function madeForYouCopy(locale: Language) {
  return (key: CopyKey, values: Record<string, string | number> = {}) => i18n.t(`madeForYou\u0000${key}`, { locale, count: 0, ...values });
}

/** "by 8:00 AM", "by 8:00 AM tomorrow" or "by 8:00 AM Saturday", in the phone's own time zone. */
export function readyWhen(dueAt: number, locale: Language, now = Date.now()): string {
  const copy = madeForYouCopy(locale);
  const time = new Intl.DateTimeFormat(locale, { hour: 'numeric', minute: '2-digit' }).format(dueAt);
  const date = (at: number) => new Intl.DateTimeFormat('en-CA', { year: 'numeric', month: '2-digit', day: '2-digit' }).format(at);
  const days = Math.round((Date.parse(date(dueAt)) - Date.parse(date(now))) / 86_400_000);
  if (days <= 0) return copy('whenToday', { time });
  if (days === 1) return copy('whenTomorrow', { time });
  return copy('whenDay', { time, weekday: new Intl.DateTimeFormat(locale, { weekday: 'long' }).format(dueAt) });
}
