import { i18n } from '../i18n';
import type { Language } from '../model';

const en = {
  title: 'Made for you',
  locked: 'A whispered session drawn from what’s on your mind. Included with a subscription.',
  plans: 'See subscription plans',
  note: 'What’s on your mind tonight?',
  privacy: 'Free AI providers read what you write and may use it for training. Leave out names and private details.',
  submit: 'Make my session',
  sending: 'Sending your request…',
  loading: 'Checking your sessions…',
  pending: 'Ready tonight',
  retrying: 'We couldn’t make your session tonight. We’ll try again.',
  delayed: 'This one is taking longer than usual.',
  expired: 'We couldn’t finish your session. Your note was erased. You can send a new request below.',
  preview: 'This is a preview. Your request was not sent.',
  refresh: 'Check again',
  limit: 'You can request one session a day. Come back tomorrow.',
  error: 'We couldn’t load your session. Try again.',
  failed: 'We couldn’t send your request. Try again.',
  counter: '%{count} / 500',
} as const;

const es: Record<keyof typeof en, string> = {
  title: 'Para ti',
  locked: 'Una sesión susurrada inspirada en lo que tienes en mente. Incluida con una suscripción.',
  plans: 'Ver planes de suscripción',
  note: '¿Qué tienes en mente esta noche?',
  privacy: 'Los proveedores gratuitos de IA leen lo que escribes y pueden usarlo para entrenamiento. Omite nombres y datos privados.',
  submit: 'Preparar mi sesión',
  sending: 'Enviando tu solicitud…',
  loading: 'Buscando tus sesiones…',
  pending: 'Estará lista esta noche',
  retrying: 'No pudimos preparar tu sesión esta noche. Lo intentaremos de nuevo.',
  delayed: 'Esta sesión está tardando más de lo habitual.',
  expired: 'No pudimos terminar tu sesión. Tu nota se borró. Puedes enviar otra solicitud aquí.',
  preview: 'Esta es una vista previa. Tu solicitud no se envió.',
  refresh: 'Volver a consultar',
  limit: 'Puedes pedir una sesión al día. Vuelve mañana.',
  error: 'No pudimos cargar tu sesión. Inténtalo de nuevo.',
  failed: 'No pudimos enviar tu solicitud. Inténtalo de nuevo.',
  counter: '%{count} / 500',
};

i18n.store({ en: { madeForYou: en }, es: { madeForYou: es } });

export function madeForYouCopy(locale: Language) {
  return (key: keyof typeof en, count = 0) => i18n.t(`madeForYou\u0000${key}`, { locale, count });
}
