// Opening the app (or "/") goes to the first unfinished onboarding step, else Today.
import { Redirect } from 'expo-router';
import React from 'react';
import { startRoute } from '../src/model';
import { useSettings } from '../src/settings';

export default function Index() {
  const { settings } = useSettings();
  return <Redirect href={startRoute(settings)} />;
}
