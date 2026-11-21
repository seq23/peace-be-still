import { Redirect, useRouter } from 'expo-router';
import React from 'react';
import { startRoute } from '../src/model';
import { useSettings } from '../src/settings';
import { Grief } from '../src/screens/grief/Grief';

/** "For when you've lost someone": the God's Word door only (the Mindset door never sees scripture). */
export default function GriefPage() {
  const { settings } = useSettings();
  const router = useRouter();
  const start = startRoute(settings);
  if (start !== '/today') return <Redirect href={start} />;
  if (settings.door !== 'faith') return <Redirect href="/today" />;
  return <Grief back={() => (router.canGoBack() ? router.back() : router.replace('/today'))}
    listen={track => router.push({ pathname: '/listen/[track]', params: { track: track.sha256 } })} />;
}
