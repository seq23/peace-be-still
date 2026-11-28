# Review notes, 1.0.1

Two parts: the App Store Connect "Notes" field (App Review Information, at most 4,000 characters; app/test/releaseGate.unit.ts
counts it) and Google Play's "App access" instructions. Every step is reachable in the 1.0.1 build. The Play review code
is never written here (public repo): it is the vault's PBS_PLAY_REVIEW_CODE, pasted into Play Console by hand.

## App Store notes

No accounts and no sign-in, so no demo account is needed.

HOW TO REACH EACH PART
1. On "What do you need tonight?" tap "With God's Word". Enter birth year 1990, pick any start, continue. The app opens on Today.
2. Chat tab: before the first free chat, a screen says free chat uses a free AI service that may keep what is typed, and offers "Continue with free chat" or "Make chat private" (paid). Nothing is sent without that tap.
3. Bible tab: the whole Bible, free. King James Version; Reina-Valera 1909 in Spanish; 개역한글 (1961) in Korean; the 1919 Chinese Union Version in Chinese.
4. Nights tab: Psalm Nights and other whispered audio (English and Spanish). The first night is free, then one a week.
5. Today: "For when you've lost someone", a short grief page with verses and the crisis line for the phone's region. Between midnight and 5 AM, Nights and Today show one "Go back to sleep" button (Psalm 4, free).

PAID FEATURES
6. More > Settings > A paid plan opens the price screen. Use a sandbox Apple ID to buy Monthly ($7.99) or Yearly ($39.99). Restore Purchases, Terms, Privacy and Manage are on that screen.
7. Paid chat: unlimited, private for the first 50 messages a day; after that the app asks before any message goes to free chat.
8. Made for you: Nights > Made for you. Write a short note, tap "Make my session". The audio is made overnight.
9. Every past story, longer reading plans and declaration topics (Today). Without a purchase each opens the price screen.

WRITE YOUR OWN NIGHT (new in 1.0.1; paid, 18 and over, English and Spanish)
10. Delete and reinstall (or More > Settings to change the door). Tap "With mindset & imagination", enter birth year 1990, pick any start.
11. Nights tab > "Write your own night" (marked Paid plan). Its screen explains it; "See plans" opens the price screen. Buy with the sandbox Apple ID.
12. Type a hope (for example "a quiet morning in a new apartment"), tap "Write my moment". The first time, a screen names every service that reads it (Cloudflare Workers AI safety model, then DeepSeek V4.1 Flash via OpenRouter, Google Gemini as fallback; none trains on it); tap "Agree and write my moment". Change any word, then "Start the night" with the phone voice, or record your own voice (the recording stays on the phone and is left out of iCloud backup).
13. Under 18, or on a Korean or Chinese phone, it is never shown.

KOREAN AND CHINESE (new in 1.0.1)
14. iPhone Settings > General > Language & Region (or More > Settings > Language in the app): 한국어, 简体中文 or 繁體中文. Screens, the Bible and chat change language; the whispered audio and the stories stay English and the app says so.
15. 새벽기도 (Korean only): with Korean set, choose "With God's Word", birth year 1990, then 새벽기도 in the list. Today shows day 1 of 40: a 개역한글 verse, a prayer, a reminder time and a KakaoTalk card.

AI CONTENT (1.2, 5.1.2)
- Every answer is labelled AI; the app says it is not a pastor or counselor. Each has "Report this answer".
- Scripture in answers is inserted word for word from the app's own Bibles; a made-up reference is dropped.

CRISIS SAFETY
- A message about self-harm, suicide or abuse gets a fixed reply with the crisis line for the phone's region (US 988 with Call and Text buttons; Mexico, Spain, Korea, Taiwan, Hong Kong have their own) and never reaches an AI model. Less clear distress is read by a safety model and answered by the private paid model.

AGE
- Birth year first. Under 13: no chat, no made-for-you. 13 to 17: Young Faith; purchases through Ask to Buy.

PURCHASES
- Auto-renewable subscriptions only (StoreKit). No trial, no introductory offer.

DATA
- No ads, no tracking. Paid chat memory and made-for-you sessions can be deleted in Settings. Privacy: https://peacebestillapp.com/privacy

## Google Play: App access

The paid plan has no account. To review it without buying:
1. Tap "With God's Word" (or "With mindset & imagination" for Write your own night), enter birth year 1990, pick any start.
2. More > Settings > A paid plan. Under the plans, tap "Have a review code?".
3. Type the 10-digit code: PBS_PLAY_REVIEW_CODE (vault; pasted here in Play Console, never in this file). The paid plan opens for 7 days on that device.
Then follow steps 7 to 15 above (Write your own night, Korean and Chinese and 새벽기도 work the same on Android).
