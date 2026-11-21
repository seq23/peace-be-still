// Story artwork (her request 21 Nov 2026): approved illustrations come from the Worker's R2 bucket
// (worker/src/storyart.ts), so a new image goes live with no app build. The manifest is kept on the
// phone and asked for again at most once a day; offline, the kept copy is used. Any failure is "no
// image": the story screen then looks exactly as it does without art.
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState } from 'react';
import { CHAT_API } from '../chat/api';

export const ART_BASE = `${CHAT_API}/story-art`;

/** A story's art id: one painting per look, because Hush Harbor and Mi Refugio share story ids. Mi Refugio
 *  gets its Latino-cast painting (`mr-`); Hush Harbor and the plain telling share the Black-cast one (`hh-`). */
export const artId = (story: { id: string; telling: string }): string => `${story.telling === 'mi-refugio' ? 'mr' : 'hh'}-${story.id}`;
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

/** The image URL for this story, or null when it has no approved art (then nothing is ever requested). */
export function useStoryArt(id: string | undefined): string | null {
  const [uri, setUri] = useState<string | null>(null);
  useEffect(() => {
    let live = true;
    setUri(null);
    if (!id) return;
    void storyArtManifest().then(m => { if (live && m?.ids.includes(id)) setUri(`${ART_BASE}/${encodeURIComponent(id)}.webp?v=${m.version}`); }, () => undefined);
    return () => { live = false; };
  }, [id]);
  return uri;
}
