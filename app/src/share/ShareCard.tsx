import React, { useRef, useState } from 'react';
import { Image, Platform, Share } from 'react-native';
import Svg, { Path, Rect, Text as SvgText } from 'react-native-svg';
import { useT } from '../settings';
import { colors, fonts, MARK } from '../theme/tokens';
import { Body, Card, Label, PillButton, TextLink } from '../ui';

export function ShareCard({ text, credit, close }: { text: string; credit: string; close: () => void }) {
  const t = useT('journey');
  const graphic = useRef<Svg>(null);
  const [image, setImage] = useState('');
  const [failed, setFailed] = useState(false);
  const [busy, setBusy] = useState(false);
  const c = colors.light;
  const fontSize = text.length > 330 ? 18 : text.length > 180 ? 22 : 28;
  const span = Math.floor(440 / (fontSize * 0.62));
  const lines = text.split(/\s+/).reduce<string[]>((rows, word) => {
    const last = rows.at(-1);
    if (last && last.length + word.length < span) rows[rows.length - 1] = `${last} ${word}`;
    else rows.push(word);
    return rows;
  }, []);
  const height = Math.max(460, 188 + lines.length * (fontSize + 9));
  const render = () => {
    setFailed(false);
    try {
      graphic.current?.toDataURL(data => {
        if (data) setImage(`data:image/png;base64,${data}`);
        else setFailed(true);
      });
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
        await Share.share({ url: file.uri });
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
        {lines.map((line, i) => <SvgText key={i} x={40} y={112 + i * (fontSize + 9)} fill={c.ink} fontFamily={fonts.serif} fontSize={fontSize}>{line}</SvgText>)}
        <SvgText x={40} y={height - 66} fill={c.accent} fontFamily={fonts.strong} fontSize={20}>{credit}</SvgText>
        <SvgText x={40} y={height - 36} fill={c.muted} fontFamily={fonts.mono} fontSize={14}>{t('share.brand')}</SvgText>
      </Svg>}
    {failed && <Body>{t('share.error')}</Body>}
    {busy ? <Body>{t('reader.loading')}</Body> : <PillButton onPress={image ? () => void share() : render}>{t(image ? (Platform.OS === 'web' ? 'share.download' : 'share.send') : 'share.render')}</PillButton>}
    <TextLink onPress={close}>{t('share.close')}</TextLink>
  </Card>;
}
