import type { Key } from '../../i18n';
import type { Door } from '../../model';

type Declaration = { line: Key; passage?: string };

const declarations = {
  faith: [
    { line: 'today.declaration.faith', passage: 'Isaiah 41:10' },
    { line: 'daily.faith.1', passage: '1 Peter 5:7' },
    { line: 'daily.faith.2', passage: 'Psalm 116:1' },
    { line: 'daily.faith.3', passage: 'James 1:5' },
    { line: 'daily.faith.4', passage: 'Philippians 1:6' },
    { line: 'daily.faith.5', passage: 'Micah 6:8' },
    { line: 'daily.faith.6', passage: 'Matthew 6:34' },
  ],
  mindset: [
    { line: 'today.declaration.mindset' },
    { line: 'daily.mindset.1' },
    { line: 'daily.mindset.2' },
    { line: 'daily.mindset.3' },
    { line: 'daily.mindset.4' },
    { line: 'daily.mindset.5' },
    { line: 'daily.mindset.6' },
  ],
} as const satisfies Record<Door, readonly Declaration[]>;

export function declaration(door: Door | null, now: Date): Declaration {
  return declarations[door ?? 'faith'][now.getDay()];
}

const drafts = [
  ['Genesis 1', 'daily.draft.0', 'daily.retelling.0'], ['Exodus 14', 'daily.draft.1', 'daily.retelling.1'], ['Ruth 2', 'daily.draft.2', 'daily.retelling.2'],
  ['1 Samuel 17', 'daily.draft.3', 'daily.retelling.3'], ['Daniel 6', 'daily.draft.4', 'daily.retelling.4'], ['Mark 4', 'daily.draft.5', 'daily.retelling.5'], ['John 20', 'daily.draft.6', 'daily.retelling.6'],
] as const;

export function todayStory(date: Date) {
  return process.env.EXPO_PUBLIC_PBS_PREVIEW === '1' ? drafts[date.getDay()] : undefined;
}

export function storyPassage(date: Date) {
  return drafts[date.getDay()][0];
}

export const plans = [
  { id: 'rest', title: 'daily.plan.rest', readings: ['Psalm 4', 'Psalm 23', 'Psalm 46', 'Psalm 62', 'Psalm 91', 'Psalm 121', 'Matthew 11:28-30'] },
  { id: 'courage', title: 'daily.plan.courage', readings: ['Joshua 1:1-9', 'Psalm 27', '1 Samuel 17', 'Daniel 6', 'Mark 4:35-41', 'Acts 4:23-31', '2 Timothy 1:6-7'] },
  { id: 'mercy', title: 'daily.plan.mercy', readings: ['Psalm 51', 'Psalm 103', 'Micah 6:8', 'Matthew 5:1-12', 'Luke 10:25-37', 'Luke 15', 'Colossians 3:12-17'] },
] as const;
