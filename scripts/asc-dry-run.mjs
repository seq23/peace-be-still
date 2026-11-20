#!/usr/bin/env node
// App Store Connect setup plan for Peace Be Still (app id 6837331126). It only prints.
// It never signs in, calls a network, writes a file or creates or prices anything:
// Claude runs the real setup after her yes. Product ids come from the same file the
// app's RevenueCat code reads, so the plan and the app cannot disagree.
// Imports are limited to these two local data files (the release gate checks this).
import products from '../app/src/config/products.json' with { type: 'json' };
import { excludedTerritories } from '../worker/src/providers.mjs';

const plan = {
  mode: 'dry-run',
  app: { name: 'Peace Be Still', appleId: '6837331126', bundleId: 'com.peacebestillapp.mobile', sku: 'peacebestill-ios' },
  subscriptionGroup: {
    referenceName: 'Paid lane',
    localizations: products.subscriptionGroup,
  },
  products: Object.values(products.products).map((p) => ({
    productId: p.id,
    referenceName: p.displayName['en-US'],
    displayName: p.displayName,
    duration: p.duration,
    usPrice: p.usPrice,
    introductoryOffer: 'none',
    familySharable: false,
  })),
  introductoryOffer: 'none',
  revenueCat: { entitlement: products.entitlement, offering: products.offering, packages: { $rc_monthly: products.products.monthly.id, $rc_annual: products.products.yearly.id } },
  availability: {
    rule: 'All territories except these, while Gemini free is a chat rung',
    excludedTerritories,
  },
  review: {
    screenshot: 'The price screen at 6.9 inches from the preview build: both prices, "no trial", Restore Purchases, Manage, Terms and Privacy',
    notes: [
      'No account or sign-in. The free lane works without any purchase.',
      'To reach the price screen: choose God\'s Word, enter birth year 1990, pick any start, then tap any item marked for the paid lane.',
      'No trial and no introductory offer. Restore Purchases and a link to Apple\'s subscriptions page are on the price screen.',
      'Chat answers come from free AI providers and are labeled AI. Messages about self-harm or abuse get a fixed reply with 988 and never reach a model. Under 13, chat is not offered.',
    ],
  },
  action: 'Plan only: nothing was created, priced or changed.',
};

console.log(JSON.stringify(plan, null, 2));
