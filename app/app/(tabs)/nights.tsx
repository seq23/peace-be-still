import React from 'react';
import { useSettings } from '../../src/settings';
import { Placeholder } from '../../src/ui/placeholder';

export default function Nights() {
  const { settings } = useSettings();
  return settings.door === 'mindset'
    ? <Placeholder heading="journey.imaginationNights.name" detail="nights.mindset" />
    : <Placeholder heading="journey.psalmNights.name" detail="nights.faith" />;
}
