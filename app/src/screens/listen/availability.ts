import Constants from 'expo-constants';
import { useIsFocused } from 'expo-router';
import { useEffect, useState } from 'react';
import { audioBaseUrl } from '../../player/library';

const base = audioBaseUrl(Constants.expoConfig?.extra?.audioBaseUrl);

export function usePublishedAudio(enabled = true) {
  const focused = useIsFocused();
  const [published, setPublished] = useState<ReadonlyMap<string, string> | null>(null);

  useEffect(() => {
    if (!enabled || !focused || !base) return;
    let active = true;
    const request = new AbortController();
    const timeout = setTimeout(() => request.abort(), 8000);

    async function refresh(url: string) {
      try {
        const response = await fetch(new URL('manifest.jsonl', url).href, { signal: request.signal });
        if (!response.ok) throw new Error('Audio catalog unavailable');
        const rows = new Map<string, string>();
        for (const line of (await response.text()).split('\n')) {
          if (!line.trim()) continue;
          const row = JSON.parse(line);
          if (row?.status === 'passed' && typeof row.file === 'string' && typeof row.sha256 === 'string') {
            rows.set(row.file, row.sha256);
          }
        }
        if (!request.signal.aborted) setPublished(rows);
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
  }, [enabled, focused]);

  return published;
}
