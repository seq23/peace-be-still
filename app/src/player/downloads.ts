import type { Track } from './library';

/** The few file operations a download needs; adapters.ts backs them with expo-file-system. */
export interface DownloadFiles {
  exists(name: string): boolean;
  uri(name: string): string;
  download(url: string, name: string): Promise<void>;
  sha256(name: string): Promise<string>;
  move(from: string, to: string): Promise<void>;
  remove(name: string): void;
}

export class DownloadIncompleteError extends Error {
  readonly code = 'download-incomplete';
  constructor(file: string) { super(`Download did not finish: ${file}`); }
}

/** Saved files are named by their manifest hash, so a re-rendered track never plays an old copy. */
const finalName = (track: Track) => `${track.sha256}.m4a`;

export function createDownloads(files: DownloadFiles) {
  return {
    /** A local copy only ever exists after its hash matched the manifest. */
    find(track: Track): string | null {
      const name = finalName(track);
      return files.exists(name) ? files.uri(name) : null;
    },
    /** Downloads to `<sha256>.part`, checks the hash, and only then renames it to the final file. */
    async save(track: Track, url: string): Promise<string> {
      const name = finalName(track);
      if (files.exists(name)) return files.uri(name);
      const part = `${track.sha256}.part`;
      if (files.exists(part)) files.remove(part);
      try {
        await files.download(url, part);
        if ((await files.sha256(part)).toLowerCase() !== track.sha256) throw new DownloadIncompleteError(track.file);
        await files.move(part, name);
        return files.uri(name);
      } catch (cause) {
        if (files.exists(part)) files.remove(part);
        throw cause instanceof DownloadIncompleteError ? cause : new DownloadIncompleteError(track.file);
      }
    },
    remove(track: Track): void {
      const name = finalName(track);
      if (files.exists(name)) files.remove(name);
    },
  };
}
export type Downloads = ReturnType<typeof createDownloads>;
