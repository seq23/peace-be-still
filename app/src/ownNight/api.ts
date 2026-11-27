// The app's one call for "Write your own night": the wish goes once to POST /api/own-night/scene (the paid private
// lane, adults only, checked again on the server) and nothing else ever leaves the phone. Any failure (offline, a
// refusal of who she is, a reply that is not one of the known shapes) is "write it yourself", never a blank scene.
import { Platform } from 'react-native';
import { authorizedPost } from '../chat/api';
import type { Age } from '../model';
import { previewCrisisText } from '../madeForYou/crisis';
import { refusedText, type SceneReply, type SceneRequest } from './contract';
import { SCENE_MAX, WHO_MAX, WISH_MAX } from './limits';

export type SceneResult = SceneReply | { kind: 'unavailable'; reason: 'offline' | 'locked' };

const text = (v: unknown): v is string => typeof v === 'string' && v.trim().length > 0;

/** Only the server's known replies pass; anything else is unsure, so she writes it herself. */
export function readReply(body: unknown): SceneResult {
  const b = (body ?? {}) as Record<string, unknown>;
  if (b.kind === 'scene' && text(b.scene) && (b.scene as string).length <= SCENE_MAX) return { kind: 'scene', scene: (b.scene as string).trim(), remaining: typeof b.remaining === 'number' ? b.remaining : 0 };
  if (b.kind === 'crisis' && text(b.text) && ['selfharm', 'abuse', 'child_abuse', 'medical'].includes(b.crisis as string)) return { kind: 'crisis', crisis: b.crisis as 'selfharm', text: b.text as string };
  if ((b.kind === 'refused' || b.kind === 'paused') && text(b.text)) return { kind: b.kind, text: b.text as string };
  if (b.kind === 'unavailable' && (b.reason === 'cap' || b.reason === 'limit')) return { kind: 'unavailable', reason: b.reason };
  return { kind: 'unavailable', reason: 'busy' };
}

export async function writeScene(age: Age | null, input: SceneRequest, fetcher: typeof fetch = fetch): Promise<SceneResult> {
  // Adults only (the Worker refuses anyone else too): a teen's or child's phone never sends a wish.
  if (age !== 'adult') return { kind: 'unavailable', reason: 'locked' };
  const wish = input.wish.trim();
  const who = input.who?.trim() ?? '';
  if (!wish || wish.length > WISH_MAX || who.length > WHO_MAX) return { kind: 'unavailable', reason: 'busy' };
  let res: Response;
  try {
    res = await authorizedPost(age, '/own-night/scene', { wish, ...(who ? { who } : {}), lang: input.lang, ...(input.region ? { region: input.region } : {}) }, fetcher);
  } catch {
    return { kind: 'unavailable', reason: 'offline' };
  }
  if (res.status === 402 || res.status === 403) return { kind: 'unavailable', reason: 'locked' };
  if (!res.ok) return { kind: 'unavailable', reason: 'busy' };
  return readReply(await res.json().catch(() => null));
}

/** The web preview's stand-in (?state=scene|crisis|refused|busy|limit): fixed TEST replies, no network, no model. */
export const isOwnNightPreview = () => Platform.OS === 'web' && process.env.EXPO_PUBLIC_PBS_PREVIEW === '1';
export const PREVIEW_SCENES = {
  en: 'TEST moment. I am standing in my own kitchen on a quiet Sunday morning, the new keys warm in my hand. Coffee is on, the window is open, and everything I hoped for is simply here.',
  es: 'Momento de PRUEBA. Estoy en mi propia cocina un domingo tranquilo por la mañana, con las llaves nuevas tibias en la mano. El café está listo, la ventana abierta, y todo lo que esperaba simplemente está aquí.',
} as const;
export function previewWrite(state: string | undefined) {
  return async (_age: Age | null, input: SceneRequest): Promise<SceneResult> => {
    if (state === 'crisis') return { kind: 'crisis', crisis: 'selfharm', text: previewCrisisText[input.lang] };
    if (state === 'refused') return { kind: 'refused', text: refusedText[input.lang] };
    if (state === 'busy' || state === 'limit' || state === 'cap') return { kind: 'unavailable', reason: state };
    return { kind: 'scene', scene: PREVIEW_SCENES[input.lang], remaining: 49 };
  };
}

/** "Report this moment" (App Review 1.2): the reason only. No word of the moment or the wish leaves the phone. */
export const REPORT_REASONS = ['hurtful', 'wrong', 'unsafe', 'other'] as const;
export type MomentReport = (typeof REPORT_REASONS)[number];
export async function reportMoment(age: Age | null, reason: MomentReport, fetcher: typeof fetch = fetch): Promise<boolean> {
  if (age !== 'adult') return false;
  try { return (await authorizedPost(age, '/report', { ownNight: true, reason }, fetcher)).status === 200; } catch { return false; }
}
