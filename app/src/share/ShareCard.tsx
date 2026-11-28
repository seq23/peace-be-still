import React, { useRef, useState } from 'react';
import { Image, Platform } from 'react-native';
import Svg, { Path, Rect, Text as SvgText } from 'react-native-svg';
import { useT } from '../settings';
import { colors, fonts, MARK } from '../theme/tokens';
import { Body, Card, Label, PillButton, TextLink } from '../ui';
import { squareLayout, tallLayout } from './wrap';

/**
 * A share card. The default is the tall card; `square` is the 1080×1080 picture KakaoTalk shows whole in a chat
 * (the 새벽기도 card), with a small `label` above the verse and a `footer` link. Either is sent through the phone's
 * share sheet (expo-sharing: the picture itself, on iPhone and Android alike), where KakaoTalk and every other app
 * that takes a picture appear.
 */
export function ShareCard({ text, credit, close, label, footer, square = false }: {
  text: string; credit: string; close: () => void; label?: string; footer?: string; square?: boolean;
}) {
  const t = useT('journey');
  const graphic = useRef<Svg>(null);
  const [image, setImage] = useState('');
  const [failed, setFailed] = useState(false);
  const [busy, setBusy] = useState(false);
  const c = colors.light;
  // The square card keeps its size, so its text steps down until every line fits above the credit.
  const { fontSize, lines, top, leading } = square ? squareLayout(text) : tallLayout(text);
  const height = square ? 520 : Math.max(460, 188 + lines.length * leading);
  // Libre Caslon has no Hangul: a Korean card is set in the body face, so the phone fills it with its own Korean sans.
  const face = /\p{Script=Hangul}/u.test(text) ? fonts.body : fonts.serif;
  // On the web preview an SVG falls back to a serif for Hangul; a phone's SVG uses its own Korean sans.
  const sans = (family: string) => Platform.OS === 'web' ? `${family}, sans-serif` : family;
  const render = () => {
    setFailed(false);
    try {
      graphic.current?.toDataURL(data => {
        if (data) setImage(`data:image/png;base64,${data}`);
        else setFailed(true);
      }, ...(square ? [{ width: 1080, height: 1080 }] : []));
    } catch {
      setFailed(true);
    }
  };
  const share = async () => {
    setFailed(false);
    setBusy(true);
    try {
      if (Platform.OS === 'web') {
        const link = document.createElement('a');
        link.href = image;
        link.download = 'peace-be-still.png';
        link.click();
      } else {
        const { Directory, File, Paths } = await import('expo-file-system');
        const folder = new Directory(Paths.cache, 'share-cards');
        folder.create({ idempotent: true });
        const file = new File(folder, 'peace-be-still.png');
        file.write(image.split(',')[1], { encoding: 'base64' });
        // React Native's Share sends only text on Android (its url is iPhone-only), so the picture goes through
        // expo-sharing on both phones.
        const Sharing = await import('expo-sharing');
        if (!(await Sharing.isAvailableAsync())) throw new Error('Sharing unavailable');
        await Sharing.shareAsync(file.uri, { mimeType: 'image/png', UTI: 'public.png' });
      }
    } catch {
      setFailed(true);
    } finally {
      setBusy(false);
    }
  };
  return <Card>
    <Label>{t('share.title')}</Label>
    {image ? <Image accessibilityLabel={text} source={{ uri: image }} style={{ width: '100%', aspectRatio: 520 / height }} /> :
      <Svg ref={graphic} width="100%" height={Math.round(height * 0.55)} viewBox={`0 0 520 ${height}`} accessibilityLabel={text}>
        <Rect width={520} height={height} fill={c.bg} />
        <Path d={MARK.wave} transform="translate(24 20)" fill="none" stroke={c.ink} strokeWidth={3} strokeLinecap="round" />
        <Path d={MARK.line} transform="translate(24 20)" fill="none" stroke={c.accent} strokeWidth={3} strokeLinecap="round" />
        {label && <SvgText x={40} y={104} fill={c.accent} fontFamily={sans(fonts.strong)} fontSize={18}>{label}</SvgText>}
        {lines.map((line, i) => <SvgText key={i} x={40} y={top + i * leading} fill={c.ink} fontFamily={face === fonts.body ? sans(face) : face} fontSize={fontSize}>{line}</SvgText>)}
        <SvgText x={40} y={height - 66} fill={c.accent} fontFamily={sans(fonts.strong)} fontSize={20}>{credit}</SvgText>
        <SvgText x={40} y={height - 36} fill={c.muted} fontFamily={fonts.mono} fontSize={14}>{t('share.brand')}</SvgText>
        {footer && <SvgText x={480} y={height - 36} textAnchor="end" fill={c.muted} fontFamily={fonts.mono} fontSize={14}>{footer}</SvgText>}
      </Svg>}
    {failed && <Body>{t('share.error')}</Body>}
    {busy ? <Body>{t('reader.loading')}</Body> : <PillButton onPress={image ? () => void share() : render}>{t(image ? (Platform.OS === 'web' ? 'share.download' : 'share.send') : 'share.render')}</PillButton>}
    <TextLink onPress={close}>{t('share.close')}</TextLink>
  </Card>;
}
