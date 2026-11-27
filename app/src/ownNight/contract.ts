// The one shape POST /api/own-night/scene speaks, shared by the app and the Worker (worker/src/ownNight.ts).
export type SceneRequest = { wish: string; who?: string; lang: 'en' | 'es'; region?: string };
export type SceneReply =
  | { kind: 'scene'; scene: string; remaining: number }
  | { kind: 'crisis'; crisis: 'selfharm' | 'abuse' | 'child_abuse' | 'medical'; text: string }
  | { kind: 'refused'; text: string }
  | { kind: 'paused'; text: string }
  /** She can write it herself: the model is down or unsure (busy), the app's paid AI is at its monthly cap (cap),
   *  or today's private messages are used (limit). Never a blank scene, never a charge to her count. */
  | { kind: 'unavailable'; reason: 'busy' | 'cap' | 'limit' };

/** The fixed reply to a wish that cannot become a night scene (harm, control of another person, sexual content, a
 *  minor): written by people, never by the model, the same words in the Worker and the preview. */
export const refusedText = {
  en: "I can't write that one as a night scene. Try a moment from your own life, just after what you hope for has happened.",
  es: 'No puedo escribir esa como escena para la noche. Prueba con un momento de tu propia vida, justo después de que pase lo que esperas.',
} as const;
