import React from 'react';
import { Redirect, useLocalSearchParams, useRouter } from 'expo-router';
import { startRoute } from '../../src/model';
import { useSettings } from '../../src/settings';
import { Daily } from '../../src/screens/daily/Daily';

export default function DailyPage() {
  const { page } = useLocalSearchParams<{ page: string }>();
  const { settings } = useSettings();
  const router = useRouter();
  const start = startRoute(settings);
  if (start !== '/today') return <Redirect href={start} />;
  if (page !== 'story' && page !== 'declaration' && page !== 'plans' && page !== 'journal') return <Redirect href="/today" />;
  if (settings.door !== 'faith' && (page === 'story' || page === 'plans')) return <Redirect href="/today" />;
  return <Daily page={page} back={() => router.canGoBack() ? router.back() : router.replace('/today')} read={(book, chapter, verse) => {
    router.push({ pathname: '/bible/[page]', params: { page: 'chapter', book, chapter, verse } });
  }} />;
}
