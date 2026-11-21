import React from 'react';
import { Redirect, useLocalSearchParams, useRouter } from 'expo-router';
import { startRoute } from '../../src/model';
import { useSettings } from '../../src/settings';
import { Daily, faithOnly, pages, type DailyPage } from '../../src/screens/daily/Daily';

export default function DailyPage() {
  const { page, id } = useLocalSearchParams<{ page: string; id?: string }>();
  const { settings } = useSettings();
  const router = useRouter();
  const start = startRoute(settings);
  if (start !== '/today') return <Redirect href={start} />;
  if (!page || !Object.hasOwn(pages, page)) return <Redirect href="/today" />;
  const name = page as DailyPage;
  if (settings.door !== 'faith' && faithOnly.includes(name)) return <Redirect href="/today" />;
  return <Daily key={`${name}:${id ?? ''}`} page={name} id={id || undefined}
    back={() => router.canGoBack() ? router.back() : router.replace('/today')}
    read={(book, chapter, verse) => router.push({ pathname: '/bible/[page]', params: { page: 'chapter', book, chapter, verse } })}
    upgrade={() => router.push('/paid')}
    open={(next, storyId) => router.push({ pathname: '/today/[page]', params: storyId ? { page: next, id: storyId } : { page: next } })} />;
}
