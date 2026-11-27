// Search pages from the 21 Nov 2026 review and keyword research
// (~/Work/app-review-2026-11-21/pbs/gripe-leverage.md: 4,430 App Store reviews, OpenSEO volumes).
// Rules for every page here:
// - Scripture only through scripture.mjs (stored KJV / RV1909, checked by site/test/scripture.test.mjs).
// - Other apps are named only where people search for them, with facts from their own listing or help
//   page, linked and dated; reviews are "reviewers say", with the method; no disparagement.
// - The chat claim stays soft (CHAT_VERSES) until the answer gate (worker/src/quality/answer.ts, PR #52)
//   is on main; then CHAT_VERSES becomes "quotes Scripture word for word".
// - Grief and caregiver pages promise no outcome and carry 988 and findahelpline.com.
import { V, Q, F, bg, KJV_SRC, RV_SRC } from "./blitz-common.mjs";
import { claimText } from "./parts.mjs";

const D21 = { published: "2026-11-21", updated: "2026-11-21", publishedText: "21 Nov 2026", updatedText: "21 Nov 2026" };
const DES21 = { published: "2026-11-21", updated: "2026-11-21", publishedText: "21 nov 2026", updatedText: "21 nov 2026" };
const READ = "21 Nov 2026";

// Until PR #52 is on main: true and soft. After: "Peace Be Still's chat quotes Scripture word for word…".
export const CHAT_VERSES = "Peace Be Still's chat is built to show each verse under the answer from a stored King James Version (Reina-Valera 1909 in Spanish), with the reference, so you can check it against your own Bible";
const CRISIS = ["988 Suicide & Crisis Lifeline", "https://988lifeline.org/"];
const HELPLINE = ["Find A Helpline (outside the US)", "https://findahelpline.com/"];
const APPLE_CANCEL = ["Apple Support: Cancel a subscription from Apple", "https://support.apple.com/en-us/118428"];
const PLAY_CANCEL = ["Google Play Help: Cancel, pause, or change a subscription", "https://support.google.com/googleplay/answer/7018481"];
const APPLE_REFUND = ["Apple: Report a problem, request a refund", "https://reportaproblem.apple.com/"];
const PLAY_REFUND = ["Google Play Help: Google Play refund policies", "https://support.google.com/googleplay/answer/2479637"];
const L = {
  hallow: "https://apps.apple.com/us/app/hallow-prayer-meditation/id1405323394",
  hallowCancel: "https://help.hallow.com/en/articles/2795868-how-do-i-cancel-my-subscription-or-free-trial",
  hallowRefund: "https://help.hallow.com/en/articles/2795888-i-was-charged-but-want-a-refund",
  hallowFaq: "https://help.hallow.com/en/articles/9509214-frequently-asked-questions",
  glorifyCancel: "https://glorify-app.zendesk.com/hc/en-gb/articles/4408356881682-How-do-I-cancel-my-subscription",
  abideCancel: "https://help.abide.com/hc/en-us/articles/360009876493-How-Do-I-CANCEL-My-Premium-Subscription",
  dwellCancel: "https://help.dwellbible.com/en/articles/15198872-how-do-i-cancel-my-dwell-subscription",
  bibleChatCancel: "https://thebiblechat.com/blog/how-to-cancel-your-bible-chat-subscription",
  bibleChat: "https://apps.apple.com/us/app/bible-chat-daily-devotional/id6448849666",
  haven: "https://apps.apple.com/us/app/haven-bible-chat/id6503387382",
  prayCancel: "https://help.pray.com/hc/en-us/articles/33708967880989-How-to-Cancel-Your-Pray-com-Subscription",
  prayGoogle: "https://help.pray.com/hc/en-us/articles/4411284912017-Cancelling-a-Pray-com-trial-or-subscription-from-Google",
  youversionCeo: "https://www.crosswalk.com/headlines/contributors/guest-commentary/ais-bible-misquotes-scripture-according-to-youversion-ceo.html",
};
const a = (href, text) => /^https:\/\/apps\.apple\.com\//.test(href) ? `<a class="src" rel="nofollow noopener" href="${href}">${text}</a>` : `<a rel="nofollow noopener" href="${href}">${text}</a>`;
const APPLE_STEPS = `<ol>
<li>Open the Settings app and tap your name.</li>
<li>Tap Subscriptions.</li>
<li>Tap the app's subscription.</li>
<li>Tap Cancel Subscription. If there is no Cancel button, or you see an expiry date in red, it is already cancelled.</li>
</ol>`;
const PLAY_STEPS = `<ol>
<li>Open the Google Play Store app and tap your profile icon.</li>
<li>Tap Payments &amp; subscriptions, then Subscriptions.</li>
<li>Choose the app's subscription and tap Cancel subscription.</li>
</ol>`;

export const SEARCH = [
  // ---- 1. Grief, English (18,100 a month, KD 0)
  {
    ...D21, lang: "en", door: "faith", group: "Bible verses and prayers for hard days", path: "/questions/bible-verses-for-grief/", alt: "/es/preguntas/versiculos-para-el-duelo/",
    title: "Bible verses for grief and loss (KJV) · Peace Be Still",
    description: "Bible verses for grief from the King James Version, for the first days after a loss, the long nights and anniversaries, with a short prayer for the grieving.",
    h1: "Bible verses for grief: scripture for the loss of a loved one",
    indexLabel: "Bible verses for grief",
    indexNote: "King James verses for the days after a loss, the nights and the anniversaries.",
    definition: "Bible verses for grief are the passages people turn to after someone they love has died: words that say God is near the broken-hearted, that Jesus wept at a graveside, and that death does not have the last word. They are not a way to hurry grief. They are company for it, read slowly, one at a time.",
    quick: `The verse most people reach for first is Psalm 34:18, ${Q("PSA 34:18")} Others are Matthew 5:4, John 11:35, Psalm 147:3, 1 Thessalonians 4:13-14 and Revelation 21:4. Read one a day, aloud if you can.`,
    bestFor: "anyone who has lost someone and wants scripture for the hard days, and anyone looking for verses to send a grieving friend.",
    sections: [
      ["Which Bible verses help most in the first days after a loss?", `<p>In the first days, short verses are easiest to hold. These say that God is close, and that tears are not a lack of faith.</p>
${V("PSA 34:18")}
${V("MAT 5:4")}
${V("JOH 11:35")}
<p>John 11:35 is the shortest verse in the King James Bible. Jesus stood at the grave of his friend Lazarus and wept, even knowing what he was about to do. Grief is not something to hide from God.</p>`],
      ["What does the Bible say about a broken heart?", `<p>Scripture speaks of the broken-hearted often, and always with God moving toward them, not away.</p>
${V("PSA 147:3")}
${V("2CO 1:3-4")}
${V("PSA 23:4")}`],
      ["What does the Bible say about seeing loved ones again?", `<p>For Christians who grieve a believer, Paul writes that grief and hope sit together: we sorrow, but not as people with no hope.</p>
${V("1TH 4:13-14")}
${V("JOH 14:1-3")}
${V("REV 21:4")}`],
      ["Which verses are for the long nights and the anniversaries?", `<p>Grief often comes back at night, on birthdays and on the date of the loss. These are for those hours.</p>
${V("PSA 30:5")}
${V("LAM 3:22-23")}
${V("ROM 8:38-39")}`],
      ["A short prayer for the grieving", `<p>Lord, you are near to the broken-hearted, and my heart is broken. I do not have the words tonight, so I bring you the tears. Thank you for the life of the one I miss. Hold what I cannot hold, and stay close in the hours that are hardest. In Jesus' name, amen.</p>
<p class="muted">A prayer written for this page, not a verse of scripture.</p>`],
      ["How do I use these verses when I am grieving?", `<ol>
<li><strong>One verse a day.</strong> Write it on a card and keep it where you will see it.</li>
<li><strong>Read it aloud.</strong> Hearing the words in your own voice helps them land when reading is hard.</li>
<li><strong>Pray it back.</strong> Turn the verse into a sentence to God: “You are nigh unto me, and my heart is broken.”</li>
<li><strong>Let someone in.</strong> Send one verse to a friend who is grieving too, or to someone who asked how to help.</li>
<li><strong>Talk to your pastor.</strong> A church grief group or your pastor can walk with you in ways a page cannot.</li>
</ol>`],
      ["If grief feels like too much", `<p>Grief can be heavy enough that you think about not going on. If that is you, please reach out now: in the United States, call or text <strong>988</strong> (the 988 Suicide &amp; Crisis Lifeline, 24 hours, free). Outside the US, <a href="https://findahelpline.com/">findahelpline.com</a> lists a free line near you. Reaching out is not a failure of faith.</p>`],
      ["Where can I listen to scripture at night?", `<p>Peace Be Still, an app {{stores.tag}}, reads King James psalms in a whisper on a dark screen with a sleep timer, including Psalm 23, Psalm 34 and Psalm 42. The first sleep night is free, then one a week on the free version; the whole King James Bible is free to read. It does not replace a pastor, a counsellor or a doctor.</p>`],
    ],
    faq: [
      ["What is the best Bible verse for grief?", `Psalm 34:18 is the verse most people turn to first: the ${F("PSA 34:18", "LORD is nigh unto them that are of a broken heart")}. Matthew 5:4, John 11:35 and Revelation 21:4 come next. The best one is the one you can carry today.`],
      ["What Bible verse can I send to someone who lost a loved one?", "Keep it short and gentle: Psalm 34:18, Matthew 5:4 or 2 Corinthians 1:3-4. Add one line of your own, such as “I am praying for you this week,” and do not expect a reply."],
      ["Is it a lack of faith to grieve?", `No. Jesus wept at the grave of Lazarus (John 11:35), and Paul tells believers not to sorrow ${F("1TH 4:13-14", "even as others which have no hope")}, which means sorrow is expected. Faith and grief live in the same heart.`],
      ["What does the Bible say about death of a loved one?", "For believers, Scripture speaks of death as sleep and of a resurrection to come (1 Thessalonians 4:13-14), of a place prepared (John 14:2), and of a day with no more death, sorrow or crying (Revelation 21:4)."],
    ],
    sources: [bg("Psalm 34:18", "Psalm 34:18 (KJV), Bible Gateway"), bg("1 Thessalonians 4:13-14", "1 Thessalonians 4:13-14 (KJV), Bible Gateway"), KJV_SRC, CRISIS, HELPLINE],
    related: ["/questions/prayer-for-caregivers/", "/questions/bible-verses-for-anxiety/", "/questions/psalms-for-sleep/", "/questions/bedtime-prayer/"],
  },
  // ---- 1b. Grief, Spanish
  {
    ...DES21, lang: "es", door: "faith", group: "Versículos", path: "/es/preguntas/versiculos-para-el-duelo/", alt: "/questions/bible-verses-for-grief/",
    title: "Versículos para el duelo (Reina-Valera 1909) · Peace Be Still",
    description: "Versículos para el duelo en la Reina-Valera 1909: para los primeros días después de una pérdida, las noches largas y los aniversarios, con una oración.",
    h1: "Versículos para el duelo: la Biblia para cuando pierdes a un ser querido",
    indexLabel: "Versículos para el duelo",
    indexNote: "Versículos de la Reina-Valera 1909 para los días después de una pérdida.",
    definition: "Los versículos para el duelo son los pasajes a los que acudimos cuando muere alguien que amamos: palabras que dicen que Dios está cerca de los quebrantados de corazón, que Jesús lloró ante una tumba y que la muerte no tiene la última palabra. No sirven para apurar el dolor. Lo acompañan, leídos despacio, uno a la vez.",
    quick: `El versículo que más se busca primero es Salmos 34:18: ${Q("PSA 34:18", "es")} Otros son Mateo 5:4, Juan 11:35, Salmos 147:3, 1 Tesalonicenses 4:13-14 y Apocalipsis 21:4. Lee uno al día, en voz alta si puedes.`,
    bestFor: "quien perdió a alguien y busca la Palabra para los días difíciles, y quien quiere enviar un versículo a una persona en duelo.",
    sections: [
      ["¿Qué versículos ayudan en los primeros días después de una pérdida?", `<p>En los primeros días, los versículos cortos son los más fáciles de sostener. Dicen que Dios está cerca y que llorar no es falta de fe.</p>
${V("PSA 34:18", "es")}
${V("MAT 5:4", "es")}
${V("JOH 11:35", "es")}
<p>Jesús lloró ante la tumba de su amigo Lázaro, aun sabiendo lo que iba a hacer. El dolor no es algo que haya que esconder de Dios.</p>`],
      ["¿Qué dice la Biblia sobre el corazón quebrantado?", `${V("PSA 147:3", "es")}
${V("2CO 1:3-4", "es")}
${V("PSA 23:4", "es")}`],
      ["¿Qué dice la Biblia sobre volver a ver a los que amamos?", `<p>Para el creyente que llora a otro creyente, Pablo escribe que el dolor y la esperanza van juntos.</p>
${V("1TH 4:13-14", "es")}
${V("JOH 14:1-2", "es")}
${V("REV 21:4", "es")}`],
      ["Versículos para las noches largas y los aniversarios", `${V("PSA 30:5", "es")}
${V("LAM 3:22-23", "es")}`],
      ["Una oración breve para el duelo", `<p>Señor, tú estás cerca de los quebrantados de corazón, y mi corazón está quebrantado. Esta noche no tengo palabras, así que te traigo mis lágrimas. Gracias por la vida de la persona que extraño. Sostén lo que yo no puedo sostener y quédate cerca en las horas más difíciles. En el nombre de Jesús, amén.</p>
<p class="muted">Una oración escrita para esta página, no un versículo de la Biblia.</p>`],
      ["Si el dolor es demasiado", `<p>El duelo puede pesar tanto que pienses en no seguir. Si es tu caso, busca ayuda ahora: en Estados Unidos llama al <strong>988</strong> y oprime 2 para español (988 Suicide &amp; Crisis Lifeline, las 24 horas, gratis). Fuera de Estados Unidos, <a href="https://findahelpline.com/">findahelpline.com</a> muestra una línea gratuita cerca de ti. Pedir ayuda no es falta de fe.</p>`],
      ["¿Dónde puedo escuchar la Biblia de noche?", `<p>Peace Be Still, una app {{stores.tag}}, tiene Mi Refugio en español, con la Reina-Valera 1909 para leer completa y gratis, y salmos para dormir. No reemplaza a un pastor, a un consejero ni a un médico.</p>`],
    ],
    faq: [
      ["¿Cuál es el mejor versículo para el duelo?", `Salmos 34:18 es el que más se busca primero: ${F("PSA 34:18", "Cercano está Jehová á los quebrantados de corazón", "es")}. Le siguen Mateo 5:4, Juan 11:35 y Apocalipsis 21:4. El mejor es el que puedas llevar contigo hoy.`],
      ["¿Qué versículo puedo enviar a alguien que perdió a un ser querido?", "Algo corto y suave: Salmos 34:18, Mateo 5:4 o 2 Corintios 1:3-4. Agrega una línea tuya, como “Estoy orando por ti esta semana”, y no esperes respuesta."],
      ["¿Llorar es falta de fe?", `No. Jesús lloró ante la tumba de Lázaro (Juan 11:35), y Pablo pide no entristecerse ${F("1TH 4:13-14", "como los otros que no tienen esperanza", "es")}, lo que da por hecho la tristeza. La fe y el dolor viven en el mismo corazón.`],
    ],
    sources: [bg("Salmos 34:18", "Salmos 34:18 (RVES), Bible Gateway", "RVES"), RV_SRC, CRISIS, HELPLINE],
    related: ["/es/preguntas/versiculos-de-fortaleza/", "/es/preguntas/oracion-de-la-noche/", "/es/preguntas/salmos-para-dormir/"],
  },
  // ---- 2. KJV Bible app (8,100 a month)
  {
    ...D21, lang: "en", door: "neutral", group: "Bible apps", path: "/kjv-bible-app/",
    title: "KJV Bible app: what to look for · Peace Be Still",
    description: "What a good KJV Bible app should have: the whole King James text free, the reference on every verse, audio, no ads and no trial, and what Peace Be Still offers.",
    h1: "KJV Bible app: what a good King James Bible app should have",
    indexLabel: "KJV Bible app",
    indexNote: "What to check in a King James app, and what Peace Be Still holds free.",
    definition: "A KJV Bible app is a phone app that holds the King James Version, the English translation first printed in 1611. Because the KJV is in the public domain in the United States, any app can carry the whole text free. What differs between apps is what sits around it: audio, ads, trials, and what is locked behind a subscription.",
    quick: "Check five things: the whole KJV is free to read, every verse shows its book, chapter and verse, there is audio, there are no ads, and nothing starts as a trial that turns into a charge. Peace Be Still, {{stores.short}}, has the whole KJV free to read, the Psalms and more chapters read aloud, no ads and no trial.",
    bestFor: "people who read the King James Version and want an app for it, or who were asked to pay for a Bible they expected to be free.",
    sections: [
      ["Is the King James Bible free to use in an app?", `<p>Yes, in the United States. The King James Version is in the public domain there, so an app can include all 66 books at no cost to you or to the app maker. In the United Kingdom it is printed under a Crown patent, which is why some UK editions carry a licence line.</p>
<p>So if an app asks you to pay just to read the KJV, the charge is for the app, not for the text. Many good apps carry it free.</p>`],
      ["What should a good KJV Bible app have?", `<table class="t"><thead><tr><th>Check</th><th>Why it matters</th></tr></thead><tbody>
<tr><td>The whole KJV free to read</td><td>The text is public domain; reading should never sit behind a paywall</td></tr>
<tr><td>Book, chapter and verse on every quote</td><td>So you can find it in your own Bible and share it accurately</td></tr>
<tr><td>Audio of the KJV</td><td>For the car, the kitchen, or reading along when your eyes are tired</td></tr>
<tr><td>No ads</td><td>Ads break up scripture and can track what you read</td></tr>
<tr><td>No trial</td><td>A “free trial” often turns into a weekly or yearly charge if you forget to cancel</td></tr>
<tr><td>Copy and share a single verse</td><td>So you can send one verse, not a whole screen</td></tr>
</tbody></table>`],
      ["Why do people still read the King James Version?", `<p>Many readers grew up on it, many churches still read it from the pulpit, and its rhythm makes it easy to memorise and to hear aloud. It is the translation most hymns, sermons and old family Bibles quote.</p>
${V("PSA 119:105")}
${V("ISA 40:8")}`],
      ["What does Peace Be Still include with the KJV?", `<table class="t"><thead><tr><th>Free version, for good</th><th>Paid plan ($7.99 a month or $39.99 a year)</th></tr></thead><tbody>
<tr><td>The whole King James Bible to read</td><td>Offline listening</td></tr>
<tr><td>Nearly every chapter read aloud, the Psalms included</td><td>A whispered sleep session every night</td></tr>
<tr><td>A morning verse and declaration, basic 7-day reading plans, saved verses, a journal and share cards</td><td>Longer plans, such as Mark and John a chapter a day</td></tr>
<tr><td>Your first whispered sleep night, then one a week</td><td>${claimText("en")}</td></tr>
<tr><td>One Bible chat a day, up to 5 messages</td><td>Every past story</td></tr>
</tbody></table>
<p>There are no ads, free or paid, and no trial. ${CHAT_VERSES}. In Spanish, the app uses the Reina-Valera 1909.</p>`],
      ["Is Peace Be Still out yet?", `<p>{{stores.out}} Every verse on this site is the King James text, checked against a stored copy.</p>`],
    ],
    faq: [
      ["Is there a free KJV Bible app with no ads?", "Yes. Several apps carry the whole King James Version free. Peace Be Still, {{stores.short}}, has the whole KJV free to read with no ads and no trial, and the Psalms and more chapters read aloud free."],
      ["Is there a KJV Bible app with audio?", "Many have audio. In Peace Be Still nearly every chapter, the Psalms included, is read aloud on the free version, and King James psalms are whispered for sleep at night."],
      ["Do I have to pay for the King James Bible?", "No. The KJV is in the public domain in the United States, so the text itself is free. Some apps charge for extras such as audio, plans or chat."],
      ["Is there a KJV Bible app in Spanish?", "The King James Version is English. The Spanish Bible of the same era that is also in the public domain is the Reina-Valera 1909, which Peace Be Still uses in its Spanish journey, Mi Refugio."],
    ],
    sources: [KJV_SRC, bg("Psalm 119:105", "Psalm 119:105 (KJV), Bible Gateway")],
    related: ["/daily-bible-verse-app/", "/free-bible-chat/", "/questions/how-to-start-reading-the-bible/", "/questions/whispered-bible-for-sleep/"],
  },
  // ---- 3. The cancel hub: seven apps, real steps, dated and sourced
  {
    ...D21, lang: "en", door: "neutral", group: "Cancelling a subscription", path: "/questions/how-to-cancel-bible-app-subscription/",
    title: "How to cancel a Bible app subscription (7 apps) · Peace Be Still",
    description: "Cancel steps for Hallow, Pray.com, Glorify, Abide, Dwell, Bible Chat and Haven, from each app's help page, plus Apple and Google refunds. Checked 21 Nov 2026.",
    h1: "How to cancel a Bible app subscription: 7 apps, step by step",
    indexLabel: "How to cancel a Bible app subscription (7 apps)",
    indexNote: "Hallow, Pray.com, Glorify, Abide, Dwell, Bible Chat and Haven, step by step.",
    definition: "To cancel a Bible or prayer app subscription, cancel it with whoever bills you: Apple (iPhone Settings), Google Play, or the app's own website. Deleting the app never cancels it. Most charges after “cancelling” come from cancelling in the wrong place, so find the billing source first, then follow the steps below.",
    quick: "Paid in the App Store: Settings › your name › Subscriptions › the app › Cancel Subscription. Paid in Google Play: Play Store › profile icon › Payments &amp; subscriptions › Subscriptions › Cancel. Paid on the app's website: cancel in your account on that website. Then check for the red expiry date or a confirmation email.",
    bestFor: "anyone trying to stop a Bible, prayer or Christian meditation app from charging again, and anyone who was charged after they thought they had cancelled.",
    sections: [
      ["First: where are you being billed?", `<p>One app can bill you in up to four places, and only that place can cancel it. Look at the receipt email or your card statement:</p>
<ul>
<li><strong>“Apple” or “APPLE.COM/BILL”</strong>: cancel on your iPhone or iPad (steps below).</li>
<li><strong>“Google” or “Google Play”</strong>: cancel in the Play Store.</li>
<li><strong>The app's own name</strong> (often through Stripe or PayPal): you signed up on its website; cancel there.</li>
<li><strong>Amazon</strong>: cancel in your Amazon account's app subscriptions.</li>
</ul>
<p>If you have more than one Apple ID or Google account, check each one.</p>`],
      ["How do I cancel on an iPhone or iPad?", `<p>Apple's steps (Apple Support, “Cancel a subscription from Apple”):</p>
${APPLE_STEPS}`],
      ["How do I cancel on Android?", `<p>Google's steps (Google Play Help):</p>
${PLAY_STEPS}`],
      ["How to cancel Hallow", `<p>Hallow can bill through Apple, Google Play, Amazon or Hallow.com. Its help page says to check first: in the app, go to <strong>Me › Settings › Subscription</strong> and read the “Subscribed through…” line.</p>
<ul>
<li><strong>Apple, Google Play or Amazon:</strong> cancel with that store (steps above). Hallow cannot cancel these for you.</li>
<li><strong>Hallow.com, from the app:</strong> Me › Settings › Subscription › Cancel My Subscription, tap “Continue to Cancellation” at each prompt, then on the website tap the red Cancel Subscription button and Continue. Wait for “Success! Your Subscription has been canceled and will not renew.”</li>
<li><strong>Hallow.com, from a browser:</strong> log in at hallow.com, open the menu (three lines, top right) › Settings › Subscription › Cancel Subscription, and confirm.</li>
</ul>
<p>Hallow says you keep access until the end of the paid period or trial, then return to the free version; to avoid a trial charge, cancel at least 24 hours before it renews. For money back, Hallow says to cancel first, then follow its refund article. Sources: ${a(L.hallowCancel, "Hallow Help, “How do I cancel my subscription or free trial?”")} (dated 22 Jul 2026) and ${a(L.hallowRefund, "“I was charged but want a refund”")}, both read ${READ}.</p>`],
      ["How to cancel Pray.com", `<p>Pray.com's help page says to check your bank or card statement first: a charge from “Pray.com” means you bought directly from Pray.com; a charge from Apple or Google means you cancel in that store.</p>
<ul>
<li><strong>Regular Premium bought from Pray.com:</strong> log in at pray.com/login with the email used for the subscription, go to Manage Subscription, choose the cancel option and follow the prompts.</li>
<li><strong>Give and Go Ad-Free Plan (a donation that comes with an ad-free account):</strong> in the Pray.com app, Settings › Manage Donation, then follow the prompts.</li>
<li><strong>Apple:</strong> Settings › your name › Subscriptions › Pray.com › Cancel.</li>
<li><strong>Google Play:</strong> Google Play Store › Menu › Subscriptions › Pray.com › Cancel.</li>
</ul>
<p>Pray.com warns not to delete your account before the subscription is cancelled, because deleting it often does not stop billing. If you still cannot find it, its help page asks you to contact support with your account email, the last 4 digits of the card and a screenshot of the charge. Sources: ${a(L.prayCancel, "Pray.com Help, “How to Cancel Your Pray.com Subscription”")} (3 Feb 2026) and ${a(L.prayGoogle, "“Cancelling a Pray.com trial or subscription from Google”")}, both read ${READ}.</p>`],
      ["How to cancel Glorify", `<p>Glorify's help page says to cancel through the store that bills you:</p>
<ul>
<li><strong>iPhone:</strong> Settings › your name › Media and Purchases › View Account › Subscriptions › Glorify › Cancel Subscription. (The shorter Settings › your name › Subscriptions path above reaches the same list.)</li>
<li><strong>Android:</strong> open the Google Play Store, not Glorify › profile icon › Payments &amp; Subscriptions › Subscriptions › Glorify › Cancel subscription.</li>
</ul>
<p>Glorify notes that deleting your Glorify account does not cancel the subscription, that auto-renew must be off at least 24 hours before the period ends, and that cancelling does not refund what was already paid; you keep premium until it expires. Source: ${a(L.glorifyCancel, "Glorify Help, “How do I cancel my subscription?”")} (updated 13 Oct 2026, read ${READ}).</p>`],
      ["How to cancel Abide", `<ul>
<li><strong>App Store:</strong> Settings › your name › Subscriptions › Abide › Cancel Subscription.</li>
<li><strong>Google Play:</strong> the Google Play steps above, or in the Abide app, More › Settings › Manage subscription.</li>
<li><strong>Abide website (card through Stripe):</strong> in the Abide app, More › Settings › Manage Subscription › Cancel.</li>
</ul>
<p>Abide says uninstalling the app or deleting your account does not cancel, and you keep Premium until the end of the current billing period. Source: ${a(L.abideCancel, "Abide Help, “How Do I CANCEL My Premium Subscription?”")} (updated 6 Oct 2026, read ${READ}).</p>`],
      ["How to cancel Dwell", `<ul>
<li><strong>Bought on the Dwell website:</strong> open <a rel="nofollow noopener" href="https://dwellapp.io/account/subscription">your Dwell account page</a> and use the “Billing and Subscription” section, or in the app tap the gear icon (top left) › Subscription and follow the prompts. Dwell's team also offers to cancel a website subscription for you by email.</li>
<li><strong>Bought in the App Store or Google Play:</strong> cancel with that store (steps above). Dwell says it cannot cancel store subscriptions for you.</li>
</ul>
<p>Source: ${a(L.dwellCancel, "Dwell Help, “How do I cancel my Dwell subscription?”")} (published 21 May 2026, read ${READ}).</p>`],
      ["How to cancel Bible Chat", `<p>Bible Chat: Daily Devotional (Book Vitals Inc.) offers a free 7-day trial, then a weekly plan at $4.99 or longer plans, according to its ${a(L.bibleChat, "App Store listing")} (checked ${READ}). The website its listing links to gives the iPhone steps: Settings › your Apple Account › Subscriptions › Bible Chat › Cancel, then confirm (${a(L.bibleChatCancel, "“How to Cancel Your Bible Chat Subscription”")}, 27 May 2025). On Android, use the Google Play steps above. To stop a trial from turning into a charge, cancel at least 24 hours before it ends. Full steps: <a href="/questions/how-to-cancel-bible-chat-subscription/">how to cancel a Bible Chat subscription</a>.</p>`],
      ["How to cancel Haven", `<p>Haven - Bible Chat (E12 Holdings LLC) says on its ${a(L.haven, "App Store listing")} that access requires a paid subscription (checked ${READ}). Its website, havenbibleapp.com, links only to the App Store and Google Play, and its FAQ says you can cancel any time, without listing steps (read ${READ}). So cancel in the store you subscribed through, with the Apple or Google steps above. There are two apps named Haven, so check the developer name. Full steps: <a href="/questions/how-to-cancel-haven-subscription/">how to cancel a Haven subscription</a>.</p>`],
      ["All seven at a glance", `<table class="t"><thead><tr><th>App</th><th>Can bill through</th><th>Where to cancel</th><th>Official steps</th></tr></thead><tbody>
<tr><td>Hallow</td><td data-label="Can bill through">Apple, Google Play, Amazon, Hallow.com</td><td data-label="Where to cancel">The store, or Me › Settings › Subscription for Hallow.com</td><td data-label="Official steps">${a(L.hallowCancel, "Hallow Help")}</td></tr>
<tr><td>Pray.com</td><td data-label="Can bill through">Apple, Google Play, Pray.com</td><td data-label="Where to cancel">The store, or pray.com/login › Manage Subscription</td><td data-label="Official steps">${a(L.prayCancel, "Pray.com Help")}</td></tr>
<tr><td>Glorify</td><td data-label="Can bill through">Apple, Google Play</td><td data-label="Where to cancel">The store</td><td data-label="Official steps">${a(L.glorifyCancel, "Glorify Help")}</td></tr>
<tr><td>Abide</td><td data-label="Can bill through">Apple, Google Play, Abide website</td><td data-label="Where to cancel">The store, or More › Settings › Manage Subscription</td><td data-label="Official steps">${a(L.abideCancel, "Abide Help")}</td></tr>
<tr><td>Dwell</td><td data-label="Can bill through">Apple, Google Play, Dwell website</td><td data-label="Where to cancel">The store, or your Dwell account › Billing and Subscription</td><td data-label="Official steps">${a(L.dwellCancel, "Dwell Help")}</td></tr>
<tr><td>Bible Chat</td><td data-label="Can bill through">Apple, Google Play</td><td data-label="Where to cancel">The store</td><td data-label="Official steps">${a(L.bibleChatCancel, "Its website")}</td></tr>
<tr><td>Haven</td><td data-label="Can bill through">Apple, Google Play</td><td data-label="Where to cancel">The store</td><td data-label="Official steps">None listed (${READ})</td></tr>
</tbody></table>
<p class="muted">Billing routes come from each app's help page, listing or website as read on ${READ}. Steps change; if a screen looks different, the app's own help page wins.</p>`],
      ["Can I get a refund?", `<ul>
<li><strong>Apple:</strong> go to <a href="https://reportaproblem.apple.com/">reportaproblem.apple.com</a>, sign in, choose “Request a refund”, then the reason and the purchase. Apple decides each request.</li>
<li><strong>Google Play:</strong> Google's refund policy explains when to ask Google and when to ask the developer.</li>
<li><strong>Website purchases:</strong> ask the app's own support; your bank can help if a charge was never authorised.</li>
</ul>
<p>Cancelling stops the next renewal; on its own it does not refund the current period.</p>`],
      ["What if I was charged after I cancelled?", `<p>Some App Store reviewers in 2026 report a charge after they believed they had cancelled. In the help pages above, the usual reasons are cancelling in the wrong place (for example deleting the app, or cancelling on the website when Apple bills you), a second account, or a trial cancelled less than 24 hours before it ended. Check each billing source, keep a screenshot of the red expiry date or the confirmation email, then use the refund routes above.</p>`],
      ["A Bible app with no trial", `<p>Peace Be Still, {{stores.tag}}, has no trial and no website billing: a free version that stays free, and a paid plan at $7.99 a month or $39.99 a year billed only by Apple or Google, so it cancels in the same two places as above.</p>`],
    ],
    faq: [
      ["Does deleting a Bible app cancel the subscription?", "No. Apple, Google or the app's website keeps billing until you cancel there. Hallow, Glorify, Abide and Pray.com each say this on their own help pages."],
      ["Why can't I find the subscription in my iPhone settings?", "You may have paid on the app's website, with Google Play, with Amazon, or under another Apple ID. Check the receipt email for who billed you. On iPhone, no Cancel button with a red date means it is already cancelled."],
      ["When should I cancel a free trial?", "At least 24 hours before it ends. Apple, Hallow and Glorify all give the 24-hour rule. You can usually keep using the trial until its end date."],
      ["Will I lose access straight away?", "Usually not. Hallow, Glorify, Abide and Apple each say you keep what you paid for until the end of the current period."],
    ],
    sources: [[`Hallow Help: How do I cancel my subscription or free trial? (read ${READ})`, L.hallowCancel], [`Glorify Help: How do I cancel my subscription? (read ${READ})`, L.glorifyCancel], [`Abide Help: How Do I CANCEL My Premium Subscription? (read ${READ})`, L.abideCancel], [`Dwell Help: How do I cancel my Dwell subscription? (read ${READ})`, L.dwellCancel], [`Pray.com Help: How to Cancel Your Pray.com Subscription (read ${READ})`, L.prayCancel], [`Bible Chat: How to Cancel Your Bible Chat Subscription (read ${READ})`, L.bibleChatCancel], APPLE_CANCEL, PLAY_CANCEL, APPLE_REFUND, PLAY_REFUND],
    notAffiliated: "Hallow, Pray.com, Glorify, Abide, Dwell, Bible Chat, Haven",
    related: ["/bible-chat-cancel-subscription/", "/questions/how-to-cancel-haven-subscription/", "/questions/how-to-cancel-bible-chat-subscription/", "/questions/hallow-app-cost/"],
  },
  // ---- 5. Is Hallow only for Catholics? (~720 a month across the cluster)
  {
    ...D21, lang: "en", door: "neutral", group: "Bible apps compared", path: "/questions/is-hallow-only-for-catholics/",
    title: "Is Hallow only for Catholics? Its own answer · Peace Be Still",
    description: "Is Hallow only for Catholics? Its own help page says no, while its content is Catholic and reviewed by Church leaders. What that means for Protestants.",
    h1: "Is Hallow only for Catholics?",
    indexLabel: "Is Hallow only for Catholics?",
    indexNote: "Hallow's own answer, what is inside, and what it means for Protestants.",
    definition: "No, according to Hallow itself: its help page answers “Is Hallow only for Catholics?” with “No.” It also says Hallow is built with Catholic Church leaders so that its content stays faithful to Church teaching. So anyone can use it, but what you will find inside is Catholic prayer: the rosary, the saints, the Catholic Bible.",
    quick: "Hallow welcomes people of every faith, by its own account, and its App Store listing calls it the “#1 Catholic App”. Protestants can use its Scripture readings and Christian meditation, but much of the library is Catholic devotion, so it suits Catholics, people exploring Catholicism, and Christians comfortable with Catholic prayer.",
    bestFor: "Protestant, Baptist, Pentecostal, non-denominational and other Christians wondering whether Hallow is meant for them.",
    sections: [
      ["What does Hallow say about non-Catholics?", `<p>From Hallow's help page (${a(L.hallowFaq, "Frequently asked questions")}, read ${READ}): to “Is Hallow only for Catholics?” it answers “No.” It says Hallow “is built in close collaboration with leaders of the Catholic Church” to keep content faithful to Church teaching, that it “welcomes people from every faith background”, and that “many non-Catholics use the app as a resource for prayer, meditation, and finding peace.”</p>
<p>Its ${a(L.hallow, "App Store listing")} (checked ${READ}) says the same in other words: content is “based on content from the approved Catholic Bible” and reviewed by senior Church leaders, and “it is meant as a resource for people of all faiths &amp; religions.”</p>`],
      ["What is inside Hallow that is specifically Catholic?", `<p>Its listing names, among other things:</p>
<ul>
<li>The Rosary, “Meditate with Mary through the mysteries of the Catholic Rosary”, and the Divine Mercy Chaplet.</li>
<li>Night Prayer from the Liturgy of the Hours, and Catholic Bible stories for sleep.</li>
<li>Lectio Divina and the Examen, which are older practices some Protestants also use.</li>
<li>Homilies and guests, including Catholic priests.</li>
</ul>
<p>It also has Scripture readings, Christian meditation and music that many Christians would find familiar.</p>`],
      ["Does Hallow use a Protestant or a Catholic Bible?", `<p>Hallow's listing says its content is based on the approved Catholic Bible. Catholic Bibles include books Protestant Bibles leave out, such as Tobit, Judith, Wisdom, Sirach and 1 and 2 Maccabees. The King James Version of 1611 printed these between the testaments as the Apocrypha, and most KJV printings today leave them out.</p>`],
      ["What do reviewers who are not Catholic say?", `<p>Among Hallow's 500 most recent US App Store reviews (24 Mar to 18 Nov 2026, read ${READ}), a handful mention not being Catholic, and they split. One five-star reviewer called it “Excellent for Catholics &amp; I still reccomend it to non Catholics” (13 Sep 2026). A three-star reviewer wrote that it is “very much an app for Catholics and not for Christians in general” (9 Apr 2026). Others mention exploring Catholicism through it. These are reviewers' views, not ours.</p>`],
      ["Who is Hallow a good fit for?", `<table class="t"><thead><tr><th>If you are…</th><th>Hallow, from its own description</th></tr></thead><tbody>
<tr><td>Catholic</td><td>Built for you: rosary, saints, Liturgy of the Hours, Catholic guests</td></tr>
<tr><td>Exploring Catholicism</td><td>A way in, with seasonal challenges such as Pray25 for Advent</td></tr>
<tr><td>A Christian comfortable with Catholic prayer</td><td>Scripture, meditation and music you can use, beside Catholic devotions</td></tr>
<tr><td>A Protestant who wants only a Protestant Bible and teaching</td><td>Much of the library will not fit; the Scripture readings may</td></tr>
</tbody></table>`],
      ["What does Hallow cost?", `<p>$9.99 a month or $69.99 a year in the United States, per the subscription terms in its ${a(L.hallow, "App Store description")} (checked ${READ}). Its daily prayers, including the rosary, and a 9-day intro challenge are free. See <a href="/questions/hallow-app-cost/">Hallow app cost</a> and <a href="/questions/is-hallow-app-free/">is Hallow free?</a></p>`],
      ["Is there a Bible app that is not tied to one church?", `<p>Peace Be Still, {{stores.short}}, is a King James Bible app that is not tied to one denomination: the whole KJV free to read, whispered psalms for sleep, and a Bible chat that answers from the plain words of Scripture and suggests your own pastor for your own situation. It is a different kind of app from Hallow, without a Catholic library.</p>`],
    ],
    faq: [
      ["Can a Protestant use Hallow?", "Yes. Hallow says it welcomes people from every faith background. Expect Catholic devotions such as the rosary and the Liturgy of the Hours beside Scripture readings and Christian meditation."],
      ["Is Hallow a Catholic app?", "Yes. Its App Store listing calls it the “#1 Catholic App” and says its content is reviewed by senior leaders within the Church and based on the approved Catholic Bible."],
      ["Is Hallow a Christian app?", "Yes. Its listing describes it as a Christian prayer app; it is Catholic in its teaching and content."],
      ["Is Peace Be Still connected to Hallow?", "No. Peace Be Still is not affiliated with Hallow."],
    ],
    sources: [[`Hallow Help: Frequently asked questions (read ${READ})`, L.hallowFaq], [`Hallow: Prayer & Meditation, App Store listing (US), checked ${READ}`, L.hallow]],
    notAffiliated: "Hallow",
    related: ["/questions/hallow-app-review/", "/questions/hallow-app-cost/", "/questions/is-hallow-app-free/", "/questions/how-to-cancel-bible-app-subscription/"],
  },
  // ---- 6a. Daily Bible verse app (1,900 a month)
  {
    ...D21, lang: "en", door: "neutral", group: "Bible apps", path: "/daily-bible-verse-app/",
    title: "Daily Bible verse app: free, with no ads · Peace Be Still",
    description: "What a daily Bible verse app should do: one verse each morning from a named translation, no pop-ups, no ads, easy sharing, and at most one gentle reminder.",
    h1: "Daily Bible verse app: one verse a morning, and nothing in the way",
    indexLabel: "Daily Bible verse app",
    indexNote: "What to look for, and Morning Word in Peace Be Still.",
    definition: "A daily Bible verse app gives you one verse of scripture each day, usually in the morning, with its book, chapter and verse. The good ones get out of the way: the verse comes first, there are no pop-ups or ads in front of it, you can share it, and the reminder is one gentle nudge you chose, not a stream of notifications.",
    quick: `Look for a verse from a named translation with its reference, no ads, no pop-up before the verse, one-tap sharing of just that verse, and an optional reminder you can turn off. In Peace Be Still, {{stores.short}}, Morning Word gives a King James verse and a short declaration each morning, free.`,
    bestFor: "people who want a verse to start the day, without ads, upsells or notification guilt.",
    sections: [
      ["What should a daily Bible verse app do?", `<ol>
<li><strong>Show the verse first.</strong> Nothing should stand between you and the morning's scripture: no gadget advert, no sponsor box.</li>
<li><strong>Name the translation and reference.</strong> “Lamentations 3:22-23 · KJV”, so you can find it in your own Bible.</li>
<li><strong>Let you share one verse.</strong> As text or a card, not a screenshot of the whole screen.</li>
<li><strong>Remind you gently, once.</strong> One optional reminder a day, off with one switch.</li>
<li><strong>Stay free.</strong> A verse a day should never need a trial or a subscription.</li>
</ol>`],
      ["What does a morning verse look like?", `<p>Here is the first Morning Word in Peace Be Still, the King James text with its reference:</p>
${V("LAM 3:22-23")}
<p>Under it sits one short declaration to say aloud, rooted in that verse: “Yesterday is behind me. This morning is new, and I get up leaning on a faithfulness that did not run out overnight.”</p>`],
      ["Which Bible verses are good to start the day?", `${V("PSA 118:24")}
${V("PSA 5:3")}
${V("JOS 1:9")}`],
      ["What do people dislike in daily verse apps?", `<p>In the 21 Nov 2026 read of 4,430 recent App Store reviews of eleven faith apps, the most common complaints in low ratings were price, features that used to be free moving behind a paywall, trials that turned into charges, and adverts or upsells. Some reviewers mention an advert appearing “the very second you open the app”. These are reviewers' reports about other apps, not a finding about any one of them.</p>`],
      ["What does Peace Be Still's daily verse include?", `<table class="t"><thead><tr><th>Free, every day</th><th>With a paid plan</th></tr></thead><tbody>
<tr><td>Morning Word: a King James verse and a short declaration</td><td>Declaration topics</td></tr>
<tr><td>Today's Bible story</td><td>Every past story</td></tr>
<tr><td>Share cards with the verse and reference</td><td>Longer reading plans</td></tr>
<tr><td>One optional reminder a day, asked only after you have used the app, off in Settings</td><td>Offline listening</td></tr>
</tbody></table>
<p>No ads free or paid, and no trial. A home-screen verse widget is not in the first version.</p>`],
    ],
    faq: [
      ["Is there a free daily Bible verse app with no ads?", "Yes. Peace Be Still, {{stores.short}}, has a free Morning Word verse and declaration every day with no ads and no trial. Many other Bible apps also offer a free verse of the day."],
      ["Which translation does the daily verse use?", "In Peace Be Still, the King James Version in English and the Reina-Valera 1909 in Spanish, each with its book, chapter and verse."],
      ["Will the app send me lots of notifications?", "Peace Be Still sends at most one gentle reminder a day, only if you say yes, and you can turn it off in Settings. A missed day is never scolded."],
    ],
    sources: [bg("Lamentations 3:22-23", "Lamentations 3:22-23 (KJV), Bible Gateway"), KJV_SRC],
    related: ["/questions/daily-bible-declarations/", "/kjv-bible-app/", "/questions/how-to-start-reading-the-bible/", "/free-bible-chat/"],
  },
  // ---- 6b. Prayer for caregivers (1,300 a month, KD 0)
  {
    ...D21, lang: "en", door: "faith", group: "Bible verses and prayers for hard days", path: "/questions/prayer-for-caregivers/",
    title: "Prayer for caregivers, with Bible verses · Peace Be Still",
    description: "Short prayers for caregivers looking after a parent, a spouse or a sick child, with King James verses for strength, and a prayer for a caregiver you love.",
    h1: "Prayer for caregivers: short prayers and verses for tired hands",
    indexLabel: "Prayer for caregivers",
    indexNote: "Short prayers and King James verses for people caring for someone.",
    definition: "A prayer for caregivers asks God for strength, patience and rest for someone looking after a person who cannot look after themselves: an ageing parent, a spouse with an illness, a child with special needs. It can be prayed by the caregiver in a spare minute, or by friends and church family who want to hold them up.",
    quick: `A one-line prayer for a hard moment: “Lord, give me strength for this hour, gentleness for this person, and rest when the house is quiet.” A verse to keep near: Galatians 6:9, ${Q("GAL 6:9")}`,
    bestFor: "caregivers of a parent, spouse or child, and anyone who wants to pray for a caregiver.",
    sections: [
      ["A short prayer for a caregiver who is tired", `<p>Lord, my hands are tired and my heart is stretched thin. Give me strength for the next hour, not the whole week. Make me gentle with the one I care for, and gentle with myself when I fall short. Send help I did not ask for, and let me sleep when the house is quiet. In Jesus' name, amen.</p>`],
      ["A prayer for a caregiver you love", `<p>Father, thank you for the way [name] gives of themselves every day. Carry the weight they carry. Give them people who show up, rest that refreshes, and a moment today when they know they are seen. Protect their health, and let them feel your nearness at the end of the day. In Jesus' name, amen.</p>
<p class="muted">Prayers written for this page, not verses of scripture.</p>`],
      ["Which Bible verses are for caregivers?", `${V("GAL 6:9")}
${V("ISA 40:29-31")}
${V("MAT 11:28")}
${V("2CO 12:9")}
${V("1PE 5:7")}`],
      ["What does the Bible say about caring for others?", `<p>Scripture treats carrying someone else's load as part of following Christ, and it promises that God carries his people too, all the way to old age.</p>
${V("GAL 6:2")}
${V("ISA 46:4")}`],
      ["How can a caregiver pray when there is no time?", `<ul>
<li><strong>One line, many times.</strong> “Lord, help me” at the sink is a prayer.</li>
<li><strong>Pray the task.</strong> While you give a medicine or fold a blanket, name the person and ask God to hold them.</li>
<li><strong>Keep one verse in view.</strong> Tape Galatians 6:9 to the fridge or the bathroom mirror.</li>
<li><strong>Let others pray.</strong> Tell your church or one friend exactly what to pray this week.</li>
<li><strong>Listen at night.</strong> A psalm read aloud once the house is asleep can be the prayer when you have no words.</li>
</ul>`],
      ["When caregiving is too heavy", `<p>Caregivers carry a lot, often alone. If you are running on empty, tell your doctor, and ask about respite care through your local agency on ageing or the care team. If you ever feel you cannot go on, in the US call or text <strong>988</strong>, any hour; outside the US, <a href="https://findahelpline.com/">findahelpline.com</a> lists a free line near you.</p>`],
      ["Where can I hear scripture when the house is quiet?", `<p>Peace Be Still, {{stores.tag}}, reads King James psalms in a whisper on a dark screen with a sleep timer; the first night is free, then one a week on the free version. It also has one Bible chat a day, free, for saying what is on your heart. It does not replace your doctor, a counsellor or your pastor.</p>`],
    ],
    faq: [
      ["What is a good prayer for a caregiver?", "Keep it short and honest: “Lord, give me strength for this hour, gentleness for this person, and rest when the house is quiet.” Short prayers fit a caregiver's day and can be prayed many times."],
      ["What Bible verse is for caregivers?", `Galatians 6:9 (${F("GAL 6:9", "let us not be weary in well doing")}) and Isaiah 40:29-31 (${F("ISA 40:29-31", "He giveth power to the faint")}) are the most used. Matthew 11:28 and 1 Peter 5:7 are for the days when you are the one who needs care.`],
      ["How do I pray for someone caring for a sick parent?", "Pray for their strength, their sleep, help from others, and their own health. Then tell them you prayed, and offer one practical thing, such as a meal or an hour's sitting."],
    ],
    sources: [bg("Galatians 6:9", "Galatians 6:9 (KJV), Bible Gateway"), bg("Isaiah 40:29-31", "Isaiah 40:29-31 (KJV), Bible Gateway"), KJV_SRC, CRISIS, HELPLINE],
    related: ["/questions/bible-verses-for-grief/", "/questions/bedtime-prayer/", "/questions/prayer-for-sleep/", "/questions/bible-verses-for-anxiety/"],
  },
  // ---- 6c. How to start reading the Bible (2,900 a month, KD 2)
  {
    ...D21, lang: "en", door: "faith", group: "Reading the Bible", path: "/questions/how-to-start-reading-the-bible/",
    title: "How to start reading the Bible: a plan · Peace Be Still",
    description: "How to start reading the Bible if you are new or coming back: begin with a Gospel, read a chapter a day, keep a short note, and what to read next.",
    h1: "How to start reading the Bible: a simple way in for beginners",
    indexLabel: "How to start reading the Bible",
    indexNote: "Start with a Gospel, a chapter a day, and where to go next.",
    definition: "To start reading the Bible, begin with one of the Gospels, the four books about the life of Jesus, rather than at page one. Read one chapter a day, at the same time each day, and write one line about what you noticed. The Bible is a library of 66 books, so it helps to know which shelf you are reading from.",
    quick: `Start with Mark (16 short chapters) or John (21). Read one chapter a day, ask three questions (what does this say about God, about people, about me?), and keep going after a missed day. John says why the Gospels were written: ${Q("JOH 20:31")}`,
    bestFor: "new believers, people coming back to faith, and anyone who has tried to read the Bible from Genesis and stalled.",
    sections: [
      ["Where should a beginner start reading the Bible?", `<p>Start with a Gospel. Mark is the shortest and moves fast; John slows down and explains who Jesus is. After that, many people read Psalms (prayers and songs) and Proverbs (short sayings, one chapter for each day of the month), then Acts (the first churches) and Genesis.</p>
${V("MAR 1:1")}`],
      ["How do I read the Bible every day?", `<ol>
<li><strong>Pick a time.</strong> The same time each day: with coffee, at lunch, or before bed.</li>
<li><strong>Pick an amount.</strong> One chapter is enough. Ten minutes is enough.</li>
<li><strong>Read slowly, then once more.</strong> The second read is where things stand out.</li>
<li><strong>Ask three questions.</strong> What does this show about God? About people? What will I carry today?</li>
<li><strong>Write one line.</strong> A sentence in a notebook or a notes app.</li>
<li><strong>Miss a day? Keep going.</strong> Pick up at the next chapter, not back at the start.</li>
</ol>`],
      ["How is the Bible organised?", `<table class="t"><thead><tr><th>Part</th><th>Books</th><th>What you will find</th></tr></thead><tbody>
<tr><td>Law</td><td>Genesis to Deuteronomy</td><td>Creation, Abraham, Moses, the Exodus</td></tr>
<tr><td>History</td><td>Joshua to Esther</td><td>Israel in the land, judges, kings, exile and return</td></tr>
<tr><td>Poetry and wisdom</td><td>Job to Song of Solomon</td><td>Psalms, Proverbs, Ecclesiastes</td></tr>
<tr><td>Prophets</td><td>Isaiah to Malachi</td><td>God's messages through the prophets</td></tr>
<tr><td>Gospels</td><td>Matthew, Mark, Luke, John</td><td>The life, death and resurrection of Jesus</td></tr>
<tr><td>The early church</td><td>Acts to Jude</td><td>The first churches and the letters written to them</td></tr>
<tr><td>Prophecy</td><td>Revelation</td><td>John's vision of the end and the new creation</td></tr>
</tbody></table>
<p>That is 39 books in the Old Testament and 27 in the New, 66 in all, in a Protestant Bible such as the King James Version.</p>`],
      ["Which translation should I read?", `<p>Choose one you will actually read, and stay with it for a while. The King James Version (1611) is the classic: many churches read it, most hymns and old family Bibles quote it, and it is in the public domain in the United States. Its older words (thee, thou, hath) take a week or two to get used to; reading it aloud helps.</p>
${V("PSA 119:105")}`],
      ["What if I don't understand what I read?", `<p>That is normal, even for long-time readers. Mark the verse and keep reading; the next chapter often explains it. Ask your pastor or a small group, and read with someone if you can. The Bible itself pictures people searching it together and checking what they heard:</p>
${V("ACT 17:11")}`],
      ["How does Peace Be Still help you start?", `<p>Peace Be Still, {{stores.tag}}, has the whole King James Bible free to read, the Psalms and more chapters read aloud, and free 7-day plans (a week of rest, of courage, of mercy). Longer plans, such as Mark and John a chapter a day for 37 days, are on a paid plan at $7.99 a month or $39.99 a year, with no trial and no ads.</p>`],
    ],
    faq: [
      ["What book of the Bible should I read first?", "Mark or John. Mark is short and fast; John explains who Jesus is. Starting at Genesis is fine too, but many people stall in Leviticus, so a Gospel first is the easier way in."],
      ["How long does it take to read the whole Bible?", "About a year at three or four chapters a day. There are 1,189 chapters in a Protestant Bible. One chapter a day takes a little over three years, and that is fine."],
      ["Should I read the Bible in order?", "Not at first. The books are grouped by kind, not by the order you need them. Start with a Gospel, then Psalms, Proverbs, Acts and Genesis, then fill in the rest."],
      ["Is the King James Version hard to read?", "It uses older English, but most readers adjust in a week or two. Reading it aloud, and starting with a Gospel or the Psalms, makes it easier."],
    ],
    sources: [bg("John 20:31", "John 20:31 (KJV), Bible Gateway"), bg("Acts 17:11", "Acts 17:11 (KJV), Bible Gateway"), KJV_SRC],
    related: ["/kjv-bible-app/", "/daily-bible-verse-app/", "/questions/bible-stories-for-adults/", "/questions/psalms-for-sleep/"],
  },
];
