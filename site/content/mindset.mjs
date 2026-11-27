// The Mindset door's pages (21 Nov 2026): the hub (/mindset/, /es/mentalidad/) and its question pages,
// rendered by site/scripts/build-seed-pages.mjs with the same layout, schema, breadcrumbs and CTA as every
// question page. Searches picked from OpenSEO keyword metrics (US, read 21 Nov 2026).
// Rules (site/test/mindset.test.mjs holds each one):
// - no faith words on any Mindset page; manifesting words are allowed here and only here;
// - each page answers the question first; Peace Be Still comes only in its last section;
// - every count and price is read from the app's settings (facts()), never typed;
// - no outcome or health promise, no trial or urgency wording;
// - another app's facts (cancel steps, data settings) only from its own page, linked, with the date read.
import { readdirSync, readFileSync } from "node:fs";
import { facts } from "./parts.mjs";

const F = facts();
const I18N = Object.fromEntries(["en", "es"].map((l) => [l, JSON.parse(readFileSync(new URL(`../../app/src/i18n/${l}.json`, import.meta.url), "utf8"))]));
// The app's own Mindset declarations, quoted (they are the lines the app shows).
const say = (key, lang = "en") => {
  const t = I18N[lang][key];
  if (!t) throw new Error(`NAMED STOP [MINDSET_LINE_MISSING] ${key} (${lang})`);
  return `<q>${t}</q>`;
};
const TOPICS = (lang) => ["calm", "confidence", "work", "people", "home", "begin"].map((k) => I18N[lang][`declaration.topic.${k}`]).join(", ");
const NIGHTS = readdirSync(new URL("../../content/imagination-nights/en/", import.meta.url)).filter((f) => f.endsWith(".json")).length;
if (NIGHTS < 10) throw new Error(`NAMED STOP [FEW_NIGHTS] only ${NIGHTS} Imagination Nights found`);

const D = { published: "2026-11-21", updated: "2026-11-21", publishedText: "21 Nov 2026", updatedText: "21 Nov 2026" };
const DES = { published: "2026-11-21", updated: "2026-11-21", publishedText: "21 nov 2026", updatedText: "21 nov 2026" };
const READ = "21 Nov 2026";
const LEIDO = "21 nov 2026";
const APPLE = ["Apple Support: Cancel a subscription from Apple", "https://support.apple.com/en-us/118428"];
const PLAY = ["Google Play Help: Cancel, pause, or change a subscription on Google Play", "https://support.google.com/googleplay/answer/7018481"];
const LIFELINE = ["988 Suicide & Crisis Lifeline", "https://988lifeline.org/"];
const CRISIS = `<p class="muted">Affirmations are not medical care. If worry is getting in the way of your days, a doctor or a licensed counselor can help. If you are thinking about hurting yourself, call or text <a href="tel:988">988</a>, the Suicide &amp; Crisis Lifeline (United States), any time.</p>`;
const CRISIS_ES = `<p class="muted">Las afirmaciones no son atención médica. Si la preocupación no te deja vivir tus días, un médico o un consejero con licencia puede ayudarte. Si piensas en hacerte daño, llama o envía un mensaje al <a href="tel:988">988</a> (Línea de Prevención del Suicidio y Crisis, Estados Unidos; para español, marca 2 o envía AYUDA al 988).</p>`;

// ---- The app, said once, at the end of each page.
const FEAT = {
  en: {
    words: `<li><strong>Morning Word · Daily Declarations:</strong> one line to say out loud each morning, such as ${say("mindset.begin.1")} Free every day; a plan adds topics (${TOPICS("en")}).</li>`,
    nights: `<li><strong>Imagination Nights:</strong> ${NIGHTS} whispered night sessions. Each is a short teaching, a scene read softly, then quiet, on a dark screen with a sleep timer that fades out. Your first night is free, then one a week; a plan opens one every night.</li>`,
    chat: `<li><strong>Mindset chat:</strong> say what is on your mind and get a short, calm answer, marked AI every time; it is not a counselor or a person. Free chat (one a day, up to ${F.free} messages) uses a free AI service that may keep what you type, so the app asks before your first one. With a paid plan, the first ${F.paid} messages each day are private and never used to train AI.</li>`,
    journal: `<li><strong>A journal that stays on your phone:</strong> Peace Be Still never receives your entries (<a href="/privacy">privacy policy</a>).</li>`,
  },
  es: {
    words: `<li><strong>Morning Word · Daily Declarations:</strong> una frase para decir en voz alta cada mañana, como ${say("mindset.begin.1", "es")} Gratis cada día; un plan suma temas (${TOPICS("es")}).</li>`,
    nights: `<li><strong>Imagination Nights:</strong> ${NIGHTS} sesiones nocturnas susurradas. Cada una trae una enseñanza corta, una escena leída en voz baja y luego silencio, con la pantalla oscura y un temporizador que baja el volumen. La primera noche es gratis, luego una por semana; un plan abre una cada noche.</li>`,
    chat: `<li><strong>Chat de Mentalidad:</strong> escribe lo que tienes en mente y recibe una respuesta corta y tranquila, marcada como IA; no es un consejero ni una persona. El chat gratis (uno al día, hasta ${F.free} mensajes) usa un servicio de IA gratis que puede guardar lo que escribes, por eso la app pregunta antes del primero. Con un plan de pago, los primeros ${F.paid} mensajes de cada día son privados y nunca se usan para entrenar IA.</li>`,
    journal: `<li><strong>Un diario que se queda en tu teléfono:</strong> Peace Be Still nunca recibe lo que escribes (<a href="/es/privacidad">privacidad</a>).</li>`,
  },
};
const PRICE = {
  en: `<p>Peace Be Still is {{stores.tag}}. It is free to download, with a free version that stays free. A plan is ${F.monthly} a month or ${F.yearly} a year: no trial, no ads, and you can cancel any time from the paid screen.</p>`,
  es: `<p>{{stores.line}} Es gratis para descargar, con una versión gratis que sigue gratis. Un plan cuesta ${F.monthly} al mes o ${F.yearly} al año: sin prueba, sin anuncios, y se cancela cuando quieras desde la pantalla de pago.</p>`,
};
// The last section: a heading, one line on how it fits this question, the features that matter here.
const app = (heading, lead, keys, lang = "en") => [heading, `<p>${lead}</p>\n<ul>\n${keys.map((k) => FEAT[lang][k]).join("\n")}\n</ul>\n${PRICE[lang]}`];

const G = { words: "Mindset: affirmations and declarations", night: "Mindset: sleep and imagination", journal: "Mindset: journaling and self-talk", apps: "Mindset: apps, privacy and cancelling" };
const GES = { words: "Mentalidad: afirmaciones", night: "Mentalidad: sueño e imaginación", journal: "Mentalidad: diario y gratitud" };
const en = (p) => ({ ...D, lang: "en", door: "mindset", ...p, path: `/questions/${p.slug}/` });
const es = (p) => ({ ...DES, lang: "es", door: "mindset", ...p, path: `/es/preguntas/${p.slug}/` });

const EN = [
  en({
    slug: "daily-affirmations", group: G.words, alt: "/es/preguntas/afirmaciones-diarias/",
    title: "Daily affirmations: how to pick one and say it · Peace Be Still",
    description: "Daily affirmations work best as one short, believable line said out loud at the same time each day. Here is how to choose yours, with examples.",
    h1: "Daily affirmations: one line a day, said out loud",
    definition: "A daily affirmation is one short sentence you say to yourself every day, in the first person and the present tense, about how you want to think or act. The useful ones are small and believable (“I start with the task I have been avoiding”), not grand, and they are tied to a moment you already have, like making coffee or brushing your teeth.",
    quick: "Pick one line you could honestly say is true today, keep it under fifteen words, say it out loud at the same moment every day for a week, then keep it or swap it. One line said daily beats ten lines read once.",
    bestFor: "anyone who wants a daily habit of calmer, kinder self-talk without a long routine.",
    sections: [
      ["What makes a daily affirmation work?", `<ul>
<li><strong>It is believable.</strong> “I am fearless” is easy to argue with at 7 a.m. “Old doubts may talk; I do not have to answer every one of them” is not.</li>
<li><strong>It names an action or a stance,</strong> not a result. “I speak up once today” is something you can do before lunch.</li>
<li><strong>It is short enough to remember</strong> without looking at your phone.</li>
<li><strong>It has a fixed moment.</strong> The same cue each day (the kettle, the car door, the first email) does more than a reminder you swipe away.</li>
</ul>`],
      ["Examples by what you need today", `<ul>
<li>Calm: <q>${I18N.en["mindset.calm.2"]}</q></li>
<li>Confidence: <q>${I18N.en["mindset.confidence.5"]}</q></li>
<li>Work: <q>${I18N.en["mindset.work.1"]}</q></li>
<li>People: <q>${I18N.en["mindset.people.3"]}</q></li>
<li>A fresh start: <q>${I18N.en["mindset.begin.3"]}</q></li>
</ul>`],
      ["How long until a daily affirmation feels natural?", `<p>Most people feel awkward for the first few days. That is normal: you are saying something new in your own voice. Give one line a full week before judging it. If it still feels false, it is probably too big; shrink it until you can say it without wincing.</p>`],
      app("Daily affirmations in Peace Be Still", "In its Mindset door, Peace Be Still gives you one line each morning and the same line at night, so the habit has two fixed moments.", ["words", "journal"]),
    ],
    faq: [
      ["How many affirmations should I say a day?", "One is enough. Repeat it two or three times, out loud if you can. More lines tend to blur together and get skipped."],
      ["Is it better to say affirmations out loud?", "Many people find out loud works better because you hear your own voice say it. A whisper counts. Writing it once in a journal is a good second choice."],
      ["Should I change my affirmation every day?", "You can, but keeping one line for a week lets it settle. Change it when your day or your focus changes."],
    ],
    related: ["/questions/morning-affirmations/", "/questions/how-to-write-affirmations/", "/questions/positive-affirmations/", "/mindset/"],
  }),
  en({
    slug: "morning-affirmations", group: G.words,
    title: "Morning affirmations: a two-minute start · Peace Be Still",
    description: "Morning affirmations are one or two short lines said before the phone and the news get your attention. A simple two-minute routine, with examples.",
    h1: "Morning affirmations: a two-minute start, before the phone",
    definition: "Morning affirmations are short, first-person lines you say soon after waking, before messages and news take over, to choose the tone of your day. They work best as a tiny routine attached to something you already do each morning, such as opening the curtains or waiting for the coffee.",
    quick: "Before you open any app: stand by the window, take two slow breaths, say one line out loud, and name one thing you will do today because of it. Two minutes, every morning, same order.",
    bestFor: "people whose mornings start in a rush and who want one calm minute that belongs to them.",
    sections: [
      ["A two-minute morning routine", `<ol>
<li><strong>Phone face down</strong> until you have finished.</li>
<li><strong>Two slow breaths,</strong> out longer than in.</li>
<li><strong>Say your line out loud,</strong> for example <q>${I18N.en["mindset.calm.1"]}</q></li>
<li><strong>Name one action</strong> that fits it: “so I will leave five minutes early.”</li>
<li><strong>Start the day.</strong> That is the whole thing.</li>
</ol>`],
      ["Morning affirmations for different days", `<ul>
<li>A day you dread: <q>${I18N.en["mindset.work.1"]}</q></li>
<li>A big meeting: <q>${I18N.en["mindset.confidence.1"]}</q></li>
<li>A day after a bad one: <q>${I18N.en["mindset.begin.1"]}</q></li>
<li>A full house: <q>${I18N.en["mindset.home.4"]}</q></li>
</ul>`],
      ["What if I forget?", `<p>Tie the line to an object, not a time. A sticky note on the kettle or the bathroom mirror works better than an alarm, because you see it at the moment you need it. If you miss a morning, say it on the drive or the walk; there is no streak to lose.</p>`],
      app("Morning affirmations in Peace Be Still", "Peace Be Still's Mindset door opens each morning on one line to say out loud, and gives you at most one gentle reminder, which you can turn off.", ["words", "journal"]),
    ],
    faq: [
      ["What is a good first morning affirmation?", `A small, believable one, such as ${say("mindset.begin.3")}`],
      ["Should morning affirmations be different from night ones?", "They can be the same line. Saying one line in the morning and again at night gives it two moments a day, which helps it stick."],
      ["Can I do morning affirmations in the shower or the car?", "Yes. Anywhere you can say a sentence out loud without being interrupted works."],
    ],
    related: ["/questions/daily-affirmations/", "/questions/affirmations-for-confidence/", "/questions/affirmations-for-sleep/", "/mindset/"],
  }),
  en({
    slug: "affirmations-for-sleep", group: G.night,
    title: "Affirmations for sleep: what to say before bed · Peace Be Still",
    description: "Sleep affirmations are slow, quiet lines for the last minutes of the day. How to use them in bed, examples for a racing mind, and what to avoid.",
    h1: "Affirmations for sleep: quiet lines for the last minutes of the day",
    definition: "Affirmations for sleep (also called night or bedtime affirmations) are short, slow lines you say or listen to in bed, meant to settle your thoughts rather than fire you up. Good ones are about rest, safety and letting the day end: “The day is done. What is left can wait until morning.”",
    quick: "Lights low, phone on a dark screen, lie down, breathe out slowly, and repeat one quiet line in your head or in a whisper until you lose track of it. Keep night lines gentle; save the big goals for the morning.",
    bestFor: "people whose mind gets busy the moment the lights go out.",
    sections: [
      ["Examples of affirmations for sleep", `<ul>
<li>“The day is done. What is left can wait until morning.”</li>
<li>“My body is heavy and warm, and the bed holds all of it.”</li>
<li>“I did enough today.”</li>
<li><q>${I18N.en["mindset.calm.3"]}</q></li>
<li><q>${I18N.en["mindset.home.5"]}</q></li>
</ul>`],
      ["How to use them in bed", `<ol>
<li>Pick one line before you lie down, not while scrolling.</li>
<li>Breathe out a little longer than you breathe in, three or four times.</li>
<li>Say the line slowly, in a whisper or in your head, in time with your breath out.</li>
<li>When a thought pulls you away, notice it and come back to the line without scolding yourself.</li>
</ol>`],
      ["What to avoid at night", `<p>Loud, energising lines (“I am unstoppable”) belong in the morning. At night, long lists, bright screens and anything that makes you plan tomorrow work against you. If listening helps more than speaking, use a recording with a sleep timer so nothing new starts after it ends.</p>`],
      app("Affirmations for sleep in Peace Be Still", "Peace Be Still's Mindset door pairs a nightly line with whispered night sessions on a screen that stays dark.", ["words", "nights"]),
    ],
    faq: [
      ["Do sleep affirmations work if I fall asleep halfway?", "Falling asleep while repeating a calm line is the point. You do not need to finish anything."],
      ["Should I listen or speak my night affirmations?", "Either. Speaking keeps your attention on the words; listening lets you lie still. Many people whisper one line, then let a recording take over."],
      ["Can I use the same affirmation every night?", "Yes. A familiar line is easier to drift off with than a new one."],
    ],
    related: ["/questions/guided-visualization-for-sleep/", "/questions/sleep-stories-for-adults/", "/questions/law-of-assumption-sleep-meditation/", "/mindset/"],
  }),
  en({
    slug: "positive-affirmations", group: G.words, alt: "/es/preguntas/afirmaciones-positivas/",
    title: "Positive affirmations that don't feel fake · Peace Be Still",
    description: "Positive affirmations are short, kind lines you say to yourself. Why some feel fake, how to fix that, and 15 examples sorted by what you need.",
    h1: "Positive affirmations that don't feel fake",
    definition: "Positive affirmations are short statements you say to yourself, in the first person, to steer your thinking towards something kinder or steadier. They feel fake when they jump too far from where you are. The fix is to make them smaller and more concrete, so you can say them and mean them.",
    quick: "Swap “I am perfect” for something true and slightly hopeful: “I am learning, and today I get a little better.” Say it out loud once a day. If you flinch, shrink it.",
    bestFor: "people who have tried affirmations, felt silly, and want ones that sound like a real person.",
    sections: [
      ["Why some affirmations feel fake", `<p>Your mind argues with a sentence that sounds untrue. “I love everything about my life” on a hard week invites a list of exceptions. A line like “I can get through today one task at a time” gives it nothing to argue with. Small, specific and present tense works better than big and general.</p>`],
      ["15 positive affirmations by need", `<ul>
<li><strong>Calm:</strong> <q>${I18N.en["mindset.calm.1"]}</q> · <q>${I18N.en["mindset.calm.4"]}</q> · “I can do one thing at a time.”</li>
<li><strong>Confidence:</strong> <q>${I18N.en["mindset.confidence.2"]}</q> · <q>${I18N.en["mindset.confidence.4"]}</q> · “I am allowed to take up space.”</li>
<li><strong>Work and money:</strong> <q>${I18N.en["mindset.work.3"]}</q> · <q>${I18N.en["mindset.work.5"]}</q> · <q>${I18N.en["mindset.work.6"]}</q></li>
<li><strong>People:</strong> <q>${I18N.en["mindset.people.2"]}</q> · <q>${I18N.en["mindset.people.4"]}</q></li>
<li><strong>Home:</strong> <q>${I18N.en["mindset.home.3"]}</q> · <q>${I18N.en["mindset.home.6"]}</q></li>
<li><strong>Starting over:</strong> <q>${I18N.en["mindset.begin.4"]}</q> · “A bad hour is not a bad day.”</li>
</ul>`],
      ["How to make one your own", `<p>Take any line above and change one word so it fits your life: the name of the task, the room, the person. Then say it in your normal speaking voice. If it sounds like you, keep it.</p>`],
      app("Positive affirmations in Peace Be Still", "Peace Be Still's Mindset door was written in this plain style: one line a day, sorted by topic, to say out loud.", ["words", "chat"]),
    ],
    faq: [
      ["What is the difference between a positive affirmation and positive thinking?", "Positive thinking is a general attitude. An affirmation is one specific sentence you repeat, which makes it easier to practise."],
      ["Can positive affirmations be negative?", "They should not deny real problems. “This is hard, and I can do the next step” is honest and still steady."],
      ["How often should I say them?", "Daily, at a fixed moment, is more useful than many times on one day."],
    ],
    related: ["/questions/daily-affirmations/", "/questions/i-am-affirmations/", "/questions/positive-self-talk/", "/mindset/"],
  }),
  en({
    slug: "i-am-affirmations", group: G.words, alt: "/es/preguntas/afirmaciones-yo-soy/",
    title: "“I am” affirmations: how to write them · Peace Be Still",
    description: "“I am” affirmations describe who you are choosing to be, in the present tense. How to write ones you believe, and examples for calm, work and people.",
    h1: "“I am” affirmations: who you are choosing to be today",
    definition: "“I am” affirmations are short statements that begin with “I am” and describe a quality you are choosing to live from, in the present tense: “I am patient with myself”, “I am ready for this meeting.” The present tense matters: it speaks as if the quality is already yours, rather than something far away.",
    quick: "Write “I am” plus one quality you can show today, then add a small action: “I am steady, so I will answer that email calmly.” Say it out loud once in the morning.",
    bestFor: "people who like the “I am” form and want lines that feel honest rather than boastful.",
    sections: [
      ["How to write an “I am” affirmation", `<ol>
<li>Choose one quality you need today: steady, patient, prepared, kind, rested.</li>
<li>Put it in the present tense: “I am steady.”</li>
<li>Add a “so” and one action you can do: “I am steady, so I take one breath before I reply.”</li>
<li>Read it aloud. If it sounds like a slogan, make it plainer.</li>
</ol>`],
      ["Examples of “I am” affirmations", `<ul>
<li>“I am calm enough to handle the next ten minutes.”</li>
<li>“I am prepared for this, and I can ask for help if I need it.”</li>
<li>“I am someone who keeps small promises to myself.”</li>
<li>“I am allowed to rest before everything is finished.”</li>
<li>“I am glad to see the people I live with, and I let them see it.”</li>
</ul>`],
      ["When “I am” feels too strong", `<p>Try “I am learning to…” or “I am becoming…”. “I am learning to say no kindly” is still present tense and much easier to believe on a hard day.</p>`],
      app("“I am” lines in Peace Be Still", "Peace Be Still's Mindset declarations use the same present-tense voice, and you can keep your own lines in its journal.", ["words", "journal"]),
    ],
    faq: [
      ["Why are “I am” affirmations in the present tense?", "Present tense describes you now, so it is something you can act on today, rather than a wish for later."],
      ["How many “I am” affirmations should I use?", "One or two. Fewer lines are easier to remember and to mean."],
      ["Are “I am” affirmations the same as declarations?", "Close. A declaration is any line said out loud with intent; “I am” is one common way to start one."],
    ],
    related: ["/questions/positive-affirmations/", "/questions/affirmations-for-self-love/", "/questions/how-to-write-affirmations/", "/mindset/"],
  }),
  en({
    slug: "affirmations-for-self-love", group: G.words,
    title: "Affirmations for self-love, like a friend · Peace Be Still",
    description: "Self-love affirmations work when they sound like a good friend talking, not a poster. How to write them, and examples for hard days.",
    h1: "Affirmations for self-love that sound like a good friend",
    definition: "Affirmations for self-love are lines that speak to yourself the way a good friend would: warmly, honestly and without conditions. They are less about feeling amazing and more about treating yourself decently on an ordinary or hard day.",
    quick: "Ask what a friend who likes you would say right now, and say that to yourself in one line: “You did your best with what you had today.” Then do one kind thing that matches it, like going to bed on time.",
    bestFor: "people who are much harder on themselves than they would ever be on a friend.",
    sections: [
      ["The friend test", `<p>Before you keep a line, imagine saying it to someone you love. If you would never say “You are perfect” to a friend who just had a rough week, do not say it to yourself either. You would more likely say “That was a lot, and you are still standing.” That is the tone to aim for.</p>`],
      ["Self-love affirmations for hard days", `<ul>
<li><q>${I18N.en["mindset.begin.4"]}</q></li>
<li><q>${I18N.en["mindset.people.3"]}</q></li>
<li>“I can be disappointed and still be kind to myself.”</li>
<li>“I do not have to earn rest.”</li>
<li>“My worth is not today's to-do list.”</li>
</ul>`],
      ["Make it something you do", `<p>Self-love lands better when a line comes with an action: say “I do not have to earn rest”, then actually sit down for ten minutes. The action is the proof your mind looks for.</p>`],
      app("Self-love in Peace Be Still", "Peace Be Still's Mindset door has a night session on self-worth (“At Peace with Yourself”) alongside its daily lines.", ["nights", "words"]),
    ],
    faq: [
      ["Is self-love the same as self-esteem?", "They overlap. Self-esteem is how you rate yourself; self-love is how you treat yourself, whatever the rating that day."],
      ["What if self-love affirmations make me cry?", "That happens, especially at first. It often means the words touched something true. Go gently and keep the line short."],
      ["Can I write my own?", "Yes, and your own words usually work best. Use the friend test above."],
    ],
    related: ["/questions/i-am-affirmations/", "/questions/positive-self-talk/", "/questions/affirmations-for-confidence/", "/mindset/"],
  }),
  en({
    slug: "affirmations-for-confidence", group: G.words,
    title: "Affirmations for confidence before a big day · Peace Be Still",
    description: "Confidence affirmations work best tied to one moment you are nervous about. How to use them before a meeting, an interview or a hard conversation.",
    h1: "Affirmations for confidence: one line for the moment you're nervous about",
    definition: "Affirmations for confidence are short lines you say before something that makes you nervous, such as an interview, a presentation or a hard conversation, to steady your voice and remind you what you have prepared. They work best when they point at one specific moment rather than at confidence in general.",
    quick: "Name the moment (“the 10 a.m. call”), pick one line about how you will show up in it (“I speak slowly and say my main point first”), and say it out loud twice in the five minutes before.",
    bestFor: "people with a specific nerve-racking moment coming up.",
    sections: [
      ["Confidence lines for specific moments", `<ul>
<li>Walking in: <q>${I18N.en["mindset.confidence.1"]}</q></li>
<li>Speaking up: <q>${I18N.en["mindset.confidence.2"]}</q></li>
<li>Asking for more: <q>${I18N.en["mindset.work.5"]}</q></li>
<li>Doubts getting loud: <q>${I18N.en["mindset.confidence.4"]}</q></li>
<li>Picturing it first: <q>${I18N.en["mindset.confidence.3"]}</q></li>
</ul>`],
      ["A five-minute routine before the moment", `<ol>
<li>Stand or sit tall and breathe out slowly twice.</li>
<li>Say your line out loud, quietly if you are in public.</li>
<li>Picture the first ten seconds going well: what you say, how your voice sounds.</li>
<li>Say your opening sentence once, out loud.</li>
</ol>`],
      ["Confidence is built afterwards too", `<p>After the moment, write one sentence about what went right, even if it was small. Over a few weeks those notes give your next affirmation real evidence behind it.</p>`],
      app("Confidence in Peace Be Still", "Peace Be Still's Mindset door has a Confidence topic for its daily lines and night sessions such as “Walking In Like You Belong” and “The Talk That Went Well”.", ["words", "nights"]),
    ],
    faq: [
      ["Do confidence affirmations replace preparation?", "No. They help you use the preparation you have done. Prepare first, then use the line to steady yourself."],
      ["What if I feel silly saying them?", "Say them quietly, or in the car or a bathroom. Feeling silly fades with repetition."],
      ["Should I picture success or the steps?", "Picture the first few seconds clearly. That is usually the hardest part, and it is specific enough to rehearse."],
    ],
    related: ["/questions/morning-affirmations/", "/questions/positive-self-talk/", "/questions/i-am-affirmations/", "/mindset/"],
  }),
  en({
    slug: "affirmations-for-anxiety", group: G.words,
    title: "Affirmations for anxious moments: honest lines · Peace Be Still",
    description: "Affirmations for anxious moments work when they are honest and slow: they name the feeling and point to the next small step. Examples, and when to get help.",
    h1: "Affirmations for anxious moments: honest lines that slow things down",
    definition: "Affirmations for anxious moments are short, honest lines you say when worry speeds you up, to slow your breathing and bring your attention back to what is in front of you. They do not argue with the feeling (“I am not anxious”); they name it and point to one next step (“This is a wave. I can breathe through the next minute.”).",
    quick: "Breathe out slowly, put a hand on something solid, and say a line that names the feeling and the next step: “I feel tense, and I can do the next small thing.” Repeat until your breath slows.",
    bestFor: "people who want a few calm words ready for the moments when worry spikes.",
    sections: [
      ["Lines for anxious moments", `<ul>
<li>“This feeling is strong, and it will pass.”</li>
<li><q>${I18N.en["mindset.calm.3"]}</q></li>
<li>“I only have to get through the next minute.”</li>
<li><q>${I18N.en["mindset.calm.2"]}</q></li>
<li>“I can feel worried and still do the next small thing.”</li>
</ul>`],
      ["Pair the line with your body", `<ol>
<li>Breathe out longer than you breathe in, four or five times.</li>
<li>Press your feet into the floor or hold something cool.</li>
<li>Name five things you can see.</li>
<li>Then say your line, slowly.</li>
</ol>
${CRISIS}`],
      ["What affirmations cannot do", `<p>A calm line can make a hard minute easier. It is not a replacement for care when worry is constant, keeps you from sleeping, working or seeing people, or comes with panic. That is the time to talk to a doctor or a counselor.</p>`],
      app("Calm lines in Peace Be Still", "Peace Be Still's Mindset door has a Calm topic, and its chat can talk a moment through with you. If you mention self-harm, it shows the 988 Lifeline and other help straight away.", ["words", "chat"]),
    ],
    faq: [
      ["Can affirmations stop anxiety?", "No line switches a feeling off. A calm, honest line can slow your breathing and give your attention somewhere to rest while the feeling passes."],
      ["Should anxiety affirmations be positive?", "Honest beats positive. “This is hard and I am handling the next step” works better than “I feel great.”"],
      ["When should I get help?", "If worry is most days, gets in the way of sleep, work or relationships, or comes with panic attacks, talk to a doctor or a licensed counselor. In a crisis in the US, call or text 988."],
    ],
    sources: [LIFELINE],
    related: ["/questions/journaling-prompts-for-anxiety/", "/questions/affirmations-for-sleep/", "/questions/positive-self-talk/", "/mindset/"],
  }),
  en({
    slug: "gratitude-affirmations", group: G.words,
    title: "Gratitude affirmations for real days · Peace Be Still",
    description: "Gratitude affirmations turn a thank-you into one line you say daily. How to make them specific, with examples for mornings, nights and hard weeks.",
    h1: "Gratitude affirmations: specific thank-yous for ordinary days",
    definition: "Gratitude affirmations are short lines that name something you are thankful for, in the present tense, said out loud or written each day. The most useful ones are specific (“I am thankful for the ten quiet minutes before everyone woke up”) rather than general (“I am grateful for everything”).",
    quick: "Each night, finish this sentence out loud with one specific thing from today: “Today I am thankful for…”. Specific and small beats big and vague.",
    bestFor: "people who want a simple thankfulness habit that does not feel forced.",
    sections: [
      ["Make it specific", `<p>“I am grateful for my family” is true but easy to say without feeling. “I am thankful my daughter laughed at dinner” puts you back in the moment. Name a person, a place or a minute from today.</p>`],
      ["Gratitude lines to start with", `<ul>
<li>“Today I am thankful for one thing that went right: …”</li>
<li><q>${I18N.en["mindset.home.6"]}</q></li>
<li>“I am thankful for my body carrying me through today.”</li>
<li>“I am thankful for one person who made today easier.”</li>
<li>“Even on a hard day, I can find one small good thing.”</li>
</ul>`],
      ["Morning or night?", `<p>Night works well for looking back on the day. Morning works for looking ahead: “I am thankful for the chance to start again.” Pick one and keep it at the same moment.</p>`],
      app("Gratitude in Peace Be Still", "Peace Be Still's Mindset door includes a night session called “Thank You, Already”, and a journal for the specific thank-yous.", ["nights", "journal"]),
    ],
    faq: [
      ["What is the difference between gratitude affirmations and a gratitude journal?", "An affirmation is said, usually one line. A journal is written and can hold a few lines and details. Many people do both: one written, one spoken."],
      ["How many things should I be thankful for each day?", "One specific thing is enough. Three is a common habit if you like lists."],
      ["What if I can't think of anything?", "Go small: a warm drink, a text from a friend, the bus being on time."],
    ],
    related: ["/questions/gratitude-journal-prompts/", "/questions/daily-affirmations/", "/questions/affirmations-for-sleep/", "/mindset/"],
  }),
  en({
    slug: "how-to-write-affirmations", group: G.words,
    title: "How to write affirmations that you believe · Peace Be Still",
    description: "How to write an affirmation: first person, present tense, small enough to believe, tied to an action. A five-step method with before-and-after examples.",
    h1: "How to write affirmations you actually believe",
    definition: "To write an affirmation, put one thing you want to think or do into a short sentence that starts with “I”, uses the present tense, and is small enough that you can say it and mean it. Then test it out loud and trim it until it sounds like you.",
    quick: "Write what you want (“be calmer at work”), turn it into a present-tense “I” sentence (“I stay calm at work”), make it smaller and concrete (“I take one breath before I reply to a hard email”), and say it out loud. Keep the version that does not make you wince.",
    bestFor: "people who want to write their own lines instead of borrowing generic ones.",
    sections: [
      ["Five steps", `<ol>
<li><strong>Name the change</strong> in plain words.</li>
<li><strong>Start with “I”</strong> and use the present tense.</li>
<li><strong>Make it believable:</strong> shrink it until you could say it is true today.</li>
<li><strong>Add an action</strong> you can do in the next 24 hours.</li>
<li><strong>Say it out loud.</strong> Cut any word you would never say in real life.</li>
</ol>`],
      ["Before and after", `<table class="t"><thead><tr><th>Before</th><th>After</th></tr></thead><tbody>
<tr><td>I am rich.</td><td data-label="After">I look at my money today with open eyes and a steady hand.</td></tr>
<tr><td>I am never stressed.</td><td data-label="After">When my mind races, I come back to one thing I can see and touch.</td></tr>
<tr><td>Everyone loves me.</td><td data-label="After">I can say no kindly and still be loved.</td></tr>
<tr><td>I will be successful.</td><td data-label="After">I start with the task I have been avoiding and give it twenty honest minutes.</td></tr>
</tbody></table>`],
      ["Common mistakes", `<ul>
<li>Future tense (“I will…”) keeps it far away.</li>
<li>Negatives (“I am not scared”) keep the word “scared” in your head; say what you are instead.</li>
<li>Too many lines: one you use beats ten you forget.</li>
</ul>`],
      app("Writing your own in Peace Be Still", "Peace Be Still's Mindset declarations were written with these same rules, and its journal is a private place on your phone for your own lines.", ["words", "journal"]),
    ],
    faq: [
      ["Should affirmations be in the present tense?", "Yes, usually. Present tense describes you now, so you can act on it today."],
      ["How long should an affirmation be?", "Under fifteen words is a good limit, short enough to remember without reading it."],
      ["Can I use other people's affirmations?", "Yes, as a start. Change a word or two so it fits your life."],
    ],
    related: ["/questions/daily-affirmations/", "/questions/i-am-affirmations/", "/questions/scripting-manifestation/", "/mindset/"],
  }),
  en({
    slug: "positive-self-talk", group: G.journal,
    title: "Positive self-talk: change the inner voice · Peace Be Still",
    description: "Positive self-talk means answering your inner critic the way a fair coach would. A three-step method, examples of rewrites, and how to practise daily.",
    h1: "Positive self-talk: answering the voice in your head",
    definition: "Self-talk is the running commentary in your head. Positive self-talk does not mean pretending everything is fine; it means answering harsh or catastrophic thoughts the way a fair, encouraging coach would: accurately, kindly and with a next step.",
    quick: "Catch the thought (“I always mess this up”), check it (“Always? I got the last two right”), and replace it with something fair and useful (“I made one mistake; I can fix it this afternoon”).",
    bestFor: "people who notice a harsh inner voice and want a practical way to talk back to it.",
    sections: [
      ["Catch, check, change", `<ol>
<li><strong>Catch</strong> the thought. Write it down word for word.</li>
<li><strong>Check</strong> it like a fair friend would: is it true, all of it, every time?</li>
<li><strong>Change</strong> it to something accurate and useful, with one next step.</li>
</ol>`],
      ["Examples of rewrites", `<table class="t"><thead><tr><th>Harsh thought</th><th>Fair self-talk</th></tr></thead><tbody>
<tr><td>I'm useless.</td><td data-label="Fair self-talk">I'm struggling with this one task. I can ask for help with it.</td></tr>
<tr><td>Everyone thinks I'm annoying.</td><td data-label="Fair self-talk">I don't know what they think. Two people were glad to see me today.</td></tr>
<tr><td>I'll never get this done.</td><td data-label="Fair self-talk">I can do twenty honest minutes on it now.</td></tr>
<tr><td>I ruined the whole day.</td><td data-label="Fair self-talk">A bad hour is not a bad day.</td></tr>
</tbody></table>`],
      ["Practise when it's easy", `<p>Rewrite one thought a day in writing, when you are calm. It builds the habit so that it is there when you are not calm. Saying one steady line out loud each morning gives you a ready-made answer.</p>`],
      app("Self-talk in Peace Be Still", "Peace Be Still's Mindset door gives you a steady line each day, a private journal for rewrites, and a calm chat for the thoughts that keep circling.", ["words", "journal", "chat"]),
    ],
    faq: [
      ["Is positive self-talk the same as affirmations?", "Related. Self-talk is answering your own thoughts as they happen; affirmations are lines you choose in advance and repeat."],
      ["Should I talk to myself in the second person?", "Some people find “You can do this” easier to hear than “I can do this.” Try both."],
      ["What if the harsh thought is true?", "Then the fair version names it and adds a next step: “I was late, and I'll leave ten minutes earlier tomorrow.”"],
    ],
    related: ["/questions/affirmations-for-self-love/", "/questions/journal-prompts-for-self-discovery/", "/questions/positive-affirmations/", "/mindset/"],
  }),
  en({
    slug: "guided-visualization-for-sleep", group: G.night, alt: "/es/preguntas/meditacion-guiada-para-dormir/",
    title: "Guided visualization for sleep tonight · Peace Be Still",
    description: "A guided visualization for sleep walks you into one calm, detailed scene as you drift off. How it works, a script to try tonight, and what to listen for.",
    h1: "Guided visualization for sleep: one calm scene, slowly",
    definition: "A guided visualization for sleep is a slow, spoken walk into one calm scene, such as an evening walk, a quiet house or a porch at dusk, that you picture in detail while lying in bed. It gives a busy mind something gentle to hold, so it stops reaching for the day's problems.",
    quick: "Lie down, relax your body from the feet up, then picture one scene with all your senses: what you see, hear, feel on your skin and smell. Move through it slowly and stay there as you drift off.",
    bestFor: "people who cannot switch off their thoughts at night and like picturing things.",
    sections: [
      ["A short script to try tonight", `<ol>
<li>Lie on your back. Breathe out slowly three times.</li>
<li>Let each part go heavy: feet, legs, hips, belly, chest, shoulders, arms, face.</li>
<li>Picture a quiet path at dusk. Notice the colour of the sky.</li>
<li>Hear your footsteps and one distant sound.</li>
<li>Feel the air on your hands. It is the right temperature.</li>
<li>Find somewhere to sit. Stay there. Nothing is next.</li>
</ol>`],
      ["What makes a good sleep visualization", `<ul>
<li>One place, not a journey through many.</li>
<li>Slow pacing with long pauses.</li>
<li>All five senses, not just sight.</li>
<li>No surprises, no tasks, no decisions.</li>
<li>An ending that is just quiet, so nothing pulls you back awake.</li>
</ul>`],
      ["Listening to one", `<p>If you use a recording, choose a soft voice, little or no music, and a sleep timer so the audio fades rather than stopping suddenly or rolling into something else.</p>`],
      app("Guided visualizations in Peace Be Still", "Peace Be Still's Imagination Nights are whispered sleep visualizations: a body settle, a short teaching, one scene, then quiet.", ["nights", "words"]),
    ],
    faq: [
      ["Is guided visualization the same as meditation?", "It is a kind of meditation that uses a picture in your mind instead of only the breath."],
      ["How long should a sleep visualization be?", "Fifteen to forty-five minutes is common. A timer that fades the voice out matters more than the length."],
      ["What if I can't picture things clearly?", "That is common. Focus on sounds and touch instead: footsteps, the weight of a blanket, warm air."],
    ],
    related: ["/questions/sleep-stories-for-adults/", "/questions/affirmations-for-sleep/", "/questions/law-of-assumption-sleep-meditation/", "/mindset/"],
  }),
  en({
    slug: "sleep-stories-for-adults", group: G.night, alt: "/es/preguntas/cuentos-para-dormir-adultos/",
    title: "Sleep stories for adults: what makes them work · Peace Be Still",
    description: "Sleep stories for adults are slow, low-stakes stories read softly at bedtime. What makes a good one, how to use them, and where imagination sessions fit.",
    h1: "Sleep stories for adults: slow, low-stakes and softly read",
    definition: "Sleep stories for adults are calm stories read slowly in a soft voice at bedtime. Unlike a novel, nothing much happens: there is no cliffhanger, the details are gentle (a train through the countryside, a quiet house at night), and the pace slows as the story goes on, so it is easy to stop listening and fall asleep.",
    quick: "Pick a story with no suspense, set a sleep timer, lie down with the lights off and the screen dark, and let the voice carry your attention. It is fine to miss the ending; that is the idea.",
    bestFor: "adults who fall asleep more easily with a voice in the room.",
    sections: [
      ["What makes a good sleep story", `<ul>
<li><strong>Low stakes:</strong> nobody is in danger and nothing needs solving.</li>
<li><strong>Lots of gentle detail:</strong> textures, sounds, light.</li>
<li><strong>A slowing pace:</strong> longer pauses near the end.</li>
<li><strong>A soft voice,</strong> often close to a whisper.</li>
<li><strong>No surprise at the end:</strong> nothing that wakes you up.</li>
</ul>`],
      ["How to use them", `<ol>
<li>Start it in bed, not on the sofa.</li>
<li>Turn the screen off or use a dark one.</li>
<li>Set a timer so the audio fades out.</li>
<li>If your mind wanders, let it; come back to the voice when you notice.</li>
</ol>`],
      ["Stories or visualizations?", `<p>A story asks you to follow along. A visualization asks you to be inside one scene. If stories keep you curious about what happens next, a visualization with a single, unchanging scene may suit you better.</p>`],
      app("Bedtime listening in Peace Be Still", "Peace Be Still's Imagination Nights sit between a story and a visualization: whispered, one scene each, built to end in quiet.", ["nights"]),
    ],
    faq: [
      ["Are sleep stories just for children?", "No. Adult sleep stories are written to be calm and slow rather than exciting, and many adults use them every night."],
      ["Is it bad to listen to the same story every night?", "No. Many people find a familiar story easier to fall asleep to."],
      ["Should I use headphones?", "If you share a room, soft sleep headphones or a pillow speaker help. Keep the volume low."],
    ],
    related: ["/questions/guided-visualization-for-sleep/", "/questions/affirmations-for-sleep/", "/mindset/"],
  }),
  en({
    slug: "how-to-manifest", group: G.night, alt: "/es/preguntas/como-manifestar/",
    indexLabel: "Picturing what you hope for: a calm method", indexNote: "A calm, step-by-step way to practise, with no promises.",
    title: "How to manifest: a calm, honest method · Peace Be Still",
    description: "How to manifest, calmly: get clear on one wish, picture the moment after it, act on it daily, and let go of the timeline. A personal practice, not a promise.",
    h1: "How to manifest: a calm method, without the pressure",
    definition: "To manifest, in the everyday sense, means to get clear on something you hope for, picture it as already done, and live and act from that picture day by day. It is a personal practice of attention and imagination. It does not promise any result, and the calm version leaves out the pressure to feel perfect all the time.",
    quick: "Write one wish in a sentence, picture a small moment that would happen after it comes true, replay that moment each night, take one real step towards it each day, and stop checking for proof.",
    bestFor: "people curious about manifesting who want a grounded, unhurried way to try it.",
    sections: [
      ["A calm, five-step method", `<ol>
<li><strong>One wish, one sentence.</strong> “I live in a quiet flat near the park.”</li>
<li><strong>The moment after.</strong> Pick a tiny scene that would follow: turning the key, a friend saying “I love this place”.</li>
<li><strong>Replay it nightly,</strong> slowly, in the first person, as you fall asleep.</li>
<li><strong>Act on it daily.</strong> One real step: a search, an email, a saved amount.</li>
<li><strong>Let go of the timeline.</strong> Checking for signs every hour turns hope into anxiety.</li>
</ol>`],
      ["What manifesting is, and what it is not", `<p>It is a way of using imagination and attention to stay clear and steady about what you want. It is not magic, and it does not replace work, money, health care or other people's choices. Anyone who promises a house, a partner or a sum of money from a method is selling something.</p>`],
      ["Why many people do it at night", `<p>The drowsy minutes before sleep are quiet and easy to fill with one scene. Ending the day on a hopeful picture is also simply calmer than ending it on the news.</p>`],
      app("Manifesting, calmly, in Peace Be Still", "Peace Be Still's Mindset door is built around this nightly method: you write your scene, and Imagination Nights whisper a session that ends in quiet.", ["nights", "words", "chat"]),
    ],
    faq: [
      ["How long does it take to manifest something?", "There is no honest timeline, and nobody can promise a result. Treat it as a practice that keeps you clear and steady, and keep taking real steps."],
      ["Is manifesting the same as the law of attraction?", "They are related ideas. The law of attraction says thoughts draw matching experiences; the law of assumption focuses on assuming the wish is already fulfilled. Both are beliefs, not proven methods."],
      ["What should I manifest first?", "Something small and specific you can also act on, so the practice and your daily steps point the same way."],
    ],
    related: ["/questions/law-of-assumption-sleep-meditation/", "/questions/scripting-manifestation/", "/questions/manifestation-journal-prompts/", "/mindset/"],
  }),
  en({
    slug: "scripting-manifestation", group: G.journal,
    indexLabel: "Scripting: writing your day as if it already happened", indexNote: "How to write one, with an example and the mistakes to skip.",
    title: "Scripting manifestation: write your script · Peace Be Still",
    description: "Scripting means writing about a wish as if it has already happened, in the past or present tense. How to write a script, an example, and how to use it at night.",
    h1: "Scripting manifestation: writing it as if it already happened",
    definition: "Scripting is a manifestation journaling method: you write a short entry about something you hope for as if it has already happened, in the past or present tense, with ordinary details, the way you would write about a real day. Many people then read it back or picture it before sleep.",
    quick: "Date the entry for a day after your wish has come true, write half a page about that ordinary day (what you did, who you saw, how it felt), and read it once before bed. Keep it calm and specific, not a list of wants.",
    bestFor: "people who think best on paper and want a structured way to practise.",
    sections: [
      ["How to write a script", `<ol>
<li>Pick one wish.</li>
<li>Write the date as a day after it came true.</li>
<li>Describe that day plainly: morning, one conversation, one small detail.</li>
<li>Write how it feels, in a sentence or two, not in capital letters.</li>
<li>End with something small and ordinary, like going to bed.</li>
</ol>`],
      ["An example", `<blockquote class="example"><p>“Saturday. I woke up without an alarm and made coffee in the new kitchen. The light comes in from the left in the mornings now. Mom called and asked how the first week went, and I said it already feels like home. I hung the picture by the door. Early night.”</p></blockquote>`],
      ["Mistakes to skip", `<ul>
<li><strong>Wish lists</strong> (“I want, I need”) are the opposite of writing it as done.</li>
<li><strong>Huge, vague scenes</strong> are hard to picture; one ordinary day is easier.</li>
<li><strong>Rewriting it daily</strong> can turn it into worry. One script, read nightly, is enough.</li>
</ul>`],
      app("Scripts in Peace Be Still", "In Peace Be Still's Mindset door, your script becomes your scene: write it once (“Write it as if it is true now”) and keep it in your journal; with a paid plan, a session made for you can be whispered around what you write.", ["nights", "journal"]),
    ],
    faq: [
      ["Should scripting be past or present tense?", "Either works. Past tense (a diary of a day that happened) feels natural to many people; present tense feels more immediate."],
      ["How long should a script be?", "Half a page is plenty. Short enough to read every night."],
      ["Does scripting work?", "It is a personal practice, not a proven method, and nobody can promise a result. Many people like it because it makes a hope specific."],
    ],
    related: ["/questions/how-to-manifest/", "/questions/manifestation-journal-prompts/", "/questions/how-to-write-affirmations/", "/mindset/"],
  }),
  en({
    slug: "manifestation-journal-prompts", group: G.journal,
    indexLabel: "Journal prompts for what you hope for", indexNote: "Twenty prompts for getting clear, picturing it and noticing progress.",
    title: "Manifestation journal prompts (20) · Peace Be Still",
    description: "Twenty manifestation journal prompts in three groups: getting clear on a wish, picturing the moment after, and noticing small steps. Calm, no pressure.",
    h1: "Manifestation journal prompts: 20 that go past the wish list",
    definition: "Manifestation journal prompts are questions that help you write about something you hope for: what exactly it is, what life looks like after it, and what you can do today. Good prompts move you from wanting to picturing and acting, rather than just listing wishes.",
    quick: "Pick one prompt a night, write for five minutes, and finish with one small action for tomorrow.",
    bestFor: "people who keep a journal and want prompts for the wishes they think about most.",
    sections: [
      ["Getting clear", `<ol>
<li>What do I hope for, in one sentence?</li>
<li>Why does this matter to me, honestly?</li>
<li>What would be enough?</li>
<li>What am I afraid will happen if it doesn't?</li>
<li>Whose approval am I hoping for, if anyone's?</li>
<li>What part of this is already true?</li>
<li>What would I stop worrying about if it happened?</li>
</ol>`],
      ["Picturing the moment after", `<ol start="8">
<li>What is the first ordinary morning like, after it comes true?</li>
<li>Who is the first person I tell, and what do they say?</li>
<li>What do I see when I walk in the door?</li>
<li>What small habit changes?</li>
<li>How do I talk about it a year from now?</li>
<li>What does my body feel like in that scene?</li>
<li>Describe one detail nobody else would notice.</li>
</ol>`],
      ["Noticing steps", `<ol start="15">
<li>What is one thing I can do tomorrow that the future me would thank me for?</li>
<li>What did I already do this week that points that way?</li>
<li>What is one thing I can let go of?</li>
<li>Where am I rushing, and what would patience look like?</li>
<li>What went right today, however small?</li>
<li>If nothing changed for a year, how would I still want to live?</li>
</ol>`],
      app("Prompts and scenes in Peace Be Still", "Peace Be Still's Mindset door turns your answer to “the moment after” into your nightly scene, and keeps the rest in a journal on your phone.", ["journal", "nights"]),
    ],
    faq: [
      ["How often should I use manifestation prompts?", "One prompt a few nights a week is plenty. Consistency matters more than volume."],
      ["What if writing about my wish makes me anxious?", "Switch to the third group of prompts, about small steps and what went right. Those are steadier."],
      ["Do I need a special journal?", "No. Any notebook or a private notes app works."],
    ],
    related: ["/questions/scripting-manifestation/", "/questions/how-to-manifest/", "/questions/gratitude-journal-prompts/", "/mindset/"],
  }),
  en({
    slug: "manifestation-app", group: G.apps,
    indexLabel: "Choosing an imagination and affirmation app", indexNote: "What to look for: privacy, no trial traps, sleep sessions, honesty.",
    title: "Manifestation app: what to check first · Peace Be Still",
    description: "What a good manifestation app should do: private writing, honest claims, no trial traps, calm sleep sessions and easy cancelling. A checklist before you pay.",
    h1: "Manifestation app: a checklist before you pay",
    definition: "A manifestation app helps you practise picturing and affirming what you hope for, usually with affirmations, visualizations or sleep sessions, a journal and reminders. The good ones keep your writing private, make no promises about results, and do not turn a trial into a surprise charge.",
    quick: "Before you subscribe, check five things: where your journal and scenes are stored, whether anything you type is used to train AI, whether there is a free version, the full price with no trial trick, and how to cancel.",
    bestFor: "people comparing manifestation, affirmation or law of assumption apps.",
    sections: [
      ["Five things to check", `<ol>
<li><strong>Privacy:</strong> are your journal entries on your phone or on a server? Is chat or text used to train AI? Read the privacy policy, not the store blurb.</li>
<li><strong>Honest claims:</strong> no promised money, partners or health. A calm practice does not need hype.</li>
<li><strong>Price:</strong> the real monthly and yearly price in dollars, shown before you tap.</li>
<li><strong>Renewals:</strong> a trial that quietly renews into a charge is a common complaint in subscription reviews; know the renewal date, or choose an app with a free version instead.</li>
<li><strong>Cancelling:</strong> where you paid (Apple, Google Play or the website) is where you cancel. Deleting an app does not cancel it.</li>
</ol>`],
      ["Features that matter", `<ul>
<li>Sleep sessions that end in quiet, with a timer that fades out.</li>
<li>A place to write your scene in your own words.</li>
<li>Short daily lines, with reminders you control.</li>
<li>A dark screen at night.</li>
</ul>`],
      ["Red flags", `<ul>
<li>Pressure: countdown timers and one-time-only offers.</li>
<li>Promised results: money, a partner, better health.</li>
<li>No way to try anything before paying.</li>
</ul>`],
      app("How Peace Be Still does it", "Peace Be Still's Mindset door was built against this checklist: your journal stays on your phone, there is no trial, and the free version stays free.", ["nights", "words", "chat", "journal"]),
    ],
    faq: [
      ["Do manifestation apps work?", "An app is a tool for a personal practice. It can make the habit easier; it cannot promise an outcome."],
      ["Is there a free manifestation app?", "Many apps have a free version with limits. Check what stays free after any introductory period."],
      ["What is the safest way to try a subscription app?", "Use the free version first, and if you subscribe, note the renewal date and where you paid."],
    ],
    related: ["/questions/free-affirmation-app/", "/questions/mindset-app/", "/questions/how-to-manifest/", "/mindset/"],
  }),
  en({
    slug: "gratitude-journal-prompts", group: G.journal, alt: "/es/preguntas/diario-de-gratitud/",
    title: "Gratitude journal prompts: 25 for ordinary days · Peace Be Still",
    description: "Twenty-five gratitude journal prompts for mornings, nights and hard weeks, plus how to keep a gratitude journal that doesn't become a chore.",
    h1: "Gratitude journal prompts: 25 for ordinary and hard days",
    definition: "Gratitude journal prompts are short questions that help you notice and write down specific things you are thankful for. They are most useful when they push you past the obvious (“my family”) to a particular moment, person or detail from today.",
    quick: "Each night, answer one prompt in two or three sentences. Name something specific and why it mattered. Five minutes is enough.",
    bestFor: "people starting a gratitude journal, or restarting one that went stale.",
    sections: [
      ["For any day", `<ol>
<li>What was the best ten minutes of today?</li>
<li>Who made today a little easier, and how?</li>
<li>What did I eat or drink today that I enjoyed?</li>
<li>What is something in my home I am glad to have?</li>
<li>What did my body let me do today?</li>
<li>What made me laugh?</li>
<li>What is a small comfort I usually overlook?</li>
<li>What went better than I expected?</li>
<li>Who would I like to thank, and for what?</li>
<li>What did I learn today?</li>
</ol>`],
      ["For hard weeks", `<ol start="11">
<li>What got me through today?</li>
<li>Who checked on me, or who could I reach out to?</li>
<li>What is one thing that did not go wrong?</li>
<li>What am I proud of handling?</li>
<li>What can I let go of tonight?</li>
<li>What is one thing I am looking forward to, however small?</li>
<li>What is a kindness someone showed me, even a stranger?</li>
</ol>`],
      ["For mornings, and the long view", `<ol start="18">
<li>What am I glad I get to do today?</li>
<li>What is something from last year I am grateful for now?</li>
<li>Which friendship am I thankful for, and why?</li>
<li>What did I once wish for that I now have?</li>
<li>What skill am I glad I learned?</li>
<li>What place makes me feel calm?</li>
<li>What advice am I grateful someone gave me?</li>
<li>What would I want to remember about this season?</li>
</ol>`],
      app("A gratitude journal in Peace Be Still", "Peace Be Still's Mindset door has a journal that stays on your phone, and a night session, “Thank You, Already”, for ending the day on thanks.", ["journal", "nights"]),
    ],
    faq: [
      ["How often should I write in a gratitude journal?", "Daily is ideal, but three times a week that you actually keep is better than daily that you abandon."],
      ["How many things should I write?", "One to three, with a sentence on why each mattered."],
      ["What if I write the same things every day?", "Use a prompt to push for a new detail, or write why the same thing mattered today in particular."],
    ],
    related: ["/questions/gratitude-affirmations/", "/questions/journal-prompts-for-self-discovery/", "/questions/manifestation-journal-prompts/", "/mindset/"],
  }),
  en({
    slug: "journal-prompts-for-self-discovery", group: G.journal,
    title: "Journal prompts for self-discovery (30) · Peace Be Still",
    description: "Thirty journal prompts for self-discovery in five themes: values, energy, people, fears and the future. How to use them without overthinking.",
    h1: "Journal prompts for self-discovery: 30 questions in five themes",
    definition: "Self-discovery journal prompts are open questions that help you notice what you value, what drains or fills you, and what you want next. You answer them in writing, honestly and without editing, and look for patterns over a few weeks.",
    quick: "Pick one theme a week, answer one prompt a day for ten minutes, and at the end of the week reread your answers and underline anything that surprised you.",
    bestFor: "people who want to understand themselves better and like thinking on paper.",
    sections: [
      ["Values and energy", `<ol>
<li>When did I last lose track of time, and what was I doing?</li>
<li>What do I want people to say about me when I'm not in the room?</li>
<li>What do I say yes to that I wish I said no to?</li>
<li>What drains me fastest?</li>
<li>What part of my day do I look forward to?</li>
<li>What would I do with a free Saturday and no obligations?</li>
</ol>`],
      ["People and fears", `<ol start="7">
<li>Who do I feel most like myself around?</li>
<li>Whose opinion do I worry about most, and why?</li>
<li>What do I need from friends that I rarely ask for?</li>
<li>What am I avoiding right now?</li>
<li>What is the worst realistic outcome, and could I handle it?</li>
<li>What did I believe about myself as a child that I still carry?</li>
</ol>`],
      ["The future, and more", `<ol start="13">
<li>What would a good ordinary day look like a year from now?</li>
<li>What do I want more of, and less of?</li>
<li>What small change would make the biggest difference?</li>
<li>What would I try if I knew nobody would judge me?</li>
<li>What am I ready to stop explaining?</li>
<li>What did I get right this month?</li>
</ol>
<p>Use the same six questions again in a month; changed answers are often the most useful part.</p>`],
      app("Journaling in Peace Be Still", "Peace Be Still's Mindset door keeps your journal on your phone, never on our servers, and pairs it with a daily line and nightly sessions.", ["journal", "words"]),
    ],
    faq: [
      ["How long should I journal for self-discovery?", "Ten minutes a day is enough. Write without editing; you are not writing for anyone else."],
      ["What if I don't know the answer?", "Write “I don't know, but…” and keep going. The second sentence is often the interesting one."],
      ["Should I reread my journal?", "Yes, weekly. Patterns only show up when you look back."],
    ],
    related: ["/questions/gratitude-journal-prompts/", "/questions/positive-self-talk/", "/questions/private-journal-app/", "/mindset/"],
  }),
  en({
    slug: "journaling-prompts-for-anxiety", group: G.journal,
    title: "Journaling prompts for worry and an anxious mind · Peace Be Still",
    description: "Journaling prompts for an anxious mind: get the worry out of your head, sort what you can control, and end on one next step. When to get more help, too.",
    h1: "Journaling prompts for worry: getting it out of your head",
    definition: "Journaling prompts for anxiety are questions you answer in writing when worry builds up, to get racing thoughts out of your head and onto paper, sort what you can and cannot control, and end on one small next step. Writing it down slows the loop and makes the worry something you can look at.",
    quick: "Set a ten-minute timer. Write the worry in full, then answer: what is in my control, what is not, and what is one thing I can do in the next 24 hours? Close the notebook when the timer ends.",
    bestFor: "people whose worries loop at night or before big days.",
    sections: [
      ["Get it out", `<ol>
<li>What exactly am I worried about? Write all of it.</li>
<li>What is the story my mind is telling about this?</li>
<li>What is the worst, best and most likely outcome?</li>
<li>What would I tell a friend who wrote this?</li>
</ol>`],
      ["Sort it", `<ol start="5">
<li>Which parts can I control, and which can't I?</li>
<li>What is one thing I can do in the next 24 hours?</li>
<li>Who could help with this?</li>
<li>What can wait until tomorrow?</li>
</ol>
${CRISIS}`],
      ["Close the loop", `<p>End every entry the same way, with one line such as “I have written it down. I can put it away until morning.” A fixed ending tells your mind the session is over. Writing earlier in the evening, not in bed, keeps the bed for sleep.</p>`],
      app("Writing it down in Peace Be Still", "Peace Be Still's Mindset door has a journal that stays on your phone, a Calm topic for its daily lines, and a chat that shows the 988 Lifeline straight away if you mention self-harm.", ["journal", "chat"]),
    ],
    faq: [
      ["Is journaling good for anxiety?", "Many people find that writing a worry down makes it feel smaller and easier to sort. It is a helpful habit, not medical care."],
      ["When is the best time to journal about worry?", "Early evening often works, so the worry is out of your head before bed rather than in it."],
      ["What if journaling makes me feel worse?", "Keep it short, use the sorting prompts, and always end on one next step. If worry is constant, talk to a doctor or counselor."],
    ],
    sources: [LIFELINE],
    related: ["/questions/affirmations-for-anxiety/", "/questions/journal-prompts-for-self-discovery/", "/questions/private-journal-app/", "/mindset/"],
  }),
  en({
    slug: "private-journal-app", group: G.apps,
    title: "Private journal app: where your words go · Peace Be Still",
    description: "A private journal app keeps entries on your phone or encrypts them, and never uses them to train AI. Five checks to run on any journal or AI journal app.",
    h1: "Private journal app: five checks before you write anything personal",
    definition: "A private journal app is one where your entries are stored only on your phone (or encrypted so the company cannot read them), are never used to train AI, and can be locked, exported and deleted by you. AI journal apps add a catch: anything you send to an AI feature leaves your phone, so its privacy depends on that AI service's rules.",
    quick: "Read the privacy policy for three things: where entries are stored, whether any text is sent to an AI service and whether that service may keep or learn from it, and how to delete everything. If the answer is unclear, assume it is not private.",
    bestFor: "anyone choosing a journal or AI journal app for personal writing.",
    sections: [
      ["Five checks", `<ol>
<li><strong>Storage:</strong> on your phone only, synced to your own cloud, or on the company's servers?</li>
<li><strong>AI features:</strong> which text goes to an AI service, and may that service keep it or use it to improve its models?</li>
<li><strong>Training:</strong> does the policy say plainly that your writing is never used to train AI?</li>
<li><strong>Lock:</strong> can you lock entries behind your phone's passcode or Face ID?</li>
<li><strong>Delete and export:</strong> can you get your words out, and delete them for good?</li>
</ol>`],
      ["Where to look", `<p>The App Store's privacy label is a summary written by the developer. The privacy policy is the binding text: search it for “store”, “server”, “train”, “third party” and “delete”.</p>`],
      ["A simple rule", `<p>If you would not want it read aloud, keep it in a journal that stays on your phone, and keep it out of any free AI chat.</p>`],
      app("Privacy in Peace Be Still", "Peace Be Still keeps the journal on your phone: its privacy policy says journal entries stay there and are never received. The chat is the part that leaves your phone, and the app says so before your first one.", ["journal", "chat"]),
    ],
    faq: [
      ["Are AI journal apps private?", "Only as private as the AI service they send your words to. Check whether that service may keep your text or use it for training."],
      ["Is a notes app a private journal?", "If it stores notes only on your phone or in your own encrypted cloud, it can be. Check its sync settings."],
      ["What happens to my journal if I delete the app?", "If entries are stored only on the phone, deleting the app deletes them. Export first if you want to keep them."],
    ],
    related: ["/questions/is-my-ai-chat-private/", "/questions/journal-prompts-for-self-discovery/", "/questions/mindset-app/", "/mindset/"],
  }),
  en({
    slug: "is-my-ai-chat-private", group: G.apps, notAffiliated: "OpenAI or ChatGPT",
    title: "Is my AI chat private? How to check · Peace Be Still",
    description: "Whether an AI chat is private depends on its settings: many free and personal plans may use chats to improve models. How to check, and ChatGPT's own steps.",
    h1: "Is my AI chat private, or used for training?",
    definition: "An AI chat is private only if the company does not keep your conversations longer than needed and does not use them to train or improve its models. Many consumer chat apps do use chats for training by default unless you turn a setting off, and free AI services often say people may review what you type.",
    quick: `Check the chat's data or privacy settings for a training switch, read the privacy policy for “train” and “retain”, and use a no-history or temporary mode for anything sensitive. In ChatGPT, OpenAI says personal plans share data by default; turn off “Improve the model for everyone” in Settings › Data controls (read ${READ}).`,
    bestFor: "anyone who talks to an AI chat about personal things.",
    sections: [
      ["Three questions to ask of any AI chat", `<ol>
<li><strong>Training:</strong> may my chats be used to improve the model, and is that on by default?</li>
<li><strong>Keeping:</strong> how long are chats kept, and can people at the company read them?</li>
<li><strong>Control:</strong> is there a setting or a mode that turns this off?</li>
</ol>`],
      ["ChatGPT's own settings", `<p>From OpenAI's Data Controls FAQ (read ${READ}):</p>
<ul>
<li>On ChatGPT Free, Plus and Pro, data sharing to improve the model is on by default; Business, Enterprise and Edu workspaces are excluded by default.</li>
<li>To turn it off on the web: account menu › Settings › Data controls › switch off “Improve the model for everyone”. On iPhone and Android: profile icon › Settings › Data controls, same switch.</li>
<li>Temporary Chats do not appear in your history, do not create memories and are not used to improve models; OpenAI says they may be kept for up to 30 days for safety.</li>
</ul>`],
      ["A practical rule", `<p>Leave out names, addresses and anything you would not want a stranger to read in a free AI chat, unless its policy says plainly that chats are not kept and not used for training.</p>`],
      app("How Peace Be Still handles it", "Peace Be Still's Mindset chat says where your words go before you type anything, and the paid chat is private.", ["chat", "journal"]),
    ],
    faq: [
      ["Does ChatGPT use my chats for training?", `On personal plans, by default, yes, according to OpenAI's Data Controls FAQ (read ${READ}). You can switch it off in Settings › Data controls.`],
      ["Is a temporary chat private?", "In ChatGPT, OpenAI says Temporary Chats are not used to improve models but may be kept for up to 30 days for safety."],
      ["Are free AI chats less private?", "Often. Free services commonly say they may keep and use what you type. Check the policy of the specific service."],
    ],
    sources: [["OpenAI Help: Data Controls FAQ", "https://help.openai.com/en/articles/7730893-data-controls-faq"]],
    related: ["/questions/private-journal-app/", "/questions/mindset-app/", "/mindset/"],
  }),
  en({
    slug: "free-affirmation-app", group: G.apps,
    title: "Free affirmation app: what stays free · Peace Be Still",
    description: "Many free affirmation apps lock most lines after a trial. What to check: what stays free, whether reminders are yours to control, and how pricing works.",
    h1: "Free affirmation app: what actually stays free",
    definition: "A free affirmation app shows you affirmations without charging you, usually with a daily line, reminders and a few themes free and the rest behind a subscription. The thing to check is what is still free a month later, not what is free on day one.",
    quick: "Before you download, look at the in-app purchases list and the store description for “free version”, and check whether anything renews into a charge. A good free tier gives you a daily line and reminders with no countdown.",
    bestFor: "people who want daily affirmations without a subscription.",
    sections: [
      ["What to check", `<ol>
<li><strong>A free version, or just a trial?</strong> A trial runs out; a free version does not.</li>
<li><strong>What is in the free part:</strong> a daily line? Reminders? Your own affirmations?</li>
<li><strong>Ads:</strong> are there ads in the free version?</li>
<li><strong>Reminders you control:</strong> how many, and can you turn them off?</li>
<li><strong>Privacy:</strong> if you write your own lines, where are they stored?</li>
</ol>`],
      ["Or skip apps entirely", `<p>You do not need an app at all: one line on a sticky note, said out loud each morning, is a complete practice. An app helps with variety, reminders and night sessions.</p>`],
      ["Signs of a fair free tier", `<ul>
<li>It is useful every day without paying.</li>
<li>Prices are shown in dollars before you tap.</li>
<li>No pop-ups pushing you to decide now.</li>
</ul>`],
      app("What is free in Peace Be Still", "Peace Be Still's Mindset door has a free version that stays free, with no ads.", ["words", "nights", "chat"]),
    ],
    faq: [
      ["Is there a completely free affirmation app?", "Some apps are fully free, often with ads. Others have a free version with limits. Check the in-app purchases list on the store page."],
      ["Do I need an app for affirmations?", "No. A note and a fixed moment each day work. Apps add variety, reminders and audio."],
      ["How do I avoid a surprise charge?", "Note the renewal date when you subscribe, or cancel in your Apple or Google Play subscriptions straight away; you usually keep access until the paid period ends."],
    ],
    related: ["/questions/manifestation-app/", "/questions/daily-affirmations/", "/questions/mindset-app/", "/mindset/"],
  }),
  en({
    slug: "mindset-app", group: G.apps,
    title: "Mindset app: what a good one does, and doesn't · Peace Be Still",
    description: "A mindset app helps you practise calmer thinking: daily lines, imagination at night, a journal, a chat. What a good one does, and what to watch out for.",
    h1: "Mindset app: what a good one does, and what it shouldn't",
    definition: "A mindset app helps you practise the way you think: daily affirmations or declarations, guided visualization or imagination at night, a journal, and sometimes an AI chat to talk thoughts through. The good ones are calm, honest about what they can and cannot do, and clear about where your words go.",
    quick: "Look for short daily lines you can say out loud, night sessions that end in quiet, a private journal, honest wording (no promised results), clear prices with no trial trap, and a privacy policy that says what happens to anything you type.",
    bestFor: "people looking for one app for daily affirmations and calm nights.",
    sections: [
      ["What a good mindset app does", `<ul>
<li>Gives you something small to do every day.</li>
<li>Helps at night with a dark screen and a sleep timer.</li>
<li>Keeps your writing private.</li>
<li>Labels AI answers as AI, and does not pretend to be a therapist.</li>
<li>Shows help lines straight away if you mention self-harm.</li>
</ul>`],
      ["What it shouldn't do", `<ul>
<li>Promise money, love or health.</li>
<li>Guilt you with streaks or a flood of notifications.</li>
<li>Hide the price or the cancel steps.</li>
</ul>`],
      ["Mindset app or therapy?", `<p>An app can support a daily habit. It is not a substitute for a counselor when you are struggling, and a good one will say so.</p>`],
      app("The Mindset door in Peace Be Still", "Peace Be Still opens with “What do you need tonight?” and one of the two doors is Mindset.", ["words", "nights", "chat", "journal"]),
    ],
    faq: [
      ["What does a mindset app do?", "It helps you practise calmer, kinder thinking every day, usually with affirmations, visualization, journaling and reminders."],
      ["Are mindset apps worth paying for?", "Try the free version first. Pay only if you use it most days and the price and cancel steps are clear."],
      ["Can a mindset app replace therapy?", "No. It can support a habit; a licensed counselor is the right help when things are hard."],
    ],
    related: ["/questions/manifestation-app/", "/questions/free-affirmation-app/", "/questions/private-journal-app/", "/mindset/"],
  }),
  en({
    slug: "how-to-cancel-calm-subscription", group: G.apps, notAffiliated: "Calm",
    title: "How to cancel a Calm subscription · Peace Be Still",
    description: `How to cancel Calm, from Calm's own help page: on Calm.com, in iPhone Settings or in Google Play. Deleting the app does not cancel. Read ${READ}.`,
    h1: "How to cancel a Calm subscription, step by step",
    definition: "To cancel Calm, cancel where you paid: on Calm.com if you subscribed on the website, in your iPhone or iPad Settings if you paid through Apple, or in the Google Play Store if you paid on Android. Removing Calm from your phone does not cancel the subscription.",
    quick: "Website: calm.com/login › profile icon › Settings › Manage Subscription › Cancel Subscription. iPhone: Settings › your name › Subscriptions › Calm › Cancel Subscription. Android: Google Play › profile icon › Payments &amp; subscriptions › Subscriptions › Calm › Cancel Subscription.",
    bestFor: "anyone who wants to stop the next Calm charge.",
    sections: [
      ["First, where did you pay?", `<p>Look at the receipt email or card statement. “Apple” or “APPLE.COM/BILL” means Apple; “Google” means Google Play; “Calm” means the website. Calm's help page says Calm cannot access or cancel subscriptions made through Apple, so an Apple subscription has to be cancelled with Apple.</p>`],
      ["Calm's steps for each", `<p>From Calm's help page, “How to cancel your subscription” (edited 28 Oct 2026, read ${READ}):</p>
<ul>
<li><strong>Calm.com:</strong> log in at calm.com/login in a web browser, click your profile icon (top right), choose Settings › Manage Subscription, click Cancel Subscription and follow the prompts.</li>
<li><strong>Apple:</strong> open Settings on your iPhone or iPad, tap your name › Subscriptions, choose Calm › Cancel Subscription. You can also open Calm and tap Manage Subscription to reach the same Apple page.</li>
<li><strong>Google Play:</strong> open the Google Play app, tap your profile icon › Payments &amp; subscriptions › Subscriptions, choose Calm › Cancel Subscription.</li>
</ul>
<p>Calm says that after you cancel, the subscription does not renew and you keep Premium access until the end of the current billing period.</p>`],
      ["How to check it worked", `<p>On iPhone, a cancelled subscription shows an expiry date instead of a Cancel button. On Google Play, it shows as cancelled in Subscriptions. Keep the confirmation email if you get one.</p>`],
      app("Where Peace Be Still fits", "Peace Be Still is an app {{stores.short}} with no trial and a free version that stays free; its Mindset door has daily lines and whispered nights.", ["nights", "words"]),
    ],
    faq: [
      ["Does deleting Calm cancel my subscription?", "No. Cancel where you paid: Calm.com, Apple or Google Play."],
      ["Will I lose Calm straight away if I cancel?", "Calm says you keep Premium access until the end of the current billing period."],
      ["Can Calm cancel an Apple subscription for me?", "No. Calm's help page says it cannot access or cancel subscriptions made through Apple."],
    ],
    sources: [["Calm Help Center: How to cancel your subscription", "https://support.calm.com/hc/en-us/articles/115002473607"], APPLE, PLAY],
    related: ["/questions/how-to-cancel-headspace-subscription/", "/questions/how-to-cancel-i-am-affirmations-subscription/", "/questions/sleep-stories-for-adults/", "/mindset/"],
  }),
  en({
    slug: "how-to-cancel-headspace-subscription", group: G.apps, notAffiliated: "Headspace",
    title: "How to cancel a Headspace subscription · Peace Be Still",
    description: `How to cancel Headspace, from its own help page: on the website, in iPhone Settings or in Google Play, and what it says about refunds. Read ${READ}.`,
    h1: "How to cancel a Headspace subscription, step by step",
    definition: "To cancel Headspace, cancel where you subscribed: on the Headspace website in a browser (not in Headspace's phone app) if you paid Headspace directly, in iPhone Settings if you paid through Apple, or in the Google Play Store if you paid on Android. Removing Headspace from your phone does not cancel it.",
    quick: "Website: log in at headspace.com in a browser, go to headspace.com/subscription/manage, tap Cancel Membership. iPhone: Settings › your name › Subscriptions › Headspace › Cancel Subscription. Android: Google Play › Menu › Subscriptions › Headspace › Cancel subscription.",
    bestFor: "anyone who wants to stop the next Headspace charge.",
    sections: [
      ["Headspace's steps", `<p>From Headspace's help page, “How do I cancel my subscription?” (edited 1 Dec 2025, read ${READ}):</p>
<ul>
<li><strong>Bought on the Headspace website:</strong> log in from a desktop or mobile browser (not the mobile app) at headspace.com, visit headspace.com/subscription/manage and tap Cancel Membership. If the button is not there, Headspace asks you to email its support team (the address is on the help page).</li>
<li><strong>Bought through Apple:</strong> open Settings, tap your name › Subscriptions, select Headspace, tap Cancel Subscription. It stops auto-renewing at the end of the current billing cycle.</li>
<li><strong>Bought through Google Play:</strong> open the Google Play Store, tap Menu › Subscriptions, tap the subscription, tap Cancel subscription and follow the instructions.</li>
</ul>`],
      ["Refunds", `<p>Headspace's page says website subscriptions are non-refundable, though it will review special circumstances if you contact support, and that Apple and Google Play purchases are subject to those stores' own refund policies. For an Apple refund, use Apple's “Report a Problem” page; for Google Play, use Google's refund request.</p>`],
      ["Family plans", `<p>Headspace's help centre says only the Family Plan's primary account holder can cancel it.</p>`],
      app("Where Peace Be Still fits", "Peace Be Still is an app {{stores.short}} with no trial and a free version that stays free; its Mindset door has daily lines and whispered nights.", ["nights", "words"]),
    ],
    faq: [
      ["Can I cancel Headspace in the app?", "For a website subscription, Headspace says to use a browser, not the app. For Apple or Google Play, cancel in that store."],
      ["Will Headspace refund me?", "Headspace says website subscriptions are non-refundable but special cases can be reviewed; store purchases follow Apple's or Google's policy."],
      ["Does deleting Headspace cancel it?", "No. Cancel where you paid."],
    ],
    sources: [["Headspace Help: How do I cancel my subscription?", "https://help.headspace.com/hc/en-us/articles/115008364988-How-do-I-cancel-my-subscription"], ["Headspace Help: How do I cancel my Family Plan?", "https://help.headspace.com/hc/en-us/articles/360010693694-How-do-I-cancel-my-Family-Plan"], APPLE, PLAY],
    related: ["/questions/how-to-cancel-calm-subscription/", "/questions/how-to-cancel-i-am-affirmations-subscription/", "/questions/guided-visualization-for-sleep/", "/mindset/"],
  }),
  en({
    slug: "how-to-cancel-i-am-affirmations-subscription", group: G.apps, notAffiliated: "I am - Daily Affirmations or Monkey Taps",
    title: "How to cancel the I am affirmations app · Peace Be Still",
    description: `How to cancel “I am - Daily Affirmations” (Monkey Taps): cancel in iPhone Settings or Google Play, since it bills through the stores. Checked ${READ}.`,
    h1: "How to cancel the “I am - Daily Affirmations” subscription",
    definition: "“I am - Daily Affirmations”, by Monkey Taps, sells its Premium through the App Store and Google Play, so you cancel it in your phone's store subscriptions, not inside I am itself. Removing it from your phone does not cancel the subscription. A lifetime purchase does not renew, so there is nothing to cancel.",
    quick: "iPhone: Settings › your name › Subscriptions › I am › Cancel Subscription. Android: Google Play › profile icon › Payments &amp; subscriptions › Subscriptions › I am › Cancel subscription.",
    bestFor: "anyone who wants to stop the next charge from the I am affirmations app.",
    sections: [
      ["What the listing says", `<p>Its US App Store listing (checked ${READ}) names the seller as Monkey Taps and offers I am Premium as a monthly or yearly auto-renewable subscription, or a lifetime purchase. We found no cancel page on the developer's website, so the store steps below are the official route.</p>`],
      ["Cancel on iPhone or iPad", `<p>Apple's steps (Apple Support, “Cancel a subscription from Apple”):</p>
<ol>
<li>Open Settings and tap your name.</li>
<li>Tap Subscriptions.</li>
<li>Tap the subscription (I am).</li>
<li>Tap Cancel Subscription. You might need to scroll down.</li>
<li>If there is no Cancel button, or an expiry date shows in red, it is already cancelled.</li>
</ol>`],
      ["Cancel on Android", `<p>Google's steps (Google Play Help): open the Play Store, tap your profile icon › Payments &amp; subscriptions › Subscriptions, choose the subscription and tap Cancel subscription, then follow the instructions. If you do not see it, check you are signed in to the Google account you paid with.</p>`],
      app("If you'd like a calmer daily line", "Peace Be Still's Mindset door gives you one line to say out loud each morning, with no trial and a free version that stays free.", ["words", "nights"]),
    ],
    faq: [
      ["Does deleting the I am app cancel my subscription?", "No. Cancel it in your Apple or Google Play subscriptions."],
      ["I bought lifetime. Do I need to cancel?", "No. A lifetime purchase is a one-time payment and does not renew."],
      ["Can I get a refund?", "For App Store purchases, request one through Apple's Report a Problem page; for Google Play, through Google Play's refund request."],
    ],
    sources: [[`I am - Daily Affirmations: App Store listing (US), checked ${READ}`, "https://apps.apple.com/us/app/id874656917"], APPLE, PLAY],
    related: ["/questions/how-to-cancel-calm-subscription/", "/questions/free-affirmation-app/", "/questions/i-am-affirmations/", "/mindset/"],
  }),
];

// ---- Spanish (real US Spanish searches, OpenSEO, read 21 Nov 2026).
const ES = [
  es({
    slug: "afirmaciones-positivas", group: GES.words, alt: "/questions/positive-affirmations/",
    title: "Afirmaciones positivas que no suenan falsas · Peace Be Still",
    description: "Las afirmaciones positivas son frases cortas y amables que te dices en voz alta. Por qué algunas suenan falsas, cómo arreglarlo y ejemplos por tema.",
    h1: "Afirmaciones positivas que no suenan falsas",
    definition: "Las afirmaciones positivas son frases cortas, en primera persona, que te dices para dirigir tu forma de pensar hacia algo más amable o más firme. Suenan falsas cuando se alejan demasiado de donde estás. La solución es hacerlas más pequeñas y concretas, para poder decirlas en serio.",
    quick: "Cambia “soy perfecta” por algo cierto y un poco esperanzador: “Estoy aprendiendo, y hoy lo hago un poco mejor”. Dila en voz alta una vez al día. Si te incomoda, hazla más pequeña.",
    bestFor: "quien ya probó las afirmaciones, se sintió raro y quiere frases que suenen a una persona real.",
    sections: [
      ["Por qué algunas suenan falsas", `<p>La mente discute con una frase que no parece verdad. “Amo todo de mi vida” en una semana difícil invita a una lista de excepciones. “Puedo con el día de hoy, una tarea a la vez” no le deja nada que discutir. Pequeña, concreta y en presente funciona mejor que grande y general.</p>`],
      ["Ejemplos por tema", `<ul>
<li><strong>Calma:</strong> <q>${I18N.es["mindset.calm.1"]}</q> · <q>${I18N.es["mindset.calm.4"]}</q></li>
<li><strong>Confianza:</strong> <q>${I18N.es["mindset.confidence.2"]}</q> · <q>${I18N.es["mindset.confidence.4"]}</q></li>
<li><strong>Trabajo y dinero:</strong> <q>${I18N.es["mindset.work.3"]}</q> · <q>${I18N.es["mindset.work.5"]}</q></li>
<li><strong>La gente que quieres:</strong> <q>${I18N.es["mindset.people.2"]}</q> · <q>${I18N.es["mindset.people.4"]}</q></li>
<li><strong>Empezar de nuevo:</strong> <q>${I18N.es["mindset.begin.1"]}</q> · <q>${I18N.es["mindset.begin.3"]}</q></li>
</ul>`],
      ["Cómo hacer una tuya", `<p>Toma cualquier frase de arriba y cambia una palabra para que encaje con tu vida: el nombre de la tarea, el cuarto, la persona. Luego dila con tu voz de siempre. Si suena a ti, quédatela.</p>`],
      app("Afirmaciones en Peace Be Still", "La puerta de Mentalidad de Peace Be Still está escrita en este estilo sencillo: una frase al día, por tema, para decir en voz alta.", ["words", "chat"], "es"),
    ],
    faq: [
      ["¿Cuántas veces al día debo decir una afirmación?", "Una frase, dos o tres veces, en voz alta si puedes. Es mejor cada día a la misma hora que muchas veces un solo día."],
      ["¿Las afirmaciones deben negar los problemas?", "No. “Esto es difícil, y puedo dar el siguiente paso” es honesto y te da firmeza."],
      ["¿Puedo escribir las mías?", "Sí, y suelen funcionar mejor. Que sean cortas, en presente y creíbles."],
    ],
    related: ["/es/preguntas/afirmaciones-diarias/", "/es/preguntas/afirmaciones-yo-soy/", "/es/preguntas/afirmaciones-poderosas/", "/es/mentalidad/"],
  }),
  es({
    slug: "afirmaciones-diarias", group: GES.words, alt: "/questions/daily-affirmations/",
    title: "Afirmaciones diarias: una frase al día · Peace Be Still",
    description: "Las afirmaciones diarias funcionan mejor como una frase corta y creíble, dicha en voz alta a la misma hora cada día. Cómo elegir la tuya, con ejemplos.",
    h1: "Afirmaciones diarias: una frase al día, en voz alta",
    definition: "Una afirmación diaria es una sola frase que te dices cada día, en primera persona y en presente, sobre cómo quieres pensar o actuar. Las útiles son pequeñas y creíbles (“Empiezo por la tarea que he estado evitando”) y van atadas a un momento que ya tienes, como el café o lavarte los dientes.",
    quick: "Elige una frase que hoy podrías decir con honestidad, que tenga menos de quince palabras, dila en voz alta en el mismo momento cada día durante una semana, y luego quédatela o cámbiala.",
    bestFor: "quien quiere un hábito diario de hablarse con más calma y cariño, sin una rutina larga.",
    sections: [
      ["Qué hace que funcione", `<ul>
<li><strong>Es creíble.</strong> Si te da vergüenza decirla, hazla más pequeña.</li>
<li><strong>Habla de una acción,</strong> no de un resultado: “Hoy hablo una vez de algo que me importa”.</li>
<li><strong>Es corta</strong> para recordarla sin mirar el teléfono.</li>
<li><strong>Tiene un momento fijo:</strong> la cafetera, la puerta del carro, el primer correo.</li>
</ul>`],
      ["Ejemplos para empezar", `<ul>
<li><q>${I18N.es["mindset.calm.2"]}</q></li>
<li><q>${I18N.es["mindset.confidence.5"]}</q></li>
<li><q>${I18N.es["mindset.work.1"]}</q></li>
<li><q>${I18N.es["mindset.people.3"]}</q></li>
<li><q>${I18N.es["mindset.begin.4"]}</q></li>
</ul>`],
      ["¿Y si se me olvida?", `<p>Átala a un objeto, no a una hora. Una nota en el espejo funciona mejor que una alarma. Si un día no la dices en la mañana, dila en el camino; no hay racha que perder.</p>`],
      app("Afirmaciones diarias en Peace Be Still", "La puerta de Mentalidad de Peace Be Still te da una frase cada mañana y la misma frase de noche, para que el hábito tenga dos momentos fijos.", ["words", "journal"], "es"),
    ],
    faq: [
      ["¿Cuántas afirmaciones al día?", "Una basta. Más frases se mezclan y se olvidan."],
      ["¿Es mejor decirlas en voz alta?", "A muchas personas les funciona mejor, porque se oyen a sí mismas. Un susurro también cuenta."],
      ["¿Cambio la frase cada día?", "Puedes, pero dejarla una semana ayuda a que se asiente."],
    ],
    related: ["/es/preguntas/afirmaciones-positivas/", "/es/preguntas/afirmaciones-yo-soy/", "/es/mentalidad/"],
  }),
  es({
    slug: "afirmaciones-yo-soy", group: GES.words, alt: "/questions/i-am-affirmations/",
    title: "Afirmaciones “yo soy”: cómo escribirlas · Peace Be Still",
    description: "Las afirmaciones “yo soy” describen quién eliges ser hoy, en presente. Cómo escribir unas que te creas, y ejemplos para la calma, el trabajo y la gente.",
    h1: "Afirmaciones “yo soy”: quién eliges ser hoy",
    definition: "Las afirmaciones “yo soy” son frases cortas que empiezan con “yo soy” o “estoy” y describen una cualidad desde la que eliges vivir, en presente: “Soy paciente conmigo”, “Estoy lista para esta reunión”. El presente importa: habla como si la cualidad ya fuera tuya.",
    quick: "Escribe “yo soy” más una cualidad que puedas mostrar hoy, y añade una acción pequeña: “Soy firme, así que contesto ese correo con calma”. Dila en voz alta una vez en la mañana.",
    bestFor: "a quien le gusta la forma “yo soy” y quiere frases honestas, no presumidas.",
    sections: [
      ["Cómo escribirla", `<ol>
<li>Elige una cualidad que necesitas hoy: firme, paciente, preparada, amable, descansado.</li>
<li>Ponla en presente: “Soy firme”.</li>
<li>Añade “así que” y una acción: “Soy firme, así que respiro antes de contestar”.</li>
<li>Léela en voz alta. Si suena a eslogan, hazla más sencilla.</li>
</ol>`],
      ["Ejemplos", `<ul>
<li>“Estoy en calma para los próximos diez minutos.”</li>
<li>“Soy alguien que cumple las promesas pequeñas que se hace.”</li>
<li>“Tengo permiso de descansar antes de terminarlo todo.”</li>
<li>“Estoy aprendiendo a decir que no con cariño.”</li>
</ul>`],
      ["Cuando “yo soy” se siente demasiado", `<p>Prueba “estoy aprendiendo a…”. Sigue en presente y es mucho más fácil de creer en un día difícil.</p>`],
      app("Frases “yo soy” en Peace Be Still", "Las declaraciones de Mentalidad de Peace Be Still usan esta misma voz en presente, y su diario guarda tus propias frases en tu teléfono.", ["words", "journal"], "es"),
    ],
    faq: [
      ["¿Por qué en presente?", "Porque describe quién eres ahora, y eso se puede poner en práctica hoy."],
      ["¿Cuántas uso?", "Una o dos. Menos frases son más fáciles de recordar y de decir en serio."],
      ["¿Son lo mismo que las declaraciones?", "Casi. Una declaración es cualquier frase dicha en voz alta con intención; “yo soy” es una forma común de empezarla."],
    ],
    related: ["/es/preguntas/afirmaciones-positivas/", "/es/preguntas/afirmaciones-diarias/", "/es/mentalidad/"],
  }),
  es({
    slug: "afirmaciones-poderosas", group: GES.words,
    title: "Afirmaciones poderosas: cortas y creíbles · Peace Be Still",
    description: "Una afirmación poderosa no es la más grande, sino la que puedes decir y creer. Cinco reglas para escribirlas y ejemplos para el trabajo, la casa y la confianza.",
    h1: "Afirmaciones poderosas: la fuerza está en que te las creas",
    definition: "Una afirmación poderosa es una frase corta que te mueve a actuar porque la puedes decir y creer. No es la más exagerada: “Puedo pedir lo que vale mi trabajo” tiene más fuerza que “Soy millonario”, porque la puedes poner en práctica esta semana.",
    quick: "Que sea en primera persona, en presente, de menos de quince palabras, creíble hoy y ligada a una acción. Dila en voz alta en un momento fijo del día.",
    bestFor: "quien busca frases con fuerza que no suenen a promesa vacía.",
    sections: [
      ["Cinco reglas", `<ol>
<li>Primera persona: “yo”.</li>
<li>Presente, no futuro.</li>
<li>Creíble hoy.</li>
<li>Ligada a una acción concreta.</li>
<li>Corta, para recordarla.</li>
</ol>`],
      ["Ejemplos con fuerza", `<ul>
<li><q>${I18N.es["mindset.work.5"]}</q></li>
<li><q>${I18N.es["mindset.confidence.1"]}</q></li>
<li><q>${I18N.es["mindset.work.2"]}</q></li>
<li><q>${I18N.es["mindset.home.1"]}</q></li>
<li><q>${I18N.es["mindset.begin.2"]}</q></li>
</ul>`],
      ["Lo que no conviene", `<p>Frases en futuro (“algún día seré…”), frases en negativo (“no tengo miedo”) y listas largas que nadie recuerda. Una frase que usas vale más que diez que olvidas.</p>`],
      app("Frases con fuerza en Peace Be Still", "La puerta de Mentalidad de Peace Be Still trae una frase al día, con temas como la confianza y el trabajo en el plan de pago.", ["words", "nights"], "es"),
    ],
    faq: [
      ["¿Qué hace poderosa a una afirmación?", "Que la puedas creer y poner en práctica. La fuerza viene de la acción que te empuja a hacer."],
      ["¿Las afirmaciones cambian la realidad?", "Son una práctica personal para tu forma de pensar, no una promesa de resultados."],
      ["¿Cuándo decirlas?", "En la mañana, antes del teléfono, y si quieres, otra vez en la noche."],
    ],
    related: ["/es/preguntas/afirmaciones-positivas/", "/es/preguntas/como-manifestar/", "/es/mentalidad/"],
  }),
  es({
    slug: "frases-de-gratitud", group: GES.journal,
    title: "Frases de gratitud para decir cada día · Peace Be Still",
    description: "Frases de gratitud propias, para decir en voz alta o escribir en la noche: concretas, cortas y fáciles de adaptar a tu día. Con ideas para días difíciles.",
    h1: "Frases de gratitud para decir y escribir cada día",
    definition: "Las frases de gratitud son líneas cortas que nombran algo por lo que das gracias. Las que más sirven son concretas (“Gracias por los diez minutos de silencio antes de que todos despertaran”) y no generales (“Gracias por todo”), porque te devuelven al momento.",
    quick: "Cada noche, termina en voz alta esta frase con algo concreto de hoy: “Hoy doy gracias por…”. Pequeño y concreto es mejor que grande y vago.",
    bestFor: "quien quiere un hábito sencillo de gratitud que no se sienta forzado.",
    sections: [
      ["Frases para cualquier día", `<ul>
<li>“Hoy doy gracias por una cosa que salió bien: …”</li>
<li><q>${I18N.es["mindset.home.6"]}</q></li>
<li>“Doy gracias por mi cuerpo, que me cargó todo el día.”</li>
<li>“Doy gracias por una persona que me hizo el día más fácil.”</li>
<li>“Aun en un día difícil, encuentro una cosa buena y pequeña.”</li>
</ul>`],
      ["Para días difíciles", `<ul>
<li>“Doy gracias por haber llegado hasta la noche.”</li>
<li>“Doy gracias por quien me escribió para saber cómo estaba.”</li>
<li>“Doy gracias por una cosa que no salió mal.”</li>
</ul>`],
      ["Cómo usarlas", `<p>Elige un momento fijo, mejor en la noche, y di o escribe una sola frase con un detalle de hoy. Un nombre, un lugar o un minuto concreto hacen que la gratitud se sienta de verdad.</p>`],
      app("La gratitud en Peace Be Still", "La puerta de Mentalidad de Peace Be Still tiene un diario que se queda en tu teléfono y una sesión nocturna sobre la gratitud, “Gracias desde ahora”.", ["journal", "nights"], "es"),
    ],
    faq: [
      ["¿Cuántas frases de gratitud por día?", "Una concreta basta. Tres es un hábito común si te gustan las listas."],
      ["¿Mejor en la mañana o en la noche?", "La noche sirve para mirar el día; la mañana, para mirar adelante. Elige una y mantenla."],
      ["¿Y si no se me ocurre nada?", "Piensa en algo pequeño: una bebida caliente, un mensaje, el camión a tiempo."],
    ],
    related: ["/es/preguntas/diario-de-gratitud/", "/es/preguntas/afirmaciones-diarias/", "/es/mentalidad/"],
  }),
  es({
    slug: "diario-de-gratitud", group: GES.journal, alt: "/questions/gratitude-journal-prompts/",
    title: "Diario de gratitud: cómo empezar, 15 preguntas · Peace Be Still",
    description: "Cómo llevar un diario de gratitud que no se vuelva una tarea: cinco minutos, un detalle concreto, y 15 preguntas para días normales y días difíciles.",
    h1: "Diario de gratitud: cómo empezar, con 15 preguntas",
    definition: "Un diario de gratitud es un cuaderno (o una app) donde anotas, casi cada día, cosas concretas por las que das gracias. Funciona mejor corto y específico: dos o tres frases sobre un momento, una persona o un detalle de hoy, y por qué te importó.",
    quick: "Cada noche, cinco minutos: responde una pregunta con dos o tres frases y un detalle concreto. Tres veces por semana que sí cumples vale más que todos los días que abandonas.",
    bestFor: "quien empieza un diario de gratitud o quiere retomarlo.",
    sections: [
      ["Preguntas para cualquier día", `<ol>
<li>¿Cuáles fueron los mejores diez minutos de hoy?</li>
<li>¿Quién me hizo el día un poco más fácil, y cómo?</li>
<li>¿Qué comí o bebí hoy que disfruté?</li>
<li>¿Qué me hizo reír?</li>
<li>¿Qué salió mejor de lo que esperaba?</li>
<li>¿A quién le quiero dar las gracias, y por qué?</li>
<li>¿Qué aprendí hoy?</li>
</ol>`],
      ["Para semanas difíciles", `<ol start="8">
<li>¿Qué me ayudó a llegar al final del día?</li>
<li>¿Quién preguntó por mí?</li>
<li>¿Qué cosa no salió mal?</li>
<li>¿De qué me siento orgullosa de haber manejado?</li>
<li>¿Qué puedo soltar esta noche?</li>
</ol>`],
      ["Para mirar lejos", `<ol start="13">
<li>¿Qué deseaba antes que hoy ya tengo?</li>
<li>¿Qué lugar me da calma?</li>
<li>¿Qué quiero recordar de esta temporada?</li>
</ol>`],
      app("Un diario de gratitud en Peace Be Still", "La puerta de Mentalidad de Peace Be Still tiene un diario que se queda en tu teléfono: Peace Be Still nunca recibe lo que escribes.", ["journal", "nights"], "es"),
    ],
    faq: [
      ["¿Cuántas cosas escribo?", "De una a tres, con una frase sobre por qué te importó cada una."],
      ["¿Y si escribo lo mismo cada día?", "Usa una pregunta nueva para buscar otro detalle, o escribe por qué hoy en particular importó."],
      ["¿Necesito un cuaderno especial?", "No. Cualquier cuaderno o una app de notas privada sirve."],
    ],
    related: ["/es/preguntas/frases-de-gratitud/", "/es/preguntas/afirmaciones-diarias/", "/es/mentalidad/"],
  }),
  es({
    slug: "meditacion-guiada-para-dormir", group: GES.night, alt: "/questions/guided-visualization-for-sleep/",
    title: "Meditación guiada para dormir esta noche · Peace Be Still",
    description: "Una meditación guiada para dormir te lleva despacio a una sola escena tranquila mientras te duermes. Cómo funciona, un guion para hoy y qué buscar en un audio.",
    h1: "Meditación guiada para dormir: una escena tranquila, despacio",
    definition: "Una meditación guiada para dormir es un recorrido hablado y lento por una escena tranquila (una caminata al atardecer, una casa en silencio, un porche de noche) que imaginas con detalle acostada en la cama. Le da a una mente ocupada algo suave que sostener, para que deje de buscar los problemas del día.",
    quick: "Acuéstate, suelta el cuerpo desde los pies hacia arriba, e imagina una sola escena con todos los sentidos: lo que ves, oyes, sientes en la piel y hueles. Recórrela despacio y quédate ahí mientras te duermes.",
    bestFor: "quien no logra apagar los pensamientos en la noche y disfruta imaginar.",
    sections: [
      ["Un guion corto para hoy", `<ol>
<li>Acuéstate boca arriba. Suelta el aire despacio tres veces.</li>
<li>Deja que cada parte se ponga pesada: pies, piernas, cadera, barriga, pecho, hombros, brazos, cara.</li>
<li>Imagina un camino tranquilo al atardecer. Fíjate en el color del cielo.</li>
<li>Escucha tus pasos y un sonido lejano.</li>
<li>Siente el aire en las manos, a la temperatura justa.</li>
<li>Busca dónde sentarte. Quédate ahí. No hay nada después.</li>
</ol>`],
      ["Qué hace buena a una meditación para dormir", `<ul>
<li>Un solo lugar, no un viaje por muchos.</li>
<li>Ritmo lento, con pausas largas.</li>
<li>Los cinco sentidos, no solo la vista.</li>
<li>Sin sorpresas, sin tareas, sin decisiones.</li>
<li>Un final que es solo silencio.</li>
</ul>`],
      ["Si usas un audio", `<p>Busca una voz suave, poca o ninguna música, y un temporizador que baje el volumen poco a poco en lugar de cortar de golpe o pasar a otra cosa.</p>`],
      app("Meditaciones para dormir en Peace Be Still", "Las Imagination Nights de Peace Be Still son visualizaciones susurradas para dormir, también en español: soltar el cuerpo, una enseñanza corta, una escena, y luego silencio.", ["nights", "words"], "es"),
    ],
    faq: [
      ["¿Es lo mismo que la meditación?", "Es un tipo de meditación que usa una imagen en la mente en lugar de solo la respiración."],
      ["¿Cuánto debe durar?", "De quince a cuarenta y cinco minutos es común. Importa más que la voz se apague suave."],
      ["¿Y si no logro imaginar con claridad?", "Es común. Enfócate en los sonidos y el tacto: los pasos, el peso de la cobija, el aire tibio."],
    ],
    related: ["/es/preguntas/cuentos-para-dormir-adultos/", "/es/preguntas/como-manifestar/", "/es/mentalidad/"],
  }),
  es({
    slug: "cuentos-para-dormir-adultos", group: GES.night, alt: "/questions/sleep-stories-for-adults/",
    title: "Cuentos para dormir para adultos, en voz baja · Peace Be Still",
    description: "Los cuentos para dormir para adultos son historias lentas y tranquilas, leídas en voz baja. Qué hace bueno a uno, cómo usarlos y dónde entra la imaginación.",
    h1: "Cuentos para dormir para adultos: lentos, tranquilos y en voz baja",
    definition: "Los cuentos para dormir para adultos son historias tranquilas leídas despacio y en voz suave a la hora de dormir. A diferencia de una novela, casi no pasa nada: no hay suspenso, los detalles son suaves (un tren por el campo, una casa en silencio) y el ritmo se hace más lento, para que sea fácil dejar de escuchar y quedarse dormida.",
    quick: "Elige una historia sin suspenso, pon un temporizador, acuéstate con la luz apagada y la pantalla oscura, y deja que la voz lleve tu atención. Está bien no oír el final; esa es la idea.",
    bestFor: "adultos que se duermen mejor con una voz en el cuarto.",
    sections: [
      ["Qué hace bueno a un cuento para dormir", `<ul>
<li>Nada en juego: nadie está en peligro.</li>
<li>Muchos detalles suaves: texturas, sonidos, luz.</li>
<li>Un ritmo que se hace más lento.</li>
<li>Una voz suave, casi un susurro.</li>
<li>Ninguna sorpresa al final.</li>
</ul>`],
      ["Cómo usarlos", `<ol>
<li>Empiézalo en la cama, no en el sillón.</li>
<li>Apaga la pantalla o usa una oscura.</li>
<li>Pon un temporizador para que el audio se apague suave.</li>
<li>Si la mente se va, déjala; vuelve a la voz cuando lo notes.</li>
</ol>`],
      ["¿Cuento o visualización?", `<p>Un cuento te pide seguir la historia. Una visualización te pide estar dentro de una sola escena. Si los cuentos te dejan con curiosidad por saber qué pasa, quizá te vaya mejor una escena que no cambia.</p>`],
      app("Para escuchar en la noche en Peace Be Still", "Las Imagination Nights de Peace Be Still están entre un cuento y una visualización: susurradas, una escena cada una, hechas para terminar en silencio.", ["nights"], "es"),
    ],
    faq: [
      ["¿Los cuentos para dormir son solo para niños?", "No. Los de adultos están escritos para ser lentos y tranquilos, no emocionantes."],
      ["¿Está mal escuchar el mismo cada noche?", "No. Una historia conocida suele ser más fácil para dormirse."],
      ["¿Uso audífonos?", "Si compartes cuarto, unos audífonos suaves para dormir ayudan. Volumen bajo."],
    ],
    related: ["/es/preguntas/meditacion-guiada-para-dormir/", "/es/mentalidad/"],
  }),
  es({
    slug: "como-manifestar", group: GES.night, alt: "/questions/how-to-manifest/",
    indexLabel: "Imaginar lo que esperas: un método tranquilo", indexNote: "Paso a paso, sin presión y sin promesas.",
    title: "Cómo manifestar: un método tranquilo y honesto · Peace Be Still",
    description: "Cómo manifestar con calma: aclara un deseo, imagina el momento de después, actúa cada día y suelta la prisa. Una práctica personal, no una promesa.",
    h1: "Cómo manifestar: un método tranquilo, sin presión",
    definition: "Manifestar, en el sentido de todos los días, es tener claro algo que esperas, imaginarlo como ya cumplido, y vivir y actuar desde esa imagen día a día. Es una práctica personal de atención e imaginación. No asegura ningún resultado, y la versión tranquila deja fuera la presión de sentirte perfecta todo el tiempo.",
    quick: "Escribe un deseo en una frase, imagina un momento pequeño que pasaría después de cumplirse, repásalo cada noche, da un paso real cada día y deja de buscar pruebas.",
    bestFor: "quien tiene curiosidad por manifestar y quiere probarlo con calma.",
    sections: [
      ["Un método en cinco pasos", `<ol>
<li><strong>Un deseo, una frase.</strong> “Vivo en un departamento tranquilo cerca del parque.”</li>
<li><strong>El momento de después.</strong> Una escena pequeña: girar la llave, una amiga que dice “me encanta tu casa”.</li>
<li><strong>Repásala cada noche,</strong> despacio, en primera persona, mientras te duermes.</li>
<li><strong>Actúa cada día.</strong> Un paso real: una búsqueda, un correo, algo ahorrado.</li>
<li><strong>Suelta el reloj.</strong> Buscar señales cada hora convierte la esperanza en ansiedad.</li>
</ol>`],
      ["Qué es y qué no es", `<p>Es una forma de usar la imaginación y la atención para mantenerte clara y firme en lo que quieres. No es magia, y no reemplaza el trabajo, el dinero, la atención médica ni las decisiones de otras personas. Quien promete que un método te traerá una casa, una pareja o dinero está vendiendo algo.</p>`],
      ["Por qué muchas personas lo hacen de noche", `<p>Los minutos de sueño antes de dormir son tranquilos y fáciles de llenar con una escena. Terminar el día con una imagen esperanzadora también es, simplemente, más tranquilo que terminarlo con las noticias.</p>`],
      app("Manifestar con calma en Peace Be Still", "La puerta de Mentalidad de Peace Be Still está hecha alrededor de este método nocturno: escribes tu escena y las Imagination Nights susurran una sesión que termina en silencio.", ["nights", "words", "chat"], "es"),
    ],
    faq: [
      ["¿Cuánto tarda en manifestarse algo?", "No hay un plazo honesto, y nadie puede prometer un resultado. Tómalo como una práctica que te da claridad, y sigue dando pasos reales."],
      ["¿Es lo mismo que la ley de atracción?", "Son ideas cercanas. La ley de atracción dice que los pensamientos atraen experiencias parecidas; la ley de la suposición se enfoca en suponer que el deseo ya se cumplió. Las dos son creencias, no métodos comprobados."],
      ["¿Qué manifiesto primero?", "Algo pequeño y concreto en lo que también puedas actuar."],
    ],
    related: ["/es/preguntas/meditacion-guiada-para-dormir/", "/es/preguntas/afirmaciones-poderosas/", "/es/mentalidad/"],
  }),
];

// ---- The hubs.
const HUB_EN = {
  ...D, lang: "en", door: "mindset", hub: true, claim: true, group: "Mindset", path: "/mindset/", alt: "/es/mentalidad/",
  title: "Mindset: declarations and Imagination Nights · Peace Be Still",
  description: "The Mindset door in Peace Be Still: Morning Word daily declarations, Imagination Nights for sleep, and a calm chat that is private with a paid plan.",
  h1: "Mindset: daily words, calm nights, and a chat that is yours",
  indexLabel: "Mindset: what is inside the second door", indexNote: "Morning Word, Imagination Nights and the Mindset chat.",
  definition: "Mindset is one of the two doors in Peace Be Still, for calm words in the morning and imagination at night, with no religious content. It has three parts: Morning Word · Daily Declarations, Imagination Nights, and a Mindset chat.",
  quick: `Morning Word gives you one line to say out loud each morning. Imagination Nights are ${NIGHTS} whispered sleep sessions built around a scene. The chat talks things through calmly; with a paid plan it is private.`,
  bestFor: "people who want affirmations, visualization and a private place to think, in one calm app.",
  sections: [
    ["Morning Word · Daily Declarations", `<p>One short line to say out loud each morning, and again at night, such as ${say("mindset.calm.1")} or ${say("mindset.confidence.2")} The daily line is free. A plan adds topics: ${TOPICS("en")}. There is at most one gentle reminder a day, and you can turn it off.</p>`],
    ["Imagination Nights", `<p>Whispered night sessions in four parts: a slow body settle, a short teaching, one scene read softly (“The Key in Your Hand”, “Walking In Like You Belong”, “A Quiet House”), then quiet. The screen stays dark and dims, a sleep timer fades the voice out, and nothing plays next. You can also write your own scene: “Write it as if it is true now.” Your first night is free, then one a week; a plan opens one every night.</p>`],
    ["The Mindset chat", `<p>Say what is on your mind and get a short, calm answer. Every answer is marked AI; it is not a counselor or a person. If you mention self-harm or abuse, it shows the 988 Lifeline and other help straight away.</p>
<ul>
<li><strong>Free chat</strong> is one chat a day, up to ${F.free} messages. It uses a free AI service that may keep what you type, so the app asks before your first free chat.</li>
<li><strong>With a paid plan</strong>, the first ${F.paid} messages each day are private and never used to train AI, and after that chat keeps going, just not private.</li>
</ul>`],
    ["What is free, and what a plan adds", `<ul>
<li><strong>Free, for good:</strong> the daily declaration, your first Imagination Night then one a week, one chat a day, and a journal that stays on your phone. No ads.</li>
<li><strong>A plan (${F.monthly} a month or ${F.yearly} a year):</strong> private chat that remembers what you share, a session every night plus ones made for you, declaration topics and offline downloads. No trial; cancel any time from the paid screen.</li>
</ul>`],
  ],
  faq: [
    ["Is the Mindset door religious?", "No. The Mindset door has no religious content. It is daily declarations, imagination at night and a calm chat."],
    ["Is the Mindset chat private?", `With a paid plan, yes: private for the first ${F.paid} messages each day and never used to train AI; after that, chat keeps going, just not private. Free chat uses a free AI service that may keep what you type, and the app asks before your first one.`],
    ["Is the chat a therapist?", "No. It is AI, it says so on every answer, and it is not a counselor or a person. If you mention self-harm, it shows the 988 Lifeline straight away."],
    ["Can teenagers use it?", "Chat is for ages 13 and up. Under 13, the app sends no chat to our service."],
  ],
  relatedTitle: "Mindset questions",
  related: [...EN.map((p) => p.path), "/questions/law-of-assumption-sleep-meditation/"],
};
const HUB_ES = {
  ...DES, lang: "es", door: "mindset", hub: true, claim: true, group: "Mentalidad", path: "/es/mentalidad/", alt: "/mindset/",
  title: "Mentalidad: declaraciones e Imagination Nights · Peace Be Still",
  description: "La puerta de Mentalidad de Peace Be Still: declaraciones diarias Morning Word, Imagination Nights para dormir y un chat tranquilo, privado con un plan de pago.",
  h1: "Mentalidad: palabras para el día, noches tranquilas y un chat tuyo",
  indexLabel: "Mentalidad: qué trae la segunda puerta", indexNote: "Morning Word, Imagination Nights y el chat de Mentalidad.",
  definition: "Mentalidad es una de las dos puertas de Peace Be Still, para palabras tranquilas en la mañana e imaginación en la noche, sin contenido religioso. Tiene tres partes: Morning Word · Daily Declarations, Imagination Nights y un chat de Mentalidad, todo en español.",
  quick: `Morning Word te da una frase para decir en voz alta cada mañana. Imagination Nights son ${NIGHTS} sesiones susurradas para dormir alrededor de una escena. El chat conversa contigo con calma; con un plan de pago es privado.`,
  bestFor: "quien quiere afirmaciones, visualización y un lugar privado para pensar, en una sola app tranquila.",
  sections: [
    ["Morning Word · Daily Declarations", `<p>Una frase corta para decir en voz alta cada mañana, y otra vez en la noche, como ${say("mindset.calm.1", "es")} o ${say("mindset.confidence.2", "es")} La frase diaria es gratis. Un plan suma temas: ${TOPICS("es")}. Hay como mucho un recordatorio suave al día, y se puede apagar.</p>`],
    ["Imagination Nights", `<p>Sesiones nocturnas susurradas en cuatro partes: soltar el cuerpo, una enseñanza corta, una escena leída en voz baja (“Alguien que se alegra de verte”, “La mañana de después”, “En paz contigo”) y luego silencio. La pantalla se queda oscura, un temporizador baja la voz poco a poco y no sigue nada después. También puedes escribir tu propia escena. La primera noche es gratis, luego una por semana; un plan abre una cada noche.</p>`],
    ["El chat de Mentalidad", `<p>Escribe lo que tienes en mente y recibe una respuesta corta y tranquila. Cada respuesta está marcada como IA; no es un consejero ni una persona. Si mencionas hacerte daño o abuso, muestra la línea 988 y otras ayudas de inmediato.</p>
<ul>
<li><strong>El chat gratis</strong> es un chat al día, hasta ${F.free} mensajes. Usa un servicio de IA gratis que puede guardar lo que escribes, por eso la app pregunta antes del primero.</li>
<li><strong>Con un plan de pago</strong>, los primeros ${F.paid} mensajes de cada día son privados y nunca se usan para entrenar IA, y después el chat sigue, pero ya no es privado.</li>
</ul>`],
    ["Qué es gratis y qué suma un plan", `<ul>
<li><strong>Gratis, para siempre:</strong> la declaración diaria, tu primera Imagination Night y luego una por semana, un chat al día y un diario que se queda en tu teléfono. Sin anuncios.</li>
<li><strong>Un plan (${F.monthly} al mes o ${F.yearly} al año):</strong> chat privado que recuerda lo que compartes, una sesión cada noche y otras hechas para ti, temas de declaraciones y descargas sin conexión. Sin prueba; se cancela cuando quieras desde la pantalla de pago.</li>
</ul>`],
  ],
  faq: [
    ["¿La puerta de Mentalidad es religiosa?", "No. No tiene contenido religioso: son declaraciones diarias, imaginación en la noche y un chat tranquilo."],
    ["¿El chat de Mentalidad es privado?", `Con un plan de pago, sí: privado en los primeros ${F.paid} mensajes de cada día y nunca se usa para entrenar IA; después, el chat sigue, pero ya no es privado. El chat gratis usa un servicio de IA gratis que puede guardar lo que escribes, y la app pregunta antes del primero.`],
    ["¿El chat es un terapeuta?", "No. Es IA, lo dice en cada respuesta, y no es un consejero ni una persona."],
    ["¿Pueden usarlo adolescentes?", "El chat es para mayores de 13 años."],
  ],
  relatedTitle: "Preguntas de Mentalidad",
  related: ES.map((p) => p.path),
};

export const MINDSET = [HUB_EN, ...EN, HUB_ES, ...ES];
