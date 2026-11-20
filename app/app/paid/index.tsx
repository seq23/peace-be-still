import { Redirect, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Linking, Text, View } from 'react-native';
import type { PurchasesPackage } from 'react-native-purchases';
import { PAID_CHAT_MESSAGES } from '../../src/gates';
import { onboarded, startRoute } from '../../src/model';
import { usePurchases } from '../../src/purchases/provider';
import { plansFrom, type Plan } from '../../src/purchases/revenuecat';
import { useSettings, useT } from '../../src/settings';
import { fonts } from '../../src/theme/tokens';
import { Body, Card, PillButton, Screen, TextLink, Title, styles, usePalette } from '../../src/ui';

const planOrder = ['yearly', 'monthly'] as const;
const planCopy = {
  yearly: { name: 'paid.plan.yearly', period: 'paid.period.yearly', join: 'paid.join.yearly', renew: 'paid.renew.yearly' },
  monthly: { name: 'paid.plan.monthly', period: 'paid.period.monthly', join: 'paid.join.monthly', renew: 'paid.renew.monthly' },
} as const;
const statusCopy = {
  idle: null,
  pending: 'paid.pending',
  buying: 'paid.buying',
  restoring: 'paid.restoring',
  failed: 'paid.failed',
  unconfirmed: 'paid.unconfirmed',
  nothingToRestore: 'paid.nothingToRestore',
  restoreFailed: 'paid.restoreFailed',
} as const;
const benefits = ['paid.chat', 'paid.nights', 'paid.stories', 'paid.topics'] as const;
const subscriptions = 'https://apps.apple.com/account/subscriptions';

export default function PaidScreen() {
  const { settings } = useSettings();
  const t = useT('journey');
  const c = usePalette();
  const router = useRouter();
  const { store, preview, paid, status, buy, restore } = usePurchases();
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
  const message = status === 'pending' && settings.age === 'teen' ? 'paid.askToBuy' : statusCopy[status];

  return (
    <Screen>
      <TextLink onPress={() => router.canGoBack() ? router.back() : router.replace('/settings')}>{t('paid.close')}</TextLink>
      <View style={{ gap: 6 }}>
        <Title>{t('paid.title')}</Title>
        <Body size={15}>{t('paid.intro')}</Body>
      </View>
      <View style={{ gap: 8 }}>
        {benefits.map(key => <Body key={key} size={15} muted={false}>{t(key)}</Body>)}
      </View>
      {paid ? <Body muted={false}>{t('paid.active')}</Body> : null}
      {!paid && offers ? (
        <View role="radiogroup" style={{ gap: 10 }}>
          {planOrder.map(plan => {
            const product = offers[plan].product;
            return (
              <Card key={plan} role="radio" selected={plan === selected} onPress={() => select(plan)}
                label={t(planCopy[plan].join, { price: product.priceString })}>
                <View style={[styles.row, { justifyContent: 'space-between' }]}>
                  <Body size={15} muted={false}>{t(planCopy[plan].name)}</Body>
                  <Text aria-hidden style={{ color: c.accent }}>{plan === selected ? '●' : '○'}</Text>
                </View>
                <Text style={{ fontFamily: fonts.mono, fontSize: 17, color: c.ink }}>{product.priceString}</Text>
                <Body size={13}>{t(planCopy[plan].period)}</Body>
                {plan === 'yearly' && product.pricePerMonthString ? (
                  <Body size={13}>{t('paid.equivalent', { price: product.pricePerMonthString })}</Body>
                ) : null}
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
        <Body size={13} style={{ textAlign: 'center' }}>{t(planCopy[selected].renew, values)}</Body>
      ) : null}
      {!paid && loading ? <ActivityIndicator accessibilityLabel={t('paid.loading')} color={c.accent} /> : null}
      {!paid && !offers && !loading ? (
        <View>
          <Body size={14}>{t('paid.unavailable')}</Body>
          {store ? <TextLink onPress={() => requestPlans(n => n + 1)}>{t('paid.retry')}</TextLink> : null}
        </View>
      ) : null}
      {message ? (
        <View accessibilityRole={busy ? 'progressbar' : 'alert'} accessibilityLiveRegion="polite">
          <Body muted={false} size={14}>{t(message)}</Body>
        </View>
      ) : null}
      <Card style={{ gap: 3 }}>
        <TextLink onPress={() => open(subscriptions)}>{t('paid.cancel')}</TextLink>
        <Body size={14} muted={false}>{t('paid.keepFree')}</Body>
        <Body size={14} muted={false}>{t('paid.keepPrice')}</Body>
        <Body size={14}>{t('paid.fairUse', { count: PAID_CHAT_MESSAGES })}</Body>
      </Card>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', columnGap: 20 }}>
        <TextLink disabled={!store || busy} onPress={() => { void restore(); }}>{t('paid.restore')}</TextLink>
        <TextLink onPress={() => open(site + (spanish ? '/es/terminos' : '/terms'))}>{t('paid.terms')}</TextLink>
        <TextLink onPress={() => open(site + (spanish ? '/es/privacidad' : '/privacy'))}>{t('paid.privacy')}</TextLink>
      </View>
      {linkFailed ? <Body size={14}>{t('paid.linkFailed')}</Body> : null}
      <Body size={13}>{t('paid.apple')}</Body>
    </Screen>
  );
}
