export type Telling = 'plain' | 'hush-harbor' | 'mi-refugio';

export type Block =
  | { type: 'retelling'; text: string }
  | { type: 'scripture'; ref: string; translation: 'KJV' | 'RV1909' }
  | { type: 'call'; parts: Array<{ say: string } | { screen: string; seconds: number }> };

export type Story = {
  id: string;
  telling: Telling;
  lang: 'en' | 'es';
  title: string;
  refs: string[];
  violence: 'none' | 'mild' | 'strong';
  sexual: 'none' | 'implied';
  blocks: Block[];
};

export type Declaration = { id: string; day: number; ref: string; topic: string; text: string };

/** "For when you've lost someone": a stored verse (by reference) and one short, gentle line. Free. */
export type GriefLine = { id: string; ref: string; text: string };

/** One morning of the 새벽기도 journey (content/saebyeok/ko.json): a stored 개역한글 verse by reference and a prayer written ahead. */
export type DawnWord = { id: string; day: number; title: string; ref: string; prayer: string };

export type Library = {
  stories: Record<Telling, Story[]>;
  declarations: { en: Declaration[]; es: Declaration[] };
  topics: string[];
  grief: { en: GriefLine[]; es: GriefLine[] };
  dawn: DawnWord[];
};
