# Diaspora starter calendar, 7 Dec 2026 to 1 Jan 2027 (DRAFTS)

**Status: drafts awaiting her yes. Nothing here is scheduled, queued or posted, and nothing reads this folder.** The posting loops read only `data/instagram/posts.json` and `data/threads/posts.json`.

- **What is here:** 24 posts in `posts.json` (12 for Korean American Christians in Korean, 12 for African diaspora Christians in English), 3 a week each for 4 weeks. Each post has the picture frame, the Instagram/Facebook caption, a Threads text, and one share card: a KakaoTalk 1080×1080 picture + message (Korean) or a WhatsApp Status 1080×1920 picture + forward text (African).
- **Pictures:** 48 PNGs in `cards/`, rendered with the Instagram templates: `npm run ig:render -- --bank data/drafts/diaspora-2026-12/posts.json --out data/drafts/diaspora-2026-12/cards` (Chrome; Hangul needs a Korean system font, so render on a Mac).
- **Scripture:** KJV only, read from the stored text by code. Korean posts quote the KJV in English with the Korean book name (no Korean Bible text: 개역개정 and 새번역 are under copyright; no public-domain Korean text is stored or verified).
- **Store words:** none on the pictures or captions (the app may be live by 7 Dec); footers point to peacebestillapp.com/ko and /prayer-points.
- **Slots are suggestions:** Korean Mon/Wed/Fri 6:30 AM CT (7:30 ET, 4:30 PT, dawn-prayer hour on the West Coast). African Mon 6:30 AM CT (declaration), Wed 7 PM CT (prayer points), Fri 9 PM CT (vigil night).

## Before any of this goes out (decisions for the coordinator and her)
1. **Her yes** on the posts and on the Korean posts sharing @peacebestillapp with the Black church audience (the account today is led by Hush Harbor).
2. **Hashtag rule:** the Instagram loop requires #blackbiblechat first and an approved list (`scripts/instagram/ig_loop.mjs` TAGS_ALLOWED). These drafts use community tags (#새벽기도, #prayerpoints, #nightvigil, #crossovernight…). Adopting them means a per-community tag rule in the loop, in the same PR that moves posts into the bank.
3. **Buffer:** the free plan holds 10 scheduled posts shared with the existing loops (`ORG_SPLIT`); 6 more a week needs a slot plan.
4. **Kakao/WhatsApp cards are for people to share by hand** (church group chats); no account sends them.

## Calendar
| Date | Slot | Community | Post | Verse | Files |
|---|---|---|---|---|---|
| 2026-12-07 Mon | 06:30 CT | African diaspora | Monday declaration | PSA 118:17 | `cards/af01-1.png`, `cards/af01-whatsapp.png` |
| 2026-12-07 Mon | 06:30 CT | Korean American | 오늘 아침 첫마디 | PSA 5:3 | `cards/ko01-1.png`, `cards/ko01-kakao.png` |
| 2026-12-09 Wed | 19:00 CT | African diaspora | Prayer points · family | JOS 24:15 | `cards/af02-1.png`, `cards/af02-whatsapp.png` |
| 2026-12-09 Wed | 06:30 CT | Korean American | 예수님의 새벽 | MAR 1:35 | `cards/ko02-1.png`, `cards/ko02-kakao.png` |
| 2026-12-11 Fri | 21:00 CT | African diaspora | Friday vigil | ACT 16:25 | `cards/af03-1.png`, `cards/af03-whatsapp.png` |
| 2026-12-11 Fri | 06:30 CT | Korean American | 집에서 드리는 새벽기도 | (list card) | `cards/ko03-1.png`, `cards/ko03-kakao.png` |
| 2026-12-14 Mon | 06:30 CT | African diaspora | Monday declaration | ISA 54:17 | `cards/af04-1.png`, `cards/af04-whatsapp.png` |
| 2026-12-14 Mon | 06:30 CT | Korean American | 기다림 | PSA 130:6 | `cards/ko04-1.png`, `cards/ko04-kakao.png` |
| 2026-12-16 Wed | 19:00 CT | African diaspora | Prayer points · journey mercies | PSA 121:8 | `cards/af05-1.png`, `cards/af05-whatsapp.png` |
| 2026-12-16 Wed | 06:30 CT | Korean American | 부르짖는 기도 | JER 33:3 | `cards/ko05-1.png`, `cards/ko05-kakao.png` |
| 2026-12-18 Fri | 21:00 CT | African diaspora | Friday vigil | LUK 6:12 | `cards/af06-1.png`, `cards/af06-whatsapp.png` |
| 2026-12-18 Fri | 06:30 CT | Korean American | 자녀를 위한 새벽기도 | (list card) | `cards/ko06-1.png`, `cards/ko06-kakao.png` |
| 2026-12-21 Mon | 06:30 CT | African diaspora | Monday declaration | PSA 16:6 | `cards/af07-1.png`, `cards/af07-whatsapp.png` |
| 2026-12-21 Mon | 06:30 CT | Korean American | 아침에 듣게 하소서 | PSA 143:8 | `cards/ko07-1.png`, `cards/ko07-kakao.png` |
| 2026-12-23 Wed | 19:00 CT | African diaspora | Prayer points · on the road | PSA 91:11 | `cards/af08-1.png`, `cards/af08-whatsapp.png` |
| 2026-12-23 Wed | 06:30 CT | Korean American | 자녀를 위한 말씀 | ISA 54:13 | `cards/ko08-1.png`, `cards/ko08-kakao.png` |
| 2026-12-25 Fri | 21:00 CT | African diaspora | Christmas night | EPH 6:18 | `cards/af09-1.png`, `cards/af09-whatsapp.png` |
| 2026-12-25 Fri | 06:30 CT | Korean American | 신년 특새를 앞두고 | (list card) | `cards/ko09-1.png`, `cards/ko09-kakao.png` |
| 2026-12-28 Mon | 06:30 CT | African diaspora | Crossover week | PSA 65:11 | `cards/af10-1.png`, `cards/af10-whatsapp.png` |
| 2026-12-28 Mon | 06:30 CT | Korean American | 송구영신 | LAM 3:23 | `cards/ko10-1.png`, `cards/ko10-kakao.png` |
| 2026-12-30 Wed | 19:00 CT | African diaspora | Crossover prayer points | PRO 3:6 | `cards/af11-1.png`, `cards/af11-whatsapp.png` |
| 2026-12-30 Wed | 06:30 CT | Korean American | 새해 첫 새벽 | PSA 46:5 | `cards/ko11-1.png`, `cards/ko11-kakao.png` |
| 2027-01-01 Fri | 21:00 CT | African diaspora | Happy New Year | ISA 43:19 | `cards/af12-1.png`, `cards/af12-whatsapp.png` |
| 2027-01-01 Fri | 06:30 CT | Korean American | 1월 준비 중 | (list card) | `cards/ko12-1.png`, `cards/ko12-kakao.png` |
