import type { Key } from '../../i18n';
import type { Door } from '../../model';

export function dateKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export function relativeDate(date: Date, days: number): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);
}

export function streak(days: readonly string[], now: Date): number {
  const done = new Set(days);
  const start = done.has(dateKey(now)) ? 0 : 1;
  let offset = start;
  while (done.has(dateKey(relativeDate(now, -offset)))) offset++;
  return offset - start;
}

const declarations = {
  faith: [
    'today.declaration.faith',
    'daily.faith.1',
    'daily.faith.2',
    'daily.faith.3',
    'daily.faith.4',
    'daily.faith.5',
    'daily.faith.6',
  ],
  mindset: [
    'today.declaration.mindset',
    'daily.mindset.1',
    'daily.mindset.2',
    'daily.mindset.3',
    'daily.mindset.4',
    'daily.mindset.5',
    'daily.mindset.6',
  ],
} as const satisfies Record<Door, readonly Key[]>;

export function declaration(door: Door | null, now: Date): Key {
  return declarations[door ?? 'faith'][now.getDay()];
}

const drafts = [
  ['Genesis 1', 'daily.draft.0'], ['Exodus 14', 'daily.draft.1'], ['Ruth 2', 'daily.draft.2'],
  ['1 Samuel 17', 'daily.draft.3'], ['Daniel 6', 'daily.draft.4'], ['Mark 4', 'daily.draft.5'], ['John 20', 'daily.draft.6'],
] as const;

export function todayStory(date: Date, development: boolean) {
  return development ? drafts[date.getDay()] : undefined;
}

export const plans = [
  { id: 'rest', title: 'daily.plan.rest', readings: ['Psalm 4', 'Psalm 23', 'Psalm 46', 'Psalm 62', 'Psalm 91', 'Psalm 121', 'Matthew 11:28-30'] },
  { id: 'courage', title: 'daily.plan.courage', readings: ['Joshua 1:1-9', 'Psalm 27', '1 Samuel 17', 'Daniel 6', 'Mark 4:35-41', 'Acts 4:23-31', '2 Timothy 1:6-7'] },
  { id: 'mercy', title: 'daily.plan.mercy', readings: ['Psalm 51', 'Psalm 103', 'Micah 6:8', 'Matthew 5:1-12', 'Luke 10:25-37', 'Luke 15', 'Colossians 3:12-17'] },
] as const;
