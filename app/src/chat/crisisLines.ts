// The one table of crisis lines by the phone's region, read by the app (the chat help line, the card's
// buttons, Made for you) and by the chat Worker (worker/src/replies.ts imports it), so a number can only
// change in one place. Each row was checked against the official source named on it (the PR that adds a
// row cites it). A region with no row, or no region at all (an unreadable phone setting and no network
// country), gets findahelpline.com: never a blank, and never a US number that does not reach her.
// Pure data: no React Native import, so the Worker bundles it.
import type { Language } from '../i18n';

export type Region = 'US' | 'MX' | 'ES' | 'KR' | 'TW' | 'HK' | 'CN' | 'other';
export type LineRegion = Exclude<Region, 'US' | 'other'>;

export type CrisisLine = {
  /** The number as written in the reply text (the card's buttons are found by it). */
  line: string;
  /** What the phone dials. */
  tel: string;
  /** The emergency number for danger this minute, as written and dialled. */
  emergency: string;
  /** Open 24 hours a day (the reply says "any time" only when the source says so). */
  anyTime: boolean;
  /** Free to call (the reply says "free" only when the source says so). */
  free: boolean;
  /** The official page the number was checked against. */
  source: string;
  /** The line's name in each screen language, said before the number (none: the number alone). */
  name: Record<Language, string> | null;
};

export const CRISIS_LINES: Record<LineRegion, CrisisLine> = {
  // Línea de la Vida, Secretaría de Salud / CONASAMA (owner, 21 Nov 2026).
  MX: { line: '800 911 2000', tel: '8009112000', emergency: '911', anyTime: true, free: true, source: 'https://www.inmegen.gob.mx/media/filer_public/26/05/21/sns_infografia5.pdf', name: { en: 'Línea de la Vida', es: 'la Línea de la Vida', ko: 'Línea de la Vida', 'zh-Hans': 'Línea de la Vida', 'zh-Hant': 'Línea de la Vida' } },
  // 024, Ministerio de Sanidad (owner, 21 Nov 2026).
  ES: { line: '024', tel: '024', emergency: '112', anyTime: true, free: true, source: 'https://www.sanidad.gob.es/linea024/home.htm', name: null },
  // 109 자살예방상담전화, 보건복지부: one number since January 2024, 24 hours (정책브리핑).
  KR: { line: '109', tel: '109', emergency: '119', anyTime: true, free: false, source: 'https://www.korea.kr/news/policyNewsView.do?newsId=148921874', name: { en: 'the suicide prevention line', es: 'la línea de prevención del suicidio', ko: '자살예방상담전화', 'zh-Hans': '自杀预防咨询电话', 'zh-Hant': '自殺預防諮詢電話' } },
  // 1925 安心專線, 衛生福利部: "全年無休、24小時免付費".
  TW: { line: '1925', tel: '1925', emergency: '119', anyTime: true, free: true, source: 'https://mohw.gov.tw/cp-16-48244-1.html', name: { en: 'the Safe Line', es: 'la línea de apoyo', ko: '안심 상담전화', 'zh-Hans': '安心专线', 'zh-Hant': '安心專線' } },
  // 香港撒瑪利亞防止自殺會 24小時情緒支援熱線; 999 for police, fire and ambulance (gov.hk).
  HK: { line: '2389 2222', tel: '23892222', emergency: '999', anyTime: true, free: false, source: 'https://www.sbhk.org.hk/', name: { en: 'the Samaritan Befrienders', es: 'Samaritan Befrienders', ko: '사마리탄 상담전화', 'zh-Hans': '香港撒玛利亚防止自杀会', 'zh-Hant': '香港撒瑪利亞防止自殺會' } },
  // 12356 全国统一心理援助热线, 国家卫生健康委, nationwide since 1 May 2025. Lines must open at least 18 hours
  // a day, not 24, so the reply never says "any time"; 120 is the ambulance.
  CN: { line: '12356', tel: '12356', emergency: '120', anyTime: false, free: false, source: 'https://www.news.cn/politics/20250508/b45e439c15bb4732858ad5c7640e9ba9/c.html', name: { en: 'the mental health support line', es: 'la línea de apoyo psicológico', ko: '심리지원 상담전화', 'zh-Hans': '心理援助热线', 'zh-Hant': '心理援助熱線' } },
};

export const FIND_HELPLINE = 'https://findahelpline.com';

/** The device region (ISO alpha-2) to its lines. US territories keep the US lines; an unreadable or unknown region gets findahelpline. */
export function regionOf(code: string | null | undefined): Region {
  const c = (code ?? '').trim().toUpperCase();
  if (!/^[A-Z]{2}$/.test(c)) return 'other';
  if (['US', 'PR', 'GU', 'VI', 'AS', 'MP'].includes(c)) return 'US';
  // Macau has no row of its own: its people are sent to findahelpline, never to Hong Kong's number.
  return c in CRISIS_LINES ? (c as LineRegion) : 'other';
}

/** The region whose line a reply names (the card's buttons follow the text she was given). */
export function lineIn(text: string): LineRegion | null {
  for (const [region, row] of Object.entries(CRISIS_LINES) as Array<[LineRegion, CrisisLine]>) {
    if (new RegExp(`(?<![\\d-])${row.line.replace(/ /g, ' ?')}(?![\\d-])`).test(text)) return region;
  }
  return null;
}

/** A one-tap help button: an i18n key (with its values) and what it opens. */
export type HelpLink = { label: 'chat.call.poison' | 'chat.call.911' | 'chat.call.childhelp' | 'chat.text.childhelp' | 'chat.call.dv' | 'chat.text.dv' | 'chat.call.line' | 'chat.call.named' | 'chat.findHelpline' | 'chat.call.988' | 'chat.text.988'; values?: { line: string; name?: string }; url: string };

/** The one list of buttons under a crisis reply (chat's card, Made for you, Write your own night), read from the fixed
 *  text she was given: the hotline for what is happening first (Poison Control, Childhelp, the Domestic Violence
 *  Hotline), then her region's line and emergency number from the table, findahelpline, and 988 only when the reply names
 *  it (a reply for Korea never gets a US button). In the US, 911 gets a button beside Poison Control only (medical
 *  danger), as chat's card always had. */
export function crisisLinks(text: string, lang: Language): HelpLink[] {
  const links: HelpLink[] = [];
  const us911 = /(?<![\d-])911(?![\d-])/.test(text) && !lineIn(text);
  if (text.includes('1-800-222-1222')) links.push({ label: 'chat.call.poison', url: 'tel:18002221222' }, ...(us911 ? [{ label: 'chat.call.911', url: 'tel:911' } as const] : []));
  if (text.includes('1-800-422-4453')) links.push({ label: 'chat.call.childhelp', url: 'tel:18004224453' }, { label: 'chat.text.childhelp', url: 'sms:18004224453' });
  if (text.includes('1-800-799-7233')) links.push({ label: 'chat.call.dv', url: 'tel:18007997233' }, { label: 'chat.text.dv', url: 'sms:88788?body=START' });
  const region = lineIn(text);
  if (region) {
    const row = CRISIS_LINES[region];
    const name = row.name?.[lang];
    links.push(name ? { label: 'chat.call.named', values: { name, line: row.line }, url: `tel:${row.tel}` } : { label: 'chat.call.line', values: { line: row.line }, url: `tel:${row.tel}` }, { label: 'chat.call.line', values: { line: row.emergency }, url: `tel:${row.emergency}` });
  }
  // The reply names the site in its words (it is fixed text, never a URL to follow): the button opens FIND_HELPLINE itself.
  if (/(?<![\w.-])findahelpline\.com(?![\w/-])/.test(text)) links.push({ label: 'chat.findHelpline', url: FIND_HELPLINE });
  if (/(?<![\d-])988(?![\d-])/.test(text)) links.push({ label: 'chat.call.988', url: 'tel:988' }, { label: 'chat.text.988', url: 'sms:988' });
  return links;
}
