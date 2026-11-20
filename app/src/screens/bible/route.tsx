import React from 'react';
import { Redirect, useRouter } from 'expo-router';
import { bible, bookCode } from '../../bible';
import { startRoute } from '../../model';
import { useSettings } from '../../settings';
import { Reader, type BibleLocation, type BiblePage } from './Reader';

export function BibleRoute({ page, book, chapter, verse, nested }: { page: BiblePage; book?: string; chapter?: string; verse?: string; nested?: boolean }) {
  const { settings } = useSettings();
  const router = useRouter();
  const start = startRoute(settings);
  if (start !== '/today') return <Redirect href={start} />;
  if (settings.door !== 'faith') return <Redirect href="/today" />;
  const code = bookCode(typeof book === 'string' ? book : '') ?? 'JOH';
  const positive = (n: string | undefined, max: number) => typeof n === 'string' && /^\d+$/.test(n) && Number(n) > 0 && Number(n) <= max ? Number(n) : undefined;
  const location: BibleLocation = { book: code, chapter: positive(chapter, 150) ?? (book ? 1 : 3), verse: positive(verse, 176) };
  return <Reader page={page} location={location} open={bible} back={nested ? () => router.canGoBack() ? router.back() : router.replace('/bible') : undefined} go={(next, target = location) => {
    router.push({ pathname: '/bible/[page]', params: { page: next, book: target.book, chapter: target.chapter, verse: target.verse } });
  }} />;
}
