// The story's header picture, only when the story has approved art (src/story/art.ts). 4:3, the
// card's rounded corners, kept on disk by expo-image so it shows offline; the alt text is the title.
// If the image cannot load (gone from R2, offline before it was kept), it is hidden: never an empty box.
import { Image } from 'expo-image';
import React, { useEffect, useState } from 'react';
import { useStoryArt } from './art';

export function StoryArt({ ids, title }: { ids: readonly string[]; title: string }) {
  const uri = useStoryArt(ids);
  const [failed, setFailed] = useState<string | null>(null);
  useEffect(() => setFailed(null), [uri]);
  if (!uri || failed === uri) return null;
  return <Image testID="story-art" source={{ uri }} cachePolicy="disk" contentFit="cover" accessible accessibilityLabel={title} alt={title}
    onError={() => setFailed(uri)} style={{ width: '100%', aspectRatio: 4 / 3, borderRadius: 18 }} />;
}
