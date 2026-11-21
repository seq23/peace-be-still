// Seed question pages, from the blue-ocean research of 18 Nov 2026
// (~/Work/codex-briefs/peace-be-still/blue-ocean-keywords.html). Rules:
// - door "faith" pages never link a "mindset" page and never use mindset words; and the reverse.
// - scripture is quoted word for word: KJV (English), Reina-Valera 1909 (Spanish).
// - no outcome or health promises; no launch date; no other app is disparaged.
const D = { published: "2026-11-18", updated: "2026-11-18", publishedText: "18 Nov 2026", updatedText: "18 Nov 2026" };
const DES = { published: "2026-11-18", updated: "2026-11-18", publishedText: "18 nov 2026", updatedText: "18 nov 2026" };
import { SLEEP } from "./blitz-sleep.mjs";
import { BLACK } from "./blitz-black.mjs";
import { APPS } from "./blitz-apps.mjs";
import { ES } from "./blitz-es.mjs";
import { KO } from "./diaspora-ko.mjs";
import { AFRICA } from "./diaspora-africa.mjs";
import { V } from "./scripture.mjs";
import { KJV_SRC } from "./blitz-common.mjs";
import { SEARCH, CHAT_VERSES } from "./blitz-search.mjs";

export const PAGES = [
  {
    ...D, lang: "en", door: "faith", group: "Sleep, prayer and Bible verses", path: "/questions/whispered-bible-for-sleep/",
    title: "Whispered Bible for sleep: how it works · Peace Be Still",
    description: "A whispered Bible for sleep is scripture read softly at bedtime. Here is what it sounds like, which passages people choose, and how to set it up tonight.",
    h1: "Whispered Bible for sleep: what it is and how to use it",
    definition: "A whispered Bible for sleep is scripture read aloud in a soft, low voice at bedtime, so you can listen with your eyes closed and let the words be the last thing you hear. Most people choose Psalms, the Gospels or short passages about rest, and play them with a sleep timer so the voice fades out on its own.",
    quick: "Pick a short passage about rest (Psalm 4, Psalm 23 or Psalm 91), play it in a whisper with a 30-minute sleep timer, keep the screen dark, and let nothing play afterwards.",
    bestFor: "anyone who likes falling asleep to scripture and wants a quiet, word-for-word reading instead of music or talk.",
    sections: [
      ["What does a whispered Bible reading sound like?", `<p>It is the Bible read close to the microphone, slowly and quietly, with long pauses between verses. There is no music under it and no preaching on top of it. The words stay exactly as written; only the voice is softer.</p>
<p>Many people know the style from “Bible ASMR” videos on YouTube, where whispered readings of Psalms and the Gospels gather millions of views. A whisper keeps the room still and makes the words easy to follow even when you are half asleep.</p>`],
      ["Which Bible passages do people listen to at night?", `<p>Most bedtime listening comes from a small set of passages about rest, safety and peace:</p>
<ul>
<li><strong>Psalm 4</strong>, which ends with lying down in peace.</li>
<li><strong>Psalm 23</strong>, the shepherd psalm.</li>
<li><strong>Psalm 91</strong>, about dwelling in the secret place of the most High.</li>
<li><strong>Psalm 121</strong> and <strong>Psalm 127</strong>, about the Lord who keeps you and gives his beloved sleep.</li>
<li><strong>Matthew 11:28–30</strong>, Jesus's invitation to the weary.</li>
</ul>
${V("PSA 4:8")}`],
      ["How do I set up a whispered Bible for sleep tonight?", `<ol>
<li>Choose one passage, not a playlist. One psalm read slowly fills 10 to 20 minutes.</li>
<li>Set a sleep timer (30 minutes is a common choice) so the audio fades out instead of stopping hard.</li>
<li>Turn the screen brightness down or lock the phone; audio keeps playing.</li>
<li>Make sure nothing plays next. Autoplay into an advert or a new video is what wakes most people.</li>
<li>Keep the same passage for a few nights. Familiar words are easier to rest in.</li>
</ol>`],
      ["Which translation is best for a whispered reading?", `<p>Many listeners choose the King James Version for bedtime because its rhythm is slow and familiar, and it is in the public domain in the United States, so it can be read and shared freely. Whatever translation you choose, the reading should be word for word, with the book, chapter and verse said or shown.</p>`],
      ["How does Peace Be Still do it?", `<p>Peace Be Still is a phone app that is coming soon to the App Store and Google Play. Its Psalm Nights journey is whispered scripture for sleep: a King James psalm read in a whisper on an always-dark screen that dims after ten seconds, with a sleep timer that fades out. Your first night is free, then one a week on the free lane; the paid lane ($7.99 a month or $39.99 a year, no trial) opens a session every night.</p>`],
    ],
    faq: [
      ["Is listening to the Bible at night good for sleep?", "Many people find it calming to end the day with scripture, and a quiet voice with a sleep timer avoids the bright screens and autoplay that keep people up. It is a nightly practice, not a treatment; if sleep problems last, talk to a doctor."],
      ["What is Bible ASMR?", "Bible ASMR is scripture read in a whisper or very soft voice, close to the microphone, often with gentle pauses. People use it to relax at bedtime. A good reading keeps the words exactly as written and names the book, chapter and verse."],
      ["Which psalm is best for sleep?", "Psalm 4 is the classic bedtime psalm because its last verse is about lying down in peace and sleeping. Psalm 23 and Psalm 91 are the most requested after it. Choose one and keep it for a few nights."],
      ["Is the King James Bible free to use?", "Yes. The King James Version is in the public domain in the United States, so anyone can read it aloud, record it and share it. In the United Kingdom it is under a Crown patent, so check the rules there."],
    ],
    sources: [["Psalm 4:8 (KJV), Bible Gateway", "https://www.biblegateway.com/passage/?search=Psalm%204%3A8&version=KJV"]],
  },



  {
    ...D, lang: "en", door: "mindset", group: "Mindset", path: "/questions/law-of-assumption-sleep-meditation/",
    title: "Law of assumption sleep meditation: how it works · Peace Be Still",
    description: "A law of assumption sleep meditation is a night practice: picture a scene you hope for as if it is already true, and fall asleep inside it. Here is how.",
    h1: "Law of assumption sleep meditation: how the nightly practice works",
    indexLabel: "Imagination at bedtime: how the nightly practice works",
    indexNote: "Picture one short scene you hope for and rest inside it as you fall asleep.",
    definition: "A law of assumption sleep meditation is a night-time practice in which you picture one short scene you hope for, as if it has already happened, and rest inside that scene as you fall asleep. People often call it “living in the end”. It is usually done lying down, with a whispered guide or in silence, in the last minutes before sleep.",
    quick: "Write one short scene that would follow your wish coming true, lie down, replay it slowly in the first person, feel it as if it is happening now, and let sleep come while you are still in it. It is a practice for your own mind, not a promise of any result.",
    bestFor: "people who already use imagination and declarations at night and want a calm, simple way to do it.",
    sections: [
      ["How does a law of assumption sleep meditation work?", `<ol>
<li><strong>Choose one scene.</strong> Something small that would happen after your wish comes true: a friend saying “congratulations”, a key in a new door.</li>
<li><strong>Write it in a few lines,</strong> in the first person and the present tense.</li>
<li><strong>Lie down and relax.</strong> Slow breathing, lights off, phone face down or on a dark screen.</li>
<li><strong>Replay the scene slowly,</strong> as if you are in it now, not watching it on a screen. Notice what you hear and feel.</li>
<li><strong>Stay in it as you drift off.</strong> If your mind wanders, return to the scene without judging yourself.</li>
</ol>`],
      ["What does “living in the end” mean?", `<p>It means picturing the moment after the thing you hope for has already happened, and staying with the feeling of that moment, instead of picturing the effort to get there. In a sleep meditation the “end” is one small scene you return to every night.</p>`],
      ["Why do people do it at bedtime?", `<p>The last minutes before sleep are quiet and drowsy, so a short scene is easy to hold and replay. Many people also like that the practice ends the day on something hopeful rather than on the news or a scrolling feed. It is a nightly habit; there is no promise of any outcome.</p>`],
      ["Can I add declarations to it?", `<p>Yes. Many people say one short declaration out loud before lying down, and another in the morning, written in the same present tense as their scene. Keep it to one line you can remember.</p>`],
      ["How will Peace Be Still do it?", `<p>Peace Be Still is a phone app coming soon to the App Store and Google Play. In its Mindset door, <strong>Imagination Nights</strong> are whispered night sessions built from a scene you write, on an always-dark screen with a sleep timer, and <strong>Morning Word</strong> gives you a short declaration to say out loud. The free lane includes your first night and then one a week; the paid lane ($7.99 a month or $39.99 a year, no trial) opens a session every night.</p>`],
    ],
    faq: [
      ["What is the law of assumption?", "The law of assumption is the idea that assuming a wish is already fulfilled, and living from that feeling, shapes your experience. People practise it with imagination, short scenes and declarations, often at bedtime. It is a personal practice and belief, not a proven method, and this page makes no promise of results."],
      ["How long should a sleep meditation scene be?", "Short. A scene of a few seconds that you can replay again and again works better than a long story. Most people choose one moment that would happen after the wish comes true and stay with it until they fall asleep."],
      ["Do I need music for it?", "No. Many people prefer silence or a soft whispered guide with no music, so the scene stays in focus. If you use audio, set a sleep timer so it fades out and nothing new starts afterwards."],
      ["Is it OK if I fall asleep before the scene ends?", "Yes. Falling asleep while still in the scene is the point of a sleep meditation. If you wake in the night, you can return to the same scene without starting over."],
    ],
    sources: [],
  },
  {
    ...D, lang: "en", door: "neutral", group: "Cancelling a subscription", path: "/questions/how-to-cancel-bible-chat-subscription/",
    title: "How to cancel a Bible Chat subscription · Peace Be Still",
    description: "Cancel a Bible Chat subscription bought in the App Store or Google Play, with Apple's and Google's own steps. Deleting the app does not cancel it.",
    h1: "How to cancel a Bible Chat subscription on iPhone or Android",
    definition: "To cancel a Bible Chat subscription, cancel it where you paid: in your iPhone's Settings if you subscribed through the App Store, or in the Google Play app if you subscribed on Android. Deleting the app does not cancel the subscription. After you cancel, you can normally keep using what you paid for until the end of the current period.",
    quick: "iPhone: Settings › your name › Subscriptions › Bible Chat › Cancel Subscription. Android: Google Play › Payments & subscriptions › Subscriptions › Bible Chat › Cancel subscription.",
    bestFor: "anyone who subscribed to Bible Chat and wants to stop the next charge.",
    sections: [
      ["How do I cancel on an iPhone or iPad?", `<p>These are Apple's own steps (Apple Support, “Cancel a subscription from Apple”):</p>
<ol>
<li>In Settings, tap your name.</li>
<li>Tap Subscriptions.</li>
<li>Tap the subscription (Bible Chat).</li>
<li>Tap Cancel Subscription. You might need to scroll down to find it.</li>
<li>If there is no Cancel button, or you see an expiration message in red text, the subscription is already cancelled.</li>
</ol>`],
      ["How do I cancel on Android?", `<p>These are Google's own steps (Google Play Help, “Cancel, pause, or change a subscription on Google Play”):</p>
<ol>
<li>On your Android device, go to subscriptions in Google Play.</li>
<li>Select the subscription you want to cancel.</li>
<li>Tap Cancel subscription.</li>
<li>Follow the instructions.</li>
</ol>
<p>Google notes that when you uninstall the app, your subscription won't cancel.</p>`],
      ["Does deleting the app cancel the subscription?", `<p>No. The subscription is billed by Apple or Google, not by the app on your phone, so it keeps renewing until you cancel it in Settings (iPhone) or Google Play (Android).</p>`],
      ["What if I am on a free trial?", `<p>Cancel at least 24 hours before the trial ends, as Apple advises, so it does not turn into a paid plan. You can usually keep using the trial until its end date after cancelling.</p>`],
      ["Is there a Bible app with no trial?", `<p>Peace Be Still, coming soon to the App Store and Google Play, has no trial and no weekly plan: a free lane that stays free (the whole King James Bible to read and hear, one chat a day, a daily story) and a paid lane at $7.99 a month or $39.99 a year, with the price shown in dollars before you tap and a cancel link on the paid screen.</p>`],
    ],
    faq: [
      ["Why can't I find Bible Chat in my subscriptions?", "Check that you are signed in with the same Apple ID or Google account you used to subscribe. If you subscribed on the app's website instead of in the store, you need to cancel it there. A missing Cancel button on iPhone means it is already cancelled."],
      ["Will I get a refund if I cancel?", "Cancelling stops the next renewal; it does not refund the current period by itself. On iPhone you can ask Apple for a refund at reportaproblem.apple.com. On Android, Google Play's refund rules apply."],
      ["Does cancelling delete my account?", "No. Cancelling only stops future charges. Your account and anything saved in the app are separate; the app's own settings or support page explain how to delete an account."],
    ],
    sources: [["Apple Support: Cancel a subscription from Apple", "https://support.apple.com/en-us/118428"], ["Google Play Help: Cancel, pause, or change a subscription", "https://support.google.com/googleplay/answer/7018481"], ["Apple: Request a refund", "https://reportaproblem.apple.com/"]],
  },
  {
    ...D, updated: "2026-11-21", updatedText: "21 Nov 2026", lang: "en", door: "neutral", group: "Cancelling a subscription", path: "/questions/how-to-cancel-haven-subscription/",
    title: "How to cancel a Haven subscription · Peace Be Still",
    description: "Cancel a Haven subscription bought in the App Store or Google Play, with Apple's and Google's own steps, and what happens after you cancel.",
    h1: "How to cancel a Haven subscription on iPhone or Android",
    definition: "To cancel a Haven subscription, cancel it with the store that bills you: in your iPhone's Settings under Subscriptions if you paid through the App Store, or in the Google Play app if you paid on Android. Uninstalling Haven does not cancel it. Once cancelled, it stops renewing at the end of the period you have already paid for.",
    quick: "iPhone: Settings › your name › Subscriptions › Haven › Cancel Subscription. Android: Google Play › Payments & subscriptions › Subscriptions › Haven › Cancel subscription.",
    bestFor: "anyone who subscribed to Haven in the App Store or Google Play and wants to stop the next charge.",
    sections: [
      ["How do I cancel Haven on an iPhone or iPad?", `<p>Apple's own steps (Apple Support, “Cancel a subscription from Apple”):</p>
<ol>
<li>In Settings, tap your name.</li>
<li>Tap Subscriptions.</li>
<li>Tap the subscription (Haven).</li>
<li>Tap Cancel Subscription. You might need to scroll down to find it.</li>
<li>If there is no Cancel button, or you see an expiration message in red text, the subscription is already cancelled.</li>
</ol>`],
      ["How do I cancel Haven on Android?", `<p>Google's own steps (Google Play Help):</p>
<ol>
<li>On your Android device, go to subscriptions in Google Play.</li>
<li>Select the subscription you want to cancel.</li>
<li>Tap Cancel subscription.</li>
<li>Follow the instructions.</li>
</ol>
<p>Uninstalling the app does not cancel the subscription.</p>`],
      ["What happens after I cancel?", `<p>The subscription stops renewing. You can normally keep using the paid features until the end of the period you already paid for. Cancelling does not delete your account or refund the current period.</p>`],
      ["What if I paid on Haven's website?", `<p>Haven's website, havenbibleapp.com (E12 Holdings), also offers a free trial and says you can cancel any time, but it lists no cancel steps (read 21 Nov 2026). A subscription bought on the website does not show in iPhone Settings or Google Play, so cancel it on that website or contact the developer, and keep the confirmation. Haven's App Store listing says “Access to Haven requires a paid subscription” (checked 21 Nov 2026).</p>`],
      ["Can I get a refund?", `<p>For App Store purchases, you can ask Apple at reportaproblem.apple.com; Apple decides. For Google Play purchases, Google Play's refund policy applies.</p>`],
      ["What do App Store reviewers report? (Nov 2026)", `<p>Among Haven's 500 most recent US App Store reviews (16 May to 19 Nov 2026), 263 gave 4 or 5 stars and 189 gave 1 or 2. Most of the 189 mention price, the subscription or the trial; 16 mention cancelling, refunds or being charged.</p>
<p class="muted">Method: Apple's public review feed, the 500 most recent US reviews, read 21 Nov 2026; a review counts toward a theme when its words mention it. These are reviewers' reports, not findings about the app.</p>`],
      ["Is there a Bible app with no trial?", `<p>Peace Be Still, coming soon to the App Store and Google Play, has no trial and no weekly plan: a free lane that stays free and a paid lane at $7.99 a month or $39.99 a year, with the price shown in dollars before you tap and cancel in two taps from the paid screen.</p>`],
    ],
    faq: [
      ["Why don't I see Haven under Subscriptions?", "Make sure you are signed in with the Apple ID or Google account you used to subscribe. If you paid on a website rather than in the store, cancel it on that website. On iPhone, no Cancel button means it is already cancelled."],
      ["Does deleting Haven stop the charges?", "No. The App Store or Google Play bills the subscription, so it keeps renewing until you cancel it in iPhone Settings or in Google Play. Deleting the app only removes it from your phone."],
      ["When should I cancel a free trial?", "Apple advises cancelling at least 24 hours before a trial ends so it does not renew as a paid subscription. You can usually keep using the trial until its end date after cancelling."],
    ],
    sources: [["Apple Support: Cancel a subscription from Apple", "https://support.apple.com/en-us/118428"], ["Google Play Help: Cancel, pause, or change a subscription", "https://support.google.com/googleplay/answer/7018481"], ["Apple: Request a refund", "https://reportaproblem.apple.com/"], ["Haven - Bible Chat: App Store listing (US), checked 21 Nov 2026", "https://apps.apple.com/us/app/haven-bible-chat/id6503387382"]],
    notAffiliated: "Haven",
    related: ["/questions/how-to-cancel-bible-app-subscription/", "/questions/is-the-haven-bible-app-free/", "/bible-chat-cancel-subscription/", "/bible-chat-alternative/"],
  },
  // ---- Landing pages for "Bible chat" searches (owner ask 18 Nov 2026). Competitor facts only from
  // their own App Store listings, checked 18 Nov 2026; unknown = "not listed". Nominative use only.
  {
    ...D, lang: "en", door: "faith", group: "Bible apps", path: "/black-bible-chat/",
    title: "Black Bible chat: Hush Harbor in Peace Be Still · Peace Be Still",
    description: "A Black Bible chat that talks like the Black church and answers with exact King James verses. Hush Harbor is a journey in Peace Be Still, coming soon.",
    h1: "Black Bible chat: a Bible chat in a Black church voice",
    definition: "A Black Bible chat is a Bible chat app that talks the way the Black church talks: warm, plain, with the cadence of a Sunday sermon and the wisdom of the church mothers, and with verses quoted exactly. In Peace Be Still, that is the journey called Hush Harbor · Black Bible Chat &amp; Stories, coming soon to the App Store and Google Play.",
    quick: "Hush Harbor is a chat in a Black church voice that answers with King James verses pasted word for word from a stored copy, plus a daily Bible story told in that voice, with Bible stories with Black faces in the pictures. The free lane includes one chat a day of up to 10 messages and today's story.",
    bestFor: "people searching for a Black Bible chat, a Black version of Bible chat, or a Bible app that sounds like their church.",
    indexNote: "Hush Harbor: a Bible chat in a Black church voice, KJV word for word.",
    sections: [
      ["What makes a Bible chat sound like the Black church?", `<p>It is the voice more than the words. A sermon rhythm that builds and lands. A church mother's saying used once, in the right place. The old spirituals named, like “Go Down, Moses” and “Wade in the Water”. Plain grammar, never put-on spellings or slang, and never a caricature.</p>
<p>Hush Harbor is named for the hidden places in the woods where enslaved people gathered at night to pray and sing. The name honours that history; the chat itself stays humble about it.</p>`],
      ["What is inside Hush Harbor?", `<ul>
<li><strong>A Bible chat in a Black church voice.</strong> Tell it what is on your heart; it answers warmly and points you to scripture. Every answer is labelled as AI.</li>
<li><strong>Bible stories with Black faces.</strong> A daily story from the core library (Jesus calms the storm, Daniel in the lions' den, Ruth and Naomi and more) told in the Hush Harbor voice, plus Black favorites such as Hagar, the Ethiopian on the desert road, Ebed-melech and Simon of Cyrene.</li>
<li><strong>Call and response.</strong> Each story has one “say it with me” moment, like “God is good” and “all the time”, with a pause for you to answer.</li>
<li><strong>The King James Version, word for word.</strong> The AI never writes a verse from memory. It names the reference; the app pastes the stored King James text.</li>
</ul>`],
      ["Is the Black Bible chat a real pastor?", `<p>No. It is an AI helper, and it says so on every answer. It is not a pastor, a prophet or a person, and it never speaks as God or Jesus. Before your first chat, the app tells you that what you type goes to free AI providers that may learn from it, so leave out names. If you mention self-harm or abuse, the app does not send it to the AI; it shows the 988 Suicide &amp; Crisis Lifeline and other help straight away.</p>`],
      ["What does it cost?", `<p>The free lane stays free: the whole King James Bible to read and hear, today's story, one chat a day of up to 10 messages, and a daily declaration. The paid lane is $7.99 a month or $39.99 a year and adds unlimited chat (fair use 100 messages a day), chat that remembers what you are carrying, and every past story. There is no trial, no weekly plan and no ads, and you can cancel in two taps.</p>`],
      ["Is the black version of Bible chat a different Bible?", `<p>No. The Bible is the same King James Version in every journey. What changes is the voice of the chat and the stories, and the faces in the pictures. The words of scripture are never changed.</p>
${V("MAR 4:39")}`],
    ],
    faq: [
      ["Is there a Black Bible chat app?", "Peace Be Still, coming soon to the App Store and Google Play, has a journey called Hush Harbor · Black Bible Chat & Stories: a Bible chat in a Black church voice with exact King James verses, and daily Bible stories with Black faces."],
      ["Is Hush Harbor the same as the Bible Chat app?", "No. Peace Be Still is not affiliated with Bible Chat or any other app. Hush Harbor is one journey inside Peace Be Still."],
      ["Does the Black Bible chat say Jesus was Black?", "No. The Bible does not describe his skin, and the chat does not make claims of history it cannot show. The pictures show Black faces so people can see themselves in the stories."],
      ["Is Hush Harbor free?", "Yes, on the free lane: one chat a day of up to 10 messages, today's story and the whole King James Bible. The paid lane adds unlimited chat and every past story."],
    ],
    sources: [["Mark 4:39 (KJV), Bible Gateway", "https://www.biblegateway.com/passage/?search=Mark%204%3A39&version=KJV"], ["988 Suicide & Crisis Lifeline", "https://988lifeline.org/"]],
    notAffiliated: true,
  },
  {
    // Retargeted 21 Nov 2026 at "bible chat" (3,600 a month, KD 27) and "bible chat app" (1,900), same URL.
    // The verse claim stays soft (CHAT_VERSES) until the chat answer gate (PR #52) is on main.
    ...D, updated: "2026-11-21", updatedText: "21 Nov 2026", lang: "en", door: "neutral", group: "Bible apps", path: "/free-bible-chat/",
    title: "Bible chat: a free Bible chat app with no trial · Peace Be Still",
    description: "Bible chat, free for good: say what is on your heart and get an answer pointed to scripture, with the verse and its reference. No trial, no ads, one chat a day free.",
    h1: "Bible chat: talk it through, with verses you can check",
    indexLabel: "Bible chat (free)",
    indexNote: "What a Bible chat should and should not do, and what stays free.",
    definition: "A Bible chat is an app where you type what is on your heart or a question about faith, and an AI answers by pointing you to scripture. A good one shows each verse with its book, chapter and verse so you can check it, says plainly that it is AI, never speaks as God or Jesus, and does not lock the chat behind a trial.",
    quick: `Test any Bible chat with a verse you know by heart: if it gets the words wrong, do not trust it with the rest. ${CHAT_VERSES}. Its free lane, for good: one chat a day of up to 10 messages, the whole King James Bible and today's story, with no trial and no ads.`,
    bestFor: "anyone choosing a Bible chat app, and anyone who wants one that is free without a trial and honest about being AI.",
    sections: [
      ["What is a Bible chat?", `<p>It is a conversation with an AI about faith and scripture. You might ask what the Bible says about worry, how to pray for a friend, or what a hard passage means. The answer should be short, kind and rooted in named verses, and it should send you to your pastor for your own situation.</p>`],
      ["How accurate are Bible chat apps?", `<p>It varies, which is why the verse matters. YouVersion's founder and CEO, Bobby Gruenewald, said AI models misquote Scripture “at least 15% of the time,” and “Some of them as much as 60% of the time” (reported by <a rel="nofollow noopener" href="https://www.crosswalk.com/headlines/contributors/guest-commentary/ais-bible-misquotes-scripture-according-to-youversion-ceo.html">Crosswalk</a>, 18 Mar 2026). Those are his figures, not a test we ran.</p>
<p>So ask any Bible chat for a verse you know well, and compare it with your own Bible. The words should match a named translation, and the reference should be one that exists.</p>
${V("PRO 30:5-6")}`],
      ["What should a Bible chat never do?", `<ul>
<li><strong>Make up a verse or a reference.</strong> If a chat cites a verse, you should be able to find it.</li>
<li><strong>Speak as God or Jesus.</strong> “I am the Lord” from an app is not prayer. Peace Be Still's chat labels every answer as AI and never speaks as God or Jesus.</li>
<li><strong>Dodge what Scripture plainly says.</strong> Where faithful churches genuinely differ, it should say so briefly; elsewhere it should answer from the plain words.</li>
<li><strong>Promise money, healing or a result.</strong> It can pray with you and point you to scripture; it cannot promise outcomes.</li>
<li><strong>Hide where your words go.</strong> Before your first free chat, Peace Be Still says it goes to a free AI service that may keep and use it, so leave out names.</li>
</ul>`],
      ["What does Bible chat include free in Peace Be Still?", `<table class="t"><thead><tr><th>Free lane, forever</th><th>Paid lane ($7.99 a month or $39.99 a year)</th></tr></thead><tbody>
<tr><td>One chat a day, up to 10 messages, shown as “N of 10 messages left today”</td><td>Unlimited chat (fair use: 100 messages a day)</td></tr>
<tr><td>The whole King James Bible to read, and a growing set of chapters read aloud</td><td>Chat that remembers what you are carrying</td></tr>
<tr><td>Today's Bible story</td><td>Every past story and longer journeys</td></tr>
<tr><td>Your first sleep night free, then one a week</td><td>A sleep session every night, plus ones made for you</td></tr>
<tr><td>A daily declaration, basic 7-day plans, saved verses, journal, streak and share cards</td><td>Declaration topics and offline downloads</td></tr>
</tbody></table>
<p>There is no trial at all: the free lane does not end, and the paid lane starts only when you choose it, with the price in dollars shown before you tap. No ads on either lane.</p>`],
      ["Is there a Bible chat in a Black church voice or in Spanish?", `<p>Yes, both at launch. <a href="/black-bible-chat/">Hush Harbor · Black Bible Chat &amp; Stories</a> answers in a Black church voice, and <a href="/es/chat-biblico-gratis/">Mi Refugio</a> is the whole chat in Spanish with the Reina-Valera 1909. The Bible text is the same; only the voice changes.</p>`],
      ["Is Peace Be Still out yet?", `<p>Not yet. It is coming soon to the App Store and Google Play: search “Peace Be Still”. There is no waitlist and no launch date to wait for.</p>`],
    ],
    faq: [
      ["Is there a Bible chat app that is free without a subscription?", "Yes. Peace Be Still, coming soon, has a free lane with one chat a day of up to 10 messages, the whole King James Bible and today's story, with no subscription, no trial and no ads."],
      ["Is this the Bible Chat app?", "No. Bible Chat: Daily Devotional is a separate app by Book Vitals Inc. Peace Be Still is not affiliated with it. See how they compare on our Bible chat alternative page."],
      ["Does the Bible chat pretend to be Jesus?", "No. Every answer is labelled as AI, and it never speaks as God or Jesus. It points you to scripture and suggests your pastor for your own situation."],
      ["How many messages are free each day?", "One conversation a day of up to 10 messages. The app shows how many are left, and the count starts again the next day. Nothing free is ever taken back."],
    ],
    sources: [["Crosswalk: AI's Bible misquotes, according to YouVersion's CEO (18 Mar 2026)", "https://www.crosswalk.com/headlines/contributors/guest-commentary/ais-bible-misquotes-scripture-according-to-youversion-ceo.html"], ["Christian Post: AI's Bible misquotes range from 15% to 60%, YouVersion CEO", "https://www.christianpost.com/news/ais-bible-misquotes-range-from-15-to-60-youversion-ceo.html"], KJV_SRC],
    notAffiliated: true,
    related: ["/bible-chat-alternative/", "/black-bible-chat/", "/christian-ai/", "/kjv-bible-app/"],
    alt: "/es/chat-biblico-gratis/",
  },
  {
    ...D, updated: "2026-11-21", updatedText: "21 Nov 2026", lang: "en", door: "neutral", group: "Bible apps compared", path: "/bible-chat-alternative/",
    title: "Bible chat alternative: what to compare before you pay · Peace Be Still",
    description: "What to check in any Bible chat app (price, trial, weekly plans, ads, renewal, verse accuracy) and a sourced comparison of four apps, checked 18 Nov 2026.",
    h1: "Looking for a Bible chat alternative? What to compare first",
    definition: "A Bible chat alternative is another app you can switch to when the one you use costs too much, starts with a trial you did not want, or gets scripture wrong. Before switching, compare five things: the price in dollars, whether there is a trial, whether there is a weekly plan, whether there are ads, and whether the verses come from a real stored Bible.",
    quick: "Check the In-App Purchases list on the App Store page (it shows every price), read the description for the words “free trial” and “weekly”, and ask the chat for a verse you know by heart to see if it quotes it exactly.",
    bestFor: "people comparing Bible chat apps on price, trial and accuracy before they pay.",
    indexNote: "Five things to compare, and a sourced table of four apps.",
    sections: [
      ["What should I look for in a Bible chat app?", `<ol>
<li><strong>The price in dollars.</strong> On iPhone, scroll to “In-App Purchases” on the App Store page. It lists every price the app can charge.</li>
<li><strong>A trial.</strong> A free trial usually becomes a paid plan unless you cancel at least 24 hours before it ends.</li>
<li><strong>A weekly plan.</strong> Weekly plans add up: $4.99 a week is about $259 a year.</li>
<li><strong>Ads.</strong> Check the description and the app's privacy label.</li>
<li><strong>Scripture accuracy.</strong> Ask for a verse you know. A good app quotes it word for word from a named translation.</li>
</ol>`],
      ["How do Bible chat apps compare?", `<p>Facts below come only from each app's own App Store page (United States) as it read on 18 Nov 2026. Prices change; check the listing before you pay. “Not listed” means the listing does not say.</p>
<table class="t"><thead><tr><th>App</th><th>Prices listed</th><th>Free trial</th><th>Weekly plan</th><th>Source</th></tr></thead><tbody>
<tr><td>Peace Be Still (coming soon)</td><td>$7.99 a month or $39.99 a year</td><td>No trial</td><td>No</td><td>This site, checked 18 Nov 2026</td></tr>
<tr><td>Bible Chat: Daily Devotional (Book Vitals Inc.)</td><td>Weekly $2.99 to $6.99; monthly $4.99 and $12.99; yearly $39.99 and $59.99</td><td>The description says “Start with a FREE 7-day trial” (re-checked 21 Nov 2026)</td><td>Yes: “our weekly plan at $4.99” (description, 21 Nov 2026)</td><td><a class="src" rel="nofollow noopener" href="https://apps.apple.com/us/app/bible-chat-daily-devotional/id6448849666">App Store listing</a>, checked 18 Nov 2026</td></tr>
<tr><td>Haven - Bible Chat (E12 Holdings LLC)</td><td>“Unlimited” purchases from $4.99 to $19.99; billing periods not listed. The description says “Access to Haven requires a paid subscription” (21 Nov 2026)</td><td>Not on the listing; its website offers a free trial to eligible new users (havenbibleapp.com, read 21 Nov 2026)</td><td>Not listed</td><td><a class="src" rel="nofollow noopener" href="https://apps.apple.com/us/app/haven-bible-chat/id6503387382">App Store listing</a>, checked 18 Nov 2026</td></tr>
<tr><td>Creed: Bible Chat &amp; Companion (Lemon Tree Labs, Inc.)</td><td>From $9.99 to $69.99, including “Annual - Discounted” at $34.99 and $44.99</td><td>Not listed</td><td>Not listed</td><td><a class="src" rel="nofollow noopener" href="https://apps.apple.com/us/app/creed-bible-chat-companion/id6747326744">App Store listing</a>, checked 18 Nov 2026</td></tr>
</tbody></table>
<p class="muted">Peace Be Still is not affiliated with Bible Chat, Haven, Creed or any app named here. Names are used only to identify the apps.</p>`],
      ["What do App Store reviewers report? (Nov 2026)", `<ul>
<li><strong>Bible Chat</strong> (500 most recent US reviews, 10 to 20 Nov 2026): 477 gave 4 or 5 stars and 19 gave 1 or 2. Most of the 19 mention price, the weekly plan or the trial.</li>
<li><strong>Haven - Bible Chat</strong> (16 May to 19 Nov 2026): 263 gave 4 or 5 stars and 189 gave 1 or 2. Most of the 189 mention price, the subscription or the trial, and many say there is no free version.</li>
</ul>
<p class="muted">Method: Apple's public review feed, the 500 most recent US reviews of each app, read 21 Nov 2026; a review counts toward a theme when its words mention it. These are reviewers' reports, not findings about the apps.</p>`],
      ["What does Peace Be Still do differently?", `<ul>
<li>No trial and no weekly plan: $7.99 a month or $39.99 a year, the price in dollars before you tap.</li>
<li>A free lane that stays free: one chat a day of up to 10 messages, the whole King James Bible and today's story.</li>
<li>No ads, ever.</li>
<li>Verses pasted from a stored King James Version (Reina-Valera 1909 in Spanish); the AI never writes a verse.</li>
<li>Cancel in two taps, from a link on the paid screen.</li>
</ul>`],
      ["How do I switch without paying twice?", `<p>Cancel the old subscription first, in iPhone Settings › your name › Subscriptions, or in Google Play › Payments &amp; subscriptions. Deleting an app does not cancel it. See <a href="/bible-chat-cancel-subscription/">how to cancel a Bible chat subscription</a>, or <a href="/questions/how-to-cancel-bible-app-subscription/">step-by-step cancel instructions for seven apps</a>.</p>`],
    ],
    faq: [
      ["What is the best Bible chat alternative?", "The one that fits your budget and quotes scripture exactly. Compare the In-App Purchases list, look for a trial or weekly plan, and test a verse you know. Peace Be Still, coming soon, has no trial, no weekly plan, no ads and a free lane."],
      ["Is there a Bible chat with no weekly plan?", "Peace Be Still, coming soon, has no weekly plan: $7.99 a month or $39.99 a year, or the free lane."],
      ["Is Peace Be Still part of Bible Chat?", "No. Peace Be Still is not affiliated with Bible Chat or any app named on this page."],
    ],
    sources: [["Apple Support: Cancel a subscription from Apple", "https://support.apple.com/en-us/118428"], ["Google Play Help: Cancel, pause, or change a subscription", "https://support.google.com/googleplay/answer/7018481"]],
    notAffiliated: true,
    related: ["/free-bible-chat/", "/questions/how-to-cancel-bible-app-subscription/", "/questions/haven-bible-chat/", "/christian-ai/"],
  },
  {
    ...D, updated: "2026-11-21", updatedText: "21 Nov 2026", lang: "en", door: "neutral", group: "Cancelling a subscription", path: "/bible-chat-cancel-subscription/",
    title: "Bible chat cancel subscription: iPhone and Android steps · Peace Be Still",
    description: "Cancel any Bible chat app's subscription on iPhone or Android with Apple's and Google's own steps, and how to ask for a refund. Deleting the app does not cancel.",
    h1: "How to cancel a Bible chat subscription, and ask for a refund",
    definition: "To cancel a Bible chat subscription, cancel it with the store that bills you: in iPhone Settings if you paid through the App Store, or in the Google Play app if you paid on Android. Deleting the app does not cancel it. To ask for money back, Apple uses reportaproblem.apple.com and Google Play has its own refund request.",
    quick: "iPhone: Settings › your name › Subscriptions › the app › Cancel Subscription. Android: Google Play › profile icon › Payments &amp; subscriptions › Subscriptions › the app › Cancel subscription. Refunds: reportaproblem.apple.com (Apple) or Google Play's refund request.",
    bestFor: "anyone who wants to stop a Bible chat app from charging again, on any app.",
    indexNote: "Apple and Google steps for any Bible chat app, and the refund routes.",
    sections: [
      ["How do I cancel a Bible chat subscription on iPhone?", `<p>Apple's steps (Apple Support, “Cancel a subscription from Apple”):</p>
<ol>
<li>Open the Settings app.</li>
<li>Tap your name.</li>
<li>Tap Subscriptions.</li>
<li>Tap the Bible chat app's subscription.</li>
<li>Tap Cancel Subscription. If there is no Cancel button, it is already cancelled.</li>
</ol>`],
      ["How do I cancel on Android?", `<p>Google's steps (Google Play Help, “Cancel, pause, or change a subscription”):</p>
<ol>
<li>Open the Google Play Store app.</li>
<li>Tap your profile icon, then Payments &amp; subscriptions, then Subscriptions.</li>
<li>Choose the Bible chat app's subscription.</li>
<li>Tap Cancel subscription and follow the steps.</li>
</ol>`],
      ["Can I get a refund?", `<p>On iPhone, go to <a href="https://reportaproblem.apple.com/">reportaproblem.apple.com</a>, sign in, choose “Request a refund”, pick the reason and the purchase. Apple decides each request. On Android, Google Play's refund policy explains when you can ask Google for a refund and when you need to ask the app's developer. If you paid on the app's own website, ask the developer.</p>`],
      ["What if I am still in a free trial?", `<p>Cancel at least 24 hours before the trial ends, as Apple advises, so it does not turn into a paid plan. You can usually keep using it until the trial's end date.</p>`],
      ["What if I was charged after I cancelled?", `<p>Some App Store reviewers in 2026 report a charge after they believed they had cancelled, across several Bible and prayer apps. The usual reasons are cancelling in the wrong place (deleting the app, or cancelling on a website when Apple bills you), a second Apple ID or Google account, or a trial cancelled under 24 hours before it ended. Check each place you could be billed, keep a screenshot of the red expiry date, then use the refund routes above. Each app's own steps, from its help page, are on <a href="/questions/how-to-cancel-bible-app-subscription/">how to cancel a Bible app subscription (7 apps)</a>.</p>`],
      ["Is there a Bible chat with nothing to cancel?", `<p>Peace Be Still has no trial and a free lane, so there is nothing to cancel to keep reading. The free lane holds the whole King James Bible, one chat a day of up to 10 messages and today's story. The paid lane is $7.99 a month or $39.99 a year, chosen on purpose, and cancels in two taps. It is coming soon to the App Store and Google Play. See <a href="/free-bible-chat/">what stays free</a>.</p>`],
    ],
    faq: [
      ["Does deleting a Bible chat app cancel the subscription?", "No. The App Store or Google Play bills it, so it keeps renewing until you cancel in iPhone Settings or Google Play."],
      ["Why can't I find the subscription?", "Check you are signed in with the Apple ID or Google account you used. If you paid on a website, cancel it there. On iPhone, no Cancel button means it is already cancelled."],
      ["Will I lose access straight away?", "Usually not. After you cancel, you can normally use the subscription until the end of the period you already paid for."],
      ["Is Peace Be Still the Bible Chat app?", "No. Peace Be Still is not affiliated with Bible Chat or any app named here."],
    ],
    sources: [["Apple Support: Cancel a subscription from Apple", "https://support.apple.com/en-us/118428"], ["Apple: Report a problem, request a refund", "https://reportaproblem.apple.com/"], ["Google Play Help: Cancel, pause, or change a subscription", "https://support.google.com/googleplay/answer/7018481"], ["Google Play Help: Google Play refund policies", "https://support.google.com/googleplay/answer/2479637"]],
    notAffiliated: true,
    related: ["/questions/how-to-cancel-bible-app-subscription/", "/questions/how-to-cancel-bible-chat-subscription/", "/questions/how-to-cancel-haven-subscription/", "/bible-chat-alternative/"],
  },
  {
    ...DES, lang: "es", door: "neutral", group: "Chat bíblico", path: "/es/chat-biblico-gratis/",
    title: "Chat bíblico gratis: lo que siempre es gratis en Peace Be Still · Peace Be Still",
    description: "Qué incluye gratis para siempre Peace Be Still: un chat al día, la Biblia completa en Reina-Valera 1909, sin anuncios y sin prueba gratuita.",
    h1: "Chat bíblico gratis: qué es gratis de verdad, y por cuánto tiempo",
    definition: "Un chat bíblico gratis es una app donde puedes hacer preguntas sobre la fe y la Biblia sin pagar. Muchas apps dicen ser gratis, pero cierran el chat detrás de una prueba que después cobra cada semana o cada año. En Peace Be Still, que llega muy pronto, el camino gratis es gratis para siempre: un chat al día de hasta 10 mensajes, sin prueba, sin anuncios y sin tarjeta.",
    quick: "Gratis para siempre: la Biblia completa para leer, la historia bíblica del día, un chat al día de hasta 10 mensajes, tu primera noche para dormir y después una por semana, una declaración diaria, planes básicos de 7 días, versículos guardados, diario y tarjetas para compartir. Lo gratis nunca se quita.",
    bestFor: "quien busca un chat bíblico en español que sea gratis sin prueba, y quiere saber dónde termina lo gratis.",
    indexNote: "Lo que es gratis para siempre y lo que agrega el plan pagado.",
    sections: [
      ["¿Qué incluye gratis Mi Refugio?", `<table class="t"><thead><tr><th>Gratis, para siempre</th><th>Plan pagado ($7.99 al mes o $39.99 al año)</th></tr></thead><tbody>
<tr><td>Un chat al día, hasta 10 mensajes</td><td>Chat sin límite (uso justo: 100 mensajes al día)</td></tr>
<tr><td>La Biblia completa en la Reina-Valera 1909, para leer</td><td>Un chat que recuerda lo que estás cargando</td></tr>
<tr><td>La historia bíblica del día</td><td>Todas las historias anteriores y caminos más largos</td></tr>
<tr><td>Tu primera noche para dormir, después una por semana</td><td>Una sesión para dormir cada noche</td></tr>
<tr><td>Una declaración diaria, planes de 7 días, versículos guardados, diario y tarjetas</td><td>Temas de declaraciones y descargas sin conexión</td></tr>
</tbody></table>`],
      ["¿Hay prueba gratuita?", `<p>No. Peace Be Still no tiene prueba, así que nada se convierte en un cobro por sorpresa. Lo gratis no es una prueba: no se acaba. El plan pagado empieza solo cuando tú lo eliges, con el precio en dólares a la vista antes de tocar.</p>`],
      ["¿Hay anuncios?", `<p>No. Peace Be Still no tiene anuncios, ni en lo gratis ni en lo pagado, nunca.</p>`],
      ["¿Qué Biblia usa?", `<p>Mi Refugio usa la Reina-Valera 1909, palabra por palabra, con libro, capítulo y versículo. La inteligencia artificial nunca escribe un versículo de memoria: solo nombra la cita, y la app pega el texto guardado.</p>
${V("PSA 91:2", "es")}`],
    ],
    faq: [
      ["¿Hay un chat bíblico gratis en español?", "Sí. Mi Refugio, el camino en español de Peace Be Still, que llega muy pronto, tiene un chat gratis al día de hasta 10 mensajes, con la Reina-Valera 1909, sin suscripción, sin prueba y sin anuncios."],
      ["¿Cuántos mensajes son gratis cada día?", "Una conversación al día de hasta 10 mensajes. La app te muestra cuántos te quedan, y al día siguiente empieza de nuevo."],
      ["¿Lo gratis va a ser menos después?", "No. Lo gratis nunca se quita. Esa promesa está en la pantalla de precios."],
    ],
    sources: [["Reina-Valera 1909, eBible.org", "https://ebible.org/find/details.php?id=spaRV1909"]],
    notAffiliated: true,
    alt: "/free-bible-chat/",
  },
  ...SLEEP,
  ...BLACK,
  ...APPS,
  ...ES,
  ...KO,
  ...AFRICA,
  ...SEARCH,
];
