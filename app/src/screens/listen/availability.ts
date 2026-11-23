import Constants from 'expo-constants';
import { useIsFocused } from 'expo-router';
import { useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { asManifestRows, audioBaseUrl, liveScripture } from '../../player/library';
import { setLiveTracks } from './preview';

const base = audioBaseUrl(Constants.expoConfig?.extra?.audioBaseUrl);

// The chapters published after this build, saved from the last good read so a downloaded one still lists offline.
// Read through the same checks as the network copy; a network read that already landed wins.
const LIVE_KEY = 'pbs.liveScripture.v1';
let readLive = false;
AsyncStorage.getItem(LIVE_KEY).then(text => { if (text && !readLive) setLiveTracks(liveScripture(text)); }).catch(() => {});

/** The published files (R2 manifest), read on focus; its scripture rows also add the chapters published after this build. `enabled` false skips the request (Today outside the small hours). */
export function usePublishedAudio(enabled = true) {
  const focused = useIsFocused();
  const [published, setPublished] = useState<ReadonlyMap<string, string> | null>(null);

  useEffect(() => {
    if (!focused || !base || !enabled) return;
    let active = true;
    const request = new AbortController();
    const timeout = setTimeout(() => request.abort(), 8000);

    async function refresh(url: string) {
      try {
        const response = await fetch(new URL('manifest.jsonl', url).href, { signal: request.signal });
        if (!response.ok) throw new Error('Audio catalog unavailable');
        const rows = new Map<string, string>();
        const text = await response.text();
        for (const line of text.split('\n')) {
          if (!line.trim()) continue;
          const row = JSON.parse(line);
          if (row?.status === 'passed' && typeof row.file === 'string' && typeof row.sha256 === 'string') {
            rows.set(row.file, row.sha256);
          }
        }
        if (!request.signal.aborted) {
          const live = liveScripture(text);   // before setPublished: its re-render lists the new chapters
          if (live.length) {
            readLive = true;
            AsyncStorage.setItem(LIVE_KEY, asManifestRows(setLiveTracks(live))).catch(() => {});
          }
          setPublished(rows);
        }
      } catch {
        if (active) setPublished(null);
      } finally {
        clearTimeout(timeout);
      }
    }

    void refresh(base);
    return () => {
      active = false;
      clearTimeout(timeout);
      request.abort();
    };
  }, [focused, enabled]);

  return published;
}
