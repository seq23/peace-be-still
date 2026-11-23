import { Redirect, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Linking, Platform, Text, TextInput, View } from 'react-native';
import type { PurchasesPackage } from 'react-native-purchases';
import { reviewOpen, type ReviewResult } from '../../src/chat/api';
import { PAID_CHAT_MESSAGES } from '../../src/gates';
import { onboarded, startRoute } from '../../src/model';
import { usePurchases } from '../../src/purchases/provider';
import { plansFrom, type Plan } from '../../src/purchases/revenuecat';
import type { Key } from '../../src/i18n';
import { useSettings, useT } from '../../src/settings';
import { fonts } from '../../src/theme/tokens';
import { Body, Card, PillButton, Screen, TextLink, Title, styles, usePalette } from '../../src/ui';

const planOrder = ['yearly', 'monthly'] as const;
const planCopy = {
  yearly: { name: 'paid.plan.yearly', period: 'paid.period.yearly', join: 'paid.join.yearly' },
  monthly: { name: 'paid.plan.monthly', period: 'paid.period.monthly', join: 'paid.join.monthly' },
} as const;
// The store's own words and its subscription page: Apple on iPhone, Google Play on Android (the web preview reads as iPhone).
const appleCopy = {
  renew: { yearly: 'paid.renew.yearly', monthly: 'paid.renew.monthly' }, charge: 'paid.apple', loading: 'paid.loading',
  unavailable: 'paid.unavailable', buying: 'paid.buying', restoring: 'paid.restoring', pending: 'paid.pending',
  nothingToRestore: 'paid.nothingToRestore', subscriptions: 'https://apps.apple.com/account/subscriptions',
} as const;
const playCopy = {
  renew: { yearly: 'paid.play.renew.yearly', monthly: 'paid.play.renew.monthly' }, charge: 'paid.play.charge', loading: 'paid.play.loading',
  unavailable: 'paid.play.unavailable', buying: 'paid.play.buying', restoring: 'paid.play.restoring', pending: 'paid.play.pending',
  nothingToRestore: 'paid.play.nothingToRestore',
  subscriptions: 'https://play.google.com/store/account/subscriptions?package=com.peacebestillapp.mobile',
} as const;
type Shop = typeof appleCopy | typeof playCopy;
const statusCopy = {
  idle: () => null,
  pending: (shop: Shop) => shop.pending,
  buying: (shop: Shop) => shop.buying,
  restoring: (shop: Shop) => shop.restoring,
  failed: () => 'paid.failed' as const,
  unconfirmed: () => 'paid.unconfirmed' as const,
  nothingToRestore: (shop: Shop) => shop.nothingToRestore,
  restoreFailed: () => 'paid.restoreFailed' as const,
} satisfies Record<string, (shop: Shop) => Key | null>;
// Each line is a built feature (ship-ready app-review.md check 13). Stories and reading plans live behind
// the God's Word door only, so the Mindset door is never sold them.
const benefits = {
  faith: ['paid.chat', 'paid.nights', 'paid.stories', 'paid.topics'],
  mindset: ['paid.chat', 'paid.nights', 'paid.topics'],
} as const;

export default function PaidScreen() {
  const { settings } = useSettings();
  const t = useT('journey');
  const c = usePalette();
  const router = useRouter();
  const { store, preview, paid, status, buy, restore, redeem } = usePurchases();
  const [plans, setPlans] = useState<{
    live: ReturnType<typeof plansFrom<PurchasesPackage>>;
    preview: ReturnType<typeof plansFrom>;
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const [requested, requestPlans] = useState(0);
  const [selected, select] = useState<Plan>('yearly');
  const [linkFailed, setLinkFailed] = useState(false);

  useEffect(() => {
    if (paid) return;
    const offering = preview
      ? preview.getOfferings().then(value => ({ live: null, preview: plansFrom(value) }))
      : store?.getOfferings().then(value => ({ live: plansFrom(value), preview: null }));
    if (!offering) return;
    let live = true;
    setLoading(true);
    setPlans(null);
    void offering.then(
      value => { if (live) setPlans(value); },
      () => { if (live) setPlans(null); },
    ).finally(() => { if (live) setLoading(false); });
    return () => { live = false; };
  }, [store, preview, requested, paid]);

  if (!onboarded(settings)) return <Redirect href={startRoute(settings)} />;
  if (settings.age === 'child') return <Redirect href="/settings" />;

  const busy = status === 'buying' || status === 'restoring';
  const offers = plans?.preview ?? plans?.live;
  const pkg = plans?.live?.[selected];
  const values = { price: offers?.[selected].product.priceString ?? '' };
  const open = (url: string) => {
    setLinkFailed(false);
    void Linking.openURL(url).catch(() => setLinkFailed(true));
  };
  const site = 'https://peacebestillapp.com';
  const spanish = t.locale === 'es';
  const shop = Platform.OS === 'android' ? playCopy : appleCopy;
  const message = status === 'pending' && settings.age === 'teen' ? 'paid.askToBuy' : statusCopy[status](shop);

  return (
    <Screen>
      <TextLink onPress={() => router.canGoBack() ? router.back() : router.replace('/settings')}>{t('paid.close')}</TextLink>
      <View style={{ gap: 6 }}>
        <Title>{t('paid.title')}</Title>
        <Body size={15}>{t('paid.intro')}</Body>
      </View>
      <View style={{ gap: 8 }}>
        {/* The headline, the training promise right under it, and the small print (PAID_CHAT_MESSAGES). */}
        <Body size={16} muted={false}>{t(settings.door === 'mindset' ? 'paid.chatHeadlineMindset' : 'paid.chatHeadline')}</Body>
        {/* paid.noTraining says "never used to train AI", not "not kept": Google's Gemini API Additional Terms
            (effective 23 Mar 2026, aistudio.google.com/docs/terms, read 21 Nov 2026) say that for Paid Services
            "Google logs prompts and responses for a limited period of time" for abuse monitoring, and "doesn't use
            your prompts ... or responses to improve our products". Gemini is the paid backup and the crisis model. */}
        <Body size={14} muted={false}>{t('paid.noTraining')}</Body>
        <Body size={13}>{t('paid.fairUse', { count: PAID_CHAT_MESSAGES })}</Body>
        {benefits[settings.door === 'mindset' ? 'mindset' : 'faith'].map(key => <Body key={key} size={15} muted={false}>{t(key)}</Body>)}
      </View>
      {paid ? <Body muted={false}>{t('paid.active')}</Body> : null}
      {!paid && offers ? (
        <View role="radiogroup" style={{ flexDirection: 'column', gap: 10 }}>
          {planOrder.map(plan => {
            const product = offers[plan].product;
            const name = t(planCopy[plan].name);
            const period = t(planCopy[plan].period);
            const equivalent = plan === 'yearly' && product.pricePerMonthString
              ? t('paid.equivalent', { price: product.pricePerMonthString })
              : null;
            return (
              <Card key={plan} role="radio" selected={plan === selected} onPress={() => select(plan)}
                label={`${name}, ${product.priceString} ${period}${equivalent ? `, ${equivalent}` : ''}`}
                style={styles.row}>
                <Text aria-hidden style={{ color: plan === selected ? c.accent : c.muted }}>{plan === selected ? '●' : '○'}</Text>
                <View style={styles.grow}>
                  <Body size={15} muted={false}>{name}</Body>
                  <Body size={14}>
                    <Text style={{ fontFamily: fonts.mono, fontSize: 17, color: c.ink }}>{product.priceString}</Text>
                    {` ${period}${equivalent ? `, ${equivalent}` : ''}`}
                  </Body>
                </View>
              </Card>
            );
          })}
        </View>
      ) : null}
      {store && pkg && !paid && !busy && status !== 'pending' ? (
        <PillButton onPress={() => { void buy(pkg); }}>{t(planCopy[selected].join, values)}</PillButton>
      ) : null}
      {preview && offers ? (
        <PillButton onPress={() => {}}>{t('paid.previewJoin', { action: t(planCopy[selected].join, values) })}</PillButton>
      ) : null}
      {offers && !paid ? (
        <Body size={13} style={{ textAlign: 'center' }}>{t(shop.renew[selected], values)}</Body>
      ) : null}
      {!paid && loading ? <ActivityIndicator accessibilityLabel={t(shop.loading)} color={c.accent} /> : null}
      {!paid && !offers && !loading ? (
        <View>
          <Body size={14}>{t(shop.unavailable)}</Body>
          {store ? <TextLink onPress={() => requestPlans(n => n + 1)}>{t('paid.retry')}</TextLink> : null}
        </View>
      ) : null}
      {message ? (
        <View accessibilityRole={busy ? 'progressbar' : 'alert'} accessibilityLiveRegion="polite">
          <Body muted={false} size={14}>{t(message)}</Body>
        </View>
      ) : null}
      <Card style={{ gap: 3 }}>
        <TextLink onPress={() => open(shop.subscriptions)}>{t('paid.cancel')}</TextLink>
        <Body size={14} muted={false}>{t('paid.keepFree')}</Body>
        <Body size={14} muted={false}>{t('paid.keepPrice')}</Body>
      </Card>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', columnGap: 20 }}>
        <TextLink disabled={!store || busy} onPress={() => { void restore(); }}>{t('paid.restore')}</TextLink>
        <TextLink onPress={() => open(site + (spanish ? '/es/terminos' : '/terms'))}>{t('paid.terms')}</TextLink>
        <TextLink onPress={() => open(site + (spanish ? '/es/privacidad' : '/privacy'))}>{t('paid.privacy')}</TextLink>
      </View>
      {linkFailed ? <Body size={14}>{t('paid.linkFailed')}</Body> : null}
      {/* Google Play's reviewer only: App Review buys in the sandbox, and Apple forbids an own unlock (3.1.1). */}
      {Platform.OS === 'android' && store && !paid ? <ReviewCode redeem={redeem} /> : null}
      <Body size={13}>{t(shop.charge)}</Body>
    </Screen>
  );
}

/** Google Play's reviewer only (Android): while the server says a review window is open (GET /api/review answers 200), one
 *  collapsed "Have a review code?" link under the plans; outside a window, nothing. The code goes to the server and RevenueCat
 *  grants the plan (worker/src/review.ts); this screen never unlocks anything itself. */
function ReviewCode({ redeem }: { redeem: (code: string) => Promise<ReviewResult> }) {
  const t = useT('journey');
  const c = usePalette();
  const [open, setOpen] = useState(false);
  const [shown, setShown] = useState(false);
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<ReviewResult | null>(null);
  useEffect(() => {
    let live = true;
    void reviewOpen().then(value => { if (live) setOpen(value); });
    return () => { live = false; };
  }, []);
  if (!open) return null;
  if (!shown) return <TextLink onPress={() => setShown(true)}>{t('review.link')}</TextLink>;
  const send = async () => {
    if (busy || !/^\d{10}$/.test(code)) return;
    setBusy(true);
    setResult(null);
    const answer = await redeem(code);
    setBusy(false);
    if (answer !== 'granted') setResult(answer);
  };
  const problem = result === 'wrong' ? 'review.wrong' : result === 'usedUp' ? 'review.usedUp' : result === 'slow' ? 'review.slow' : result === 'failed' ? 'review.failed' : null;
  return (
    <Card style={{ gap: 8 }}>
      <Body size={15} muted={false}>{t('review.title')}</Body>
      <Body size={14}>{t('review.intro')}</Body>
      <TextInput accessibilityLabel={t('review.title')} keyboardType="number-pad" inputMode="numeric" maxLength={10} value={code}
        onChangeText={value => setCode(value.replace(/\D/g, ''))} onSubmitEditing={() => { void send(); }}
        style={{ fontFamily: fonts.mono, fontSize: 17, color: c.ink, backgroundColor: c.card, borderColor: problem ? c.wine : c.line, borderWidth: 1, borderRadius: 14, padding: 12, outlineColor: c.accent }} />
      <TextLink disabled={busy || code.length !== 10} onPress={() => { void send(); }}>{t('review.use')}</TextLink>
      {problem ? <Text accessibilityRole="alert" style={{ fontFamily: fonts.body, fontSize: 14, color: c.wine }}>{t(problem)}</Text> : null}
    </Card>
  );
}
