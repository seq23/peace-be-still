// The tab bar (expo-router Tabs) follows the door and the age: tabsFor() hides Chat under 13 and Bible on
// the Mindset door. Inside the tabs the journey's language applies (Mi Refugio is Spanish).
import { Redirect, Tabs } from 'expo-router';
import React, { useEffect } from 'react';
import { markOpened, onboarded, startRoute, tabsFor, type Tab } from '../../src/model';
import { useSettings, useT } from '../../src/settings';
import { TabIcon } from '../../src/ui/art';
import { usePalette } from '../../src/ui';
import { fonts } from '../../src/theme/tokens';

const ALL: Tab[] = ['today', 'chat', 'bible', 'nights', 'more'];

export default function TabsLayout() {
  const { settings, save } = useSettings();
  const t = useT('journey');
  const c = usePalette();
  const shown = tabsFor(settings);
  const ready = onboarded(settings);
  // Each day she opens the app counts once toward Today's "N days this week".
  useEffect(() => {
    const next = ready ? markOpened(settings) : null;
    if (next) save(next);
  }, [ready, settings, save]);
  // The tabs exist only once onboarding is done; a deep link before that goes to the first unfinished step.
  if (!ready) return <Redirect href={startRoute(settings)} />;
  return (
    <Tabs screenOptions={{
      headerShown: false,
      tabBarActiveTintColor: c.accent,
      tabBarInactiveTintColor: c.muted,
      // No fixed height or padding: the navigator sizes the bar from the safe area, so a label's descenders
      // (Today, Nights) are never clipped. The preview check (scripts/preview/check.mjs) measures it.
      tabBarStyle: { backgroundColor: c.card, borderTopColor: c.line },
      tabBarLabelStyle: { fontFamily: fonts.body, fontSize: 12, lineHeight: 16 },
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
