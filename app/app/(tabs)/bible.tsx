import { Redirect } from 'expo-router';
import React from 'react';
import { tabsFor } from '../../src/model';
import { useSettings } from '../../src/settings';
import { Placeholder } from '../../src/ui/placeholder';

export default function Bible() {
  const { settings } = useSettings();
  if (!tabsFor(settings).includes('bible')) return <Redirect href="/today" />;
  return <Placeholder heading="tabs.bible" detail="bible.detail" />;
}
