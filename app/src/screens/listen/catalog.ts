import { chapterTitles } from '../../player/books';
import type { Door } from '../../model';
import type { Track } from '../../player/library';

export function shelfOf(track: Track) {
  if (track.kind === 'psalms' || track.kind === 'bible') return track.kind;
  // A grief night sits on "For when you've lost someone"; the "3 AM, back to sleep" night is only ever the one button.
  if (track.kind === 'psalm-night' && track.journey === 'grief') return 'grief';
  if (track.kind === 'psalm-night' && track.journey === 'back-to-sleep') return 'backToSleep';
  // A whispered Psalm Night sits on the Psalms shelf; its psalm is its scriptureRef, not its ref (a script path).
  if (track.kind === 'psalm-night') return 'psalms';
  if (track.kind === 'imagination-night' || track.ref.startsWith('content/imagination-nights/')) return 'imagination';
  if (track.kind === 'stories' && track.ref.startsWith('content/stories/hush-harbor/')) return 'hushHarbor';
  if (track.kind === 'stories' && track.ref.startsWith('content/stories/mi-refugio/')) return 'miRefugio';
  // The plain English tellings (everyone), voiced by the library fill once published.
  if (track.kind === 'stories' && track.ref.startsWith('content/stories/plain/')) return 'bibleStories';
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
