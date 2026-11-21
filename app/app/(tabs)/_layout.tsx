// The tab bar (expo-router Tabs) follows the door and the age: tabsFor() hides Chat under 13 and Bible on
// the Mindset door. Inside the tabs the journey's language applies (Mi Refugio is Spanish).
import { Redirect, Tabs } from 'expo-router';
import React, { useEffect } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { markOpened, onboarded, startRoute, tabsFor, type Tab } from '../../src/model';
import { useSettings, useT } from '../../src/settings';
import { TabIcon } from '../../src/ui/art';
import { usePalette } from '../../src/ui';
import { fonts } from '../../src/theme/tokens';

const ALL: Tab[] = ['today', 'chat', 'bible', 'nights', 'more'];

// The navigator's own 49 pt bar fits only its 10 pt label: a tab is 5 pt padding, a 28 pt icon box, the label,
// 5 pt padding. Ours is 12 pt on a 16 pt line, so the bar is sized from that content (plus 4 pt of air), and
// the navigator adds the home-indicator inset as padding itself. The preview check measures every label.
const TAB_LABEL = { fontSize: 12, lineHeight: 16 } as const;
const TAB_BAR_CONTENT = 5 + 28 + TAB_LABEL.lineHeight + 5 + 4;

export default function TabsLayout() {
  const { settings, save } = useSettings();
  const t = useT('journey');
  const c = usePalette();
  const shown = tabsFor(settings);
  const insets = useSafeAreaInsets();
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
      tabBarStyle: { backgroundColor: c.card, borderTopColor: c.line, height: TAB_BAR_CONTENT + insets.bottom },
      tabBarLabelStyle: { fontFamily: fonts.body, ...TAB_LABEL },
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
