import { useRouter } from 'expo-router';
import React from 'react';
import { useT } from '../src/settings';
import { Logo, Screen, TextLink, Title } from '../src/ui';

export default function NotFound() {
  const t = useT();
  const router = useRouter();
  return (
    <Screen>
      <Logo label={t('brand.name')} />
      <Title>{t('notFound.title')}</Title>
      <TextLink onPress={() => router.replace('/')}>{`${t('notFound.link')}  ›`}</TextLink>
    </Screen>
  );
}
