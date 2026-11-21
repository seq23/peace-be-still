// English sleep, prayer and verse pages (blitz-top50.json, cluster "Bible chat / AI / sleep").
import { D, V, Q, P, F, bg, KJV_SRC } from "./blitz-common.mjs";

const G = "Sleep, prayer and Bible verses";

export const SLEEP = [
  {
    ...D, lang: "en", door: "faith", group: G, path: "/questions/prayer-for-sleep/", alt: "/es/preguntas/oracion-para-dormir/",
    title: "Prayer for sleep: short prayers to pray tonight · Peace Be Still",
    description: "Short prayers for sleep you can pray lying down tonight, the Bible verses they lean on (KJV, word for word), and how to keep it simple when your mind is busy.",
    h1: "A prayer for sleep you can pray tonight",
    indexLabel: "Prayer for sleep",
    indexNote: "Three short prayers to pray lying down, and the verses under them.",
    definition: "A prayer for sleep is a few honest words to God at the end of the day: hand over what you are carrying, ask for rest, and lie down. Try this one tonight: “Lord, I give you today. Keep me and the people I love tonight. I lie down in your peace.” Then let Psalm 4:8 be the last thing you read.",
    quick: "Keep it short enough to say with your eyes closed. Thank God for one thing, hand over one worry by name, ask for rest, and end with Psalm 4:8. If your mind keeps running, say the same line again instead of starting a new one.",
    bestFor: "anyone lying awake who wants words to pray, not a long list to read.",
    sections: [
      ["What is a short prayer to say before bed?", `<p>Three you can learn by heart. Pick one and keep it for a week.</p>
<ol>
<li><strong>For a heavy day:</strong> “Father, today was a lot. I put it in your hands. I am not carrying it into my sleep. Amen.”</li>
<li><strong>For a worried mind:</strong> “Lord, you know what I am afraid of. You are awake while I sleep. Keep my house tonight. Amen.”</li>
<li><strong>For someone you love:</strong> “Jesus, hold my mother (or my son, my friend) tonight wherever they are. Give us both rest. Amen.”</li>
</ol>
<p>None of these are magic words. They are a way of telling God the truth and then lying down.</p>`],
      ["What does the Bible say about sleep?", `<p>The Bible treats sleep as a gift and a sign of trust. David slept in the middle of a war and said the Lord kept him:</p>
${V("PSA 3:5")}
<p>Psalm 127 goes further and says that worrying late into the night does not add anything:</p>
${V("PSA 127:2")}`],
      ["Which Psalm is for sleeping in peace?", `<p>Psalm 4. It is an evening psalm, and its last verse is the one most people pray at bedtime: ${Q("PSA 4:8")} Read the whole psalm once, then keep only verse 8 in your mouth as you settle. See <a href="/questions/psalms-for-sleep/">six psalms for sleep</a> if you want more.</p>`],
      ["Is it okay to fall asleep while praying?", `<p>Yes. Many believers fall asleep mid-prayer, and there is nothing in scripture that counts it against you. The disciples fell asleep in Gethsemane, and Jesus woke them gently. If you drift off while talking to God, that is a good place to drift off.</p>`],
      ["Praying when your mind will not stop", `<ul>
<li>Say one line, slowly, on the out-breath. Repeat it rather than adding new ones.</li>
<li>Name the worry out loud once, then stop discussing it. You have told God; you do not need to tell him nine times.</li>
<li>If a task comes to mind, write it on paper by the bed and go back to the line.</li>
<li>If you would rather listen than speak, play a psalm read softly with a sleep timer.</li>
</ul>`],
      ["Where Peace Be Still fits", `<p>Peace Be Still is a phone app coming soon to the App Store and Google Play. Its Psalm Nights read a King James psalm in a whisper on a dark screen that dims after ten seconds, with a sleep timer that fades out. Your first night is free, then one a week in the free version; a paid plan ($7.99 a month or $39.99 a year, no trial) opens one every night.</p>`],
    ],
    faq: [
      ["What is the best prayer for sleep?", `The one you will actually pray. Short is better: thank God for one thing, hand over one worry, ask for rest. Many people end with Psalm 4:8: ${Q("PSA 4:8")}`],
      ["Can I pray for sleep if I feel anxious?", "Yes. Philippians 4:6 tells believers to bring everything to God in prayer, “with thanksgiving”. A prayer is not a treatment; if anxiety or poor sleep goes on for weeks, talk to a doctor as well as to God."],
      ["Should I pray out loud or silently at night?", "Either. A whisper can help you slow down and stay with the words, especially if you share a room. Silent prayer is just as much prayer."],
      ["How long should a bedtime prayer be?", "A minute is plenty. A long prayer often turns into a list of worries. Say what matters, end with a verse, and let yourself rest."],
    ],
    sources: [bg("Psalm 4", "Psalm 4 (KJV), Bible Gateway"), bg("Psalm 127:2", "Psalm 127:2 (KJV), Bible Gateway"), bg("Philippians 4:6-7", "Philippians 4:6-7 (KJV), Bible Gateway")],
    related: ["/questions/bedtime-prayer/", "/questions/bible-verses-for-sleep/", "/questions/psalms-for-sleep/", "/questions/bible-verses-for-sleep-and-anxiety/", "/questions/whispered-bible-for-sleep/"],
  },
  {
    ...D, lang: "en", door: "faith", group: G, path: "/questions/bedtime-prayer/",
    title: "Bedtime prayer: simple prayers for children and grown-ups · Peace Be Still",
    description: "A simple bedtime prayer for children, one for grown-ups, and one for a family to say together, with the King James verses behind them and how to make it a habit.",
    h1: "A simple bedtime prayer for children, grown-ups and families",
    indexLabel: "Bedtime prayer",
    indexNote: "One prayer for a child, one for you, one to say together.",
    definition: "A bedtime prayer is the short prayer said at the end of the day, lying down or kneeling by the bed. A simple one for a child: “Thank you, God, for today. Keep me safe tonight. Bless my family. Amen.” For a grown-up, add one thing you are handing over. The habit matters more than the wording.",
    quick: "Children: three lines they can say alone (thank you, keep me, bless). Grown-ups: thank, hand over, rest. Families: one line each, then the same verse together every night, such as Psalm 4:8.",
    bestFor: "parents setting up a bedtime routine, and adults who want to start praying before sleep again.",
    sections: [
      ["What is the bedtime prayer most people learned as children?", `<p>Many American families taught “Now I lay me down to sleep”. Its newer, gentler form goes:</p>
<blockquote class="verse prayer"><p>Now I lay me down to sleep, I pray the Lord my soul to keep. Watch over me throughout the night, and keep me safe till morning light. Amen.</p><cite>Traditional children's prayer</cite></blockquote>
<p>It is not scripture, so it is not quoted from the King James Bible. It is a family prayer, and you can change the words to suit your child.</p>`],
      ["A bedtime prayer for a child", `<p>Short lines a four-year-old can repeat after you, and a ten-year-old can say alone:</p>
<ol>
<li>Thank you, God, for today.</li>
<li>Thank you for (one thing from the day: a friend, a meal, a game).</li>
<li>Please keep me safe tonight.</li>
<li>Bless Mommy, Daddy, Grandma, and (anyone they name).</li>
<li>Amen.</li>
</ol>
<p>Let your child fill in line 2 and line 4. That is where the prayer becomes theirs.</p>`],
      ["A bedtime prayer for grown-ups", `<p>“Lord, thank you for carrying me through today. I give you what I did not finish and what I could not fix. Watch over the people I love. Let me rest in you tonight. Amen.”</p>
${V("PSA 121:7-8")}`],
      ["How do we pray together as a family at night?", `<ul>
<li>Keep it under five minutes so nobody dreads it.</li>
<li>Each person says one thank-you and one person they are praying for.</li>
<li>End with the same verse every night. Children learn it by heart within a couple of weeks.</li>
<li>Skip the lecture. Bedtime prayer is not the moment to correct the day.</li>
</ul>
${V("NUM 6:24-26")}`],
      ["Is it okay to fall asleep listening to the Bible?", `<p>Yes. Plenty of families play a short passage or a psalm after prayer and let it run while children drift off. Use a sleep timer so the audio stops on its own, and turn off autoplay so a new video does not start.</p>`],
      ["Where Peace Be Still fits", `<p>Peace Be Still, coming soon to the App Store and Google Play, has a daily Bible story to read or hear and Psalm Nights, a whispered King James psalm with a sleep timer. Chat is not offered under 13. The free version includes today's story and the whole King James Bible to read and hear.</p>`],
    ],
    faq: [
      ["What is a good bedtime prayer for kids?", "A short one they can say alone: “Thank you, God, for today. Please keep me safe tonight. Bless my family. Amen.” Let them add one thing they are thankful for and the names of people they love."],
      ["What is the blessing in Numbers 6?", `It is the priestly blessing that Aaron spoke over Israel: ${Q("NUM 6:24-26")} Many parents pray it over a child at bedtime.`],
      ["Should my child kneel to pray at night?", "Kneeling is a good habit if your family likes it, but God hears a child lying under the covers just the same. Pick whatever keeps the prayer happening."],
      ["Is “Now I lay me down to sleep” in the Bible?", "No. It is a traditional children's prayer, not a Bible verse. Many families now use a gentler last line, “keep me safe till morning light”."],
    ],
    sources: [bg("Numbers 6:24-26", "Numbers 6:24-26 (KJV), Bible Gateway"), bg("Psalm 121", "Psalm 121 (KJV), Bible Gateway")],
    related: ["/questions/prayer-for-sleep/", "/questions/bedtime-bible-stories/", "/questions/bible-verses-for-sleep/", "/questions/psalms-for-sleep/"],
  },
  {
    ...D, lang: "en", door: "faith", group: G, path: "/questions/bible-verses-for-anxiety/",
    title: "Bible verses for anxiety (KJV), grouped by what you feel · Peace Be Still",
    description: "Bible verses for anxiety, quoted word for word from the King James Version and grouped by what you are feeling: worry, fear, a racing mind, being alone. Plus how to pray them.",
    h1: "Bible verses for anxiety, grouped by what you are feeling",
    indexLabel: "Bible verses for anxiety",
    indexNote: "Grouped by worry, fear, a racing mind and loneliness.",
    definition: `The Bible verses most turned to for anxiety are Philippians 4:6-7, 1 Peter 5:7, Isaiah 41:10, Matthew 6:34 and John 14:27. Philippians 4:6 is the clearest: ${Q("PHI 4:6")} In 1611 English, “careful” means anxious.`,
    quick: "Pick the group below that matches what you feel right now, read one verse slowly, and pray it back in your own words. One verse held for a few days does more than a list read once.",
    bestFor: "someone anxious right now who wants a few verses that fit, not fifty.",
    sections: [
      ["What does the Bible say about anxiety?", `<p>It says to bring it to God rather than carry it alone, and it promises his peace, not the absence of every hard thing. Paul wrote this from prison:</p>
${V("PHI 4:6-7")}
<p>Note the word “careful”. In the King James English of 1611 it means full of care, worried. The verse is not telling you to be careless; it is telling you not to be eaten up with worry.</p>`],
      ["Verses for when you are worried about tomorrow", `${V("MAT 6:34")}
${V("1PE 5:7")}`],
      ["Verses for when you are afraid", `${V("ISA 41:10")}
${V("PSA 56:3")}`],
      ["What is the most calming verse in the Bible?", `<p>There is no official answer, but many people name Jesus's words to his friends the night before the cross:</p>
${V("JOH 14:27")}
<p>Another short one to say under your breath is ${Q("PSA 46:10")}</p>`],
      ["Verses for a racing mind", `${V("ISA 26:3")}
${V("PSA 94:19")}`],
      ["How do I pray when I am anxious?", `<ol>
<li>Say plainly what you are anxious about. God already knows; saying it helps you.</li>
<li>Thank him for one true thing, as Philippians 4:6 asks (${F("PHI 4:6", "with thanksgiving")}).</li>
<li>Ask for what you need today, not for the whole future.</li>
<li>Read one verse from above, slowly, twice.</li>
<li>If it is night, see <a href="/questions/bible-verses-for-sleep-and-anxiety/">verses for sleep and anxiety</a>.</li>
</ol>`],
      ["When to get more help", `<p>Scripture and prayer are a comfort, not a replacement for care. If anxiety is stopping you from working, eating or sleeping for weeks, talk to a doctor or counselor. If you are thinking about harming yourself, call or text 988 (the Suicide &amp; Crisis Lifeline in the US) now.</p>`],
      ["Where Peace Be Still fits", `<p>Peace Be Still, coming soon, has a Bible chat where you can say what is on your heart and get King James verses back, pasted word for word from a stored copy. It is AI and says so on every answer. If you mention self-harm, it shows 988 and other help straight away instead of an AI reply.</p>`],
    ],
    faq: [
      ["Is anxiety a sin in the Bible?", `The Bible does not call feeling anxious a sin. It invites anxious people to bring their worry to God: ${Q("1PE 5:7")} (1 Peter 5:7). Feeling afraid and praying about it is what the Psalms are full of.`],
      ["Is there a verse for worry at night?", `Psalm 4:8: ${Q("PSA 4:8")} Psalm 94:19 also fits a racing mind: ${Q("PSA 94:19")}`],
      [`What does “${F("PHI 4:6", "Be careful for nothing")}” mean?`.replace(/<[^>]+>/g, ""), "In the King James Version, “careful” means anxious or full of care. Philippians 4:6 is saying: do not be anxious about anything, but pray about everything, with thanksgiving."],
      ["Can a Bible verse take anxiety away?", "This page makes no promise like that. Many believers find comfort in holding one verse through a hard season. If anxiety is heavy or lasts, see a doctor or counselor too."],
    ],
    sources: [bg("Philippians 4:6-7", "Philippians 4:6-7 (KJV), Bible Gateway"), bg("1 Peter 5:7", "1 Peter 5:7 (KJV), Bible Gateway"), bg("Isaiah 41:10", "Isaiah 41:10 (KJV), Bible Gateway"), ["988 Suicide & Crisis Lifeline", "https://988lifeline.org/"]],
    related: ["/questions/bible-verses-for-sleep-and-anxiety/", "/questions/prayer-for-sleep/", "/questions/bible-verses-for-sleep/", "/ai-bible-verse/"],
  },
  {
    ...D, lang: "en", door: "faith", group: G, path: "/questions/bible-verses-for-sleep/",
    title: "Bible verses for sleep (KJV): 10 to read before bed · Peace Be Still",
    description: "Ten Bible verses about sleep and rest, each quoted word for word from the King James Version, with what each one means and the one to choose for tonight.",
    h1: "Bible verses for sleep: 10 to read before bed",
    indexLabel: "Bible verses for sleep",
    indexNote: "Ten verses that talk about sleep itself, quoted from the KJV.",
    definition: "The Bible verses most read before sleep are Psalm 4:8, Proverbs 3:24, Psalm 127:2, Psalm 3:5 and Psalm 121:3-4. They are verses that actually mention lying down or sleeping. The best known is Psalm 4:8: “I will both lay me down in peace, and sleep: for thou, LORD, only makest me dwell in safety.”",
    quick: "Tonight, read Proverbs 3:24 once, then Psalm 4:8 twice, slowly, and turn the light off. Keep the same two verses for a week.",
    bestFor: "people who want verses that are about sleep itself, quoted exactly, not a long general list.",
    sections: [
      ["Ten verses that speak about sleep", `<table class="t"><thead><tr><th>Verse</th><th>KJV text</th><th>Why people read it at night</th></tr></thead><tbody>
<tr><td>Psalm 4:8</td><td>${Q("PSA 4:8")}</td><td>The classic bedtime verse</td></tr>
<tr><td>Proverbs 3:24</td><td>${Q("PRO 3:24")}</td><td>A promise that sleep can be sweet</td></tr>
<tr><td>Psalm 127:2</td><td>${Q("PSA 127:2")}</td><td>Letting go of late-night worry</td></tr>
<tr><td>Psalm 3:5</td><td>${Q("PSA 3:5")}</td><td>Sleep in a hard season</td></tr>
<tr><td>Psalm 121:3-4</td><td>${Q("PSA 121:3-4")}</td><td>God stays awake so you can sleep</td></tr>
<tr><td>Matthew 11:28</td><td>${Q("MAT 11:28")}</td><td>For the tired</td></tr>
<tr><td>Isaiah 26:3</td><td>${Q("ISA 26:3")}</td><td>A mind kept in peace</td></tr>
<tr><td>Psalm 63:6</td><td>${Q("PSA 63:6")}</td><td>For when you wake in the night</td></tr>
<tr><td>Mark 4:38</td><td>${Q("MAR 4:38")}</td><td>Jesus asleep in the storm</td></tr>
<tr><td>Psalm 91:5</td><td>${Q("PSA 91:5")}</td><td>Fear in the dark</td></tr>
</tbody></table>`],
      ["What does the Bible say about sleep?", `<p>It names sleep as something God gives (Psalm 127:2), something you can do even when life is not settled (Psalm 3:5), and a picture of trust: the One who keeps you does not sleep, so you can. It also shows Jesus himself asleep on a cushion in a boat during a storm, which is where the name of this app comes from.</p>
${V("MAR 4:39")}`],
      ["Which one should I read tonight?", `<ul>
<li>If today was heavy: Matthew 11:28.</li>
<li>If you are afraid: Psalm 91:5 and Psalm 4:8.</li>
<li>If your mind keeps running: Isaiah 26:3.</li>
<li>If you woke at 3 a.m.: Psalm 63:6.</li>
</ul>`],
      ["Is it okay to fall asleep listening to the Bible?", `<p>Yes. Many people play a psalm or a short passage read softly and fall asleep before it ends. Use a sleep timer so it stops on its own, keep the screen dark, and make sure nothing new starts playing.</p>`],
      ["Where Peace Be Still fits", `<p>Peace Be Still, coming soon to the App Store and Google Play, has the whole King James Bible free to read, with a growing set of chapters read aloud, and Psalm Nights: a psalm whispered on an always-dark screen with a sleep timer that fades out. First night free, then one a week in the free version, or every night on a paid plan ($7.99 a month or $39.99 a year, no trial).</p>`],
    ],
    faq: [
      ["What is the best Bible verse for sleep?", `Psalm 4:8 is the verse most people choose: ${Q("PSA 4:8")} Proverbs 3:24 is a close second because it says ${F("PRO 3:24", "thy sleep shall be sweet")}.`],
      ["Where in the Bible does it say God gives his beloved sleep?", `Psalm 127:2: ${Q("PSA 127:2")}`],
      ["Did Jesus sleep in the Bible?", `Yes. Mark 4:38 says he was ${F("MAR 4:38", "in the hinder part of the ship, asleep on a pillow")} during a storm. When the disciples woke him, he calmed the wind and the sea.`],
      ["Are these verses quoted exactly?", "Yes. Every verse here is pasted from a stored copy of the King James Version, word for word, with the book, chapter and verse. The KJV is in the public domain in the United States."],
    ],
    sources: [bg("Proverbs 3:24", "Proverbs 3:24 (KJV), Bible Gateway"), bg("Mark 4:35-41", "Mark 4:35-41 (KJV), Bible Gateway"), KJV_SRC],
    related: ["/questions/psalms-for-sleep/", "/questions/prayer-for-sleep/", "/questions/bible-verses-for-sleep-and-anxiety/", "/questions/bible-asmr/"],
  },
  {
    ...D, lang: "en", door: "faith", group: G, path: "/questions/bible-verses-for-sleep-and-anxiety/",
    title: "Bible verses for sleep and anxiety: a night routine (KJV) · Peace Be Still",
    description: "When worry keeps you up: a short night routine that pairs a verse for anxiety with a verse for sleep, all KJV word for word, plus what to read if you wake at 3 a.m.",
    h1: "Bible verses for sleep and anxiety: what to read when worry keeps you up",
    indexLabel: "Bible verses for sleep and anxiety",
    indexNote: "A four-step night routine, and what to read at 3 a.m.",
    definition: `When anxiety keeps you awake, pair one verse that hands over the worry with one that lets you lie down. A good pair: 1 Peter 5:7, ${Q("1PE 5:7")} then Psalm 4:8, ${F("PSA 4:8", "I will both lay me down in peace, and sleep")}. Read the first, pray, then rest on the second.`,
    quick: "Lights low. Read 1 Peter 5:7 and say your worry out loud once. Read Philippians 4:7. Lie down with Psalm 4:8 on repeat in your head. If you wake later, use Psalm 63:6 instead of picking up your phone.",
    bestFor: "anyone whose worry gets louder at bedtime and who wants a routine, not a list.",
    sections: [
      ["Why does worry get louder at night?", `<p>The day's noise stops and there is nothing left to distract you, so the unfinished things come forward. The Psalms know this well. David wrote about being troubled at night and about meditating on God ${F("PSA 63:6", "in the night watches")}. Night worry is old and common; it is not a sign that your faith is weak.</p>
${V("PSA 77:4")}`],
      ["A four-step night routine with scripture", `<ol>
<li><strong>Hand it over.</strong> ${V("1PE 5:7")}</li>
<li><strong>Say it once.</strong> Name the worry out loud, in one sentence, to God.</li>
<li><strong>Receive peace.</strong> ${V("PHI 4:7")}</li>
<li><strong>Lie down.</strong> ${V("PSA 4:8")}</li>
</ol>`],
      ["Is there a verse for worry at night?", `<p>Psalm 42:8 was written by someone in deep distress, and it puts God's song in the night:</p>
${V("PSA 42:8")}`],
      ["What to read if you wake at 3 a.m.", `<p>Keep the phone face down. Turn to one of these instead, from memory if you can:</p>
<ul>
<li>${Q("PSA 63:6")} (Psalm 63:6)</li>
<li>${Q("PSA 121:4")} (Psalm 121:4)</li>
<li>${Q("ISA 26:3")} (Isaiah 26:3)</li>
</ul>`],
      ["How do I pray when I am anxious at bedtime?", `<p>Short and honest. “Lord, I am worried about the rent (the test, my son, the doctor's call). I cannot fix it tonight. I give it to you until morning.” Then stop. The aim is not to solve it in prayer; it is to put it down for the night.</p>`],
      ["When to get more help", `<p>This is a faith practice, not medical care. If worry or poor sleep goes on for weeks, see a doctor. If you are thinking about harming yourself, call or text 988 now.</p>`],
      ["Where Peace Be Still fits", `<p>Peace Be Still, coming soon, has Psalm Nights (a whispered King James psalm on a dark screen with a sleep timer) and a Bible chat for saying what is on your heart, which answers with verses pasted from a stored King James Bible. The chat is AI and is labelled as AI.</p>`],
    ],
    faq: [
      ["What verse should I read when I can't sleep because of worry?", `Start with 1 Peter 5:7 to hand the worry over, then lie down with Psalm 4:8: ${Q("PSA 4:8")}`],
      ["What does the Bible say about overthinking at night?", `Psalm 94:19 speaks to it: ${Q("PSA 94:19")} Isaiah 26:3 promises perfect peace to the one whose mind is ${F("ISA 26:3", "stayed on thee")}.`],
      ["Is it wrong to take sleep medicine if I pray?", "No. Prayer and medical care go together. Talk to your doctor about medicine; pray about everything, including that."],
      ["How many verses should I read at night?", "Fewer than you think. Two verses held slowly are easier to rest in than a page read quickly. Keep the same pair for a week."],
    ],
    sources: [bg("1 Peter 5:7", "1 Peter 5:7 (KJV), Bible Gateway"), bg("Psalm 63", "Psalm 63 (KJV), Bible Gateway"), ["988 Suicide & Crisis Lifeline", "https://988lifeline.org/"]],
    related: ["/questions/bible-verses-for-anxiety/", "/questions/bible-verses-for-sleep/", "/questions/prayer-for-sleep/", "/questions/psalms-for-sleep/"],
  },
  {
    ...D, lang: "en", door: "faith", group: G, path: "/questions/psalms-for-sleep/", alt: "/es/preguntas/salmos-para-dormir/",
    title: "Psalms for sleep: 6 bedtime psalms (KJV) · Peace Be Still",
    description: "Six psalms people read or listen to at bedtime, each quoted from the King James Version, with what each one is about and how to use them for sleep.",
    h1: "Psalms for sleep: 6 bedtime psalms to read or hear tonight",
    indexLabel: "Psalms for sleep",
    indexNote: "Six bedtime psalms, what each is about, and Psalm 4 in full.",
    definition: "Psalms for sleep are psalms people read or listen to at bedtime because they speak of rest, safety and trust in God. The most used are Psalm 4, 3, 23, 91, 121 and 127. Many people play one psalm read slowly, or whispered, with a sleep timer, so scripture is the last thing they hear before sleeping.",
    quick: "Start with Psalm 4, the traditional evening psalm, which ends with lying down in peace. Then try Psalm 23 or Psalm 91. Read or listen to one psalm, slowly, with the lights low.",
    bestFor: "people who want a short list of bedtime psalms, quoted exactly, and a simple way to use them.",
    sections: [
      ["Which psalms are best to read before bed?", `<p>These six are the ones most often read at night, each with a verse from the King James Version:</p>
<table class="t"><thead><tr><th>Psalm</th><th>What it is about</th><th>Bedtime verse (KJV)</th></tr></thead><tbody>
<tr><td>Psalm 4</td><td>Peace after a hard day</td><td>${Q("PSA 4:8")} (4:8)</td></tr>
<tr><td>Psalm 3</td><td>Rest in trouble</td><td>${Q("PSA 3:5")} (3:5)</td></tr>
<tr><td>Psalm 23</td><td>The shepherd who leads to still waters</td><td>${Q("PSA 23:2")} (23:2)</td></tr>
<tr><td>Psalm 91</td><td>Shelter and protection</td><td>${Q("PSA 91:1")} (91:1)</td></tr>
<tr><td>Psalm 121</td><td>The keeper who does not sleep</td><td>${Q("PSA 121:4")} (121:4)</td></tr>
<tr><td>Psalm 127</td><td>Letting go of worry</td><td>${Q("PSA 127:2")} (127:2)</td></tr>
</tbody></table>`],
      ["Which Psalm is for sleeping in peace?", `<p>Psalm 4. It is an evening prayer: David asks to be heard, tells the reader to ${F("PSA 4:4", "commune with your own heart upon your bed, and be still")}, and ends with lying down in peace. Here it is in full, eight verses, about two minutes read slowly:</p>
${P("PSA 4:1-8")}`],
      ["What does the Bible say about sleep?", `<p>That it is a gift, not a reward for finishing everything. Psalm 127:2 says worrying late does not add anything, ${F("PSA 127:2", "for so he giveth his beloved sleep")}. Psalm 121 says the one who keeps you ${F("PSA 121:4", "shall neither slumber nor sleep")}, so you can.</p>`],
      ["Is it okay to fall asleep listening to the Bible?", `<p>Yes. Psalm 91 sleep readings on YouTube have gathered millions of views, and many people fall asleep before the reading ends. Set a sleep timer so the audio fades out, and turn off autoplay so nothing new starts.</p>`],
      ["What is a short prayer to say before bed?", `<p>Pray Psalm 4:8 back to God in your own words: “Lord, I am lying down now. I am trusting you to keep me safe tonight.” For more, see <a href="/questions/prayer-for-sleep/">prayers for sleep</a>.</p>`],
      ["How Peace Be Still does it", `<p>Peace Be Still is a phone app coming soon to the App Store and Google Play. Its Psalm Nights journey reads a King James psalm in a whisper on an always-dark screen, with a sleep timer that fades out and nothing playing afterwards. The first night is free, then one a week; a paid plan ($7.99 a month or $39.99 a year, no trial) opens one every night.</p>`],
    ],
    faq: [
      ["What psalm do you read before bed?", `Psalm 4 is the traditional bedtime psalm. Its last verse reads: ${Q("PSA 4:8")} Psalm 23 and Psalm 91 are the next most read at night.`],
      ["Which psalm is for peace of mind at night?", `Many people turn to Psalm 4 for peace at the end of the day, and to Psalm 121, which says the Lord who keeps you ${F("PSA 121:4", "shall neither slumber nor sleep")}. Read one slowly and stay with the verse that stands out to you.`],
      ["Can I listen to psalms while I sleep?", "Yes. Many people play a psalm read slowly or whispered, with a sleep timer so the audio fades out. Keep the screen dark and turn off autoplay so nothing new starts once the reading ends."],
      ["Are these verses quoted exactly?", "Yes. Every verse on this page is pasted from a stored King James Version, word for word, with the psalm and verse number. The KJV is in the public domain in the United States."],
    ],
    sources: [bg("Psalm 4", "Psalm 4 (KJV), Bible Gateway"), bg("Psalm 91", "Psalm 91 (KJV), Bible Gateway")],
    related: ["/questions/bible-verses-for-sleep/", "/questions/whispered-bible-for-sleep/", "/questions/prayer-for-sleep/", "/questions/bible-asmr/"],
  },
  {
    ...D, lang: "en", door: "faith", group: "Bible stories", path: "/questions/bible-stories-for-adults/",
    title: "Bible stories for adults: 12 to read or hear as a grown-up · Peace Be Still",
    description: "Twelve Bible stories that read differently as an adult (Job, Hannah, the prodigal son, Elijah under the tree), with the chapters, reading time and what each one is about.",
    h1: "Bible stories for adults: 12 that hit differently as a grown-up",
    indexLabel: "Bible stories for adults",
    indexNote: "Twelve stories with chapters, reading time and what they hold for grown-ups.",
    definition: "Bible stories for adults are the same stories children learn, read as a grown-up: Job's loss, Hannah's prayer for a child, Elijah wanting to give up, the father who runs to the prodigal son. They are best read straight from scripture, one story at a time, where the hard parts are left in.",
    quick: "Start with Elijah under the juniper tree (1 Kings 19:1-15) or the prodigal son (Luke 15:11-32). Each takes about five minutes to read aloud. Read the passage itself, not a summary.",
    bestFor: "adults who grew up on Sunday school versions and want the stories again, in full, without cartoons.",
    sections: [
      ["Twelve stories worth reading again as an adult", `<table class="t"><thead><tr><th>Story</th><th>Passage</th><th>What it holds for grown-ups</th></tr></thead><tbody>
<tr><td>Job, who would not let go</td><td>Job 1:13-22; 42:10-17</td><td>Grief without easy answers</td></tr>
<tr><td>Hannah's prayer</td><td>1 Samuel 1:9-20</td><td>Praying through longing and being misunderstood</td></tr>
<tr><td>Elijah and the still small voice</td><td>1 Kings 19:1-15</td><td>Burnout, sleep, food, and God's quiet voice</td></tr>
<tr><td>The son who came home</td><td>Luke 15:11-32</td><td>Both sons, and a father who runs</td></tr>
<tr><td>Ruth and Naomi</td><td>Ruth 1:1-22</td><td>Loyalty after loss</td></tr>
<tr><td>Joseph forgives his brothers</td><td>Genesis 45:1-15</td><td>Family hurt and forgiveness</td></tr>
<tr><td>The woman at the well</td><td>John 4:5-30</td><td>Being fully known and not turned away</td></tr>
<tr><td>Abigail rides to meet David</td><td>1 Samuel 25:14-35</td><td>A wise woman stopping a disaster</td></tr>
<tr><td>Jacob wrestles until morning</td><td>Genesis 32:24-30</td><td>Holding on to God in the dark</td></tr>
<tr><td>Esther, for such a time as this</td><td>Esther 4:1-17</td><td>Risk, courage and timing</td></tr>
<tr><td>Nicodemus comes by night</td><td>John 3:1-17</td><td>Honest questions from a serious person</td></tr>
<tr><td>The road to Emmaus</td><td>Luke 24:13-35</td><td>Disappointment that turns around</td></tr>
</tbody></table>`],
      ["Why read Bible stories as an adult?", `<p>Because most of them were never children's stories. Elijah asks to die under a tree, then sleeps and eats twice before God speaks to him. Hannah prays so hard the priest thinks she is drunk. These are stories about grief, family and fear, told plainly.</p>
${V("1KI 19:5")}`],
      ["Are there Bible stories for adults to listen to?", `<p>Yes. The simplest way is to listen to the passage itself read aloud: any of the stories above takes five to ten minutes. Many free audio Bibles read the King James Version, which is in the public domain in the United States.</p>`],
      ["What is the best Bible story to fall asleep to?", `<p>Pick a quiet one, not a battle. Jesus calming the storm (Mark 4:35-41) is short and ends in ${F("MAR 4:39", "a great calm")}. Ruth and Naomi and the road to Emmaus are gentle too. Leave Jericho and Goliath for the morning.</p>`],
      ["Is there a free audio Bible story app?", `<p>Peace Be Still, coming soon to the App Store and Google Play, gives a daily Bible story to read or hear in the free version, along with the whole King James Bible to read and hear. Its launch library holds 60 stories, including most of the ones above, each told with the King James text beside it. A paid plan ($7.99 a month or $39.99 a year, no trial) adds every past story.</p>`],
    ],
    faq: [
      ["What Bible stories are good for adults?", "Stories with grown-up struggles: Job's grief, Hannah's longing, Elijah's exhaustion (1 Kings 19), the prodigal son and his older brother (Luke 15), Ruth and Naomi after loss, and Joseph forgiving his brothers."],
      ["Where do I start reading Bible stories as an adult?", "Start with one short story read straight from scripture, such as Luke 15:11-32. Read it aloud once. Then read the story around it the next day."],
      ["Are the Bible stories in Peace Be Still word for word?", "The stories are retold in plain words, and the King James text for that passage sits beside each one, pasted from a stored copy. Any verse quoted in a story is exact."],
    ],
    sources: [bg("1 Kings 19:1-15", "1 Kings 19:1-15 (KJV), Bible Gateway"), bg("Luke 15:11-32", "Luke 15:11-32 (KJV), Bible Gateway")],
    related: ["/questions/bedtime-bible-stories/", "/questions/whispered-bible-for-sleep/", "/questions/bible-asmr/", "/black-bible-chat/"],
  },
  {
    ...D, lang: "en", door: "faith", group: "Bible stories", path: "/questions/bedtime-bible-stories/",
    title: "Bedtime Bible stories: 10 gentle ones for tonight · Peace Be Still",
    description: "Ten gentle bedtime Bible stories that end in peace, not battles, with the passage, how long each takes to read aloud, and a closing verse for each.",
    h1: "Bedtime Bible stories: 10 gentle stories that end in peace",
    indexLabel: "Bedtime Bible stories",
    indexNote: "Ten quiet stories, how long each takes, and a verse to close on.",
    definition: "Bedtime Bible stories are short stories from scripture read or heard just before sleep. The best ones are calm and end in rest: Jesus calming the storm, the lost sheep carried home, Samuel hearing his name at night, the shepherds under the stars. Save battles and plagues for daytime.",
    quick: "Choose a story that ends quietly, read it in under ten minutes, then close with one verse from it. Jesus calms the storm (Mark 4:35-41) is the classic: it ends with a great calm on the sea.",
    bestFor: "parents reading at bedtime, and adults who like to fall asleep to a story.",
    sections: [
      ["Ten gentle stories for bedtime", `<table class="t"><thead><tr><th>Story</th><th>Passage</th><th>About</th></tr></thead><tbody>
<tr><td>Jesus calms the storm</td><td>Mark 4:35-41</td><td>4 minutes</td></tr>
<tr><td>The lost sheep</td><td>Luke 15:1-7</td><td>2 minutes</td></tr>
<tr><td>Samuel hears his name</td><td>1 Samuel 3:1-10</td><td>3 minutes</td></tr>
<tr><td>The night the shepherds heard</td><td>Luke 2:1-20</td><td>5 minutes</td></tr>
<tr><td>Moses in the basket</td><td>Exodus 2:1-10</td><td>3 minutes</td></tr>
<tr><td>Abraham counts the stars</td><td>Genesis 15:1-6</td><td>2 minutes</td></tr>
<tr><td>Five loaves and two fishes</td><td>John 6:1-14</td><td>4 minutes</td></tr>
<tr><td>Ruth and Naomi</td><td>Ruth 1:1-22</td><td>7 minutes</td></tr>
<tr><td>Mary and Martha</td><td>Luke 10:38-42</td><td>2 minutes</td></tr>
<tr><td>Noah and the rainbow</td><td>Genesis 9:12-16</td><td>2 minutes</td></tr>
</tbody></table>
<p class="muted">Reading times are for reading the passage aloud at a slow bedtime pace.</p>`],
      ["What is the best Bible story to fall asleep to?", `<p>Jesus calming the storm. It is short, it has a clear shape (wind, fear, one word from Jesus, quiet), and its last scene is the calm itself:</p>
${V("MAR 4:39")}`],
      ["Which Bible stories are too scary for bedtime?", `<p>Many children find these better in daylight: the flood itself (Genesis 7), the plagues of Egypt, David and Goliath, the walls of Jericho, Jonah inside the fish, and the crucifixion. They are not off-limits; they just make a busy last ten minutes before sleep.</p>`],
      ["How do I read a Bible story at bedtime?", `<ol>
<li>Read the story once, slowly, in a lower voice than usual.</li>
<li>Ask one question, not a quiz: “What do you think Samuel felt?”</li>
<li>End with one verse from the story, the same way every night.</li>
<li>Pray, then lights out.</li>
</ol>
${V("1SA 3:10")}`],
      ["Are there Bible stories for adults to listen to?", `<p>Yes, and many adults use them for sleep. See <a href="/questions/bible-stories-for-adults/">Bible stories for adults</a> for twelve that read differently as a grown-up.</p>`],
      ["Is there a free audio Bible story app?", `<p>Peace Be Still, coming soon to the App Store and Google Play, has a daily Bible story to read or hear on its free version. Its story library includes every story in the table above. Chat is not offered under 13; the stories and the King James Bible are open to everyone.</p>`],
    ],
    faq: [
      ["What Bible stories are good for bedtime?", "Calm ones that end in rest: Jesus calms the storm (Mark 4), the lost sheep (Luke 15), Samuel hearing God at night (1 Samuel 3), the shepherds (Luke 2) and Moses in the basket (Exodus 2)."],
      ["How long should a bedtime Bible story be?", "Under ten minutes read aloud. Most of the stories above take two to five. A short story finished is better than a long one abandoned."],
      ["Should I read from a children's Bible or the real Bible?", "Both work. A picture Bible helps small children follow. As they grow, read the passage itself; the King James Version is slow and rhythmic, which suits bedtime."],
    ],
    sources: [bg("Mark 4:35-41", "Mark 4:35-41 (KJV), Bible Gateway"), bg("1 Samuel 3:1-10", "1 Samuel 3:1-10 (KJV), Bible Gateway")],
    related: ["/questions/bible-stories-for-adults/", "/questions/bedtime-prayer/", "/questions/bible-verses-for-sleep/", "/bible-app-for-teens/"],
  },
  {
    ...D, lang: "en", door: "faith", group: G, path: "/questions/bible-asmr/",
    title: "Bible ASMR: whispered scripture to fall asleep to · Peace Be Still",
    description: "What Bible ASMR is, what a good whispered reading sounds like, which passages people choose, whether it is free, and how to avoid ads waking you up halfway through.",
    h1: "Bible ASMR: whispered scripture you can fall asleep to",
    indexLabel: "Bible ASMR",
    indexNote: "What it is, what makes a good one, and how to avoid ads mid-reading.",
    definition: "Bible ASMR is scripture read in a whisper or a very soft voice, close to the microphone, so it is calm to listen to at night. Most readings are Psalms or the Gospels, with long pauses and no music. People use it to wind down at bedtime with God's Word as the last thing they hear.",
    quick: "Choose a whispered reading of one psalm (Psalm 23, 91 or 4), check that it names the book and translation, set a sleep timer, and turn off autoplay so an ad or a new video does not start.",
    bestFor: "ASMR listeners who want scripture, and believers who like a whisper more than a sermon at night.",
    sections: [
      ["What does Bible ASMR sound like?", `<p>A low, close voice reading slowly. Soft page turns or quiet room sound sometimes, but no music swells and no preaching on top. The reading should keep the words exactly as written and say the book, chapter and verse.</p>`],
      ["Which passages are most popular for Bible ASMR?", `<ul>
<li><strong>Psalm 91</strong>, the most searched psalm for sleep.</li>
<li><strong>Psalm 23</strong>, short and familiar.</li>
<li><strong>Psalm 4</strong>, the evening psalm.</li>
<li><strong>Matthew 5 to 7</strong>, the Sermon on the Mount, for longer listens.</li>
<li><strong>John 14</strong>, ${F("JOH 14:1", "Let not your heart be troubled")}.</li>
</ul>
${V("JOH 14:1")}`],
      ["Is Bible ASMR free?", `<p>Most of it is free on YouTube, paid for by ads. The catch for sleep is that an advert can play in the middle or at the end at full volume. Options: a channel's ad-free membership, YouTube Premium, downloading a reading you are allowed to keep, or an app with no ads.</p>`],
      ["How to set up a whispered reading for sleep", `<ol>
<li>Pick one passage, not a ten-hour playlist.</li>
<li>Set a sleep timer for 30 to 45 minutes.</li>
<li>Turn autoplay off, or use an app that plays nothing afterwards.</li>
<li>Lock the screen or dim it right down.</li>
<li>Keep the volume low enough that you have to stay still to hear it.</li>
</ol>`],
      ["Is it okay to fall asleep listening to the Bible?", `<p>Yes. Scripture does not need you awake to be true, and many believers end the day this way. It is a nightly practice, not a promise of sleep.</p>`],
      ["Where Peace Be Still fits", `<p>Peace Be Still, coming soon to the App Store and Google Play, has Psalm Nights: real whispered readings of King James psalms, on a screen that goes dark after ten seconds, with a sleep timer that fades out. No ads, ever, and nothing plays after. Your first night is free, then one a week in the free version.</p>`],
    ],
    faq: [
      ["What is Bible ASMR?", "Scripture read in a whisper or very soft voice, close to the microphone, with gentle pauses. People listen to it at bedtime to wind down. A good reading keeps the words exact and names the book, chapter and verse."],
      ["Is ASMR okay for Christians?", "ASMR is just a way of speaking softly. Whispered scripture is the Bible read quietly; what matters is what is being read. Many Christians use it the way others use a quiet audio Bible."],
      ["What Bible translation is used for Bible ASMR?", "Many readers choose the King James Version because it is in the public domain in the United States and its rhythm is slow. Peace Be Still uses the KJV in English and the Reina-Valera 1909 in Spanish."],
      ["How do I stop ads waking me up?", "Turn off autoplay, set a sleep timer, and use an ad-free option: a membership, a downloaded file you are allowed to keep, or an app with no ads."],
    ],
    sources: [bg("Psalm 91", "Psalm 91 (KJV), Bible Gateway"), bg("John 14:1-3", "John 14:1-3 (KJV), Bible Gateway")],
    related: ["/questions/whispered-bible-for-sleep/", "/questions/psalms-for-sleep/", "/questions/bible-verses-for-sleep/", "/questions/bible-stories-for-adults/"],
  },
  {
    ...D, lang: "en", door: "faith", group: "Morning", path: "/questions/daily-bible-declarations/",
    title: "Daily Bible declarations: say scripture out loud each morning · Peace Be Still",
    description: "What a Bible declaration is, how to make one from a verse in three steps, and seven to say out loud this week, each tied to a King James verse quoted word for word.",
    h1: "Daily Bible declarations: how to say scripture out loud each morning",
    indexLabel: "Daily Bible declarations",
    indexNote: "Seven declarations for a week, each tied to a KJV verse.",
    definition: `A daily Bible declaration is a short sentence you say out loud in the morning that agrees with something God's Word already says, with the verse beside it. For example, Psalm 118:24 says ${Q("PSA 118:24")} The declaration is: “This is the day the Lord has made, and I will rejoice in it.” It is speaking scripture, not inventing promises.`,
    quick: "Take one verse, keep its meaning, put it in the first person, and say it out loud once in the morning. Keep the verse reference next to it so you never drift from what the text says.",
    bestFor: "people who want to start the day with scripture in their own mouth, rooted in exact verses.",
    sections: [
      ["What is a declaration in the Bible?", `<p>To declare is to say something openly. The Psalms are full of people saying God's works out loud: ${F("PSA 22:22", "I will declare thy name unto my brethren")} (Psalm 22:22). A daily declaration follows that pattern: you say aloud what scripture says about God and about how to live.</p>
${V("PSA 118:17")}`],
      ["How do I make a declaration from scripture?", `<ol>
<li><strong>Pick one verse</strong> and read it in context, so you know what it means.</li>
<li><strong>Keep the promise the verse makes</strong>, and no more. If it is about God's presence, do not turn it into a promise of money.</li>
<li><strong>Say it in the first person</strong>, with the reference: “The Lord is my shepherd, so I have what I need today.” (from Psalm 23:1)</li>
</ol>`],
      ["Seven declarations for this week", `<table class="t"><thead><tr><th>Day</th><th>Say out loud</th><th>The verse (KJV)</th></tr></thead><tbody>
<tr><td>Monday</td><td>This is the day the Lord has made. I will rejoice in it.</td><td>${Q("PSA 118:24")}</td></tr>
<tr><td>Tuesday</td><td>I can do what today asks of me through Christ.</td><td>${Q("PHI 4:13")}</td></tr>
<tr><td>Wednesday</td><td>God's mercies are new for me this morning.</td><td>${Q("LAM 3:22-23")}</td></tr>
<tr><td>Thursday</td><td>I will not be afraid; God is with me.</td><td>${Q("ISA 41:10")}</td></tr>
<tr><td>Friday</td><td>The Lord is my shepherd. I have what I need today.</td><td>${F("PSA 23:1", "The LORD is my shepherd; I shall not want.")}</td></tr>
<tr><td>Saturday</td><td>I will be still and know that he is God.</td><td>${Q("PSA 46:10")}</td></tr>
<tr><td>Sunday</td><td>I will give thanks, for the Lord is good.</td><td>${Q("PSA 107:1")}</td></tr>
</tbody></table>`],
      ["What should I declare over my day?", `<p>Things scripture actually says: that God is with you, that his mercy is new, that you can be still, that you will give thanks. Be wary of declarations that promise a result the verse never promised. A declaration is agreement with God's Word, not a way to make God do something.</p>`],
      ["Morning Word in Peace Be Still", `<p>Peace Be Still, coming soon to the App Store and Google Play, has Morning Word · Daily Declarations: one King James verse, one declaration to say out loud, and a short prayer, with one gentle reminder a day at most that you can turn off. A daily declaration is in the free version every day; a paid plan adds declaration topics.</p>`],
    ],
    faq: [
      ["Are declarations biblical?", `Saying God's Word out loud is all through scripture: the Psalms declare his works, and Romans 10:10 says ${F("ROM 10:10", "with the mouth confession is made")}. A declaration is biblical when it stays with what the verse says.`],
      ["What is the difference between a declaration and a prayer?", "A prayer speaks to God. A declaration speaks God's Word out loud, often to yourself, as a reminder of what is true. Many people do both: declare the verse, then pray about the day."],
      ["Should I say declarations out loud?", "Yes, if you can. Hearing your own voice say a verse helps it stay with you. A whisper in a shared room works too."],
      ["Can I make up my own declaration?", "Make it from a verse, keep the verse's meaning, and put the reference beside it. That keeps it rooted in scripture rather than in what you hope will happen."],
    ],
    sources: [bg("Psalm 118:24", "Psalm 118:24 (KJV), Bible Gateway"), bg("Lamentations 3:22-23", "Lamentations 3:22-23 (KJV), Bible Gateway")],
    related: ["/questions/bible-verses-for-anxiety/", "/questions/prayer-for-sleep/", "/bible-app-for-women/", "/bible-app-for-teens/"],
  },
];
