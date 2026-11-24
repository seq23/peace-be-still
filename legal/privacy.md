# Privacy policy

Effective: November 23, 2026

This policy covers the Peace Be Still app and the website peacebestillapp.com. Peace Be Still is made by Spry Labs, the trade name of Redwood Reserve Holdings LLC, a Wyoming limited liability company. Write to info@peacebestillapp.com with any privacy question or request.

The short version: there is no account, we never ask for your name, there are no ads, and we do not sell or share personal information. Free chat goes to free AI providers, which may keep what you type and learn from it. For ages 13 to 17, free chat goes only to Cloudflare Workers AI, which does not train on it. Paid chat is private: it goes to a paid AI service that does not use it to improve its AI.

## What stays on your phone

Your birth year, the door you chose, your settings, saved verses, highlights, journal entries and your streak stay on your phone. We never receive them. Deleting the app deletes them.

## Chat

Chat is optional, and it comes free or paid. Before your first free chat, the app asks for your permission in plain words and tells you where your words go; there is no free chat without that yes, and the app remembers it on your phone. You can choose to make chat private instead.

Free chat: each message travels through our service to an AI provider, which writes the answer. The providers, tried in this order, are Cloudflare Workers AI, Google Gemini (free tier) and free models reached through OpenRouter. These providers may retain and use what you type to improve their services, and people at those companies may read it. Please leave out names and anything that identifies you or someone else. For ages 13 to 17, free chat goes only to Cloudflare Workers AI, which does not use what you type to train AI models; when it is busy, chat says it is resting and tries no other provider.

Paid chat: each message goes through our service to a paid AI service under terms that do not let it use what you type to train or improve its AI (today DeepSeek V4.1 Flash through OpenRouter, served only by DeepInfra, Together or Fireworks in the United States with zero data retention, never by DeepSeek itself; if those are unavailable, Google Gemini on a paid plan. If we change them, it will be another paid service with the same promise, named here). Paid chat never falls back to a free provider unless you choose free chat after your private messages, or while the paid service is down; the app always asks first. For ages 13 to 17, paid chat never uses Google Gemini: when the paid service is unavailable, chat says it is resting, and free chat on Cloudflare Workers AI is offered instead.

Each chat message is sent with your age group (teen or adult), the door you chose, the chat voice and the language, so the answer fits; none of these is linked to your name, because the app never asks for it. Your birth year itself never leaves your phone.

Every message first goes through a safety check in our own code. When that check recognizes a message as someone saying they mean to hurt themselves, or that someone is hurting them, our code answers with crisis lines for the region your phone is set to, and the message is not sent to any AI model. A message with less clear signs of distress is never sent to a free provider: a safety model on Cloudflare Workers AI reads it, and it is answered by the private AI. The AI that writes an answer also says whether a message seems unsafe, and then the same safety model checks it before anything is shown. From then on, that conversation is answered by the private AI until it has been calm for a while (at most 24 hours), for free and paid chat alike.

For ages 13 to 17, no Google Gemini model reads any message. When the safety check or the safety model sees clear signs of danger, the app shows crisis lines for your region and asks "Are you safe right now?" at once, in words written by people, not by AI, and no AI model writes anything in reply. A message with less clear signs, and the rest of that conversation, is answered by Cloudflare Workers AI, which does not use what you type to train AI models. Each person aged 13 to 17 gets one answer a day written by Cloudflare Workers AI, which also has a small daily limit shared by everyone using the app. After that answer, in any conversation that day, the reply is in words written by people and names free crisis lines for your region, and chat stays open. When you reach your free chat limit for the day, the reply names the free crisis lines for your region at any age. In a conversation about your safety, when Cloudflare Workers AI has no answer, you see the crisis lines the first time, and after that a short note that points back to them. "Are you safe right now?" is asked again only if new signs of danger appear or you say you are not safe.

We do not store chat text. It passes through our service to the provider and is gone from our service once the answer is returned.

## Paid chat memory

If you have a paid plan, chat can remember what you are carrying. That memory is a short summary, at most 1,000 characters, stored on our service under an anonymous install id and sent with your messages so the answers remember. It is kept until you delete it in Settings, or until 30 days after your paid plan ends, whichever comes first. Words about self-harm or abuse are never saved to memory.

## Sessions made for you

If you have a paid plan and ask for a session made for you, the scene or worry you write is sent to our service. Free AI providers write the session script from your words, and they may keep what you write and learn from it, as with chat (the request form says so before you send). For ages 13 to 17, no free provider that may learn from it is used: Cloudflare Workers AI or the private paid model writes and checks it. When the free providers are busy, or what they write still misses our checks after one revision, a private paid model writes it instead, through hosts that keep nothing you send and never train on it. We make the audio on our own computer with an open-source voice engine. Your written words are deleted once the audio is made, and at most 7 days after you send them. The finished audio is kept for you to play until you delete it, or until 30 days after your paid plan ends.

## Fair use and safety records

To keep chat safe and affordable, our service keeps a few records with no words in them, under the anonymous install id: whether chat is paused on an install (by us, or for 24 hours after a flood of messages, repeated messages or attempts to break the app's rules, with the reason as a short code), deleted when the pause ends; the AI cost of a paid install's chat this month, deleted 30 days after the paid plan ends; and, for a conversation where the safety check saw signs of danger, when that happened and how many calm messages followed, deleted after two days. Your consent to free chat is kept on your phone.

## Reporting an answer

If you report an answer or a session, we keep the answer you reported, the reason you chose and the time, for 90 days, so a person can review it. Your message and anything that identifies you are not kept with it.

## The anonymous install id and limits

To keep chat fair and free, our service creates a random install id the first time you open chat. It is not tied to your name, email, phone number, or Apple or Google account. Our service uses the install id and a one-way hash of your IP address to count messages each day (1 conversation of up to 5 messages a day in the free version, 50 private messages a day in a paid plan, then free chat if you choose it) and to stop abuse. So that answers do not repeat, our service also keeps short records of recent answer patterns for each install id: keyed hashes of 8 characters, with no words in them. Those counters and records are deleted within 48 hours. If a Google Play reviewer types the app review code, our service keeps a keyed hash of that install id (never the id itself) so the code opens no more than 10 devices, and deletes it 7 days after the review access ends. We also keep a count of all chat messages per day, with no text and no identifier, to stay inside the free AI allowances.

Your first chat on an iPhone is private: that one conversation (up to the free day's messages) goes to the same private paid service as a paid plan, never to a free AI service. To give it once per iPhone, the app asks Apple's DeviceCheck for a device token, and our service asks Apple to keep one yes-or-no mark for this iPhone ("already had its private first chat"). Apple keeps that mark for our app only; it tells us nothing about you, and it is not your Apple account. Our service also keeps, for each install id, whether its first chat was private and the day, with no words, for up to 120 days, to see whether the private first chat helps; the IP hash on that record is deleted after the day. Without DeviceCheck (the web, Android, or when Apple does not answer), the first chat is the normal free chat, with its own notice first.

## Audio and the Bible

The Bible text, the Bible audio and the sleep sessions are files. When your phone fetches one, our host (Cloudflare) sees your IP address in order to deliver it, as any web host does. We do not keep a record of what you listen to or read.

## Purchases

Apple handles every purchase on an iPhone, and Google Play on Android. We never see your name, Apple ID, Google account or payment card. RevenueCat, which manages subscriptions for us, receives an anonymous app user id, your purchase receipts from Apple or Google Play, and basic details such as the app version, the iOS or Android version and store country, so the app knows whether you have a paid plan. RevenueCat's diagnostics and its collection of device identifiers are turned off in the app, and the Android app does not use the advertising ID.

## What we never do

No ads, no ad SDKs and no analytics SDKs. The app does not track you across other companies' apps or websites, and we do not sell or share personal information. Browser Do Not Track signals do not apply because there is no tracking to stop.

## Children

Peace Be Still asks for a birth year before anything else.

Under 13, the app sends no chat, memory, made-for-you session or install id to our service, and the birth year stays on the device. Audio files are fetched like any web file: the IP address is used only to deliver the file. The paid plan is not offered under 13.

We do not knowingly collect personal information from children under 13. If you believe a child sent us information, write to info@peacebestillapp.com and we will delete it.

For ages 13 to 17, chat uses the teen voice, chat and sessions made for you go only to AI services that do not train on what is typed (Cloudflare Workers AI, or the paid service through OpenRouter named above; never Google Gemini), and paid upgrades go through Apple's Ask to Buy, or Google Play's purchase approval in Family Link, when a parent has turned it on.

## Where the app is offered

The app is offered in the United States and other countries, but not in the European Economic Area, the United Kingdom or Switzerland, because one of our free AI providers does not allow its free tier to serve people there. It is not offered in mainland China either, where religious content online needs a government permit.

## Keeping it safe

Everything between the app and our service travels over HTTPS. The install id is carried in a signed token so no one else can use your limits or your memory, and IP addresses are stored only as one-way hashes.

## The website

The website peacebestillapp.com sets no cookies and has no accounts, ads or tracking scripts. It uses Cloudflare Web Analytics, a privacy-first visit counter with no cookies, which tells us page views, the page you came from, and your country and device type, in totals. Cloudflare, our host, processes basic details of each visit, such as your IP address and browser type, to deliver the page and protect the site.

Until November 18, 2026 the site had a form to hear when the app launches. It is closed. For people who signed up before then, we keep the email address, page language, door chosen if any, the page, the date and time, and the sentence agreed to, only to send one launch email. We delete the whole list after that email is sent. To be removed sooner, use the "Remove my email" link you saw after signing up, or the link in the launch email.

## Your choices and rights

You can delete paid chat memory and made-for-you sessions in Settings at any time. Apple manages subscriptions in your iPhone's Settings, and Google Play in the Play Store app under Payments and subscriptions. For anything else, write to info@peacebestillapp.com: you can ask what we hold about your install id and ask us to delete it, and we will answer by hand within 30 days. We treat you the same whether or not you make a request. These rights apply wherever you live, including California and other states with privacy laws.

## Changes

When this policy changes, we post the change on this page and update the date on it.

## Contact

Spry Labs (Redwood Reserve Holdings LLC), 30 N. Gould St, Ste R, Sheridan, WY 82801, USA. Email info@peacebestillapp.com.
