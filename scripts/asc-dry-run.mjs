#!/usr/bin/env node
// This script only describes a proposed setup. It has no API or account access.
const plan = {
  mode: 'dry-run',
  app: 'Peace Be Still',
  subscriptionGroup: 'Peace Be Still',
  products: [
    { suggestedId: 'peacebestill.monthly', duration: '1 month', plannedUSPrice: '$7.99' },
    { suggestedId: 'peacebestill.yearly', duration: '1 year', plannedUSPrice: '$39.99' },
  ],
  introductoryOffer: 'none',
  action: 'Plan only: no products or prices are created or changed.',
};
console.log(JSON.stringify(plan, null, 2));
