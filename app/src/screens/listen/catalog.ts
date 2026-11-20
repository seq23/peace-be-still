import { chapterTitles } from '../../player/books';
import type { Door } from '../../model';
import type { Track } from '../../player/library';

export function shelfOf(track: Track) {
  if (track.kind === 'psalms' || track.kind === 'bible') return track.kind;
  if (track.kind === 'imagination-night' || track.ref.startsWith('content/imagination-nights/')) return 'imagination';
  if (track.kind === 'stories' && track.ref.startsWith('content/stories/hush-harbor/')) return 'hushHarbor';
  if (track.kind === 'stories' && track.ref.startsWith('content/stories/mi-refugio/')) return 'miRefugio';
  return null;
}

export function trackBelongsToDoor(track: Track, door: Door | null): boolean {
  const shelf = shelfOf(track);
  return door === 'mindset' ? shelf === 'imagination' : door === 'faith' && shelf !== null && shelf !== 'imagination';
}

export function groupBible(tracks: readonly Track[], locale: 'en' | 'es') {
  const books = new Map<string, Track[]>();
  for (const track of tracks) {
    const [code] = track.ref.split(' ');
    const chapters = books.get(code) ?? [];
    chapters.push(track);
    books.set(code, chapters);
  }
  return Array.from(books, ([code, chapters]) => ({
    code,
    title: chapterTitles(code + ' 1')?.[locale].slice(0, -2) ?? code,
    chapters: chapters.sort(byChapter),
  }));
}

export function byChapter(a: Track, b: Track) {
  return Number(a.ref.split(' ')[1]) - Number(b.ref.split(' ')[1]);
}
