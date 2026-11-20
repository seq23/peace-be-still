#!/usr/bin/env node
// Standalone by design: prints a plan and never accesses an account or network.
const plan = {
  mode: 'dry-run', app: 'Peace Be Still',
  subscriptionGroup: { en: 'Peace Be Still', es: 'Peace Be Still' },
  entitlement: 'paid', offering: 'default',
  availability: 'All territories except the EEA, UK and Switzerland while Gemini free is a chat rung',
  products: [
    { id: 'com.peacebestillapp.mobile.paid.monthly', displayName: 'Paid lane · monthly', duration: '1 month', plannedUSPrice: '$7.99' },
    { id: 'com.peacebestillapp.mobile.paid.yearly', displayName: 'Paid lane · yearly', duration: '1 year', plannedUSPrice: '$39.99' },
  ],
  introductoryOffer: 'none', reviewScreenshot: 'Provide the subscription screen showing price and terms',
  reviewNotes: 'No trial. Restore Purchases is available on the price screen.',
  action: 'Plan only: no products or prices are created or changed.',
};
console.log(JSON.stringify(plan, null, 2));
