import type { Key } from '../../i18n';

/** Topic names, written out so every string in the files has a reader. God's Word topics tag content/morning-word. */
export const topicNames = {
  peace: 'declaration.topic.peace',
  worry: 'declaration.topic.worry',
  fear: 'declaration.topic.fear',
  tired: 'declaration.topic.tired',
  grief: 'declaration.topic.grief',
  waiting: 'declaration.topic.waiting',
  'fresh-start': 'declaration.topic.freshStart',
  loved: 'declaration.topic.loved',
  love: 'declaration.topic.love',
  family: 'declaration.topic.family',
  'work-money': 'declaration.topic.workMoney',
  guidance: 'declaration.topic.guidance',
  thanks: 'declaration.topic.thanks',
  calm: 'declaration.topic.calm',
  confidence: 'declaration.topic.confidence',
  work: 'declaration.topic.work',
  people: 'declaration.topic.people',
  home: 'declaration.topic.home',
  begin: 'declaration.topic.begin',
} as const satisfies Record<string, Key>;
export type TopicId = keyof typeof topicNames;

/**
 * The Mindset door's Morning Word: plain first-person lines, no scripture (the door's rule), no outcome promised.
 * The free daily line follows the day of the year; a paid topic narrows it to that topic.
 */
export const mindsetDeclarations: readonly { line: Key; topic: TopicId }[] = [
  { line: 'today.declaration.mindset', topic: 'begin' },
  { line: 'daily.mindset.1', topic: 'confidence' },
  { line: 'daily.mindset.2', topic: 'calm' },
  { line: 'daily.mindset.3', topic: 'people' },
  { line: 'daily.mindset.4', topic: 'people' },
  { line: 'daily.mindset.5', topic: 'begin' },
  { line: 'daily.mindset.6', topic: 'calm' },
  { line: 'mindset.calm.1', topic: 'calm' },
  { line: 'mindset.calm.2', topic: 'calm' },
  { line: 'mindset.calm.3', topic: 'calm' },
  { line: 'mindset.calm.4', topic: 'calm' },
  { line: 'mindset.confidence.1', topic: 'confidence' },
  { line: 'mindset.confidence.2', topic: 'confidence' },
  { line: 'mindset.confidence.3', topic: 'confidence' },
  { line: 'mindset.confidence.4', topic: 'confidence' },
  { line: 'mindset.confidence.5', topic: 'confidence' },
  { line: 'mindset.work.1', topic: 'work' },
  { line: 'mindset.work.2', topic: 'work' },
  { line: 'mindset.work.3', topic: 'work' },
  { line: 'mindset.work.4', topic: 'work' },
  { line: 'mindset.work.5', topic: 'work' },
  { line: 'mindset.work.6', topic: 'work' },
  { line: 'mindset.people.1', topic: 'people' },
  { line: 'mindset.people.2', topic: 'people' },
  { line: 'mindset.people.3', topic: 'people' },
  { line: 'mindset.people.4', topic: 'people' },
  { line: 'mindset.home.1', topic: 'home' },
  { line: 'mindset.home.2', topic: 'home' },
  { line: 'mindset.home.3', topic: 'home' },
  { line: 'mindset.home.4', topic: 'home' },
  { line: 'mindset.home.5', topic: 'home' },
  { line: 'mindset.home.6', topic: 'home' },
  { line: 'mindset.begin.1', topic: 'begin' },
  { line: 'mindset.begin.2', topic: 'begin' },
  { line: 'mindset.begin.3', topic: 'begin' },
  { line: 'mindset.begin.4', topic: 'begin' },
];
export const mindsetTopics = [...new Set(mindsetDeclarations.map(item => item.topic))];

export type Plan = { id: string; title: Key; detail?: Key; paid?: true; readings: readonly string[] };

const chapters = (book: string, count: number) => Array.from({ length: count }, (_, index) => `${book} ${index + 1}`);

/** Reading plans: references only; the reader shows the stored KJV or RV1909 text. Basic plans are free; the longer ones are paid. */
export const plans: readonly Plan[] = [
  { id: 'rest', title: 'daily.plan.rest', readings: ['Psalm 4', 'Psalm 23', 'Psalm 46', 'Psalm 62', 'Psalm 91', 'Psalm 121', 'Matthew 11:28-30'] },
  { id: 'courage', title: 'daily.plan.courage', readings: ['Joshua 1:1-9', 'Psalm 27', '1 Samuel 17', 'Daniel 6', 'Mark 4:35-41', 'Acts 4:23-31', '2 Timothy 1:6-7'] },
  { id: 'mercy', title: 'daily.plan.mercy', readings: ['Psalm 51', 'Psalm 103', 'Micah 6:8', 'Matthew 5:1-12', 'Luke 10:25-37', 'Luke 15', 'Colossians 3:12-17'] },
  {
    id: 'psalms-30', title: 'plan.psalms.title', detail: 'plan.psalms.detail', paid: true,
    readings: [3, 4, 13, 16, 23, 27, 30, 31, 34, 37, 40, 42, 46, 51, 56, 61, 62, 63, 84, 86, 90, 91, 103, 116, 121, 127, 130, 131, 139, 143].map(n => `Psalm ${n}`),
  },
  { id: 'proverbs-31', title: 'plan.proverbs.title', detail: 'plan.proverbs.detail', paid: true, readings: chapters('Proverbs', 31) },
  { id: 'mark-john', title: 'plan.gospels.title', detail: 'plan.gospels.detail', paid: true, readings: [...chapters('Mark', 16), ...chapters('John', 21)] },
  {
    id: 'heavy-30', title: 'plan.heavy.title', detail: 'plan.heavy.detail', paid: true,
    readings: [
      'Psalm 13', 'Psalm 22', 'Ruth 1', 'Job 1', 'Job 2', 'Psalm 42', 'Psalm 43', '1 Kings 19', 'Psalm 31', 'Psalm 55',
      'Lamentations 3', 'Psalm 77', 'Psalm 88', 'Isaiah 40', 'Psalm 102', 'Isaiah 43', 'Psalm 130', 'Job 38', 'Job 42', 'Psalm 142',
      'Matthew 11:28-30', 'John 11', 'Psalm 34', 'Isaiah 61', 'Romans 8', 'Psalm 46', '2 Corinthians 4', 'Psalm 56', 'Psalm 121', 'Revelation 21:1-7',
    ],
  },
];
