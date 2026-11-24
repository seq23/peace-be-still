// App pages: other apps' names + a modifier (nominative use only; facts only from each app's own US
// App Store listing, linked, "checked 18 Nov 2026"; no logos; the not-affiliated line), and the
// "best ... app" landing pages. Owner 18 Nov 2026: Peace Be Still is our pick, with provable facts and
// the disclosure line; no ratings, user counts or testimonials for Peace Be Still (it is new; none are quoted).
import { D, V, Q, F, bg, PICK_EN, CHECKED } from "./blitz-common.mjs";

const G = "Bible apps compared";
const L = {
  hallow: "https://apps.apple.com/us/app/hallow-prayer-meditation/id1405323394",
  glorify: "https://apps.apple.com/us/app/glorify-devotional-prayer/id1490587079",
  duomo: "https://apps.apple.com/us/app/duomo-daily-prayer-bible/id6736357076",
  creed: "https://apps.apple.com/us/app/creed-bible-chat-companion/id6747326744",
  haven: "https://apps.apple.com/us/app/haven-bible-chat/id6503387382",
  haven2: "https://apps.apple.com/us/app/haven-bible-chat/id6547854713",
};
const src = (k, name) => [`${name}: App Store listing (US), checked ${CHECKED}`, L[k]];
const a = (k, text = "App Store listing") => `<a class="src" rel="nofollow noopener" href="${L[k]}">${text}</a>`;
const APPLE_CANCEL = ["Apple Support: Cancel a subscription from Apple", "https://support.apple.com/en-us/118428"];
const PLAY_CANCEL = ["Google Play Help: Cancel, pause, or change a subscription", "https://support.google.com/googleplay/answer/7018481"];
const PBS_ROW = `<tr><td>Peace Be Still</td><td>$7.99 a month or $39.99 a year</td><td>No trial</td><td>Free version forever: whole KJV to read, a growing set of chapters read aloud, today's story, 1 chat a day (5 messages), first sleep night then 1 a week, daily declaration</td><td>This site</td></tr>`;
const HEAD = `<table class="t"><thead><tr><th>App</th><th>Prices listed</th><th>Trial</th><th>What is free</th><th>Source</th></tr></thead><tbody>`;
const CANCEL_STEPS = `<ol>
<li>iPhone: Settings › your name › Subscriptions › the app › Cancel Subscription.</li>
<li>Android: Google Play › profile icon › Payments &amp; subscriptions › Subscriptions › the app › Cancel subscription.</li>
<li>Deleting the app does not cancel it. See <a href="/bible-chat-cancel-subscription/">the full steps and refunds</a>, or <a href="/questions/how-to-cancel-bible-app-subscription/">cancel steps for seven Bible and prayer apps</a>.</li>
</ol>`;
// 21 Nov 2026 refresh: what recent App Store reviewers report, with the method (gripe-leverage.md).
// Reviewers' words are claims, never our findings; counts only with the window and the method.
const D21 = { updated: "2026-11-21", updatedText: "21 Nov 2026" };
const READ = "21 Nov 2026";
const METHOD = "Method: Apple's public review feed, the 500 most recent US reviews, read 21 Nov 2026; a review counts toward a theme when its words mention it. These are reviewers' reports, not findings about the app.";
const HALLOW_REVIEWS = ["What App Store reviewers report (Nov 2026)", `<p>Among Hallow's 500 most recent US App Store reviews (24 Mar to 18 Nov 2026), 370 gave 4 or 5 stars and 103 gave 1 or 2. About half of those 103 (51) mention cancelling, refunds or being charged, most often a charge after a trial, or after the reviewer believed they had cancelled. Some low ratings object to paying for prayer at all.</p>
<p>Hallow's own help page says to cancel where you subscribed (Apple, Google Play, Amazon or Hallow.com) and shows how to check which in the app: <a href="/questions/how-to-cancel-bible-app-subscription/">the steps are here</a>.</p>
<p class="muted">${METHOD}</p>`];

export const APPS = [
  {
    ...D, ...D21, lang: "en", door: "neutral", group: G, path: "/questions/hallow-app-cost/",
    title: "Hallow app cost: monthly and yearly prices, checked · Peace Be Still",
    description: "How much Hallow costs on the US App Store: $9.99 a month or $69.99 a year per its listing, what is free, the yearly maths, and lower-cost options. Checked 18 Nov 2026.",
    h1: "How much does Hallow cost? The prices on its App Store listing",
    indexLabel: "Hallow app cost",
    indexNote: "$9.99 a month or $69.99 a year per the listing, and what is free.",
    definition: "Hallow costs $9.99 a month or $69.99 a year in the United States, according to the subscription terms in its own App Store description (checked 18 Nov 2026, and again 21 Nov 2026). Its In-App Purchases list also shows a $10.99 monthly price. Hallow's daily prayers, including the rosary, and its 9-day Intro Prayer Challenge are free.",
    quick: "Hallow: $9.99 a month or $69.99 a year (listing, US). Over a year, monthly billing comes to $119.88, so the yearly plan saves $49.89. For comparison, Peace Be Still ({{stores.short}}) is $7.99 a month or $39.99 a year, with no trial and a free version that stays free.",
    bestFor: "people deciding whether to pay for Hallow, and anyone wanting a lower yearly price.",
    pick: PICK_EN("For a lower yearly price and a free version that stays free, our pick is Peace Be Still: $39.99 a year against Hallow's listed $69.99."),
    sections: [
      ["What Hallow's listing says it costs", `${HEAD}
<tr><td>Hallow: Prayer &amp; Meditation (Hallow, Inc.)</td><td>$9.99 a month or $69.99 a year (description); In-App Purchases also list $10.99 monthly</td><td>Not stated in the description</td><td>Daily prayers (including the rosary) and the 9-day Intro Prayer Challenge</td><td>${a("hallow")}, checked ${CHECKED}</td></tr>
${PBS_ROW}
</tbody></table>
<p class="muted">Prices are for the United States and change. Check the listing before you pay.</p>`],
      ["Monthly or yearly: the maths", `<table class="t"><thead><tr><th>Plan</th><th>One year</th><th>Two years</th></tr></thead><tbody>
<tr><td>Hallow monthly ($9.99)</td><td>$119.88</td><td>$239.76</td></tr>
<tr><td>Hallow yearly ($69.99)</td><td>$69.99</td><td>$139.98</td></tr>
<tr><td>Peace Be Still yearly ($39.99)</td><td>$39.99</td><td>$79.98</td></tr>
</tbody></table>`],
      ["Is there a Bible app with no free trial?", `<p>Peace Be Still has no trial at all, so nothing turns into a charge by surprise. Its paid plan starts only when you choose it, with the price in dollars shown before you tap.</p>`],
      ["Which Bible apps are free with no ads?", `<p>Peace Be Still has no ads, free or paid. Its free version holds the whole King James Bible to read and hear, today's story, one chat a day of up to 5 messages, the first sleep night and then one a week, and a daily declaration. Nothing free is ever taken back.</p>`],
      ["How do I cancel a subscription on iPhone?", CANCEL_STEPS],
      HALLOW_REVIEWS,
      ["Is it worth paying for a prayer app?", `<p>It is worth it if you use it most days and the free part does not cover what you need. Use the free part for two weeks first. Then ask: did I open it daily, and would I pay for a book or a class that did the same? Hallow is a Catholic app with thousands of guided sessions; if that fits your church, its free prayers are a good test.</p>`],
    ],
    faq: [
      ["How much is Hallow per month?", "Hallow's App Store description lists $9.99 a month in the United States (checked 18 Nov 2026). Its In-App Purchases list also shows a $10.99 monthly option."],
      ["How much is Hallow per year?", "$69.99 a year, per the subscription terms in its App Store description (US, checked 18 Nov 2026)."],
      ["Is there a cheaper alternative to Hallow?", "Peace Be Still, {{stores.short}}, is $7.99 a month or $39.99 a year with a free version that stays free. It is a different kind of app: King James Bible, whispered psalms and a Bible chat, not a Catholic guided-prayer library."],
      ["Is Peace Be Still part of Hallow?", "No. Peace Be Still is not affiliated with Hallow or any app named here."],
    ],
    sources: [src("hallow", "Hallow: Prayer & Meditation"), APPLE_CANCEL],
    notAffiliated: "Hallow",
    related: ["/questions/is-hallow-app-free/", "/questions/hallow-app-review/", "/questions/is-hallow-only-for-catholics/", "/questions/how-to-cancel-bible-app-subscription/"],
  },
  {
    ...D, ...D21, lang: "en", door: "neutral", group: G, path: "/questions/hallow-app-review/",
    title: "Hallow app review: who it is for, from its own listing · Peace Be Still",
    description: "A fact-only look at Hallow: what its listing says it offers, who it suits (Catholic guided prayer), its price and rating as listed, and what to weigh before you pay.",
    h1: "Hallow app review: who it suits, and what to weigh before paying",
    indexLabel: "Hallow app review",
    indexNote: "What the listing offers, who it suits, and what to weigh.",
    definition: "Hallow is a Catholic prayer and meditation app with audio-guided sessions: the rosary, Lectio Divina, the Examen, Night Prayer, chant and Bible stories read by guests. Its App Store listing shows 4.9 out of 5 from 384,119 ratings (checked 21 Nov 2026). It suits Catholics who want guided audio prayer and will use it often enough to pay $69.99 a year.",
    quick: "If you are Catholic and want guided audio prayer with many voices, Hallow's own description shows that is its focus. If you want the King James Bible, whispered psalms for sleep or a Bible chat with no trial, look at Peace Be Still, {{stores.short}}, at $39.99 a year.",
    bestFor: "people reading reviews before paying for Hallow.",
    pick: PICK_EN("If you want the King James Bible, whispered psalms and a Bible chat for less, our pick is Peace Be Still."),
    sections: [
      ["What does Hallow offer, according to its listing?", `<ul>
<li>Over 10,000 sessions on contemplative prayer, meditation, Catholic Bible readings and music.</li>
<li>Daily prayers including Lectio Divina, the Rosary and the Divine Mercy Chaplet.</li>
<li>Night Prayer and Catholic Bible stories for sleep.</li>
<li>Choice of 50+ guides; sessions in 5, 10 or 15 minute lengths; offline downloads.</li>
<li>Seasonal challenges such as Pray40 for Lent and Pray25 for Advent.</li>
</ul>
<p class="muted">All from Hallow's ${a("hallow")}, checked ${CHECKED}.</p>`],
      ["The listing at a glance", `<table class="t"><thead><tr><th></th><th>Hallow</th><th>Peace Be Still</th></tr></thead><tbody>
<tr><td>Tradition</td><td>Catholic; “meant as a resource for people of all faiths”</td><td>Christian, King James Version; Reina-Valera 1909 in Spanish</td></tr>
<tr><td>Price</td><td>$9.99 a month or $69.99 a year</td><td>$7.99 a month or $39.99 a year</td></tr>
<tr><td>Free</td><td>Daily prayers and the 9-day Intro Prayer Challenge</td><td>Whole KJV to read, a growing set of chapters read aloud, today's story, 1 chat a day, first sleep night then 1 a week, daily declaration</td></tr>
<tr><td>Rating shown</td><td>4.9 out of 5, 384,119 ratings (checked 21 Nov 2026)</td><td>None quoted here: the app is new</td></tr>
<tr><td>Source</td><td>${a("hallow")}, ${CHECKED}</td><td>This site</td></tr>
</tbody></table>`],
      HALLOW_REVIEWS,
      ["Is Hallow only for Catholics?", `<p>Hallow's own help page answers “No”: it welcomes people from every faith background, while its content is Catholic and reviewed by Church leaders. See <a href="/questions/is-hallow-only-for-catholics/">is Hallow only for Catholics?</a></p>`],
      ["Is it worth paying for a prayer app?", `<p>Pay when the free part has become a habit and the paid part adds something you will use weekly. A review score tells you other people liked it; your own two weeks on the free part tell you whether you will.</p>`],
      ["Is there a Bible app with no free trial?", `<p>Peace Be Still has no trial and no weekly plan. The free version is not a trial; it does not end.</p>`],
      ["How do I cancel an App Store subscription?", CANCEL_STEPS],
    ],
    faq: [
      ["Is Hallow a Catholic app?", "Yes. Its App Store description calls it a Catholic app whose content is based on the approved Catholic Bible and reviewed by Church leaders, while saying it is meant for people of all faiths."],
      ["What is Hallow's rating?", "4.9 out of 5 from 384,119 ratings on the US App Store, checked 21 Nov 2026. Ratings change daily."],
      ["Does Hallow have sleep content?", "Its listing names Night Prayer from the Liturgy of the Hours and Catholic Bible stories for sleep. Peace Be Still's Psalm Nights are whispered King James psalms with a sleep timer."],
    ],
    sources: [src("hallow", "Hallow: Prayer & Meditation"), APPLE_CANCEL],
    notAffiliated: "Hallow",
    related: ["/questions/hallow-app-cost/", "/questions/is-hallow-app-free/", "/questions/is-hallow-only-for-catholics/", "/questions/how-to-cancel-bible-app-subscription/"],
  },
  {
    ...D, ...D21, lang: "en", door: "neutral", group: G, path: "/questions/is-hallow-app-free/",
    title: "Is Hallow free? What you get without paying · Peace Be Still",
    description: "Is Hallow free? Its listing says daily prayers (including the rosary) and the 9-day Intro Prayer Challenge are free; the rest needs a subscription. Checked 18 Nov 2026.",
    h1: "Is Hallow free? What you can use without paying",
    indexLabel: "Is Hallow free?",
    indexNote: "Daily prayers and the 9-day challenge are free; the rest is paid.",
    definition: "Hallow is free to download, and part of it is free to use. Its App Store description says users can access the daily prayers, including the rosary, and the 9-day Intro Prayer Challenge for free. The full app needs a subscription of $9.99 a month or $69.99 a year in the United States (checked 18 Nov 2026).",
    quick: "Free in Hallow, per its listing: daily prayers (including the rosary) and the 9-day Intro Prayer Challenge. Paid: the full library. Free in Peace Be Still, {{stores.short}}: the whole King James Bible to read and hear, today's story, one chat a day, and more, for good.",
    bestFor: "people who want to pray with Hallow without a subscription, or want a bigger free version.",
    pick: PICK_EN("If you want the most you can use free, for good, our pick is Peace Be Still."),
    sections: [
      ["What is free in Hallow?", `<p>Hallow's own description: “Users can access our daily prayers (including the rosary) and the 9-day Intro Prayer Challenge for free. To access the full suite of Hallow, Hallow offers two auto-renewing subscription options: $9.99 per month, $69.99 per year.” Source: ${a("hallow")}, checked ${CHECKED} and again ${READ}.</p>`],
      ["Free parts side by side", `${HEAD}
<tr><td>Hallow (Hallow, Inc.)</td><td>$9.99 a month or $69.99 a year</td><td>Not stated in the description</td><td>Daily prayers (including the rosary), 9-day Intro Prayer Challenge</td><td>${a("hallow")}, ${CHECKED}</td></tr>
${PBS_ROW}
</tbody></table>`],
      ["Which Bible apps are free with no ads?", `<p>Peace Be Still has no ads, on the free or the paid. Many Bible reading apps are free; check whether chat, audio or sleep content sits behind a paywall, and whether a “free trial” turns into a charge.</p>`],
      HALLOW_REVIEWS,
      ["Is there a Bible app with no free trial?", `<p>Peace Be Still has no trial. You either use the free version, which does not end, or choose the paid plan at $7.99 a month or $39.99 a year.</p>`],
      ["How do I cancel a subscription on iPhone?", CANCEL_STEPS],
    ],
    faq: [
      ["Can I use Hallow for free?", "Yes, in part. Its App Store description says the daily prayers, including the rosary, and the 9-day Intro Prayer Challenge are free. The full library needs a subscription."],
      ["Does Hallow have a free trial?", "Its App Store description does not mention one (checked 18 Nov 2026). The price screen inside the app is the place to check before you tap."],
      ["What is free forever in Peace Be Still?", "The whole King James Bible to read, a growing set of chapters read aloud, today's story, one chat a day of up to 5 messages, your first sleep night and then one a week, a daily declaration, basic 7-day plans, saved verses, a journal and share cards."],
    ],
    sources: [src("hallow", "Hallow: Prayer & Meditation"), APPLE_CANCEL, PLAY_CANCEL],
    notAffiliated: "Hallow",
    related: ["/questions/hallow-app-cost/", "/questions/hallow-app-review/", "/questions/is-hallow-only-for-catholics/", "/questions/how-to-cancel-bible-app-subscription/"],
  },
  {
    ...D, lang: "en", door: "neutral", group: G, path: "/questions/is-creed-bible-app-free/",
    title: "Is the Creed Bible app free? What its listing says · Peace Be Still",
    description: "Is Creed: Bible Chat & Companion free? Its listing says free users get limited AI chat and voice; unlimited needs a subscription ($9.99 to $69.99 listed). Checked 18 Nov 2026.",
    h1: "Is the Creed Bible app free?",
    indexLabel: "Is the Creed Bible app free?",
    indexNote: "Limited free chat; subscriptions from $9.99 to $69.99 listed.",
    definition: "Creed: Bible Chat & Companion is free to download with limited use. Its App Store description says free users get limited access to AI chat and voice features and need a subscription for unlimited access. Its In-App Purchases list prices from $9.99 to $69.99, including “Annual - Discounted” at $34.99 and $44.99 (US, checked 18 Nov 2026).",
    quick: "Creed: limited free chat, then a subscription (listed from $9.99 to $69.99). Peace Be Still, {{stores.short}}: one chat a day of up to 5 messages free for good, with every verse pasted from a stored King James Bible.",
    bestFor: "people trying Creed who want to know where free ends.",
    pick: PICK_EN("For a Bible chat whose free part is spelled out and stays free, our pick is Peace Be Still."),
    sections: [
      ["What does Creed's listing say about free use?", `<p>From Creed's description: “Free users get limited access to AI Chat and Voice features, and require a subscription for unlimited access.” The listing does not say how many messages are free. Source: ${a("creed")}, checked ${CHECKED}.</p>`],
      ["Prices side by side", `${HEAD}
<tr><td>Creed: Bible Chat &amp; Companion (Lemon Tree Labs, Inc.)</td><td>From $9.99 to $69.99, including “Annual - Discounted” at $34.99 and $44.99; billing periods mostly not named</td><td>Not stated in the description</td><td>Limited AI chat and voice</td><td>${a("creed")}, ${CHECKED}</td></tr>
${PBS_ROW}
</tbody></table>`],
      ["How do the chats handle scripture?", `<p>Creed's listing describes a companion called Lenny who offers “scripture-inspired guidance”. In Peace Be Still, the AI only names the reference, and the app pastes the stored King James text word for word, so a verse can never be made up. You can test any Bible chat by asking for a verse you know by heart:</p>
${V("PHI 4:13")}`],
      ["Is there a Bible app with no free trial?", `<p>Peace Be Still has no trial and no weekly plan. The free version counts your messages kindly (“N of 5 messages left today”) and starts again each day.</p>`],
      ["How do I cancel an App Store subscription?", CANCEL_STEPS],
    ],
    faq: [
      ["Is Creed free?", "Partly. Its App Store description says free users get limited AI chat and voice, and need a subscription for unlimited access (checked 18 Nov 2026)."],
      ["How much is Creed?", "Its In-App Purchases list shows prices from $9.99 to $69.99, including annual discounted options at $34.99 and $44.99, on the US App Store, checked 18 Nov 2026."],
      ["Is Creed in Spanish?", "Its listing shows English as the only language (checked 18 Nov 2026). Peace Be Still has Mi Refugio, a Spanish journey with the Reina-Valera 1909, at launch."],
    ],
    sources: [src("creed", "Creed: Bible Chat & Companion"), APPLE_CANCEL],
    notAffiliated: "Creed",
    related: ["/questions/is-the-haven-bible-app-free/", "/questions/haven-bible-chat/", "/free-bible-chat/", "/ai-bible/"],
  },
  {
    ...D, lang: "en", door: "neutral", group: G, path: "/questions/is-the-haven-bible-app-free/",
    title: "Is the Haven Bible app free? What its listing says · Peace Be Still",
    description: "Is Haven - Bible Chat free? Its App Store listing says access requires a paid subscription, with purchases from $4.99 to $19.99. Checked 18 Nov 2026, with free options.",
    h1: "Is the Haven Bible app free?",
    indexLabel: "Is the Haven Bible app free?",
    indexNote: "Its listing says a paid subscription is required.",
    definition: "No, not beyond the download. The App Store description for Haven - Bible Chat (E12 Holdings LLC) ends with “Access to Haven requires a paid subscription”. Its In-App Purchases list “Unlimited” options from $4.99 to $19.99 without naming the billing periods (US, checked 18 Nov 2026).",
    quick: "Haven - Bible Chat: free to download, paid to use, per its listing. If you want a Bible chat you can use without paying, Peace Be Still ({{stores.short}}) gives one chat a day of up to 5 messages free, for good.",
    bestFor: "people who downloaded Haven and want to know what it costs, or want a free option.",
    pick: PICK_EN("For a Bible chat you can use free every day, our pick is Peace Be Still."),
    sections: [
      ["Does the Haven Bible chat app cost money?", `<p>Yes. The last line of its description reads “Access to Haven requires a paid subscription”. Source: ${a("haven")}, checked ${CHECKED}.</p>`],
      ["Prices side by side", `${HEAD}
<tr><td>Haven - Bible Chat (E12 Holdings LLC)</td><td>“Unlimited” options from $4.99 to $19.99; billing periods not listed</td><td>Not stated in the description</td><td>Not listed; “Access to Haven requires a paid subscription”</td><td>${a("haven")}, ${CHECKED}</td></tr>
${PBS_ROW}
</tbody></table>
<p class="muted">Two apps on the App Store are called “Haven: Bible Chat”. This page is about the one by E12 Holdings LLC. The other, by Appki Limited, lists weekly, monthly and yearly “Premium” access from $4.99 to $99.99 (${a("haven2", "its listing")}, ${CHECKED}).</p>`],
      ["Which Bible apps are free with no ads?", `<p>Peace Be Still has no ads and a free version that stays free: the whole King James Bible to read and hear, today's story, one chat a day of up to 5 messages, the first sleep night then one a week, and a daily declaration.</p>`],
      ["How do I cancel a subscription on iPhone?", CANCEL_STEPS],
    ],
    faq: [
      ["Is Haven Bible chat free?", "Its App Store description says access requires a paid subscription (E12 Holdings LLC, checked 18 Nov 2026). The download itself is free."],
      ["How much is Haven?", "Its In-App Purchases list shows “Unlimited” options from $4.99 to $19.99 on the US App Store, without the billing periods. The price screen inside the app shows the period."],
      ["How do I cancel Haven?", "On iPhone: Settings › your name › Subscriptions › Haven › Cancel Subscription. On Android: Google Play › Payments & subscriptions › Subscriptions. Deleting the app does not cancel it."],
    ],
    sources: [src("haven", "Haven - Bible Chat"), src("haven2", "Haven: Bible Chat (Appki Limited)"), APPLE_CANCEL],
    notAffiliated: "Haven",
    related: ["/questions/haven-bible-chat/", "/questions/how-to-cancel-haven-subscription/", "/free-bible-chat/", "/questions/is-creed-bible-app-free/"],
  },
  {
    ...D, lang: "en", door: "neutral", group: G, path: "/questions/haven-bible-chat/",
    title: "Haven Bible Chat: what it is, and alternatives · Peace Be Still",
    description: "What Haven - Bible Chat is per its own App Store listing, what it costs, how to cancel, and Bible chat alternatives with no trial and a free version. Checked 18 Nov 2026.",
    h1: "Haven Bible Chat: what it is, and what else to consider",
    indexLabel: "Haven Bible Chat and alternatives",
    indexNote: "What the listing says, the cost, cancelling, and alternatives.",
    definition: "Haven - Bible Chat is an iPhone app by E12 Holdings LLC with daily verses, devotionals, prayers, a streak and a chat you can “ask Haven anything”. Its listing says access requires a paid subscription, shows a 12+ age rating and English only (checked 18 Nov 2026). Alternatives include Bible chat apps with a free version, such as Peace Be Still, {{stores.short}}.",
    quick: "Haven: daily verses, devotionals and a chat, paid subscription required, English only, per its listing. Peace Be Still: a Bible chat with verses pasted from a stored King James Bible, one free chat a day for good, Spanish at launch, no trial, no ads.",
    bestFor: "people comparing Haven with other Bible chat apps.",
    pick: PICK_EN("Our pick for a Bible chat alternative: Peace Be Still, for its free version and word-for-word verses."),
    sections: [
      ["What is Haven Bible Chat?", `<p>Its listing describes hand-picked daily verses, devotionals and prayers, verse citations, a daily streak, and a chat: “ask Haven anything”. Subtitle on the listing: “Bible Widget, Verse, Pet, Grow”. Source: ${a("haven")}, checked ${CHECKED}.</p>`],
      ["Haven and Peace Be Still, fact by fact", `<table class="t"><thead><tr><th></th><th>Haven - Bible Chat</th><th>Peace Be Still</th></tr></thead><tbody>
<tr><td>Price</td><td>“Unlimited” options $4.99 to $19.99; access requires a paid subscription</td><td>$7.99 a month or $39.99 a year; free version forever</td></tr>
<tr><td>Languages</td><td>English</td><td>English and Spanish (Mi Refugio, Reina-Valera 1909)</td></tr>
<tr><td>Age rating</td><td>12+</td><td>13+; under 13 no chat</td></tr>
<tr><td>Verses</td><td>Not described in the listing</td><td>Pasted word for word from a stored KJV; the AI never writes a verse</td></tr>
<tr><td>Source</td><td>${a("haven")}, ${CHECKED}</td><td>This site</td></tr>
</tbody></table>`],
      ["How do I cancel Haven Bible Chat?", `${CANCEL_STEPS}
<p>See also <a href="/questions/how-to-cancel-haven-subscription/">how to cancel a Haven subscription</a>.</p>`],
      ["Is there a Bible app with no free trial?", `<p>Peace Be Still has no trial and no weekly plan, and the price shows in dollars before you tap.</p>`],
      ["Which Bible apps are free with no ads?", `<p>Peace Be Still has no ads, free or paid. Its free version includes one chat a day of up to 5 messages, and the AI is labelled as AI on every answer.</p>
${V("PSA 119:105")}`],
    ],
    faq: [
      ["Does the Haven Bible chat app cost money?", "Yes. Its App Store listing says access requires a paid subscription, with “Unlimited” purchases from $4.99 to $19.99 (US, checked 18 Nov 2026)."],
      ["Is Haven in Spanish?", "Its listing shows English only (checked 18 Nov 2026). Peace Be Still has a full Spanish journey, Mi Refugio, with the Reina-Valera 1909."],
      ["Are there two Haven Bible chat apps?", "Yes. One is by E12 Holdings LLC; another “Haven: Bible Chat” is by Appki Limited. Check the developer name on the listing before you subscribe or cancel."],
    ],
    sources: [src("haven", "Haven - Bible Chat"), src("haven2", "Haven: Bible Chat (Appki Limited)"), APPLE_CANCEL],
    notAffiliated: "Haven",
    related: ["/questions/is-the-haven-bible-app-free/", "/questions/how-to-cancel-haven-subscription/", "/bible-chat-alternative/", "/black-bible-chat/"],
  },
  {
    ...D, ...D21, lang: "en", door: "neutral", group: G, path: "/questions/glorify-app-reviews/",
    title: "Glorify app reviews: rating, prices and what it offers · Peace Be Still",
    description: "Glorify: Devotional & Prayer per its own App Store listing: its rating, the Glorify Plus prices ($6.99 to $9.99 monthly, $41.99 to $69.99 yearly), features, and what to weigh.",
    h1: "Glorify app reviews: what its listing shows, and what it costs",
    indexLabel: "Glorify app reviews",
    indexNote: "Rating, Glorify Plus prices and features, from its listing.",
    definition: "Glorify: Devotional & Prayer (TUPOE LTD) shows 4.9 out of 5 from 101,475 ratings on the US App Store (checked 21 Nov 2026). Its listing describes daily devotionals, guided Christian meditation, sleep meditations, courses and several Bible translations including the KJV. Glorify Plus is listed at $6.99 to $9.99 monthly and $41.99 to $69.99 yearly.",
    quick: "Glorify suits people who want a 10-minute daily routine (quote, passage, devotional, meditation), per its listing. Its lowest listed monthly price ($6.99) is below Peace Be Still's $7.99; its listed yearly prices ($41.99 and $69.99) are above Peace Be Still's $39.99.",
    bestFor: "people reading Glorify reviews before subscribing.",
    pick: PICK_EN("For the lowest yearly price here and a free version that stays free, our pick is Peace Be Still."),
    sections: [
      ["What does Glorify offer, according to its listing?", `<ul>
<li>A daily quiet time: an inspiring quote, a Bible passage, a devotional, and a “Daily Walk with God”.</li>
<li>Sleep and calming meditations based on scripture.</li>
<li>Christian courses, a Bible journal and worship music.</li>
<li>Multiple Bible translations, including the King James Version.</li>
<li>Community: discuss devotionals and share prayer requests with friends and church.</li>
</ul>
<p class="muted">From Glorify's ${a("glorify")}, checked ${CHECKED}.</p>`],
      ["What does Glorify cost?", `${HEAD}
<tr><td>Glorify: Devotional &amp; Prayer (TUPOE LTD)</td><td>Glorify Plus monthly $6.99 or $9.99; annual $41.99 or $69.99; “Pay it Forward” $4.99</td><td>Not stated in the description; the In-App Purchases list includes “Intro Offer” items</td><td>Not stated in the description</td><td>${a("glorify")}, ${CHECKED}</td></tr>
${PBS_ROW}
</tbody></table>`],
      ["What App Store reviewers report (Nov 2026)", `<p>Among Glorify's 500 most recent US App Store reviews (15 Nov 2025 to 18 Nov 2026), 440 gave 4 or 5 stars and 41 gave 1 or 2. The most common theme in those 41 is audio: reviewers say listening to the devotionals and passages used to be free and now needs Glorify Plus, and several who listen because of dyslexia or ADHD describe it as an access problem. Four mention the Glorify Ring advertisement shown in the app in July 2026.</p>
<p>Glorify's help page says to cancel through the App Store or Google Play, and that deleting your Glorify account does not cancel: <a href="/questions/how-to-cancel-bible-app-subscription/">the steps are here</a>.</p>
<p class="muted">${METHOD}</p>`],
      ["Is there a Bible app with no free trial?", `<p>Peace Be Still has no trial, no intro offer and no weekly plan. The price you see is the price, and it never rises while you stay.</p>`],
      ["Is it worth paying for a prayer app?", `<p>A high rating tells you many people liked it. Whether it is worth it for you depends on whether you open it most days. Try the free part first, then decide.</p>`],
      ["How do I cancel a subscription on iPhone?", CANCEL_STEPS],
    ],
    faq: [
      ["What is Glorify's rating?", "4.9 out of 5 from 101,475 ratings on the US App Store, checked 21 Nov 2026. Ratings change daily."],
      ["How much is Glorify Plus?", "Its In-App Purchases list shows monthly $6.99 and $9.99 and annual $41.99 and $69.99 on the US App Store (checked 18 Nov 2026)."],
      ["Does Glorify have the King James Bible?", "Its listing says it offers multiple Bible translations including the King James Version."],
    ],
    sources: [src("glorify", "Glorify: Devotional & Prayer"), APPLE_CANCEL],
    notAffiliated: "Glorify",
    related: ["/questions/hallow-app-review/", "/daily-bible-verse-app/", "/bible-app-for-women/", "/questions/how-to-cancel-bible-app-subscription/"],
  },
  {
    ...D, lang: "en", door: "neutral", group: G, path: "/questions/is-duomo-bible-app-free/",
    title: "Is the Duomo Bible app free? What its listing says · Peace Be Still",
    description: "Is Duomo: Daily Prayer & Bible free? Its listing calls it a paid-access app with a free trial; plans from $9.99 a week to $89.99 a year. Checked 18 Nov 2026.",
    h1: "Is the Duomo Bible app free?",
    indexLabel: "Is the Duomo Bible app free?",
    indexNote: "A paid-access app with a free trial, per its listing.",
    definition: "No. Duomo's App Store description says “Duomo is a paid-access app. All features are available through in-app subscription. A free trial is offered.” Its In-App Purchases list weekly ($9.99), monthly ($19.99), 3-month ($39.99) and yearly ($69.99 and $89.99) plans on the US App Store (checked 18 Nov 2026).",
    quick: "Duomo: paid access after a free trial; plans from $9.99 a week. Peace Be Still, {{stores.short}}: no trial, no weekly plan, and a free version that stays free, or $7.99 a month or $39.99 a year.",
    bestFor: "people who saw Duomo and want to know the cost before the trial ends.",
    pick: PICK_EN("For no trial and no weekly plan, our pick is Peace Be Still."),
    sections: [
      ["What does Duomo's listing say about price?", `<p>“Duomo is a paid-access app. All features are available through in-app subscription. A free trial is offered so you can experience the journey before committing.” Source: ${a("duomo")}, checked ${CHECKED}.</p>`],
      ["Prices side by side", `${HEAD}
<tr><td>Duomo: Daily Prayer &amp; Bible (DUOMO APP LIMITED)</td><td>Weekly $9.99; monthly $19.99; 3-month $39.99; yearly $69.99 or $89.99; “Premium Listening mode” $19.99</td><td>Yes, “A free trial is offered”</td><td>Not listed; paid access</td><td>${a("duomo")}, ${CHECKED}</td></tr>
${PBS_ROW}
</tbody></table>
<p>A weekly plan adds up: $9.99 a week is about $519 over a year.</p>`],
      ["Is there a Bible app with no free trial?", `<p>Yes. Peace Be Still has no trial, so there is no date to remember and nothing that turns into a charge by surprise.</p>`],
      ["How do I cancel before a trial ends?", `<p>Apple advises cancelling at least 24 hours before a trial ends.</p>
${CANCEL_STEPS}`],
      ["Which Bible apps are free with no ads?", `<p>Peace Be Still's free version has no ads and does not end: the whole King James Bible to read and hear, today's story, one chat a day, and a daily declaration.</p>
${V("ISA 55:1")}`],
    ],
    faq: [
      ["Is Duomo free?", "No. Its App Store description calls it a paid-access app with a free trial (checked 18 Nov 2026)."],
      ["How much is Duomo a week?", "Its In-App Purchases list shows a weekly plan at $9.99 on the US App Store (checked 18 Nov 2026)."],
      ["When should I cancel a free trial?", "At least 24 hours before it ends, as Apple advises, so it does not renew as a paid plan."],
    ],
    sources: [src("duomo", "Duomo: Daily Prayer & Bible"), APPLE_CANCEL, PLAY_CANCEL],
    notAffiliated: "Duomo",
    related: ["/questions/glorify-app-reviews/", "/questions/is-hallow-app-free/", "/bible-chat-cancel-subscription/", "/free-bible-chat/"],
  },
  // ---- Landing pages ----
  {
    ...D, lang: "en", door: "neutral", group: "Bible apps", path: "/ai-bible/",
    title: "AI Bible: an AI that answers with real verses · Peace Be Still",
    description: "An AI Bible app answers questions about scripture. Here is how to tell one that quotes real verses from one that invents them, and how Peace Be Still pastes every verse from a stored KJV.",
    h1: "AI Bible: an AI that answers with real verses, not made-up ones",
    indexLabel: "AI Bible",
    indexNote: "How to spot an AI that invents verses, and one that cannot.",
    definition: "An AI Bible is an app where you ask questions about faith or scripture and an AI answers. The risk is that a language model can invent a verse that sounds right. The safe design lets the AI choose only references, then pastes the verse from a stored Bible. Peace Be Still, {{stores.short}}, works that way with the King James Version.",
    quick: "Test any AI Bible: ask for a verse you know by heart and check it word for word, ask where a phrase is found, and see whether it says it is AI. In Peace Be Still the AI names the reference; the app pastes the stored KJV text.",
    bestFor: "people curious about AI Bible apps who want to know which ones they can trust with scripture.",
    pick: PICK_EN("Our pick for an AI Bible that cannot misquote scripture: Peace Be Still."),
    sections: [
      ["Is Bible chat AI?", `<p>Most “Bible chat” apps use a large language model, which is AI. Some say so plainly; some call it a friend, a guide or a companion. A good one labels every answer as AI and never speaks as God or Jesus.</p>`],
      ["Can an AI Bible make up verses?", `<p>Yes, if it writes the verse itself. Language models predict likely words, so they can produce a sentence that sounds like the King James Bible but is not in it. That is why Peace Be Still never lets the AI write scripture: it returns a reference such as “Psalm 23:1”, and the app pastes the stored text.</p>
<p>${F("PSA 23:1", "The LORD is my shepherd; I shall not want.")} (Psalm 23:1)</p>`],
      ["How do I test an AI Bible?", `<ol>
<li>Ask for John 3:16 or Psalm 23:1 and compare it with a printed Bible.</li>
<li>Ask “Where does the Bible say God helps those who help themselves?” A good AI says that line is not in the Bible.</li>
<li>Ask what translation it uses. It should name one.</li>
<li>Check that each answer is marked as AI.</li>
</ol>`],
      ["Is Bible chat free?", `<p>Many are free to download and paid to use. Peace Be Still's free version gives one chat a day of up to 5 messages, for good, with no trial. See <a href="/free-bible-chat/">exactly what stays free</a>.</p>`],
      ["Where do my words go?", `<p>Before your first chat, Peace Be Still tells you that what you type goes to free AI providers that may learn from it, and to leave out names. If you mention self-harm or abuse, the app does not send it to the AI; it shows 988 and other help straight away.</p>`],
    ],
    faq: [
      ["Is there an AI that answers Bible questions?", "Yes, several apps do. Peace Be Still, {{stores.short}}, answers with King James verses pasted from a stored copy, labels every answer as AI, and never speaks as God."],
      ["Does the Bible app use AI?", "Some Bible apps add AI chat and many do not. Check the app's own description: it should say whether answers are written by AI."],
      ["Is AI Bible chat accurate?", "Only as accurate as its design. If the AI writes verses itself, it can get them wrong. If the app pastes verses from a stored Bible, the scripture is exact, though the AI's own words still deserve a careful read."],
    ],
    sources: [KJVSRC(), ["988 Suicide & Crisis Lifeline", "https://988lifeline.org/"]],
    related: ["/ai-bible-verse/", "/christian-ai/", "/free-bible-chat/", "/bible-chat-alternative/", "/black-bible-chat/"],
  },
  {
    ...D, lang: "en", door: "neutral", group: "Bible apps", path: "/ai-bible-verse/",
    title: "AI Bible verse finder: the right verse for what you face · Peace Be Still",
    description: "Can an AI find the right Bible verse for what you are going through? Examples by situation, quoted from the KJV, how to check an AI's verse, and how Peace Be Still keeps verses exact.",
    h1: "Can an AI find the right Bible verse for what you are going through?",
    indexLabel: "AI Bible verse finder",
    indexNote: "Verses by situation, and how to check an AI's pick.",
    definition: "Yes, an AI can suggest Bible verses that fit what you describe, such as grief, a new job or fear before surgery, faster than a topic index. The risk is a misquoted verse. Use an AI that names the reference and shows the stored text, then read the verse in its chapter before you lean on it.",
    quick: "Describe what you are facing in one or two sentences, without names. Take the reference the AI gives, read the whole paragraph around it, and keep the one verse that speaks. Peace Be Still pastes every verse from a stored King James Bible.",
    bestFor: "people who want a verse for a real moment and want to be sure it is quoted right.",
    pick: PICK_EN("Our pick for finding a verse you can trust: Peace Be Still."),
    sections: [
      ["Verses an AI might offer, by situation", `<table class="t"><thead><tr><th>You say</th><th>A verse that fits (KJV)</th></tr></thead><tbody>
<tr><td>“I lost my mother last month.”</td><td>${Q("PSA 34:18")} (Psalm 34:18)</td></tr>
<tr><td>“I start a new job Monday and I'm nervous.”</td><td>${Q("JOS 1:9")} (Joshua 1:9)</td></tr>
<tr><td>“Money is tight this month.”</td><td>${Q("PHI 4:19")} (Philippians 4:19)</td></tr>
<tr><td>“I'm so tired.”</td><td>${Q("MAT 11:28")} (Matthew 11:28)</td></tr>
<tr><td>“I said something I regret.”</td><td>${Q("1JO 1:9")} (1 John 1:9)</td></tr>
</tbody></table>`],
      ["Is AI Bible chat accurate?", `<p>The scripture is exact only if the app pastes it from a stored Bible. The choice of verse is the AI's judgement, so read it in context. A verse about Israel's exile, for example, is a promise to a nation in a particular moment; it can still comfort you, but read the chapter.</p>`],
      ["How to check a verse an AI gives you", `<ol>
<li>Look up the reference in a printed Bible or a site such as Bible Gateway.</li>
<li>Read five verses before and after it.</li>
<li>Ask: who is speaking, and to whom?</li>
<li>Keep the verse if it still fits.</li>
</ol>`],
      ["Where do Black people come from in the Bible?", `<p>A common search people type alongside verse finders. Genesis 10:6 lists Cush, Mizraim (Egypt) and Phut among the sons of Ham, African lands. See <a href="/questions/who-are-black-people-in-the-bible/">who are Black people in the Bible</a> for what the text does and does not say.</p>`],
      ["How Peace Be Still does it", `<p>In Peace Be Still, {{stores.short}}, you tell the chat what is going on, and it answers with a verse card: the reference, and the King James text pasted from the stored copy. Free version: one chat a day of up to 5 messages. Every answer is labelled as AI.</p>`],
    ],
    faq: [
      ["Can AI give me a Bible verse for my situation?", "Yes. Describe the situation and ask for one verse with its reference. Then read the verse in its chapter; the AI chooses, but you decide whether it fits."],
      ["Is it okay to use AI to find Bible verses?", "Many Christians use concordances, topic indexes and search tools; an AI is another kind of index. Treat its picks as suggestions, and keep reading scripture itself."],
      ["Should I tell an AI Bible app personal details?", "Share the situation, not names or details that identify anyone. Peace Be Still tells you before your first chat that what you type goes to free AI providers that may learn from it."],
    ],
    sources: [bg("Psalm 34:18", "Psalm 34:18 (KJV), Bible Gateway"), bg("Joshua 1:9", "Joshua 1:9 (KJV), Bible Gateway")],
    related: ["/ai-bible/", "/christian-ai/", "/questions/bible-verses-for-anxiety/", "/free-bible-chat/"],
  },
  {
    ...D, lang: "en", door: "neutral", group: "Bible apps", path: "/christian-ai/",
    title: "Christian AI: how to tell one you can trust · Peace Be Still",
    description: "What makes a Christian AI trustworthy: exact scripture, labelled as AI, never speaking as God, crisis help, honest data use, no outcome promises. A six-point checklist and our pick.",
    h1: "Christian AI: six things that make one trustworthy",
    indexLabel: "Christian AI",
    indexNote: "A six-point checklist for any Christian AI app.",
    definition: "A Christian AI is an AI chat built to talk about faith, prayer and scripture from a Christian point of view. One you can trust quotes scripture exactly from a named translation, says it is AI, never speaks as God or Jesus, sends crisis messages to real help, tells you where your words go, and promises no outcomes.",
    quick: "Check six things: exact verses, an AI label on every answer, no speaking as God, crisis words routed to 988, a plain note about where your words go, and no promises of money or healing. Peace Be Still, {{stores.short}}, was built around all six.",
    bestFor: "Christians weighing an AI chat app, and pastors asked about them.",
    pick: PICK_EN("Our pick for a Christian AI that stays with scripture: Peace Be Still."),
    sections: [
      ["How do I know if a Christian AI is trustworthy?", `<ol>
<li><strong>Exact scripture.</strong> Verses come from a stored Bible, with book, chapter and verse; the AI never writes them.</li>
<li><strong>Labelled as AI.</strong> Every answer says it is AI. It is not a pastor or a person.</li>
<li><strong>Never speaks as God or Jesus.</strong> It can point to what Jesus said; it never says “I am” in his name.</li>
<li><strong>Crisis help first.</strong> Words about self-harm or abuse get the 988 Lifeline and real help, not an AI reply.</li>
<li><strong>Honest about data.</strong> It tells you where your words go before you type.</li>
<li><strong>No outcome promises.</strong> No money, healing or results for prayers or payments.</li>
</ol>`],
      ["What are good Christian apps?", `<p>It depends on what you need. A reading app for the Bible itself; a guided prayer app if you like audio prayer; a sleep app for whispered scripture; a chat if you want to talk things through. Peace Be Still combines the King James Bible, Psalm Nights for sleep and a Bible chat in one app, with a free version.</p>`],
      ["What scripture says about testing what you hear", `<p>The early church was told to test teaching, not swallow it whole. That applies to an AI as much as to a person.</p>
${V("1JO 4:1")}
${V("ACT 17:11")}`],
      ["How Peace Be Still handles the six", `<ul>
<li>The AI names references; the app pastes the King James text (Reina-Valera 1909 in Spanish).</li>
<li>Every answer is labelled as AI.</li>
<li>It never speaks as God or Jesus.</li>
<li>Crisis words get a fixed reply with 988 and are not sent to the AI.</li>
<li>Before the first chat: what you type goes to free AI providers that may learn from it; leave out names.</li>
<li>No promises of outcomes, ever.</li>
</ul>`],
    ],
    faq: [
      ["Is it okay for Christians to use AI?", "Many Christians use AI as a tool, like a concordance or a search engine. Test what it says against scripture (Acts 17:11), keep praying and reading the Bible itself, and stay in your church."],
      ["Can a Christian AI replace a pastor?", "No. An AI can point you to scripture and help you put words to a prayer. It cannot know you, visit you, or carry pastoral responsibility. A good one says so."],
      ["Is Peace Be Still's chat a Christian AI?", "Yes: a Bible chat that answers with King James verses pasted word for word, labelled as AI, in a plain voice, a Black church voice (Hush Harbor), a teen voice (Young Faith) or Spanish (Mi Refugio)."],
    ],
    sources: [bg("1 John 4:1", "1 John 4:1 (KJV), Bible Gateway"), bg("Acts 17:11", "Acts 17:11 (KJV), Bible Gateway"), ["988 Suicide & Crisis Lifeline", "https://988lifeline.org/"]],
    related: ["/ai-bible/", "/ai-bible-verse/", "/bible-app-for-teens/", "/black-bible-chat/"],
  },
  {
    ...D, lang: "en", door: "neutral", group: "Bible apps", path: "/bible-app-for-women/",
    title: "Bible app for women: what to look for, and our pick · Peace Be Still",
    description: "A Bible app made with women in mind: the women of scripture in its stories, a morning word and whispered psalms at night, the whole KJV free to read, with a growing set of chapters read aloud, no trial, no ads.",
    h1: "A Bible app for women: what to look for, and our pick",
    indexLabel: "Bible app for women",
    indexNote: "Stories of the women of scripture, morning and night, no trial.",
    definition: "A Bible app for women is a Bible app whose stories, devotionals and voice speak to women's lives: the women of scripture told in full, a morning word to start the day, and something quiet at night. Look for exact scripture, the Bible read aloud, no ads and no trial. Our pick is Peace Be Still, {{stores.short}}.",
    quick: "Check four things: exact verses from a named translation, scripture read aloud free, stories that include the women of scripture, and honest pricing with no trial. Peace Be Still has all four, plus Hush Harbor in a Black church voice and Mi Refugio in Spanish.",
    bestFor: "women choosing a Bible app, and anyone buying one as a gift.",
    pick: PICK_EN("Our pick for a Bible app for women: Peace Be Still, for its morning-and-night rhythm and honest prices."),
    sections: [
      ["What should a Bible app for women have?", `<ul>
<li><strong>The women of scripture, told in full.</strong> Hannah, Ruth, Esther, Abigail, Deborah, Hagar, the Shunammite woman, Mary Magdalene.</li>
<li><strong>A morning and a night.</strong> One verse to say out loud before the day starts; whispered psalms when it ends.</li>
<li><strong>The Bible read aloud,</strong> for the commute, the kitchen, the drive.</li>
<li><strong>No ads, no trial,</strong> and a price you can see before you tap.</li>
</ul>`],
      ["Women of the Bible in Peace Be Still's stories", `<table class="t"><thead><tr><th>Story</th><th>Passage</th></tr></thead><tbody>
<tr><td>Hannah's prayer</td><td>1 Samuel 1:9-20</td></tr>
<tr><td>Ruth and Naomi</td><td>Ruth 1:1-22</td></tr>
<tr><td>Esther, for such a time as this</td><td>Esther 4:1-17</td></tr>
<tr><td>Deborah under the palm tree</td><td>Judges 4:4-16</td></tr>
<tr><td>Abigail rides to meet David</td><td>1 Samuel 25:14-35</td></tr>
<tr><td>The woman who touched his hem</td><td>Mark 5:25-34</td></tr>
<tr><td>Hagar and the God who sees (Hush Harbor)</td><td>Genesis 16:1-13</td></tr>
<tr><td>The Shunammite woman: it is well (Hush Harbor)</td><td>2 Kings 4:8-37</td></tr>
</tbody></table>
${V("EST 4:14")}`],
      ["Is there a free Bible app with no ads?", `<p>Peace Be Still has no ads, free or paid, ever. Its free version holds the whole King James Bible to read and hear, today's story, one chat a day of up to 5 messages, your first sleep night then one a week, and a daily declaration.</p>`],
      ["Which Bible app reads the Bible aloud?", `<p>Peace Be Still reads the whole King James Bible aloud in the free version, and the Reina-Valera 1909 in Spanish. Psalm Nights whisper a psalm at bedtime with a sleep timer.</p>`],
      ["Is there a Bible app with no free trial or weekly plan?", `<p>Yes: Peace Be Still has neither. $7.99 a month or $39.99 a year, cancel in two taps, and your price never rises while you stay.</p>`],
      ["Can you use a Bible chat app for free?", `<p>In Peace Be Still, yes: one chat a day of up to 5 messages, for good. A paid plan adds unlimited Bible chat and a chat that remembers what you are carrying. With a paid plan: unlimited Bible chat, kept private. Your private chats are never used to train AI. Private for up to 50 messages a day. After that you can choose free chat, which isn't private; we always ask first.</p>`],
    ],
    faq: [
      ["What is the best Bible app for women?", "Our pick is Peace Be Still, {{stores.short}}: the women of scripture in its stories, a morning declaration and whispered psalms at night, the whole KJV free to read, with a growing set of chapters read aloud, no ads and no trial. We make it, so weigh that."],
      ["Is there a Bible app for Black women?", "Peace Be Still's Hush Harbor · Black Bible Chat & Stories has a chat in a Black church voice and Bible stories told in a Black church voice, including Hagar and the Shunammite woman."],
      ["Is there a Bible app for women in Spanish?", "Yes. Mi Refugio · Biblia y Chat en Español is the Spanish journey in Peace Be Still, with the Reina-Valera 1909, at launch."],
    ],
    sources: [bg("Esther 4:14", "Esther 4:14 (KJV), Bible Gateway"), bg("1 Samuel 1:9-20", "1 Samuel 1:9-20 (KJV), Bible Gateway")],
    related: ["/black-bible-app/", "/questions/daily-bible-declarations/", "/questions/psalms-for-sleep/", "/free-bible-chat/"],
  },
  {
    ...D, lang: "en", door: "neutral", group: "Bible apps", path: "/bible-app-for-teens/",
    title: "Bible app for teens: what parents should check · Peace Be Still",
    description: "A good Bible app for a teenager: plain answers to real questions, exact verses, short stories, no ads, no chat under 13, and upgrades through Apple's Ask to Buy. A parent's checklist.",
    h1: "A Bible app for teens: what parents should check first",
    indexLabel: "Bible app for teens",
    indexNote: "A parent's checklist, and Young Faith for ages 13 to 17.",
    definition: "A good Bible app for a teenager gives plain answers to real questions, quotes scripture exactly, keeps stories short, has no ads, and keeps parents in charge of purchases. Peace Be Still, {{stores.short}}, has Young Faith · Bible for Teens for ages 13 to 17, with upgrades through Apple's Ask to Buy and no chat at all under 13.",
    quick: "Check: an age gate (no AI chat under 13), exact verses, no ads, purchases that need your approval, and a clear note about where typed words go. Young Faith has a 3-minute story, a declaration and plain answers, every verse from the King James Bible.",
    bestFor: "parents and youth pastors choosing a Bible app for 13 to 17 year olds.",
    pick: PICK_EN("Our pick for a teen Bible app: Peace Be Still's Young Faith, for ages 13 to 17."),
    sections: [
      ["What should parents check in a teen Bible app?", `<ol>
<li><strong>Age rules.</strong> Does it ask for a birth year? Is chat off for under-13s?</li>
<li><strong>Exact scripture.</strong> Verses from a named translation, not written by an AI.</li>
<li><strong>Ads.</strong> None is best.</li>
<li><strong>Purchases.</strong> Can a teen buy without you? On iPhone, Family Sharing's Ask to Buy sends you the request.</li>
<li><strong>Crisis help.</strong> Does the app show real help, such as 988, if a teen types something worrying?</li>
</ol>`],
      ["What is Young Faith · Bible for Teens?", `<p>A journey inside Peace Be Still for ages 13 to 17: a 3-minute Bible story, a declaration, and plain answers to real questions in a teen voice, every verse from the King James Bible. Upgrades go through Ask to Buy. Under 13, the app has no chat at all.</p>
${V("1TI 4:12")}`],
      ["Is there a free Bible app with no ads?", `<p>Peace Be Still has no ads. Its free version includes the whole King James Bible to read and hear, today's story, one chat a day of up to 5 messages (13 and over), and a daily declaration.</p>`],
      ["Which Bible app reads the Bible aloud?", `<p>Peace Be Still reads the whole King James Bible aloud in the free version, which helps teens who would rather listen than read.</p>`],
      ["Is there a Bible app with no free trial or weekly plan?", `<p>Peace Be Still has neither: $7.99 a month or $39.99 a year, and for teens every upgrade goes through Ask to Buy.</p>`],
    ],
    faq: [
      ["What is the best Bible app for teens?", "Our pick is Peace Be Still's Young Faith, for ages 13 to 17: short stories, plain answers, exact KJV verses, no ads, and purchases through Ask to Buy. We make it, so weigh our pick accordingly."],
      ["Is AI Bible chat safe for teens?", "It depends on the design. Look for an age gate, an AI label on every answer, crisis words routed to 988, and a plain note about where typed words go. Peace Be Still has no chat under 13."],
      ["What Bible verse is good for teenagers?", `1 Timothy 4:12 is a favourite: ${Q("1TI 4:12")}`],
    ],
    sources: [["Apple Support: Use Ask to Buy", "https://support.apple.com/en-us/105055"], bg("1 Timothy 4:12", "1 Timothy 4:12 (KJV), Bible Gateway")],
    related: ["/christian-ai/", "/questions/bedtime-bible-stories/", "/questions/daily-bible-declarations/", "/free-bible-chat/"],
  },
];
function KJVSRC() { return ["King James Version, eBible.org", "https://ebible.org/find/details.php?id=eng-kjv"]; }
