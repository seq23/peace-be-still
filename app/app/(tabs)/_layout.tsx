// The tab bar (expo-router Tabs) follows the door and the age: tabsFor() hides Chat under 13 and Bible on
// the Mindset door. Inside the tabs the journey's language applies (Mi Refugio is Spanish).
import { Tabs } from 'expo-router';
import React from 'react';
import { tabsFor, type Tab } from '../../src/model';
import { useSettings, useT } from '../../src/settings';
import { TabIcon } from '../../src/ui/art';
import { usePalette } from '../../src/ui';
import { fonts } from '../../src/theme/tokens';

const ALL: Tab[] = ['today', 'chat', 'bible', 'nights', 'more'];

export default function TabsLayout() {
  const { settings } = useSettings();
  const t = useT('journey');
  const c = usePalette();
  const shown = tabsFor(settings);
  return (
    <Tabs screenOptions={{
      headerShown: false,
      tabBarActiveTintColor: c.accent,
      tabBarInactiveTintColor: c.muted,
      tabBarStyle: { backgroundColor: c.card, borderTopColor: c.line },
      tabBarLabelStyle: { fontFamily: fonts.body, fontSize: 12, lineHeight: 16 },
      tabBarItemStyle: { paddingVertical: 4 },
      sceneStyle: { backgroundColor: c.bg },
    }}>
      {ALL.map(tab => (
        <Tabs.Screen key={tab} name={tab} options={{
          title: t(`tabs.${tab}`),
          href: shown.includes(tab) ? undefined : null,
          tabBarIcon: ({ color }) => <TabIcon tab={tab} color={String(color)} />,
        }} />
      ))}
    </Tabs>
  );
}
