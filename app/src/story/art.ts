// Story artwork (her request 21 Nov 2026): approved illustrations come from the Worker's R2 bucket
// (worker/src/storyart.ts), so a new image goes live with no app build. The manifest is kept on the
// phone and asked for again at most once a day; offline, the kept copy is used. Any failure is "no
// image": the story screen then looks exactly as it does without art.
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState } from 'react';
import { CHAT_API } from '../chat/api';
import type { Telling } from '../content';

export const ART_BASE = `${CHAT_API}/story-art`;

/** A story's art ids, best first: one painting per look, because the tellings share story ids (her rulings
 *  21 Nov 2026). Hush Harbor shows only the Black-cast painting (`hh-`) and Mi Refugio only the Hispanic-cast
 *  one (`mr-`); the plain "Bible Chat & Stories" telling shows the Hispanic-cast painting, or the Black-cast one
 *  when that story has no approved `mr-` painting. */
const LOOKS: Record<Telling, readonly ('hh' | 'mr')[]> = { 'hush-harbor': ['hh'], 'mi-refugio': ['mr'], plain: ['mr', 'hh'] };
export const artIds = (story: { id: string; telling: Telling }): string[] => LOOKS[story.telling].map(look => `${look}-${story.id}`);
export const ART_MANIFEST_KEY = 'peace-be-still-story-art-manifest';
const DAY = 24 * 3600_000;
type Manifest = { version: number; ids: string[] };
type Kept = { at: number; manifest: Manifest };

const valid = (m: unknown): m is Manifest => !!m && typeof m === 'object' && Number.isInteger((m as Manifest).version) && Array.isArray((m as Manifest).ids) && (m as Manifest).ids.every(x => typeof x === 'string');

let pending: Promise<Manifest | null> | null = null;
/** The approved manifest: the kept copy when it is under a day old, otherwise asked for (kept copy on failure). */
export function storyArtManifest(fetcher: typeof fetch = fetch, now = Date.now()): Promise<Manifest | null> {
  return (pending ??= (async () => {
    const kept = await AsyncStorage.getItem(ART_MANIFEST_KEY).then(v => (v ? (JSON.parse(v) as Kept) : null)).catch(() => null);
    if (kept && valid(kept.manifest) && now - kept.at < DAY) return kept.manifest;
    try {
      const res = await fetcher(`${ART_BASE}/manifest.json`);
      const body = res.ok ? await res.json() : null;
      if (!valid(body)) return kept && valid(kept.manifest) ? kept.manifest : null;
      await AsyncStorage.setItem(ART_MANIFEST_KEY, JSON.stringify({ at: now, manifest: body } satisfies Kept)).catch(() => undefined);
      return body;
    } catch {
      return kept && valid(kept.manifest) ? kept.manifest : null;
    }
  })().finally(() => { pending = null; }));
}

/** The image URL for this story: the first of its art ids that is approved, or null when none is (then
 *  nothing is ever requested). */
export function useStoryArt(ids: readonly string[]): string | null {
  const [uri, setUri] = useState<string | null>(null);
  const key = ids.join(' ');
  useEffect(() => {
    let live = true;
    setUri(null);
    if (!key) return;
    void storyArtManifest().then(m => {
      const id = m && key.split(' ').find(x => m.ids.includes(x));
      if (live && id) setUri(`${ART_BASE}/${encodeURIComponent(id)}.webp?v=${m.version}`);
    }, () => undefined);
    return () => { live = false; };
  }, [key]);
  return uri;
}
