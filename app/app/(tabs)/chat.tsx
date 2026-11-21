import { Redirect } from 'expo-router';
import React from 'react';
import { tabsFor } from '../../src/model';
import { useSettings } from '../../src/settings';
import { Placeholder } from '../../src/ui/placeholder';

export default function Chat() {
  const { settings } = useSettings();
  // Under-13s have no chat, even by a typed link.
  if (!tabsFor(settings).includes('chat')) return <Redirect href="/today" />;
  return <Placeholder heading="tabs.chat" detail="chat.detail" />;
}
