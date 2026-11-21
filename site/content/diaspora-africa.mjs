// Pages for African diaspora Christians in the US (mostly Nigerian and Ghanaian), centred on prayer
// points, declarations and night vigils (21 Nov 2026; owner: build goodwill before the African
// journey ships in January 2027). Rules for every page here:
// - African church idiom as it is really used (prayer points, vigil, crossover, journey mercies),
//   never caricature: no "die by fire", no all-caps shouting, no prosperity formulas;
// - no denomination taken: Pentecostal, Anglican, Methodist, Presbyterian, Baptist and independent
//   churches all hold vigils; the page never ranks one way of praying over another;
// - every declaration and prayer point stands on a KJV verse quoted word for word (scripture.mjs);
// - only what the app does today; the African journey is "being built for January 2027";
// - no waitlist (closed 18 Nov 2026): the store CTA, and Instagram for news.
import { D as D18, V, F } from "./blitz-common.mjs";

const D = { ...D18, published: "2026-11-21", updated: "2026-11-21", publishedText: "21 Nov 2026", updatedText: "21 Nov 2026" };
const G = "Prayer points, declarations and vigils";
const IG = `<a href="https://www.instagram.com/peacebestillapp/">Instagram @peacebestillapp</a>`;
const LANDING = "/prayer-points/";
const AQ = {
  vigil: "/questions/night-vigil-prayer-points/",
  vigilHome: "/questions/how-to-hold-a-night-vigil-at-home/",
  crossover: "/questions/crossover-night-prayer-points/",
  journey: "/questions/prayer-points-for-journey-mercies/",
  family: "/questions/prayer-points-for-family/",
  app: "/questions/prayer-points-app/",
};
const BASE_AF = { ...D, lang: "en", door: "faith", group: G };

const TODAY_TABLE = `<table class="t"><thead><tr><th>In the app</th><th>Today</th></tr></thead><tbody>
<tr><td>The Bible</td><td>The whole King James Version to read, free. A growing set of chapters read aloud.</td></tr>
<tr><td>Morning Word · Daily Declarations</td><td>A declaration each morning, built on one verse quoted word for word.</td></tr>
<tr><td>Bible chat</td><td>Arriving with the app's launch. It is AI, and every answer will say so.</td></tr>
<tr><td>Psalm Nights</td><td>A psalm whispered at bedtime with the screen dark (an AI voice).</td></tr>
<tr><td>Today's Bible story</td><td>One a day.</td></tr>
<tr><td>Prayer points and a night-vigil order</td><td>Not yet. Being built for January 2027.</td></tr>
</tbody></table>`;

// A prayer point: what to pray, then the verse it stands on.
const pp = (point, r) => `<li><p>${point}</p>${V(r)}</li>`;
const points = (...items) => `<ol class="points">${items.join("\n")}</ol>`;

export const AFRICA = [
  {
    ...BASE_AF, path: LANDING,
    alts: [["en", LANDING]],
    og: "og-prayer-points.png", ogAlt: "Peace Be Still logo with the words Prayer points, declarations and night vigils, with the King James open.",
    audience: "African Christians in the United States, including Nigerian and Ghanaian believers",
    title: "Prayer points, declarations and night vigils, with the KJV · Peace Be Still",
    ogTitle: "Prayer points, declarations and vigils, with the King James open",
    description: "For Nigerian, Ghanaian and other African Christians in the US: what Peace Be Still does today (the KJV and daily declarations, with Bible chat arriving at launch), and the prayer-points journey being built for January 2027.",
    h1: "Prayer points, declarations and night vigils, with the King James open",
    indexLabel: "Prayer points and vigils, for African Christians",
    indexNote: "What the app does today, and the journey being built for January 2027.",
    definition: "Peace Be Still is a coming-soon phone app for the start and the end of the day, built on the King James Version that many Nigerian and Ghanaian congregations still read from the pulpit. Today it has the whole KJV and a daily declaration that stands on one verse; an AI Bible chat arrives with the app's launch. A journey shaped around prayer points, declarations and the night vigil is being built for January 2027.",
    quick: "Today: the King James Bible to read and hear, a morning declaration from Scripture, and whispered Psalms at night. Bible chat arrives with the app's launch. Not yet: prayer points and a vigil order inside the app. Those are being built for January 2027, and this page will say when they are ready.",
    bestFor: "Nigerian, Ghanaian and other African believers in the US who pray with prayer points, keep Friday vigils, and want the King James close at hand between services.",
    sections: [
      ["Who this is for", `<p>The sister who joins the 5 a.m. prayer line by phone before her shift. The fellowship that keeps a Friday vigil in somebody's living room in Houston, Dallas, Atlanta, Maryland or the Bronx. The father who leads family devotion before school, in English, Yoruba, Igbo, Twi or Ewe, with the KJV open on the table. The student who misses home church and wants the same Scripture on her phone.</p>
<p>Whatever church you belong to, Pentecostal, Anglican, Methodist, Presbyterian, Baptist or independent, Peace Be Still keeps the text of Scripture at the centre and leaves the preaching to your pastor.</p>`],
      ["What Peace Be Still does today", `<p>The app is coming soon to the App Store. When it opens, this is what you will find:</p>
${TODAY_TABLE}
<p>The free lane stays free. The paid lane is $7.99 a month or $39.99 a year. No ads, and no trial that turns into a charge.</p>`],
      ["What is being built for January 2027", `<p>A journey for the way many African churches pray: prayer points that each stand on a verse, declarations for the morning, and an order for a night vigil you can keep at home or with your fellowship. It is still being built, so the details and the date may move.</p>
<p>When it is ready, it will be on this page and on ${IG} first. We are not collecting emails for it.</p>
${V("HAB 2:3")}`],
      ["Every declaration stands on a verse", `<p>In Peace Be Still, a declaration is Scripture said back to God, with its chapter and verse beside it, so you always know what you are standing on. The Bible and the declarations come from a stored King James text, never typed from memory.</p>
${V("PSA 118:17")}`],
      ["Hush Harbor, and an African journey of its own", `<p>Peace Be Still launches with Hush Harbor · Black Bible Chat &amp; Stories, which speaks in a Black American church voice and tells Bible stories told in a Black church voice. Many African believers will enjoy it, and its stories include Africans the Bible names, such as the Ethiopian official in Acts 8 and Simon of Cyrene. But African churches and Black American churches each have their own ways of praying, so the African journey is being built as its own thing, not a copy of Hush Harbor.</p>
<p>See <a href="/questions/black-people-in-the-bible/">Black people in the Bible</a> for the named Africans in Scripture, each with the verse.</p>`],
    ],
    faq: [
      ["Does Peace Be Still have prayer points today?", "Not yet. Today it has a daily declaration built on one verse and the whole KJV; Bible chat arrives with the app's launch. Prayer points and a vigil order are being built for January 2027."],
      ["Which Bible does it use?", "The King James Version, read from a stored copy, with book, chapter and verse."],
      ["Is it for one church or denomination?", "No. It keeps to the text of Scripture so believers from Pentecostal, Anglican, Methodist, Presbyterian, Baptist and independent churches can all use it. For your own situation, it points you to your pastor."],
      ["Is the chat a pastor or a prophet?", "No. The Bible chat, arriving with the app's launch, is AI and will say so on every answer. It is not a pastor or a person; for your own situation, talk with your pastor."],
      ["Is it free?", "Yes. The free lane stays free: the whole KJV to read and hear, today's story, one chat a day of up to 10 messages (chat arrives with the app's launch), your first sleep night and then one a week, and a daily declaration. The paid lane is $7.99 a month or $39.99 a year."],
    ],
    relatedTitle: "Prayer points and vigils",
    related: [...Object.values(AQ), "/questions/daily-bible-declarations/"],
  },
  {
    ...BASE_AF, path: AQ.vigil,
    title: "Night vigil prayer points from Scripture (KJV) · Peace Be Still",
    description: "Night vigil and midnight prayer points, in the order many vigils run: praise, repentance, family, church, nation and thanksgiving, each standing on a King James verse.",
    h1: "Night vigil prayer points, each with its verse",
    indexLabel: "Night vigil prayer points",
    indexNote: "Prayer points in vigil order, each with a KJV verse.",
    definition: "Night vigil prayer points are short, specific prayers that a vigil works through one by one through the night, usually from late evening into the early hours. Most vigils move from praise and thanksgiving, through repentance, into intercession for family, church and nation, and end in thanksgiving. Below are 12 points in that order, each standing on a King James verse.",
    quick: "Start with praise (Psalm 119:62), confess before you ask (Psalm 51), pray for your family by name, for your church and pastor, for the nation where you live and the one you came from, then close in thanksgiving.",
    bestFor: "anyone leading or joining a vigil who wants prayer points that each rest on Scripture.",
    sections: [
      ["Why pray at night?", `<p>Scripture is full of night prayer. David rose at midnight to give thanks. Jesus continued all night in prayer before he chose the twelve. Paul and Silas prayed and sang at midnight in prison.</p>
${V("ACT 16:25")}
${V("LUK 6:12")}`],
      ["Praise and thanksgiving (to open)", points(
        pp("Thank God for keeping you and your household through the week, by name.", "PSA 119:62"),
        pp("Praise him for who he is before asking for anything.", "PSA 103:2"),
      )],
      ["Repentance", points(
        pp("Ask the Lord to search your heart, and confess what he shows you.", "PSA 139:23-24"),
        pp("Receive his mercy, and forgive anyone you are holding something against.", "1JO 1:9"),
      )],
      ["Family", points(
        pp("Pray for your spouse, children and parents by name, here and back home.", "JOS 24:15"),
        pp("Pray for the children to know the Lord for themselves.", "ISA 54:13"),
      )],
      ["Church and pastor", points(
        pp("Pray for your pastor, the ministers and the workers, that they stand firm.", "EPH 6:18"),
        pp("Pray for unity in the fellowship.", "EPH 4:3"),
      )],
      ["The nations", points(
        pp("Pray for the country where you live: its cities, its leaders, your neighbours and your workplace.", "JER 29:7"),
        pp("Pray for the country you came from: peace, honest leaders, and the church there.", "1TI 2:1-2"),
      )],
      ["Thanksgiving (to close)", points(
        pp("Thank God for hearing, before you see any answer.", "PHI 4:6-7"),
        pp("Commit the coming week into his hands.", "PSA 37:5"),
      )],
    ],
    faq: [
      ["What is a night vigil?", "A night vigil is a prayer meeting that runs through the night, often from about 10 or 11 p.m. into the early hours, with worship, the Word and long seasons of prayer. Many African churches in the US hold vigils regularly, often on a Friday night."],
      ["How many prayer points should a vigil have?", "There is no rule. Many leaders use 7 to 12, giving each one several minutes, rather than racing through 50."],
      ["What is the difference between midnight prayer and a vigil?", "Midnight prayer is a single time of prayer at or around midnight; a vigil keeps watch through the night. The same prayer points work for both."],
    ],
    related: [LANDING, AQ.vigilHome, AQ.family, AQ.crossover],
  },
  {
    ...BASE_AF, path: AQ.vigilHome,
    title: "How to hold a night vigil at home: an order you can follow · Peace Be Still",
    description: "An order for a night vigil at home or with a small fellowship: when to start, how to divide the night, what to read, and how to keep it going when people are tired.",
    h1: "How to hold a night vigil at home",
    indexLabel: "How to hold a night vigil at home",
    indexNote: "A simple order for a home or small-group vigil.",
    definition: "A home vigil is a night of prayer kept in a living room instead of a church hall. It needs a start time, a simple order that moves between worship, the Word and prayer, someone to lead each part, and an agreed end. Four to six hours is common; even two hours, kept faithfully, is a vigil.",
    quick: "Agree the hours (for example 10 p.m. to 3 a.m.), split the night into blocks of about an hour, give each block a leader and a theme, read one passage aloud in each, and keep water and a short break at the halfway point.",
    bestFor: "a family or small fellowship keeping a vigil at home, or anyone who cannot get to the church vigil this month.",
    sections: [
      ["Before the night", `<ul>
<li><strong>Agree the hours</strong> and tell neighbours if you will be singing late.</li>
<li><strong>Choose a theme</strong> and one passage for each block.</li>
<li><strong>Name a leader for each block</strong> so no one person carries the whole night.</li>
<li><strong>Write the prayer points down.</strong> See <a href="${AQ.vigil}">night vigil prayer points</a>.</li>
</ul>`],
      ["A five-hour order", `<table class="t"><thead><tr><th>Time</th><th>Block</th><th>Read</th></tr></thead><tbody>
<tr><td>10:00 p.m.</td><td>Worship and thanksgiving</td><td>Psalm 100</td></tr>
<tr><td>11:00 p.m.</td><td>The Word: a short exhortation</td><td>The theme passage</td></tr>
<tr><td>12:00 a.m.</td><td>Repentance and midnight prayer</td><td>Psalm 51</td></tr>
<tr><td>1:00 a.m.</td><td>Intercession: family, church, nations</td><td>1 Timothy 2:1-4</td></tr>
<tr><td>2:00 a.m.</td><td>Personal prayer and testimonies</td><td>Mark 11:22-24</td></tr>
<tr><td>3:00 a.m.</td><td>Thanksgiving and the grace</td><td>Numbers 6:24-26</td></tr>
</tbody></table>`],
      ["Keeping awake without strain", `<p>Stand for worship, sit for the Word, and let people walk while they pray. A short break with water at the halfway point helps more than coffee. Nobody should be shamed for dozing; the disciples slept in Gethsemane too.</p>
${V("MAT 26:41")}`],
      ["Closing well", `<p>End on time, in thanksgiving, with the blessing. Make sure everyone driving home is rested enough to drive.</p>
${V("NUM 6:24-26")}`],
    ],
    faq: [
      ["Do we need a pastor to hold a vigil?", "Many home vigils are led by elders or group leaders. If your church has a house-fellowship structure, let your pastor know and follow its guidance."],
      ["Can we hold a vigil on a phone line or video call?", "Yes. Many diaspora fellowships pray together on a conference line or video call when members live far apart. Give each block a leader and mute between speakers."],
      ["What if only two of us keep it?", "Two is enough. Jesus said where two or three are gathered in his name, he is in the midst of them (Matthew 18:20)."],
    ],
    related: [LANDING, AQ.vigil, AQ.crossover, AQ.family],
  },
  {
    ...BASE_AF, path: AQ.crossover,
    title: "Crossover night prayer points for 31 December (KJV) · Peace Be Still",
    description: "Prayer points for crossover night on 31 December: thanksgiving for the year, release of what is past, and committing the new year to God, each with a King James verse.",
    h1: "Crossover night prayer points for 31 December",
    indexLabel: "Crossover night prayer points",
    indexNote: "Thanksgiving, letting go, and the new year, each with a verse.",
    definition: "Crossover night is the service many African churches hold on 31 December to pray out the old year and pray in the new one at midnight. Its prayer points usually move in three steps: thanksgiving for the year that is ending, letting go of what is past, and committing the new year into God's hands.",
    quick: "Before midnight, thank God for the year by name and release what is past (Isaiah 43:18-19). At midnight, praise. After midnight, commit the new year to him (Psalm 65:11; Proverbs 3:5-6).",
    bestFor: "anyone keeping crossover night at church, at home, or on a call with family in another time zone.",
    sections: [
      ["Before midnight: thanksgiving", points(
        pp("Thank God for every month of this year: what he gave, and what he kept you from.", "LAM 3:22-23"),
        pp("Thank him for the people he kept alive, and remember those you lost with gratitude.", "PSA 103:2"),
      )],
      ["Before midnight: letting go", points(
        pp("Lay down the disappointments of the year, and refuse to carry them into the new one.", "ISA 43:18-19"),
        pp("Forgive, so you cross over free.", "MAR 11:25"),
      )],
      ["At midnight: praise", `<p>Many congregations count down and then break into praise. At home, stand together and sing.</p>
${V("PSA 65:11")}`],
      ["After midnight: the new year", points(
        pp("Commit the new year, month by month, into God's hands.", "PRO 3:5-6"),
        pp("Ask for wisdom to number your days.", "PSA 90:12"),
        pp("Pray for your household's going out and coming in all year.", "PSA 121:8"),
        pp("Pray for the church and the nations in the new year.", "1TI 2:1-2"),
      )],
    ],
    faq: [
      ["Is crossover night the same as Watch Night?", "They are close cousins. Watch Night in Black American churches is tied to 31 December 1862 and the Emancipation Proclamation; crossover night is how many African churches name the same midnight service of prayer."],
      ["What if my family back home crosses over hours earlier?", "Join their midnight on a call, then keep your own. Many families pray twice that night, once in Lagos or Accra time and once in local time."],
      ["Which psalm is read at crossover?", `Practices differ. Psalm 65 (${F("PSA 65:11", "Thou crownest the year with thy goodness")}), Psalm 90 and Psalm 121 are common choices.`],
    ],
    sources: [["Smithsonian NMAAHC: The Historical Legacy of Watch Night", "https://nmaahc.si.edu/explore/stories/historical-legacy-watch-night"]],
    related: [LANDING, AQ.vigil, AQ.journey, AQ.family],
  },
  {
    ...BASE_AF, path: AQ.journey,
    title: "Prayer points for journey mercies (KJV) · Peace Be Still",
    description: "Prayer points for journey mercies when you travel home for Christmas or a family occasion: before you leave, on the road or in the air, and when you arrive, each with a KJV verse.",
    h1: "Prayer points for journey mercies",
    indexLabel: "Prayer points for journey mercies",
    indexNote: "Before you leave, on the way, and when you arrive.",
    definition: "Journey mercies are what believers ask God for before travelling: protection on the way, peace while away, and a safe return. Prayer points for journey mercies usually cover three stages: before you leave, on the road or in the air, and when you arrive, with Psalm 121 as the anchor.",
    quick: "Read Psalm 121 together before you leave, commit the travellers and the house left behind, and give thanks when you land. Psalm 121:8 is the verse most families say at the door.",
    bestFor: "families flying home to Lagos, Accra, Abuja, Kumasi or anywhere for Christmas, a wedding or a burial, and the people praying for them.",
    sections: [
      ["Before you leave", points(
        pp("Commit every traveller by name, and the journey from door to door.", "PSA 121:8"),
        pp("Ask God to keep the house and the people staying behind.", "PSA 121:7"),
      )],
      ["On the road or in the air", points(
        pp("Ask for his presence at every airport, connection and checkpoint.", "GEN 28:15"),
        pp("Pray for the pilots, drivers and everyone responsible for your safety.", "PSA 91:11"),
        pp("Pray for calm when there are delays.", "ISA 26:3"),
      )],
      ["When you arrive", points(
        pp("Give thanks as soon as you land, and call home.", "PSA 107:30"),
        pp("Pray for the time with family: kindness, patience and wisdom in every conversation.", "ROM 12:10"),
      )],
      ["Before the return journey", `<p>Pray the same points again, and add thanksgiving for the time together.</p>
${V("DEU 28:6")}`],
    ],
    faq: [
      ["What does “journey mercies” mean?", "It is a prayer phrase for God's protection and kindness on a journey, used widely in African and Black American churches."],
      ["Which Bible verse is for journey mercies?", "Psalm 121 is the most used, especially verse 8. Genesis 28:15, Psalm 91:11 and Deuteronomy 28:6 are also common."],
      ["Should I still pray if the flight is short?", "Yes. Commit every journey, long or short, to God; Psalm 121 makes no distinction."],
    ],
    related: [LANDING, AQ.family, AQ.crossover, AQ.vigil],
  },
  {
    ...BASE_AF, path: AQ.family,
    title: "Prayer points for your family, from Scripture (KJV) · Peace Be Still",
    description: "Prayer points for your family, here and back home: marriage, children, parents, work, and the family's walk with God, each standing on a King James verse.",
    h1: "Prayer points for your family, from Scripture",
    indexLabel: "Prayer points for family",
    indexNote: "Marriage, children, parents and the family's walk with God.",
    definition: "Family prayer points are specific prayers for each person in a household, said by name: the marriage, the children, parents and elders, work and provision, and the family's walk with God. For families split between the US and home, they include the relatives far away.",
    quick: "Pray for one part of the family each day, by name, with one verse. Monday the marriage, Tuesday the children, Wednesday parents and elders, Thursday work and provision, Friday the family back home, Saturday thanksgiving.",
    bestFor: "parents leading family devotion, and anyone praying for relatives on two continents.",
    sections: [
      ["The household's walk with God", points(
        pp("Pray that your house will serve the Lord together.", "JOS 24:15"),
        pp("Pray for every member of the household to believe.", "ACT 16:31"),
      )],
      ["Marriage", points(
        pp("Pray for love, patience and honest words between husband and wife.", "EPH 4:32"),
      )],
      ["Children", points(
        pp("Pray for each child to know the Lord for themselves.", "ISA 54:13"),
        pp("Pray for wisdom to teach them at home, in the car, at bedtime.", "DEU 6:6-7"),
      )],
      ["Parents and elders, here and back home", points(
        pp("Pray for parents and elders by name: their strength, their peace, and their care.", "ISA 46:4"),
        pp("Pray for the relatives you support from here, and for wisdom in giving.", "GAL 6:9"),
      )],
      ["Work and provision", points(
        pp("Commit everyone's work and studies to the Lord.", "PRO 16:3"),
        pp("Thank God for daily bread and ask him for it again.", "MAT 6:11"),
      )],
    ],
    faq: [
      ["How do I lead family devotion with prayer points?", "Read one verse, give one prayer point, and let each person pray one sentence. Ten minutes a day kept faithfully is better than an hour once a month."],
      ["Can we pray in our own language?", "Of course. Many families pray in Yoruba, Igbo, Twi, Ewe or another language and read the Bible in English. God hears every tongue."],
      ["What if family members don't pray with us?", "Pray for them by name anyway. Family prayer is not only for those in the room."],
    ],
    related: [LANDING, AQ.journey, AQ.vigil, AQ.vigilHome],
  },
  {
    ...BASE_AF, path: AQ.app,
    title: "Is there a prayer points app? What to look for · Peace Be Still",
    description: "What to look for in a prayer points app: every point tied to a verse, the Bible translation named, no ads in the middle of prayer, and no trial that turns into a charge. And what Peace Be Still has today.",
    h1: "Is there a prayer points app? What to look for",
    indexLabel: "Is there a prayer points app?",
    indexNote: "Four things to check, and an honest note on Peace Be Still.",
    definition: "A prayer points app gives you short, specific prayers to work through, ideally each tied to a Bible verse. When choosing one, check four things: that every point shows its chapter and verse, that the Bible translation is named, that no ads interrupt prayer, and that no free trial quietly turns into a yearly charge.",
    quick: "Look for chapter and verse on every point, a named translation, no ads, and the price in dollars before you tap. Peace Be Still does not have prayer points yet; they are being built for January 2027.",
    bestFor: "people who pray with prayer points and want them on their phone without ads or surprise charges.",
    sections: [
      ["1. Every point stands on a verse", `<p>A prayer point is strongest when you can see what it stands on. Check that the app shows the chapter and verse for every point, and that the verse is quoted, not paraphrased.</p>
${V("JER 33:3")}`],
      ["2. The translation is named", `<p>An app should say which Bible it quotes. The King James Version is in the public domain, so any app can quote it word for word; modern translations need the publisher's permission.</p>`],
      ["3. No ads in the middle of prayer", `<p>Free apps often pay for themselves with ads. An ad between prayer points breaks the flow of a vigil. Read the listing and reviews before you rely on one.</p>`],
      ["4. The price before you tap", `<p>Many apps open with “7 days free” and a yearly charge after. Check the price, the renewal date and how to cancel. On iPhone you can cancel any time in Settings › your name › Subscriptions.</p>`],
      ["Does Peace Be Still have prayer points?", `<p>Not yet, and we would rather say so plainly. Today Peace Be Still has the whole KJV to read, Morning Word · Daily Declarations (one verse each morning), no ads or trials, and Bible chat arriving with the app's launch (AI, and labelled as AI). Prayer points and a night-vigil order are being built for January 2027. See <a href="${LANDING}">the prayer points page</a>.</p>`],
    ],
    faq: [
      ["Is a prayer points app a replacement for church?", "No. It is a help for the days between services. Keep your church's vigils and prayer meetings."],
      ["Can I write my own prayer points?", "Yes, and many people do. Take one verse, turn it into one sentence of prayer, and write it down. That is a prayer point."],
      ["Which Bible does Peace Be Still use?", "The King James Version, read from a stored copy, with book, chapter and verse."],
    ],
    related: [LANDING, AQ.vigil, "/questions/daily-bible-declarations/", AQ.family],
  },
];

if (AFRICA.length !== 1 + Object.keys(AQ).length) throw new Error("NAMED STOP [AFRICA_PAGES_INCOMPLETE] a prayer-points page is missing");
