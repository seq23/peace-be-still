import { Redirect } from 'expo-router';
import React from 'react';
import ChatScreen from '../../src/chat/ChatScreen';
import { tabsFor } from '../../src/model';
import { useSettings } from '../../src/settings';
import { Screen } from '../../src/ui';

export default function Chat() {
  const { settings } = useSettings();
  // Under-13s have no chat, even by a typed link.
  if (!tabsFor(settings).includes('chat')) return <Redirect href="/today" />;
  return <Screen edges={['top']}><ChatScreen /></Screen>;
}
