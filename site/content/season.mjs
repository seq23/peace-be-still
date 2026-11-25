// The Watch Night → January fast → night prayer season (growth plan, 21 Nov 2026; live by 20 Dec 2026).
// English and Spanish twins: night prayer (60,500 a month) ↔ oración de la noche (22,200, the page in
// blitz-es.mjs), the Watch Night service on 31 Dec, and the 21-day January fast.
// Rules for every page here:
// - Scripture only through scripture.mjs (stored KJV / Reina-Valera 1909), checked by scripture.test.mjs;
// - prayers on these pages are ours and are labelled as prayers, never set as verses;
// - no health or outcome claims (risk brain R-ADV-04/06): fasting is described as a practice of prayer,
//   with "this is not medical advice" and the people who should ask a doctor before giving up food;
// - only what the app does today: Psalm Nights, Hush Harbor stories and Morning Word exist; there is no
//   Watch Night session and no fasting plan inside the app, and the pages say so;
// - Watch Night history is sourced (National Archives, Smithsonian NMAAHC, Wikipedia's cited article).
import { V, F, bg, KJV_SRC, RV_SRC, MI_REFUGIO_ES } from "./blitz-common.mjs";

const D = { published: "2026-11-21", updated: "2026-11-21", publishedText: "21 Nov 2026", updatedText: "21 Nov 2026" };
const DES = { published: "2026-11-21", updated: "2026-11-21", publishedText: "21 nov 2026", updatedText: "21 nov 2026" };
const es = "es";
const rv = (search, label) => bg(search, label, "RVES");

export const PATHS = {
  night: "/questions/night-prayer/",
  noche: "/es/preguntas/oracion-de-la-noche/",
  watch: "/questions/watch-night-service/",
  finDeAno: "/es/preguntas/culto-de-fin-de-ano/",
  fast: "/questions/21-day-fast/",
  ayuno: "/es/preguntas/ayuno-de-21-dias/",
};
const G = "Watch Night and the January fast";
const GES = "Fin de año y el ayuno de enero";
const GN = "Sleep, prayer and Bible verses";

const NMAAHC = ["Smithsonian NMAAHC: The Historical Legacy of Watch Night", "https://nmaahc.si.edu/explore/stories/historical-legacy-watch-night"];
const ARCHIVES = ["National Archives: The Emancipation Proclamation", "https://www.archives.gov/exhibits/featured-documents/emancipation-proclamation"];
const WIKI = ["Wikipedia: Watchnight service (with its cited sources)", "https://en.wikipedia.org/wiki/Watchnight_service"];

// The 21-day plan: one focus a day, in three weeks, each standing on one verse. Same verses in both
// languages, so the English and Spanish plans can be prayed side by side in one family.
const PLAN = [
  // Week 1: turn back to God
  ["Turn back to God with your whole heart. Name why you are fasting, in one sentence.", "Vuelve a Dios de todo corazón. Escribe en una frase por qué ayunas.", "JOE 2:12"],
  ["Ask God for a clean heart. Confess what you already know is wrong.", "Pídele a Dios un corazón limpio. Confiesa lo que ya sabes que está mal.", "PSA 51:10"],
  ["Receive forgiveness. Stop paying for what God has already forgiven.", "Recibe el perdón. Deja de pagar lo que Dios ya perdonó.", "1JO 1:9"],
  ["Ask God to search you: habits, words, the way you treat people.", "Pídele a Dios que te examine: costumbres, palabras, el trato con los demás.", "PSA 139:23-24"],
  ["Fast quietly. Keep it between you and God, and keep your face washed.", "Ayuna en secreto. Que quede entre tú y Dios, con la cara lavada.", "MAT 6:17-18"],
  ["Pray for someone carrying a heavy load, and do one thing to lighten it.", "Ora por alguien que lleva una carga pesada y haz algo para aliviarla.", "ISA 58:6"],
  ["Rest on God's mercy. End the first week with thanks, not a score.", "Descansa en la misericordia de Dios. Cierra la semana dando gracias, sin llevar la cuenta.", "LAM 3:22-23"],
  // Week 2: listen
  ["Read how Daniel kept his three weeks. Ask God for understanding.", "Lee cómo Daniel guardó sus tres semanas. Pídele a Dios entendimiento.", "DAN 10:2-3"],
  ["When you are hungry, read instead. Let the hunger send you to the Word.", "Cuando tengas hambre, lee. Que el hambre te lleve a la Palabra.", "MAT 4:4"],
  ["Ask God to show you his way for one decision in front of you.", "Pídele a Dios que te muestre su camino en una decisión que tienes delante.", "PSA 25:4-5"],
  ["Hand over your own plan. Trust him with the part you cannot see.", "Entrega tu propio plan. Confía en él con la parte que no ves.", "PRO 3:5-6"],
  ["Ask plainly for wisdom, for work, money, family or church.", "Pide sabiduría con sencillez, para el trabajo, el dinero, la familia o la iglesia.", "JAM 1:5"],
  ["Wait on the Lord. Pray for strength for the second half.", "Espera en Jehová. Pide fuerzas para la segunda mitad.", "ISA 40:31"],
  ["Be still. Ten minutes of silence before you pray a word.", "Quédate quieto. Diez minutos de silencio antes de decir una palabra.", "PSA 46:10"],
  // Week 3: pray for others and go forward
  ["Pray like Esther, for your people. Name your family and your church.", "Ora como Ester, por tu pueblo. Nombra a tu familia y a tu iglesia.", "EST 4:16"],
  ["Pray for the right way for your household and your children this year.", "Pídele a Dios que enderece el camino de tu casa y de tus hijos este año.", "EZR 8:21"],
  ["Pray for leaders: your pastor, your city, your country.", "Ora por tu pastor y por las autoridades de tu ciudad y de tu país.", "1TI 2:1-2"],
  ["Pray for a neighborhood or city that needs to turn to God.", "Ora por un barrio o una ciudad que necesita volverse a Dios.", "JON 3:5"],
  ["Give God every worry, one by one, with thanks.", "Entrégale a Dios cada preocupación, una por una, con gratitud.", "PHI 4:6-7"],
  ["Leave last year behind. Press on to what is ahead.", "Deja atrás el año pasado. Sigue hacia lo que está delante.", "PHI 3:13-14"],
  ["Give thanks for the 21 days, and for the new thing God is doing.", "Da gracias por los 21 días y por lo nuevo que Dios hace.", "ISA 43:18-19"],
];
const WEEKS = {
  en: ["Week 1 (days 1 to 7): turn back to God", "Week 2 (days 8 to 14): listen", "Week 3 (days 15 to 21): pray for others and go forward"],
  es: ["Semana 1 (días 1 al 7): volver a Dios", "Semana 2 (días 8 al 14): escuchar", "Semana 3 (días 15 al 21): orar por otros y seguir adelante"],
};
const week = (n, lang) => {
  const day = lang === es ? "Día" : "Day";
  const rows = PLAN.slice(n * 7, n * 7 + 7).map(([en, sp, r], i) => `<li><p><strong>${day} ${n * 7 + i + 1}.</strong> ${lang === es ? sp : en}</p>${V(r, lang)}</li>`).join("\n");
  return [WEEKS[lang][n], `<ol class="points" start="${n * 7 + 1}">\n${rows}\n</ol>`];
};

const PSALM_NIGHTS_EN = `<p>Peace Be Still, {{stores.tag}}, has <strong>Psalm Nights · Whispered Scripture for Sleep</strong>: a King James psalm whispered at bedtime (an AI voice), with the screen kept dark and a sleep timer. Psalm 4, Psalm 23, Psalm 91, Psalm 121 and Psalm 63 are among them. Your first night is free, then one a week; the paid plan ($7.99 a month or $39.99 a year, no trial) opens one every night.</p>`;
const HUSH_HARBOR_EN = (stories) => `<p>Peace Be Still, {{stores.tag}}, has <strong>Hush Harbor · Black Bible Chat &amp; Stories</strong>: Bible stories told in a Black church voice, word for word from the King James where it quotes Scripture. ${stories} Today's story is free every day.</p>`;
const MI_REFUGIO = (extra) => `${MI_REFUGIO_ES}
<p>De noche, los Salmos se leen en susurro (con una voz de IA), con la pantalla oscura y un temporizador. ${extra}</p>`;

const NOT_MEDICAL_EN = `<p class="muted">This page is about prayer. It is not medical advice. Before you give up food, talk with your doctor if you are pregnant or nursing, have diabetes or another health condition, take regular medicine, are under 18, or have ever struggled with eating. You can fast from something other than food instead.</p>`;
const NOT_MEDICAL_ES = `<p class="muted">Esta página trata de la oración. No es consejo médico. Antes de dejar de comer, habla con tu médico si estás embarazada o amamantando, tienes diabetes u otra condición de salud, tomas medicina con regularidad, eres menor de 18 años o alguna vez has tenido problemas con la comida. También puedes ayunar de algo que no sea comida.</p>`;

export const SEASON = [
  // ---- Night prayer, English (60,500 a month, KD 12). Twin: /es/preguntas/oracion-de-la-noche/
  {
    ...D, lang: "en", door: "faith", group: GN, path: PATHS.night, alt: PATHS.noche,
    title: "Night prayer to end the day, with Psalms · Peace Be Still",
    description: "A night prayer you can pray tonight, how to pray at night in five steps, what to pray if you wake at 3 a.m., and the King James psalms for the night.",
    h1: "Night prayer: how to end the day with God",
    indexLabel: "Night prayer",
    indexNote: "A prayer for tonight, five steps, and a 3 a.m. prayer.",
    definition: "A night prayer is the prayer that closes the day before God: thanks for what was good, honesty about what went wrong, and handing over what is still unfinished. A short one for tonight: “Lord, thank you for today. Forgive me where I failed. I give you what I could not finish. Keep my house tonight. Amen.”",
    quick: "Thank, confess, hand over, then rest on one verse such as Psalm 4:8. Five minutes is enough. If you wake in the night, pray one line and a verse, and lie back down without picking up the phone.",
    bestFor: "anyone who wants a simple way to end the day in prayer, and anyone awake at 3 a.m. who wants something to pray.",
    sections: [
      ["What is a good night prayer?", `<p>One you will actually pray. This one takes under a minute:</p>
<p>“Lord, thank you for this day, for what went well and for what the hard parts taught me. Forgive me where I failed you and the people around me. I give you what I could not finish and what I could not fix. Watch over the ones I love tonight, near and far. Let me lie down in peace. Amen.”</p>
${V("PSA 4:8")}`],
      ["How do you pray at night?", `<ol>
<li><strong>Look back for one minute.</strong> Where did you see God today?</li>
<li><strong>Give thanks</strong> for two things, by name.</li>
<li><strong>Confess</strong> what went wrong, plainly, without replaying it.</li>
<li><strong>Hand over</strong> what is unfinished. It will still be there in the morning.</li>
<li><strong>End on a verse</strong> and turn off the light.</li>
</ol>
${V("PSA 42:8")}`],
      ["What should I pray if I wake up at 3 a.m.?", `<p>Keep it short, so prayer does not turn into a worry list. Many people pray one line and a verse:</p>
<p>“Lord, you are awake when I am awake. I give you what woke me. Watch over me until morning. Amen.”</p>
${V("PSA 63:6")}
<p>Then lie back down. If something specific woke you, write it on paper by the bed and leave it there until morning. If waking in the night happens often, it is worth mentioning to your doctor.</p>`],
      ["Is there midnight prayer in the Bible?", `<p>Yes. David wrote ${F("PSA 119:62", "At midnight I will rise to give thanks unto thee")}, and Jesus ${F("LUK 6:12", "continued all night in prayer to God")}. In prison at Philippi, Paul and Silas prayed and sang at midnight:</p>
${V("ACT 16:25")}`],
      ["Which psalms are prayed at night?", `<p>Psalm 4 is David's evening prayer and ends with the verse above. Psalm 91 asks for protection (${F("PSA 91:5", "Thou shalt not be afraid for the terror by night")}). Psalm 121 is the keeper who never sleeps, and Psalm 134 blesses those ${F("PSA 134:1", "which by night stand in the house of the LORD")}. In Anglican and Catholic churches, Night Prayer (also called Compline) is the last set prayer of the day and uses psalms like these.</p>`],
      ["Night prayer in Peace Be Still", `${PSALM_NIGHTS_EN}
<p>On 31 December many churches keep a whole night of prayer: see <a href="${PATHS.watch}">the Watch Night service</a>, and the <a href="${PATHS.fast}">21-day January fast</a> that often follows it.</p>`],
    ],
    faq: [
      ["What is the night prayer called?", "In many homes it is simply the evening or bedtime prayer. In Anglican and Catholic churches the set night prayer is called Compline, or Night Prayer. Any honest prayer at the end of the day counts; you do not need a set form to pray at night."],
      ["Is it wrong to fall asleep while praying?", "No. Falling asleep while talking to God is not a failure. Psalm 4 ends with lying down in peace and sleeping, and that is a good place to stop. Pray what matters first, then rest."],
      ["Why do people pray at 3 a.m.?", "Some wake then and use the time to pray; some churches keep night watches. Scripture shows prayer in the night watches (Psalm 63:6) and at midnight (Acts 16:25). Keep it short and go back to sleep when you can."],
      ["How long should a night prayer be?", "A few minutes. A long night prayer often becomes a list of worries. Say what matters, give the rest to God, and close with one verse you can carry to sleep."],
    ],
    sources: [KJV_SRC, bg("Psalm 4", "Psalm 4 (KJV), Bible Gateway"), bg("Psalm 63", "Psalm 63 (KJV), Bible Gateway"), bg("Acts 16:25", "Acts 16:25 (KJV), Bible Gateway")],
    related: ["/questions/bedtime-prayer/", "/questions/prayer-for-sleep/", "/questions/psalms-for-sleep/", PATHS.watch],
  },

  // ---- Watch Night, English (2,400 a month, KD 15; "new year prayer" 3,600). Twin: culto de fin de año.
  {
    ...D, lang: "en", door: "faith", group: G, path: PATHS.watch, alt: PATHS.finDeAno,
    audience: "Black churches and families in the United States keeping Watch Night",
    title: "Watch Night service: history and a prayer · Peace Be Still",
    description: "What a Watch Night service is, why Black churches keep it on 31 December (Freedom's Eve, 1862), what happens, how to keep it at home, and a midnight prayer.",
    h1: "The Watch Night service: history, order and a prayer for midnight",
    indexLabel: "Watch Night service",
    indexNote: "Freedom's Eve, what happens, and how to keep it at home.",
    definition: "A Watch Night service is a church service held late on New Year's Eve that prays the old year out and the new year in at midnight. In Black American churches it carries the memory of Freedom's Eve, 31 December 1862, when people gathered to wait for the Emancipation Proclamation, which President Lincoln issued on 1 January 1863.",
    quick: "In 2026 Watch Night is Thursday 31 December. Most services start in the late evening with singing, testimony and the Word, and the church prays together as midnight comes. You can keep it at home with a psalm, thanks for the year, and prayer through midnight.",
    bestFor: "anyone going to Watch Night for the first time, families keeping it at home, and anyone who wants to know where it came from.",
    sections: [
      ["Where did Watch Night come from?", `<p>Two streams meet in it. Methodists, following John Wesley, held watch nights from 1740: late services of prayer and Scripture, monthly at first and later on New Year's Eve, where Methodists also renewed their covenant with God. Then on 31 December 1862, enslaved and free Black people gathered in churches and homes to watch for the Emancipation Proclamation, which Lincoln issued the next day. That night is remembered as Freedom's Eve, and Black churches have kept Watch Night ever since.</p>
<p>The Proclamation freed people in the states then in rebellion; freedom reached many only as Union troops advanced, and slavery ended in law with the Thirteenth Amendment in 1865. Watch Night remembers the waiting as much as the news.</p>`],
      ["What happens at a Watch Night service?", `<p>Every church does it its own way. Most include:</p>
<ul>
<li>congregational singing, often the old hymns and spirituals;</li>
<li>testimonies of what God did in the year that is ending;</li>
<li>Scripture and a sermon;</li>
<li>prayer through the last minutes of the year, often at the altar, into midnight;</li>
<li>in many churches, Holy Communion, and a fellowship meal after.</li>
</ul>
${V("EXO 14:13")}`],
      ["A Watch Night prayer for midnight", `<p>“Lord, we have watched and waited, and you have kept us. Thank you for every month of this year: for what you gave, and for what you carried us through. We remember the ones who waited before us and did not give up on you. We lay down what is behind us. Take this new year, our homes, our church and our children, and teach us to number our days. Amen.”</p>
${V("PSA 90:12")}`],
      ["Scriptures for Watch Night", `${V("LAM 3:22-23")}
${V("PSA 30:5")}
${V("HAB 2:3")}`],
      ["How do you keep Watch Night at home?", `<ol>
<li><strong>Start around 11 p.m.</strong> with a hymn or spiritual everyone knows.</li>
<li><strong>Read Psalm 90</strong> aloud, one verse each.</li>
<li><strong>Testify:</strong> each person names one thing God did this year.</li>
<li><strong>Lay down the old year.</strong> Pray over what is ending, by name.</li>
<li><strong>Pray through midnight</strong>, then welcome the new year with praise.</li>
<li><strong>Pray the new year in</strong>, with the prayer below, and eat together.</li>
</ol>`],
      ["A New Year prayer", `<p>“Father, this year is yours before it has begun. Go before us in every month. Give us daily bread, clean hearts and wise words. Make a way where we cannot see one. Amen.”</p>
${V("PSA 65:11")}
${V("ISA 43:18-19")}`],
      ["Watch Night in Peace Be Still", `${HUSH_HARBOR_EN("Among them: Moses at the Red Sea (“Stand Still and See”) and Daniel in the lions' den (“Didn't My Lord Deliver Daniel”).")}
<p>The app has no Watch Night service of its own; this page is the order to follow. Many churches begin a <a href="${PATHS.fast}">21-day fast</a> the first week of January, and the plan is here.</p>`],
    ],
    faq: [
      ["Why do Black churches have Watch Night?", "Black churches keep Watch Night in memory of Freedom's Eve, 31 December 1862, when enslaved and free Black people gathered to wait for the Emancipation Proclamation, issued on 1 January 1863. The service gives thanks for the year and prays the new one in."],
      ["What time does a Watch Night service start?", "Times vary by church. Many start between 9 and 11 p.m. and run past midnight, so the congregation is praying as the year turns. Check your church's announcement or website for this year's time."],
      ["Is Watch Night the same as crossover night?", "They are close cousins. Watch Night is the name in Black American and Methodist churches; many African churches call the same midnight service of prayer crossover night. Both thank God for the year that is ending and pray the new one in, and many families now keep both."],
      ["What do you wear to Watch Night?", "Whatever your church usually wears on Sunday. Some churches dress up for the new year; others are casual because the service runs late. Bring a Bible and a coat, and something to write on if your church shares a word for the new year. Children are welcome in most churches."],
    ],
    sources: [ARCHIVES, NMAAHC, WIKI, KJV_SRC, bg("Psalm 90", "Psalm 90 (KJV), Bible Gateway")],
    related: ["/questions/crossover-night-prayer-points/", PATHS.fast, PATHS.night, "/black-bible-chat/"],
  },

  // ---- 21-day fast, English (21 day fast 2,400 at KD 6; fasting prayer 8,100 at KD 10). Twin: ayuno.
  {
    ...D, lang: "en", door: "faith", group: G, path: PATHS.fast, alt: PATHS.ayuno,
    title: "21-day fast: a day-by-day prayer plan (KJV) · Peace Be Still",
    description: "A 21-day fast for January 2027: the kinds of fast (including the Daniel fast), a fasting prayer, and a daily plan with one prayer focus and one KJV verse.",
    h1: "The 21-day fast: prayers and a day-by-day plan",
    indexLabel: "21-day fast",
    indexNote: "Kinds of fast, a fasting prayer, and a plan for every day.",
    definition: `A 21-day fast is three weeks set apart for prayer, in which you give up some or all food, or something else such as social media, and give that time to God. Many churches begin one in the first week of January. It follows Daniel, who was ${F("DAN 10:2-3", "mourning three full weeks")} and ate ${F("DAN 10:2-3", "no pleasant bread")}.`,
    quick: "Choose your fast, pick a start date (many churches begin on Sunday 3 or Monday 4 January 2027), and pray through one focus and one verse each day using the plan below. Keep it quiet, keep it kind, and end on day 21 with thanksgiving.",
    bestFor: "anyone joining their church's January fast, or keeping one alone, who wants a plan for each day's prayer.",
    sections: [
      ["Before you start", NOT_MEDICAL_EN],
      ["What kinds of fast are there?", `<table class="t"><thead><tr><th>Fast</th><th>What you give up</th><th>Where it comes from</th></tr></thead><tbody>
<tr><td>The Daniel fast</td><td data-label="What you give up">Meat, sweets and rich food, and often wine; many eat vegetables, fruit, grains and water</td><td data-label="Where it comes from">Daniel 1:12 and 10:3</td></tr>
<tr><td>A partial fast</td><td data-label="What you give up">Food until evening, or one meal a day</td><td data-label="Where it comes from">Judges 20:26 (${F("JDG 20:26", "fasted that day until even")})</td></tr>
<tr><td>A full fast</td><td data-label="What you give up">All food, for a short time, with water</td><td data-label="Where it comes from">Esther 4:16; only with your doctor's okay</td></tr>
<tr><td>A fast from something else</td><td data-label="What you give up">Social media, TV, games, shopping or sweets</td><td data-label="Where it comes from">A modern practice, kept in the same spirit</td></tr>
</tbody></table>
<p>Churches differ on the details of the Daniel fast; follow your church's guide if it has one.</p>
${V("DAN 1:12")}`],
      ["A fasting prayer", `<p>“Lord, I set these days apart for you. When I am hungry, turn me to your Word. Search my heart and make it clean. Loose what binds me and the people I love. Show me your way for this year, and let this fast be between you and me. Amen.”</p>
${V("ISA 58:6")}
${V("MAT 6:17-18")}`],
      week(0, "en"),
      week(1, "en"),
      week(2, "en"),
      ["How do you end a 21-day fast?", `<p>With thanks. On day 21, write down what you prayed for and what you noticed God doing, even small things. Many churches close with a service of praise or communion. Go back to your usual meals gently, the way your doctor advises, and keep one habit from the fast, such as reading before breakfast.</p>
${V("PSA 30:5")}`],
      ["The fast in Peace Be Still", `<p>The app has no fasting plan inside it; this page is the plan. What it does have helps each day of it:</p>
<ul>
<li><strong>Morning Word · Daily Declarations:</strong> a declaration each morning that stands on one verse, quoted word for word.</li>
<li><strong>Hush Harbor · Black Bible Chat &amp; Stories:</strong> stories of people who fasted, told in a Black church voice: Esther (“For Such a Time as This”), Daniel (“Didn't My Lord Deliver Daniel”) and Jonah, whose message moved Nineveh to fast (“Jonah Ran, and God Called Again”).</li>
<li><strong>Psalm Nights · Whispered Scripture for Sleep:</strong> a whispered psalm at bedtime when the day was long.</li>
</ul>
<p>Peace Be Still is {{stores.tag}}. The whole King James Bible and today's story are free.</p>`],
    ],
    faq: [
      ["When does the January 2027 fast start?", "Most churches choose the first Sunday or Monday of the year. In 2027 that is Sunday 3 January or Monday 4 January, so a 21-day fast ends on Saturday 23 or Sunday 24 January. Follow your church's dates if it announces them."],
      ["What can you eat on a Daniel fast?", "Churches differ, but most follow Daniel 1:12 and 10:3: vegetables, fruit, whole grains, beans and water, with no meat, sweets or rich food. Many also leave out coffee and wine. Check your church's guide, and your doctor if you have a health condition."],
      ["Is fasting commanded in the Bible?", `Jesus speaks of fasting as something his followers will do: ${F("MAT 6:16", "when ye fast")} (Matthew 6:16), not “if”. The Bible gives no single rule for how long or what to give up, so churches and believers choose with prayer.`],
      ["What if I break my fast?", "Start again at the next meal or the next day. A fast is not a test you pass or fail; it is time given to God. Lamentations 3:22-23 says his mercies are new every morning, and that includes day 9 of a fast."],
    ],
    sources: [KJV_SRC, bg("Daniel 10", "Daniel 10 (KJV), Bible Gateway"), bg("Isaiah 58", "Isaiah 58 (KJV), Bible Gateway"), bg("Matthew 6:16-18", "Matthew 6:16-18 (KJV), Bible Gateway")],
    related: [PATHS.watch, PATHS.night, "/questions/bible-verses-for-grief/", "/black-bible-chat/"],
  },

  // ---- Culto de fin de año (vigilia de Año Nuevo). Gemela de Watch Night.
  {
    ...DES, lang: es, door: "faith", group: GES, path: PATHS.finDeAno, alt: PATHS.watch,
    title: "Culto de fin de año: vigilia y oración · Peace Be Still",
    description: "Cómo vivir el culto o la vigilia de fin de año el 31 de diciembre: qué se hace, cómo hacerlo en casa, una oración y versículos de la Reina-Valera 1909.",
    h1: "Culto de fin de año: cómo recibir el Año Nuevo orando",
    indexLabel: "Culto de fin de año",
    indexNote: "Qué se hace, cómo hacerlo en casa y una oración para la medianoche.",
    definition: "El culto de fin de año, o vigilia de Año Nuevo, es el servicio que muchas iglesias hacen la noche del 31 de diciembre para despedir el año dando gracias y recibir el nuevo orando a la medianoche. En las iglesias negras de Estados Unidos se llama Watch Night y recuerda la noche del 31 de diciembre de 1862.",
    quick: "En 2026 el 31 de diciembre cae jueves. La mayoría de las iglesias empiezan en la noche con alabanza, testimonios y la Palabra, y oran juntas al llegar la medianoche. En casa basta un salmo, dar gracias por el año y orar hasta la medianoche.",
    bestFor: "quien va por primera vez a una vigilia de fin de año, y las familias que quieren hacerla en casa.",
    sections: [
      ["¿De dónde viene la vigilia de fin de año?", `<p>Los metodistas, siguiendo a John Wesley, hacían vigilias de oración desde 1740, primero cada mes y más tarde la noche de fin de año. En Estados Unidos, la noche del 31 de diciembre de 1862, personas negras esclavizadas y libres se reunieron en iglesias y casas a esperar la Proclamación de Emancipación, que el presidente Lincoln firmó al día siguiente. Esa noche se recuerda como la Víspera de la Libertad, y las iglesias negras la guardan desde entonces con el nombre de Watch Night.</p>
<p>Hoy muchas iglesias evangélicas hispanas tienen su propio culto de fin de año, con la misma idea: terminar el año delante de Dios.</p>`],
      ["¿Qué se hace en un culto de fin de año?", `<p>Cada iglesia lo hace a su manera. Casi siempre hay:</p>
<ul>
<li>alabanza y coros;</li>
<li>testimonios de lo que Dios hizo en el año;</li>
<li>lectura de la Biblia y predicación;</li>
<li>oración en los últimos minutos del año, hasta la medianoche;</li>
<li>en muchas iglesias, la Santa Cena y una comida para compartir después.</li>
</ul>
${V("PSA 90:12", es)}`],
      ["Una oración para la medianoche", `<p>“Señor, hemos esperado y tú nos has guardado. Gracias por cada mes de este año: por lo que nos diste y por lo que nos ayudaste a pasar. Dejamos atrás lo que ya pasó. Toma este año nuevo, nuestra casa, nuestra iglesia y nuestros hijos, y enséñanos a contar nuestros días. Amén.”</p>
${V("LAM 3:22-23", es)}`],
      ["¿Cómo hacer la vigilia de fin de año en casa?", `<ol>
<li><strong>Empieza a las 11 de la noche</strong> con un coro que todos en casa sepan.</li>
<li><strong>Lee el Salmo 90</strong> en voz alta; que cada uno lea un versículo.</li>
<li><strong>Abre el tiempo de testimonios:</strong> cada uno dice algo que Dios hizo este año.</li>
<li><strong>Despide el año.</strong> Oren juntos por lo que termina, por nombre.</li>
<li><strong>Oren hasta la medianoche</strong> y reciban el año con alabanza.</li>
<li><strong>Consagra el año nuevo</strong> con la oración de abajo, y luego coman juntos.</li>
</ol>`],
      ["Una oración para el Año Nuevo", `<p>“Padre, este año es tuyo antes de empezar. Ve delante de nosotros cada mes. Danos el pan de cada día, un corazón limpio y palabras sabias. Abre camino donde no lo vemos. Amén.”</p>
${V("PSA 65:11", es)}
${V("ISA 43:18-19", es)}`],
      ["El fin de año en Peace Be Still", `${MI_REFUGIO("La primera noche es gratis y luego una por semana; un plan de pago ($7.99 al mes o $39.99 al año, sin prueba) abre una cada noche.")}
<p>La app no tiene un culto de fin de año propio; esta página es el orden a seguir. Muchas iglesias empiezan un <a href="${PATHS.ayuno}">ayuno de 21 días</a> la primera semana de enero, y aquí está el plan.</p>`],
    ],
    faq: [
      ["¿Qué se lee en el culto de fin de año?", "Muchas iglesias leen el Salmo 90, que pide aprender a contar nuestros días, o el Salmo 65, que dice que Dios corona el año de sus bienes. Lamentaciones 3:22-23 y Isaías 43:18-19 también son muy comunes."],
      ["¿A qué hora empieza la vigilia de fin de año?", "Depende de cada iglesia. Muchas empiezan entre las 9 y las 11 de la noche y terminan después de la medianoche, para estar orando cuando cambia el año. Revisa el anuncio de tu iglesia."],
      ["¿Qué es Watch Night?", "Es el nombre del culto de fin de año en las iglesias negras de Estados Unidos. Recuerda la noche del 31 de diciembre de 1862, cuando se esperaba la Proclamación de Emancipación, firmada el 1 de enero de 1863."],
    ],
    sources: [ARCHIVES, NMAAHC, RV_SRC, rv("Salmos 90", "Salmos 90 (RVES), Bible Gateway")],
    related: [PATHS.ayuno, PATHS.noche, "/es/preguntas/oracion-por-la-noche/", "/es/preguntas/salmos-para-dormir/"],
  },

  // ---- Ayuno de 21 días. Gemela de /questions/21-day-fast/.
  {
    ...DES, lang: es, door: "faith", group: GES, path: PATHS.ayuno, alt: PATHS.fast,
    title: "Ayuno de 21 días: plan de oración (RV 1909) · Peace Be Still",
    description: "Un ayuno de 21 días para enero de 2027: tipos de ayuno (también el de Daniel), una oración para ayunar y un plan con un versículo cada día.",
    h1: "Ayuno de 21 días: oraciones y un plan día por día",
    indexLabel: "Ayuno de 21 días",
    indexNote: "Tipos de ayuno, una oración y un plan para cada día.",
    definition: `Un ayuno de 21 días son tres semanas apartadas para orar, en las que dejas parte o toda la comida, u otra cosa como las redes sociales, y le das ese tiempo a Dios. Muchas iglesias lo empiezan la primera semana de enero. Sigue el ejemplo de Daniel, que escribió: ${F("DAN 10:2-3", "me contristé por espacio de tres semanas", es)}, y añadió: ${F("DAN 10:2-3", "No comí pan delicado", es)}.`,
    quick: "Elige tu ayuno, una fecha para empezar (muchas iglesias empiezan el domingo 3 o el lunes 4 de enero de 2027) y ora cada día con un motivo y un versículo del plan de abajo. Hazlo en secreto y con amor, y el día 21 da gracias.",
    bestFor: "quien se une al ayuno de enero de su iglesia, o lo hace solo, y quiere un plan para orar cada día.",
    sections: [
      ["Antes de empezar", NOT_MEDICAL_ES],
      ["¿Qué tipos de ayuno hay?", `<table class="t"><thead><tr><th>Ayuno</th><th>Qué dejas</th><th>De dónde viene</th></tr></thead><tbody>
<tr><td>El ayuno de Daniel</td><td data-label="Qué dejas">Carne, dulces y comida fina, y muchas veces el vino; se comen verduras, frutas, granos y agua</td><td data-label="De dónde viene">Daniel 1:12 y 10:3</td></tr>
<tr><td>Ayuno parcial</td><td data-label="Qué dejas">La comida hasta la tarde, o una comida al día</td><td data-label="De dónde viene">Jueces 20:26 (${F("JDG 20:26", "ayunaron aquel día hasta la tarde", es)})</td></tr>
<tr><td>Ayuno completo</td><td data-label="Qué dejas">Toda la comida, por poco tiempo, con agua</td><td data-label="De dónde viene">Ester 4:16; solo con el visto bueno de tu médico</td></tr>
<tr><td>Ayuno de otra cosa</td><td data-label="Qué dejas">Redes sociales, televisión, juegos, compras o dulces</td><td data-label="De dónde viene">Una práctica de hoy, con el mismo espíritu</td></tr>
</tbody></table>
<p>Las iglesias no coinciden en todos los detalles del ayuno de Daniel; si tu iglesia tiene su guía, síguela.</p>
${V("DAN 1:12", es)}`],
      ["Una oración para ayunar", `<p>“Señor, aparto estos días para ti. Cuando tenga hambre, llévame a tu Palabra. Examina mi corazón y límpialo. Desata lo que me ata a mí y a los que amo. Muéstrame tu camino para este año, y que este ayuno quede entre tú y yo. Amén.”</p>
${V("ISA 58:6", es)}
${V("MAT 6:17-18", es)}`],
      week(0, es),
      week(1, es),
      week(2, es),
      ["¿Cómo terminar un ayuno de 21 días?", `<p>Dando gracias. El día 21, escribe por qué oraste y lo que viste hacer a Dios, aunque sea pequeño. Muchas iglesias cierran con un culto de alabanza o la Santa Cena. Vuelve a tus comidas de siempre poco a poco, como te indique tu médico, y quédate con una costumbre del ayuno, como leer antes del desayuno.</p>
${V("PSA 30:5", es)}`],
      ["El ayuno en Peace Be Still", MI_REFUGIO("Peace Be Still no tiene un plan de ayuno dentro de la app; esta página es el plan. La Biblia completa y la historia del día son gratis.")],
    ],
    faq: [
      ["¿Cuándo empieza el ayuno de enero de 2027?", "La mayoría de las iglesias escogen el primer domingo o lunes del año. En 2027 es el domingo 3 o el lunes 4 de enero, así que un ayuno de 21 días termina el sábado 23 o el domingo 24 de enero. Si tu iglesia anuncia fechas, síguelas."],
      ["¿Qué se come en el ayuno de Daniel?", "Las iglesias varían, pero casi todas siguen Daniel 1:12 y 10:3: verduras, frutas, granos, frijoles y agua, sin carne, dulces ni comida fina. Muchos también dejan el café. Revisa la guía de tu iglesia y consulta a tu médico si tienes una condición de salud."],
      ["¿La Biblia manda ayunar?", `Jesús habla del ayuno como algo que sus discípulos harán: ${F("MAT 6:16", "cuando ayunáis", es)} (Mateo 6:16), no “si ayunáis”. La Biblia no fija cuántos días ni qué dejar, así que cada iglesia y cada creyente lo decide en oración.`],
      ["¿Qué hago si rompo el ayuno?", "Vuelve a empezar en la próxima comida o al día siguiente. El ayuno no es un examen que se aprueba o se reprueba; es tiempo para Dios. Sus misericordias son nuevas cada mañana (Lamentaciones 3:22-23)."],
    ],
    sources: [RV_SRC, rv("Daniel 10", "Daniel 10 (RVES), Bible Gateway"), rv("Isaías 58", "Isaías 58 (RVES), Bible Gateway"), rv("Mateo 6:16-18", "Mateo 6:16-18 (RVES), Bible Gateway")],
    related: [PATHS.finDeAno, PATHS.noche, "/es/preguntas/oracion-de-la-manana/", "/es/preguntas/devocional-diario/"],
  },
];
