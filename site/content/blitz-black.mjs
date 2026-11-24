// Black Christian pages (blitz-top50.json, cluster "Black Christian"). History stated only with a
// source; where the Bible is silent, the page says so. Never "Black Bible Stories" as one phrase.
import { D, V, Q, P, F, bg, PICK_EN } from "./blitz-common.mjs";

const G = "Black Christians and the Bible";
const BRIT_KUSH = ["Britannica: Sudan, the kingdom of Kush", "https://www.britannica.com/place/Sudan/The-kingdom-of-Kush"];
const BRIT_TAHARQA = ["Britannica: Taharqa, king of Kush and Egypt", "https://www.britannica.com/biography/Taharqa"];
const PEW = ["Pew Research Center: Faith Among Black Americans (2021)", "https://www.pewresearch.org/religion/2021/02/16/faith-among-black-americans/"];
const RABOTEAU = ["Albert J. Raboteau, “The Secret Religion of the Slaves”, Christian History 33 (1992)", "https://christianhistoryinstitute.org/magazine/article/secret-religion-of-the-slaves"];
const NHC = ["National Humanities Center: The Religious Experience of African Americans", "https://nationalhumanitiescenter.org/tserve/nineteen/nkeyinfo/aareligion.htm"];
const NMAAHC_WATCH = ["Smithsonian NMAAHC: The Historical Legacy of Watch Night", "https://nmaahc.si.edu/explore/stories/historical-legacy-watch-night"];

export const BLACK = [
  {
    ...D, lang: "en", door: "faith", group: G, path: "/questions/black-people-in-the-bible/",
    title: "Black people in the Bible: who they are, with the verses · Peace Be Still",
    description: "Black and African people in the Bible, named with chapter and verse: Moses's Ethiopian wife, Ebed-melech, the Ethiopian official, Simeon called Niger, Simon of Cyrene and more.",
    h1: "Black people in the Bible: who they are, with chapter and verse",
    indexLabel: "Black people in the Bible",
    indexNote: "A table of named African people, each with the verse.",
    definition: "Yes, there are Black and African people in the Bible. Scripture names Cushites (the King James Version usually says “Ethiopians”) such as Moses's wife, Ebed-melech who rescued Jeremiah, and the treasurer baptised in Acts 8, plus Africans from Egypt and Cyrene such as Hagar and Simon of Cyrene. The Bible does not sort people by race; it names their lands.",
    quick: "The clearest cases are the people the Bible calls Ethiopian or Cushite: Moses's wife (Numbers 12:1), Ebed-melech (Jeremiah 38:7), the Ethiopian official (Acts 8:27) and King Tirhakah (2 Kings 19:9). Add Simeon called Niger (Acts 13:1) and Simon of Cyrene (Mark 15:21).",
    bestFor: "readers who want names and verses they can check, not a list of guesses.",
    sections: [
      ["Are there Black people in the Bible?", `<p>Yes. Cush, the land south of Egypt in what is now Sudan, appears dozens of times, and the King James Version mostly translates it as Ethiopia. The ancient kingdom of Kush was a Black African kingdom that for a time ruled Egypt itself. Jeremiah even uses the dark skin of Cushites as a known fact in a proverb:</p>
${V("JER 13:23")}`],
      ["Named African people in the Bible", `<table class="t"><thead><tr><th>Person</th><th>Where from</th><th>Verse (KJV)</th></tr></thead><tbody>
<tr><td>Moses's wife</td><td>Cush (“Ethiopian”)</td><td>${Q("NUM 12:1")} (Numbers 12:1)</td></tr>
<tr><td>Ebed-melech</td><td>Cush</td><td>${Q("JER 38:7")} (Jeremiah 38:7)</td></tr>
<tr><td>The treasurer of Candace</td><td>Ethiopia</td><td>${Q("ACT 8:27")} (Acts 8:27)</td></tr>
<tr><td>Tirhakah</td><td>King of Cush</td><td>${Q("2KI 19:9")} (2 Kings 19:9)</td></tr>
<tr><td>Simeon called Niger</td><td>A leader in the church at Antioch</td><td>${Q("ACT 13:1")} (Acts 13:1)</td></tr>
<tr><td>Simon of Cyrene</td><td>Cyrene, North Africa</td><td>${Q("MAR 15:21")} (Mark 15:21)</td></tr>
<tr><td>Hagar</td><td>Egypt</td><td>${Q("GEN 16:1")} (Genesis 16:1)</td></tr>
</tbody></table>`],
      ["How many Black people are in the Bible?", `<p>Nobody can give an honest number. The Bible names people by land, tribe and family, not by colour, and ancient Egyptians, Cushites and Libyans ranged widely in appearance. What can be counted: Cush or Ethiopia appears well over fifty times in the King James Old Testament, and several named Cushites act at key moments in Israel's story.</p>`],
      ["Who was the first Black person in the Bible?", `<p>The first African name in scripture is Cush himself, listed among the sons of Ham in the table of nations, and his son Nimrod:</p>
${V("GEN 10:6")}
<p>Whether to call Cush “the first Black person” depends on reading a family list as a race list, which the text does not do. It does show Africa in the human story from the start.</p>`],
      ["What does this mean for Black believers?", `<p>That Africa is not a footnote in the Bible. An African official is one of the first people baptised after Pentecost. An African man carried the cross. A Cushite saved a prophet's life and God sent him a promise by name (Jeremiah 39:15-18). These are stories the Black church has preached for generations.</p>`],
      ["Hush Harbor stories in Peace Be Still", `<p>Peace Be Still, {{stores.short}}, has Hush Harbor · Black Bible Chat &amp; Stories. Its Black favorites include Hagar and the God who sees, the Ethiopian on the desert road, Ebed-melech and the prophet in the pit, Simon of Cyrene, and Moses and the Ethiopian woman, each told in the Hush Harbor voice with the King James text beside it.</p>`],
    ],
    faq: [
      ["Is Cush Africa in the Bible?", "Yes. Cush is the region south of Egypt along the Nile, in what is now Sudan, home of the ancient kingdom of Kush. The King James Version usually translates it as “Ethiopia”, which is not the same as the modern country of Ethiopia."],
      ["Who was the Ethiopian eunuch in Acts 8?", "A senior official, treasurer to Candace, queen of the Ethiopians. Philip met him on the desert road while he was reading Isaiah, explained the passage, and baptised him (Acts 8:26-39)."],
      ["Was Moses's wife Black?", "Numbers 12:1 calls her an Ethiopian woman, Hebrew “Cushite”, from the African land of Cush. Miriam and Aaron spoke against Moses because of her, and God rebuked them."],
      ["Does the Bible talk about race?", `Not in the modern sense. It names nations, lands and families. It also says God made all nations ${F("ACT 17:26", "of one blood")} (Acts 17:26).`],
    ],
    sources: [BRIT_KUSH, bg("Numbers 12:1", "Numbers 12:1 (KJV), Bible Gateway"), bg("Acts 8:26-39", "Acts 8:26-39 (KJV), Bible Gateway"), bg("Jeremiah 38:7-13", "Jeremiah 38:7-13 (KJV), Bible Gateway")],
    related: ["/questions/who-are-black-people-in-the-bible/", "/questions/black-history-in-the-bible/", "/questions/black-bible-verses/", "/black-bible-app/", "/black-bible-chat/"],
  },
  {
    ...D, lang: "en", door: "faith", group: G, path: "/questions/who-are-black-people-in-the-bible/",
    title: "Who are Black people in the Bible? How to tell, word by word · Peace Be Still",
    description: "How readers work out who in the Bible was Black or African: the words Cush, Ethiopia, Niger, Ham, Put and Mizraim, what each meant, and why lists online disagree.",
    h1: "Who are Black people in the Bible? How readers tell, word by word",
    indexLabel: "Who are Black people in the Bible?",
    indexNote: "The words that point to Africa (Cush, Niger, Put) and what each means.",
    definition: "Black people in the Bible are found by following the places and words the text uses: Cush (translated “Ethiopia” in the KJV), Mizraim (Egypt), Put (usually Libya), and Niger, a Latin word for black used as a nickname in Acts 13:1. Lists online disagree because some add people the text never places in Africa.",
    quick: "Trust a name when the verse itself says Cushite, Ethiopian, Egyptian, Cyrenian or Niger. Treat everyone else on popular lists as a later reading, however beloved.",
    bestFor: "people who have seen conflicting lists and want to know how to check one.",
    sections: [
      ["Which Bible words point to Africa?", `<table class="t"><thead><tr><th>Word in the KJV</th><th>What it means</th><th>Example</th></tr></thead><tbody>
<tr><td>Ethiopia, Ethiopian</td><td>Hebrew Cush: the Nile land south of Egypt (today Sudan)</td><td>Numbers 12:1; Acts 8:27</td></tr>
<tr><td>Cushi</td><td>“The Cushite”, used as a name</td><td>2 Samuel 18:21; Zephaniah 1:1</td></tr>
<tr><td>Egypt</td><td>Hebrew Mizraim</td><td>Genesis 16:1 (Hagar)</td></tr>
<tr><td>Phut, Libya</td><td>Hebrew Put, west of Egypt</td><td>Genesis 10:6; Ezekiel 30:5</td></tr>
<tr><td>Cyrene, Cyrenian</td><td>A Greek city in today's Libya</td><td>Mark 15:21; Acts 13:1</td></tr>
<tr><td>Niger</td><td>Latin for black, a nickname</td><td>Acts 13:1</td></tr>
</tbody></table>`],
      ["Who are Black people descended from in the Bible?", `<p>Genesis 10 lists Ham's sons as Cush, Mizraim, Phut and Canaan. The first three are African lands: Cush, Egypt and Libya. Readers have long linked African peoples to this list.</p>
${V("GEN 10:6")}
<p>One warning. Genesis 9:25 puts a curse on Canaan, not on Ham and not on Cush. The claim that Black people carry a “curse of Ham” is not in the text, and it was used to defend slavery.</p>
${V("GEN 9:25")}`],
      ["Who are some Black people in the Bible?", `<p>Named in the text as African: Moses's Cushite wife, Hagar the Egyptian, Ebed-melech the Ethiopian, Tirhakah king of Ethiopia, the Ethiopian treasurer, Simon of Cyrene, and Simeon called Niger. For the full table with each verse, see <a href="/questions/black-people-in-the-bible/">Black people in the Bible</a>.</p>`],
      ["Why do lists online disagree?", `<ul>
<li>Some lists add people because of later art or tradition, not the text.</li>
<li>Some treat any Egyptian or North African as “Black”, though ancient Egypt held many peoples.</li>
<li>Some rely on what a name sounds like in English.</li>
<li>Some miss that the KJV's “Ethiopia” is usually Cush, the land of the Kushite kingdom.</li>
</ul>`],
      ["Is there a Bible app for Black Christians?", `<p>Peace Be Still, {{stores.tag}}, has Hush Harbor · Black Bible Chat &amp; Stories: a chat in a Black church voice that answers with King James verses pasted word for word, and a Bible story every day told in that voice. See <a href="/black-bible-app/">the Black Bible app page</a>.</p>`],
    ],
    faq: [
      ["What does Niger mean in Acts 13:1?", "Niger is a Latin word meaning black or dark. Simeon “that was called Niger” was a teacher in the church at Antioch. Many readers take the nickname to describe his skin; the verse itself does not explain it."],
      ["Is Ethiopia in the Bible the same as Ethiopia today?", "Usually not. In the King James Version “Ethiopia” translates Cush, the land along the Nile south of Egypt, now mostly in Sudan. The modern country took the name much later."],
      ["Is the curse of Ham in the Bible?", "No. Genesis 9:25 curses Canaan, Ham's son, and says nothing about skin. The “curse of Ham” idea was read into the text and used to justify slavery."],
    ],
    sources: [bg("Genesis 10:6-8", "Genesis 10:6-8 (KJV), Bible Gateway"), bg("Genesis 9:18-27", "Genesis 9:18-27 (KJV), Bible Gateway"), bg("Acts 13:1", "Acts 13:1 (KJV), Bible Gateway"), BRIT_KUSH],
    related: ["/questions/black-people-in-the-bible/", "/questions/who-is-black-in-the-bible/", "/questions/black-history-in-the-bible/", "/black-bible-app/"],
  },
  {
    ...D, lang: "en", door: "faith", group: G, path: "/questions/who-is-black-in-the-bible/",
    title: "Who is Black in the Bible? Seven people the text calls African · Peace Be Still",
    description: "Seven people the Bible itself calls Cushite, Ethiopian, Egyptian or Cyrenian, a short story for each in plain words, and what the verse actually says.",
    h1: "Who is Black in the Bible? Seven people the text itself calls African",
    indexLabel: "Who is Black in the Bible?",
    indexNote: "Seven people, one short story each, and what the verse says.",
    definition: "The people the Bible itself calls African are Hagar the Egyptian, Moses's Cushite wife, Cushi the messenger, Ebed-melech the Ethiopian, Tirhakah king of Ethiopia, the Ethiopian treasurer in Acts 8, and Simon of Cyrene. Each one is named by land in the text, so you can check it yourself.",
    quick: "Seven names you can open and read: Genesis 16, Numbers 12, 2 Samuel 18, Jeremiah 38, 2 Kings 19, Acts 8 and Mark 15.",
    bestFor: "someone who wants the stories behind the names, told short.",
    sections: [
      ["Hagar the Egyptian", `<p>An Egyptian servant in Abraham's house who ran into the desert, pregnant and alone. God met her by a spring, and she became the only person in scripture who gives God a name.</p>
${V("GEN 16:13")}`],
      ["Moses's Cushite wife", `<p>Miriam and Aaron spoke against Moses because he had married a Cushite woman. God answered by rebuking them, not her (Numbers 12:1-15).</p>`],
      ["Cushi, the runner", `<p>The man who carried the news of Absalom's death to King David is called Cushi, “the Cushite” (2 Samuel 18:21-32). He ran the hardest message in the story.</p>`],
      ["Ebed-melech the Ethiopian", `<p>When Jeremiah was dropped into a muddy pit to die, a Cushite official at the king's court went to the king, got permission, and pulled him out with ropes and old rags so they would not cut him. God later sent Ebed-melech a promise by name.</p>
${V("JER 39:18")}`],
      ["Tirhakah, king of Ethiopia", `<p>Named in 2 Kings 19:9 and Isaiah 37:9 as marching against Assyria. Historians identify him with Taharqa, a king of Kush who ruled Egypt in the 600s BC.</p>`],
      ["The Ethiopian treasurer", `<p>A court official of Candace, queen of the Ethiopians, reading Isaiah aloud in his chariot. Philip explained the passage, and the man asked to be baptised by the road.</p>
${V("ACT 8:36")}`],
      ["Simon of Cyrene", `<p>A man from Cyrene in North Africa, coming in from the country, made to carry Jesus's cross (Mark 15:21). Mark names his sons, Alexander and Rufus, as if the first readers knew them.</p>`],
      ["Who is the ancestor of Black people in the Bible?", `<p>Genesis 10 lists Cush, Mizraim (Egypt) and Phut among the sons of Ham, and readers have linked African peoples to them. The Bible does not present a race ancestor, and it says God ${F("ACT 17:26", "hath made of one blood all nations of men")} (Acts 17:26).</p>`],
    ],
    faq: [
      ["Was the Queen of Sheba Black?", "The Bible does not say. Sheba is often placed in southern Arabia (today's Yemen); Ethiopian tradition calls her Makeda and holds her as an Ethiopian queen. 1 Kings 10 tells her visit to Solomon."],
      ["Was Hagar Black?", "Genesis calls her an Egyptian. Ancient Egypt held people of many complexions, so the text gives her nation, not her colour. Many Black readers have long seen their own story in hers."],
      ["Who is Ebed-melech in the Bible?", "A Cushite official in King Zedekiah's court who rescued the prophet Jeremiah from a pit (Jeremiah 38:7-13). God promised to deliver him because he trusted in God (Jeremiah 39:15-18)."],
    ],
    sources: [bg("Genesis 16", "Genesis 16 (KJV), Bible Gateway"), bg("Jeremiah 38:7-13", "Jeremiah 38:7-13 (KJV), Bible Gateway"), bg("2 Samuel 18:21-32", "2 Samuel 18:21-32 (KJV), Bible Gateway"), BRIT_TAHARQA],
    related: ["/questions/black-people-in-the-bible/", "/questions/who-are-black-people-in-the-bible/", "/questions/was-bathsheba-black-in-the-bible/", "/black-bible-chat/"],
  },
  {
    ...D, lang: "en", door: "faith", group: G, path: "/questions/black-history-in-the-bible/",
    title: "Black history in the Bible: Africa's place in scripture · Peace Be Still",
    description: "What the Bible records about Africa: the kingdom of Kush, Egypt, Cyrene, African kings and officials, Africans at Pentecost, and how the Exodus shaped Black history in America.",
    h1: "Black history in the Bible: what scripture records about Africa",
    indexLabel: "Black history in the Bible",
    indexNote: "Kush, Egypt, Cyrene, Pentecost, and the Exodus in the spirituals.",
    definition: "The Bible records Africa at almost every stage: Egypt from Abraham to the Exodus, the kingdom of Cush (Kush) whose king Tirhakah marched against Assyria, Africans from Egypt, Libya and Cyrene at Pentecost, and an Ethiopian official baptised in Acts 8. Black history in America then took the Exodus story as its own.",
    quick: "Three threads: African nations inside the Bible (Egypt, Cush, Put, Cyrene), African people inside the church from day one (Acts 2:10, 8:27, 13:1), and the Bible inside Black American history, from the spirituals to the freedom movement.",
    bestFor: "teachers, Bible study leaders and Black History Month planners who want sourced facts.",
    sections: [
      ["What does the Bible say about Black history?", `<p>The Bible does not tell “Black history” as a topic, but it is full of African history. Egypt is the setting for Joseph and the Exodus. The kingdom of Kush, south of Egypt, was a Black African power that ruled Egypt as its 25th dynasty, and one of its kings is named in scripture:</p>
${V("2KI 19:9")}`],
      ["Africans in the church from the start", `<p>At Pentecost, the crowd that heard the apostles included people from Egypt and from Libya near Cyrene:</p>
${V("ACT 2:10")}
<p>Within a few chapters an Ethiopian official is baptised (Acts 8), and by Acts 13 two of the five leaders in Antioch, Simeon called Niger and Lucius of Cyrene, have African ties.</p>`],
      ["A prophecy the Black church holds close", `<p>Psalm 68 says Ethiopia will reach out to God. Black preachers in America quoted this verse for two centuries as a promise about African people.</p>
${V("PSA 68:31")}`],
      ["How did the Bible shape Black history in America?", `<p>Enslaved Christians heard the Exodus as their story: a God who sees the suffering of slaves and says ${F("EXO 5:1", "Let my people go")}. That is why the spirituals sing of Moses, Pharaoh and the Jordan. Many enslaved believers worshipped in secret in the woods, in what were called hush harbors.</p>
${V("EXO 3:7")}`],
      ["Who was the first Black person in the Bible?", `<p>The first African name in the Bible's family lists is Cush, son of Ham (Genesis 10:6). The first African person whose story is told at length is Hagar the Egyptian (Genesis 16).</p>`],
      ["Where Peace Be Still fits", `<p>Peace Be Still, {{stores.short}}, has Hush Harbor · Black Bible Chat &amp; Stories, named for the hidden places of worship. Its 20 Black favorites, told in the Hush Harbor voice with the King James text beside each, include Let my people go, Paul and Silas singing at midnight, and the valley of dry bones.</p>`],
    ],
    faq: [
      ["Is Cush Africa in the Bible?", "Yes. Cush is the land south of Egypt along the Nile, now mostly in Sudan, home of the kingdom of Kush. The King James Version usually translates it “Ethiopia”."],
      ["Which Pharaoh in the Bible was Black?", "The Bible does not name a Black pharaoh. It does name Tirhakah, king of Ethiopia (2 Kings 19:9), whom historians identify with Taharqa, a Kushite king who ruled Egypt in the 25th dynasty."],
      ["Why is the Exodus so important in Black churches?", "Because enslaved Christians heard in it a God who sees slaves and sets them free. The spirituals, the sermons and the freedom movement all drew on it."],
    ],
    sources: [BRIT_KUSH, BRIT_TAHARQA, NHC, bg("Acts 2:5-11", "Acts 2:5-11 (KJV), Bible Gateway")],
    related: ["/questions/hush-harbor/", "/questions/black-people-in-the-bible/", "/questions/black-bible-verses/", "/questions/african-american-bible/"],
  },
  {
    ...D, lang: "en", door: "faith", group: G, path: "/questions/black-bible-verses/",
    title: "Black Bible verses: scriptures about Africa, skin and freedom · Peace Be Still",
    description: "Bible verses that mention Black or dark skin, Ethiopia and Africa, and the freedom verses Black churches love most, all KJV word for word with what each means.",
    h1: "Bible verses about Black skin, Africa and freedom",
    indexLabel: "Black Bible verses",
    indexNote: "Verses that mention dark skin, Ethiopia, and the freedom verses.",
    definition: `Bible verses that mention Black or dark skin include Song of Solomon 1:5, ${F("SOL 1:5", "I am black, but comely")}, and Jeremiah 13:23, about the Ethiopian's skin. Verses about Africa include Psalm 68:31 and Amos 9:7. Black churches also hold close freedom verses such as Exodus 3:7 and Isaiah 61:1.`,
    quick: "Skin: Song of Solomon 1:5-6, Jeremiah 13:23. Africa: Psalm 68:31, Amos 9:7, Acts 8:27. Freedom: Exodus 3:7, Isaiah 61:1 (read by Jesus in Luke 4), Galatians 3:28.",
    bestFor: "anyone looking for scripture that speaks to Black identity, quoted exactly.",
    sections: [
      ["Which Bible verses mention dark skin?", `${V("SOL 1:5-6")}
<p>The woman in the Song is dark from working in the sun, and she says it with her head up: black, and lovely.</p>
${V("JER 13:23")}`],
      ["Verses about Africa and Ethiopia", `${V("PSA 68:31")}
${V("AMO 9:7")}
<p>In Amos, God tells Israel that he cares for the Ethiopians as he does for them. It is one of the plainest verses about God and all peoples.</p>`],
      ["Freedom verses the Black church loves", `${V("EXO 3:7")}
${V("ISA 61:1")}
<p>Jesus read this passage aloud in the synagogue at Nazareth and said it was fulfilled that day (Luke 4:16-21).</p>`],
      ["Verses about one human family", `${V("ACT 17:26")}
${V("GAL 3:28")}`],
      ["Is there a Bible app for Black Christians?", `<p>Peace Be Still, {{stores.short}}, has Hush Harbor · Black Bible Chat &amp; Stories: tell the chat what is on your heart and it answers in a Black church voice with King James verses like these, pasted word for word. It is AI, labelled as AI, and never speaks as God.</p>`],
    ],
    faq: [
      ["Where does the Bible say “I am black, but comely”?", `Song of Solomon 1:5 (${F("SOL 1:5", "I am black, but comely")}). The speaker is a young woman darkened by the sun from working in the vineyards (1:6). Some newer translations say “dark and lovely”.`],
      ["Is there a verse about Ethiopia stretching out her hands?", `Yes, Psalm 68:31: ${Q("PSA 68:31")} Black preachers have quoted it for generations.`],
      ["What verse says God made all nations of one blood?", `Acts 17:26, from Paul's speech in Athens: God ${F("ACT 17:26", "hath made of one blood all nations of men for to dwell on all the face of the earth")}.`],
    ],
    sources: [bg("Song of Solomon 1:5-6", "Song of Solomon 1:5-6 (KJV), Bible Gateway"), bg("Psalm 68:31", "Psalm 68:31 (KJV), Bible Gateway"), bg("Amos 9:7", "Amos 9:7 (KJV), Bible Gateway")],
    related: ["/questions/black-people-in-the-bible/", "/questions/black-history-in-the-bible/", "/questions/black-christian/", "/black-bible-chat/"],
  },
  {
    ...D, lang: "en", door: "faith", group: G, path: "/questions/african-american-bible/",
    title: "African American Bible: the editions, and the Bible apps · Peace Be Still",
    description: "What people mean by an African American Bible: the African American Jubilee Edition, the Original African Heritage Study Bible, and Bible apps with a Black church voice.",
    h1: "Is there an African American Bible? The editions and the apps",
    indexLabel: "African American Bible",
    indexNote: "The Jubilee Edition, the African Heritage Study Bible, and apps.",
    definition: "An African American Bible is a Bible edition with notes, art and essays from the African American church, around the same scripture text. The best known are the African American Jubilee Edition (American Bible Society, 1999, KJV or CEV) and the Original African Heritage Study Bible (KJV, edited by Cain Hope Felder). The scripture itself is not changed.",
    quick: "If you want a printed Bible, look at the African American Jubilee Edition or the Original African Heritage Study Bible, both available in the King James Version. If you want an app, look for one that quotes a named translation word for word and speaks in a voice you trust.",
    bestFor: "people shopping for a Bible, or a Bible app, made with African American readers in mind.",
    sections: [
      ["What is the African American Bible?", `<p>There is no separate African American translation. What exists are editions that wrap a standard translation in material about the African American faith story: articles, history, art, and notes on Africa and African people in scripture.</p>`],
      ["Which African American Bible editions exist?", `<table class="t"><thead><tr><th>Edition</th><th>Text</th><th>What it adds</th></tr></thead><tbody>
<tr><td>Holy Bible: African American Jubilee Edition (American Bible Society, 1999)</td><td>King James Version or Contemporary English Version</td><td>Essays and art on the African American religious experience by Black scholars and theologians</td></tr>
<tr><td>The Original African Heritage Study Bible (Cain Hope Felder, general editor)</td><td>King James Version</td><td>Study notes on Africa and people of African descent in the Bible</td></tr>
</tbody></table>
<p class="muted">Editions are reprinted often; check the publisher's current listing before buying.</p>`],
      ["Why do many Black churches use the King James Version?", `<p>For many families it is the Bible of their grandparents' church, the words of the spirituals and the old sermons. Its rhythm is made for reading aloud. And it is in the public domain in the United States, so anyone can print, read and record it freely.</p>
<p>${F("PSA 23:1", "The LORD is my shepherd; I shall not want.")} (Psalm 23:1)</p>`],
      ["How do I choose an edition?", `<ol>
<li><strong>Pick the translation first.</strong> If your church reads the King James Version, both editions above come in it.</li>
<li><strong>Decide how much study material you want.</strong> A study Bible has notes on nearly every page; a Jubilee-style edition keeps most essays in separate sections.</li>
<li><strong>Check the print size</strong> if it is a gift for an older reader.</li>
<li><strong>Look at the art.</strong> Many families choose these editions for pictures that look like them.</li>
</ol>`],
      ["Is there a Bible app for Black Christians?", `<p>Peace Be Still, {{stores.short}}, has Hush Harbor · Black Bible Chat &amp; Stories inside a full King James Bible. The chat answers in a Black church voice; every verse is pasted from the stored KJV, never written by the AI. Its stories are told in that same voice, with the King James text beside them. See <a href="/black-bible-app/">the Black Bible app</a>.</p>`],
    ],
    faq: [
      ["Is there an African American Bible?", "Yes, as editions rather than a new translation. The African American Jubilee Edition (1999) and the Original African Heritage Study Bible both use the King James Version with added notes, essays and art."],
      ["Who edited the African Heritage Study Bible?", "Cain Hope Felder, a New Testament scholar at Howard University School of Divinity, was the general editor."],
      ["Is the scripture different in an African American Bible?", "No. The scripture is the translation named on the cover, such as the KJV. The difference is in the notes, art and essays around it."],
    ],
    sources: [["Museum of the Bible: Holy Bible, African American Jubilee Edition", "https://collections.museumofthebible.org/artifacts/8890-holy-bible-african-american-jubilee-edition"], ["Yale Divinity Library guide: African American religion, Bibles", "https://guides.library.yale.edu/african_american_religion/bibles"]],
    related: ["/black-bible-app/", "/questions/black-christian/", "/questions/black-bible-verses/", "/questions/black-history-in-the-bible/"],
  },
  {
    ...D, lang: "en", door: "faith", group: G, path: "/questions/black-christian/",
    title: "Black Christian life: devotionals, churches and Bible tools · Peace Be Still",
    description: "Where Black Christians find devotionals and Bible tools that speak their language: what the Black church is, sourced numbers from Pew Research, Watch Night, and a Bible app in a Black church voice.",
    h1: "Black Christian: devotionals, church and Bible tools made with you in mind",
    indexLabel: "Black Christian",
    indexNote: "The Black church in numbers, its traditions, and tools that fit.",
    definition: "A Black Christian is a follower of Jesus whose faith is often shaped by the Black church: its preaching, its songs and its history of faith under slavery and segregation. Pew Research found 66% of Black Americans are Protestant, and 60% of Black churchgoers attend congregations where most people and the senior clergy are Black.",
    quick: "For devotionals that fit, look for exact scripture in a translation you know, a voice that sounds like home, and stories that show people who look like you. Peace Be Still's Hush Harbor is built on those three things.",
    bestFor: "Black believers looking for daily tools, and leaders planning devotionals for their church.",
    sections: [
      ["What is the Black church?", `<p>The phrase covers the historically Black denominations (such as the African Methodist Episcopal Church, founded in Philadelphia in 1816) and the many Black congregations in other traditions. Pew Research's 2021 survey of 8,660 Black adults found:</p>
<ul>
<li>66% of Black Americans are Protestant, 6% Catholic and 3% another Christian faith.</li>
<li>60% of Black adults who attend services go to congregations where most attendees and the senior clergy are Black.</li>
<li>Most Black adults say they rely on prayer to help make major decisions.</li>
</ul>`],
      ["Traditions many Black Christians share", `<ul>
<li><strong>Watch Night</strong> on New Year's Eve, linked by the Smithsonian's National Museum of African American History and Culture to 31 December 1862, when Black communities waited for the Emancipation Proclamation to take effect.</li>
<li><strong>Call and response</strong>: “God is good.” “All the time.”</li>
<li><strong>The spirituals</strong>, such as “Go Down, Moses” and “Wade in the Water”.</li>
<li><strong>Church mothers</strong>, whose sayings carry as much weight as many sermons.</li>
</ul>`],
      ["Where do Black Christians find devotionals made for them?", `<p>Start with your own church's reading plan. Beyond that, look for three things in any book or app: scripture quoted exactly from a named translation, a voice that does not feel borrowed, and honesty about history. Avoid anything that promises money or healing for a donation.</p>
${V("MIC 6:8")}`],
      ["Is there a Bible app for Black Christians?", `<p>Peace Be Still, {{stores.tag}}, has Hush Harbor · Black Bible Chat &amp; Stories: a Bible chat in a Black church voice, a daily Bible story told in that voice, and one “say it with me” call-and-response moment in each story. Every verse comes from the stored King James text.</p>`],
    ],
    faq: [
      ["What percentage of Black Americans are Christian?", "Pew Research's 2021 report found 66% are Protestant, 6% Catholic and 3% belong to other Christian faiths: about three in four in all."],
      ["What is Watch Night?", "A New Year's Eve service. The Smithsonian's NMAAHC ties it to 31 December 1862, “Freedom's Eve”, when Black communities gathered to wait for the Emancipation Proclamation."],
      ["What is the oldest Black denomination in the US?", "The African Methodist Episcopal Church, founded by Richard Allen and others in Philadelphia in 1816, is the oldest independent Black denomination."],
    ],
    sources: [PEW, NMAAHC_WATCH, ["Britannica: African Methodist Episcopal Church", "https://www.britannica.com/topic/African-Methodist-Episcopal-Church"]],
    related: ["/black-bible-app/", "/questions/hush-harbor/", "/questions/african-american-bible/", "/black-bible-chat/"],
  },
  {
    ...D, lang: "en", door: "faith", group: G, path: "/questions/was-jesus-black-in-the-bible/",
    title: "Was Jesus Black? What the Bible says, and does not say · Peace Be Still",
    description: "What the Bible says about how Jesus looked: no description of his skin, a Jewish man of Galilee, Revelation 1's vision, Isaiah 53:2, and why the blond Jesus of paintings is not from scripture either.",
    h1: "Was Jesus Black? What the Bible says, and what it does not",
    indexLabel: "Was Jesus Black?",
    indexNote: "No skin colour in the Gospels; what Revelation 1 and Isaiah 53 say.",
    definition: "The Bible does not say what colour Jesus's skin was. It says he was a Jewish man from Nazareth in Galilee, in the first century, and it describes no feature of his face. The pale, blond Jesus of many paintings is not from the Bible either; it came from the artists who painted him.",
    quick: `Short answer: the Gospels give no physical description. Revelation 1:14-15 describes the risen Christ in a vision with hair ${F("REV 1:14", "white like wool")} and feet like burning brass, which some read as a clue; it is a vision of glory, not a portrait.`,
    bestFor: "people who have heard both “Jesus was Black” and “Jesus was white” and want to see what the text says.",
    sections: [
      ["What did Jesus look like according to the Bible?", `<p>The four Gospels never describe his face, height, hair or skin. Isaiah's prophecy, which Christians read as about Jesus, says there was nothing striking about his looks:</p>
${V("ISA 53:2")}`],
      ["What does Revelation 1 say about his hair and feet?", `<p>John sees the risen Christ in a vision:</p>
${V("REV 1:14-15")}
<p>Many Black readers point to ${F("REV 1:14", "like wool")} and to feet ${F("REV 1:15", "like unto fine brass")}. Others note that the same verse says his hair was white as snow and his eyes like fire: this is a picture of glory and age, not of ethnicity. Both readings agree on one thing: it is not the Jesus of a stained-glass window in northern Europe.</p>`],
      ["Who was Jesus, by family and place?", `<p>A Jew of the tribe of Judah and the line of David, raised in Nazareth, a town in Galilee. Matthew's family line includes Tamar, Rahab (a Canaanite) and Ruth (a Moabite). He would have looked like other Jewish men of his time and region, not like a European.</p>
${V("MAT 1:5")}`],
      ["Why are there Black pictures of Jesus?", `<p>Because Christians everywhere have painted Jesus looking like their own people: in Ethiopia, in Europe, in Latin America, in Asia. A Black Jesus in a picture is a way of saying “he came for us too”, the same thing a European painting says for its people.</p>`],
      ["How Peace Be Still answers this", `<p>In Hush Harbor · Black Bible Chat &amp; Stories, the chat does not claim Jesus was Black, because the Bible does not say. Its stories are told in a Black church voice, and include the Africans the Bible names, so people can hear themselves in the stories. The chat is AI, labelled as AI, and quotes the King James text word for word.</p>`],
    ],
    faq: [
      ["Does the Bible say Jesus had hair like wool?", `Revelation 1:14 says ${F("REV 1:14", "His head and his hairs were white like wool, as white as snow")}. In context it describes the colour (white), in a vision of the risen Christ. It is not a description of Jesus during his life.`],
      ["Was Jesus white?", "Not in the sense of a European. He was a Jewish man from Galilee in the first century. The fair-skinned Jesus of many paintings reflects the artists, not the Bible."],
      ["Is it wrong to picture Jesus as Black?", "Christians across the world have pictured Jesus in their own likeness for centuries. The Bible gives no picture to break. What matters is who he is, not a portrait."],
    ],
    sources: [bg("Revelation 1:12-16", "Revelation 1:12-16 (KJV), Bible Gateway"), bg("Isaiah 53:2", "Isaiah 53:2 (KJV), Bible Gateway"), bg("Matthew 1:1-6", "Matthew 1:1-6 (KJV), Bible Gateway")],
    related: ["/questions/black-people-in-the-bible/", "/questions/was-samson-black-in-the-bible/", "/questions/black-bible-verses/", "/black-bible-chat/"],
  },
  {
    ...D, lang: "en", door: "faith", group: G, path: "/questions/was-samson-black-in-the-bible/",
    title: "Was Samson Black? What Judges says about him · Peace Be Still",
    description: "Was Samson Black? What Judges 13 to 16 says about his family, his tribe and his seven locks, and why the text does not settle the question either way.",
    h1: "Was Samson Black? What the book of Judges says",
    indexLabel: "Was Samson Black?",
    indexNote: "His tribe, his family and his seven locks, from Judges 13 to 16.",
    definition: `The Bible does not say Samson was Black, and it does not say he was not. Judges 13 to 16 tells us he was an Israelite from the tribe of Dan, son of Manoah, a Nazirite whose hair was never cut, worn in ${F("JDG 16:13", "seven locks")}. It never describes his skin.`,
    quick: "Samson was an Israelite of the tribe of Dan (Judges 13:2). The seven locks of his hair (Judges 16:13, 19) are why many people picture him with locs today; the verses give the number of locks, not their texture.",
    bestFor: "people who have seen Samson drawn with locs and want to know what the text supports.",
    sections: [
      ["What does the Bible say about Samson's family?", `${V("JDG 13:2")}
<p>He was born to an Israelite couple in Zorah, of the tribe of Dan, after an angel's visit. He was set apart as a Nazirite from birth: no razor on his head.</p>`],
      ["What were Samson's seven locks?", `<p>Delilah weaves the seven locks of his head into a loom, then later has them shaved off:</p>
${V("JDG 16:19")}
<p>“Locks” in 1611 English means lengths or tresses of hair. Many Black readers picture these as locs, since uncut hair grown for years and worn in seven sections looks a lot like them. That is a reasonable picture, but the verse does not describe the texture.</p>`],
      ["Were the Israelites Black?", `<p>The Bible does not use colour to describe Israel. The Israelites lived between Africa and Asia, came out of centuries in Egypt, and included people from other nations (Exodus 12:38 speaks of ${F("EXO 12:38", "a mixed multitude")}). Most historians picture ancient Israelites as brown-skinned people of the Near East.</p>`],
      ["Why does the question matter?", `<p>Because for generations, Bible pictures showed every hero as European. Asking “was Samson Black?” is often really asking “can I see myself in this story?”. The answer to that is yes, and the Bible gives no reason to say otherwise.</p>`],
      ["Samson in Peace Be Still", `<p>Samson's last prayer (Judges 16:4-30) is in Peace Be Still's story library. In Hush Harbor · Black Bible Chat &amp; Stories, stories are told in a Black church voice with the King James text beside them. The app is {{stores.tag}}.</p>`],
    ],
    faq: [
      ["What tribe was Samson from?", `The tribe of Dan. His father Manoah was ${F("JDG 13:2", "of the family of the Danites")} from Zorah (Judges 13:2).`],
      ["Did Samson have dreadlocks?", "Judges 16 says he had seven locks of uncut hair. Many people picture them as locs, and that fits uncut hair worn for years, but the Bible does not describe their texture."],
      ["Where is Samson's story in the Bible?", "Judges chapters 13 to 16, from the angel's announcement to his parents to his final prayer in the temple of Dagon."],
    ],
    sources: [bg("Judges 13", "Judges 13 (KJV), Bible Gateway"), bg("Judges 16", "Judges 16 (KJV), Bible Gateway")],
    related: ["/questions/was-jesus-black-in-the-bible/", "/questions/was-bathsheba-black-in-the-bible/", "/questions/who-is-black-in-the-bible/", "/black-bible-app/"],
  },
  {
    ...D, lang: "en", door: "faith", group: G, path: "/questions/was-bathsheba-black-in-the-bible/",
    title: "Was Bathsheba Black? What 2 Samuel tells us about her · Peace Be Still",
    description: "Was Bathsheba Black? What the Bible says about her father, her husband Uriah the Hittite and her place in Jesus's family line, and why the text does not say her colour.",
    h1: "Was Bathsheba Black? What the Bible tells us about her",
    indexLabel: "Was Bathsheba Black?",
    indexNote: "Her family, her marriages and her place in Jesus's line.",
    definition: "The Bible does not say Bathsheba was Black. 2 Samuel 11:3 calls her the daughter of Eliam and the wife of Uriah the Hittite. She married King David, was the mother of Solomon, and is named in Jesus's family line in Matthew 1:6. No verse describes her skin.",
    quick: "Bathsheba was an Israelite woman, daughter of Eliam (2 Samuel 11:3), likely the granddaughter of David's adviser Ahithophel (2 Samuel 23:34). The idea that she was Black comes from later readings, not the text.",
    bestFor: "people who have heard the claim and want what the verses actually say.",
    sections: [
      ["Who was Bathsheba in the Bible?", `${V("2SA 11:3")}
<p>She is first seen from David's roof. David took her, then had her husband killed in battle. She later became David's wife, and the mother of Solomon, and she secured Solomon's place as king (1 Kings 1).</p>`],
      ["Who was Bathsheba's family?", `<p>Her father Eliam appears in the list of David's mighty men as the son of Ahithophel, David's counsellor:</p>
${V("2SA 23:34")}
<p>That makes her, very likely, an Israelite from a family close to the king.</p>`],
      ["Where does the idea that Bathsheba was Black come from?", `<p>Some readers link her to the Song of Solomon, where a woman says she is black and comely; the Song is about Solomon's beloved, not his mother. Others note that 1 Chronicles 3:5 calls her ${F("1CH 3:5", "Bath-shua")} and connect the name to other women. None of these makes the text say she was Black.</p>`],
      ["Why is she in Jesus's family line?", `<p>Matthew names four women before Mary: Tamar, Rahab, Ruth, and ${F("MAT 1:6", "her that had been the wife of Urias")}. Each has a hard story. Matthew includes them on purpose; grace runs through the family line.</p>
${V("MAT 1:6")}`],
      ["Where Peace Be Still fits", `<p>Peace Be Still, {{stores.short}}, has Hush Harbor · Black Bible Chat &amp; Stories, where you can ask questions like this one and get an answer that keeps to the King James text. The chat is AI and labelled as AI; it says plainly when the Bible is silent.</p>`],
    ],
    faq: [
      ["Was Bathsheba a Hittite?", "Her husband Uriah was a Hittite. Bathsheba herself is called the daughter of Eliam, and her family appears to be Israelite (2 Samuel 23:34)."],
      ["Is Bathsheba the woman in the Song of Solomon?", `No. The Song's speaker who says ${F("SOL 1:5", "I am black, but comely")} is Solomon's beloved, not his mother Bathsheba.`],
      ["Where is Bathsheba's story?", "2 Samuel 11 and 12 (David and Uriah, Nathan's rebuke, Solomon's birth) and 1 Kings 1 and 2 (Solomon made king)."],
    ],
    sources: [bg("2 Samuel 11", "2 Samuel 11 (KJV), Bible Gateway"), bg("2 Samuel 23:34", "2 Samuel 23:34 (KJV), Bible Gateway"), bg("Matthew 1:6", "Matthew 1:6 (KJV), Bible Gateway")],
    related: ["/questions/was-samson-black-in-the-bible/", "/questions/was-jesus-black-in-the-bible/", "/questions/who-is-black-in-the-bible/", "/black-bible-chat/"],
  },
  {
    ...D, lang: "en", door: "faith", group: G, path: "/questions/hush-harbor/",
    title: "What was a hush harbor? Secret worship under slavery · Peace Be Still",
    description: "What a hush harbor was: hidden places where enslaved people worshipped in secret, what services were like in their own words, why they met there, and how it shaped the Black church.",
    h1: "What was a hush harbor, and why does it matter to the Black church?",
    indexLabel: "What was a hush harbor?",
    indexNote: "Secret worship under slavery, in the words of people who were there.",
    definition: "A hush harbor was a hidden place, in woods, gullies, ravines or thickets, where enslaved African Americans met in secret to pray, sing and preach away from the people who enslaved them. Historian Albert Raboteau calls these meetings part of the “invisible institution” that grew into the Black church.",
    quick: "Enslaved Christians met in hush harbors because they were often forbidden to worship freely or were preached obedience to their masters. They whispered, sang and prayed, sometimes all night, and risked a beating to be there.",
    bestFor: "anyone learning the history of the Black church, and people curious where the Hush Harbor journey's name comes from.",
    sections: [
      ["What is a hush harbor?", `<p>Raboteau, writing in Christian History, puts it plainly: one practice was to meet in secluded places, “woods, gullies, ravines, and thickets (aptly called ‘hush harbors’)”. People found each other there by signals and passwords, and kept their voices low so they would not carry.</p>`],
      ["Why did enslaved people meet in hush harbors?", `<ul>
<li>Many were forbidden to hold their own services, or even to pray.</li>
<li>The sermons they were allowed to hear often told them to obey their masters.</li>
<li>In secret they could preach the whole Bible, including the Exodus and freedom.</li>
<li>They could worship in their own way: their own songs, their own preachers, their own shouts.</li>
</ul>
${V("EXO 3:7")}`],
      ["What were hush harbor services like?", `<p>The people who were there described them. Lucretia Alexander, quoted by Raboteau, remembered: “They used to sing their songs in a whisper and pray in a whisper.” Wash Wilson said: “Sometimes us sing and pray all night.” In Louisiana, one man would bend over a vessel of water and speak into it to drown the sound.</p>`],
      ["How did hush harbors shape the Black church?", `<p>The National Humanities Center describes these meetings as places where enslaved people freely mixed African rhythms, singing and beliefs with evangelical Christianity. Their songs became the spirituals; their preachers became the first pastors of Black congregations after emancipation; their faith in a God who frees slaves became the backbone of Black preaching.</p>`],
      ["What is the Hush Harbor journey in Peace Be Still?", `<p>Peace Be Still, a phone app {{stores.tag}}, has a journey called Hush Harbor · Black Bible Chat &amp; Stories. The name honours this history. Inside it you can talk through what is on your heart with a Bible chat in a Black church voice, which answers with King James verses pasted word for word, and read a daily Bible story told in that voice. The chat is AI, labelled as AI, and stays humble about the history it is named for.</p>`],
    ],
    faq: [
      ["What is a hush harbor?", "A secret meeting place, usually in woods or thickets, where enslaved African Americans gathered to worship away from their enslavers. The meetings were kept quiet, with whispered songs and prayers."],
      ["What happened if enslaved people were caught at a hush harbor?", "They could be whipped. Historians record that enslaved Christians risked floggings to attend secret gatherings to worship God."],
      ["Is the Hush Harbor journey affiliated with any business named Hush Harbor?", "No. Hush Harbor in Peace Be Still is a journey inside the app, named for the history of secret worship. It is not affiliated with any other business or place of that name."],
    ],
    sources: [RABOTEAU, NHC, NMAAHC_WATCH],
    related: ["/questions/black-history-in-the-bible/", "/questions/black-christian/", "/black-bible-chat/", "/black-bible-app/"],
  },
  {
    ...D, lang: "en", door: "faith", group: "Bible apps", path: "/black-bible-app/",
    title: "Black Bible app: Hush Harbor in Peace Be Still · Peace Be Still",
    description: "A Bible app with a Black church voice: Hush Harbor in Peace Be Still has a Bible chat that sounds like home, a daily Bible story in that voice, the whole KJV free, no trial, no ads.",
    h1: "A Black Bible app with a Black church voice",
    indexLabel: "Black Bible app",
    indexNote: "Hush Harbor: a Black church voice, daily stories, KJV.",
    definition: "A Black Bible app is a Bible app made with Black believers in mind: the same scripture, with a voice that sounds like the Black church and Bible stories told in that voice. Peace Be Still, {{stores.short}}, has one inside it: Hush Harbor · Black Bible Chat &amp; Stories, on top of the whole King James Bible, free to read and hear.",
    quick: "Look for three things: verses quoted word for word from a named translation, a voice and art that feel like home, and honest prices with no surprise charges. Hush Harbor has all three, and its free version includes one chat a day and today's story.",
    bestFor: "Black Christians, and the people who love them, looking for a Bible app that sounds like their church.",
    pick: PICK_EN("Our pick for a Black Bible app: Peace Be Still, for Hush Harbor's Black church voice and its honest prices."),
    sections: [
      ["Is there a Black Bible app?", `<p>Yes. Hush Harbor · Black Bible Chat &amp; Stories is a journey inside Peace Be Still, a phone app {{stores.tag}}. It has a Bible chat in a Black church voice, a daily Bible story told in that voice, and one “say it with me” moment in every story: “God is good.” “All the time.”</p>`],
      ["What should a Bible app for Black Christians have?", `<ul>
<li><strong>Exact scripture.</strong> Every verse from a named translation, with book, chapter and verse. An AI should never write a verse from memory.</li>
<li><strong>A voice that feels like home.</strong> Warm, plain church-family language, never put-on slang or a caricature.</li>
<li><strong>Stories that sound like home.</strong> Bible stories told in a Black church voice, faithful to the text, including the Africans the Bible names.</li>
<li><strong>History told truthfully,</strong> including the hush harbors the journey is named for.</li>
<li><strong>Honest prices,</strong> in dollars, before you tap.</li>
</ul>`],
      ["Which Bible app reads the Bible aloud?", `<p>Peace Be Still reads the whole King James Bible aloud in the free version, and its Psalm Nights whisper a psalm at bedtime with a sleep timer. Many other Bible apps also have audio; check whether it costs extra.</p>`],
      ["Is there a free Bible app with no ads?", `<p>Peace Be Still has no ads, free or paid, ever. The free version stays free: the whole King James Bible to read and hear, today's story, one chat a day of up to 5 messages, your first sleep night and then one a week, and a daily declaration.</p>`],
      ["Is there a Bible app with no free trial or weekly plan?", `<p>Peace Be Still has neither. A paid plan is $7.99 a month or $39.99 a year, and adds unlimited Bible chat, chat that remembers what you are carrying, and every past story. With a paid plan: unlimited Bible chat, kept private. Your private chats are never used to train AI. Private for up to 50 messages a day. After that you can choose free chat, which isn't private; we always ask first. You can cancel in two taps.</p>
${V("MAR 4:39")}`],
    ],
    faq: [
      ["Is there a Bible app made for Black people?", "Peace Be Still, {{stores.short}}, has Hush Harbor · Black Bible Chat & Stories: a chat in a Black church voice that answers with exact King James verses, and daily Bible stories told in that voice. Everyone is welcome in every journey."],
      ["Which Bible translation does Hush Harbor use?", "The King James Version, quoted word for word from a stored copy with book, chapter and verse. The AI chooses which verses to show, but the words always come from the stored text."],
      ["Is the chat a real pastor?", "No. It is AI and says so on every answer. It never speaks as God or Jesus. If you mention self-harm or abuse, it shows the 988 Lifeline and other help instead of an AI reply."],
      ["Is Hush Harbor free?", "Yes, in the free version: one chat a day of up to 5 messages, today's story and the whole King James Bible. A paid plan adds unlimited Bible chat and every past story. With a paid plan: unlimited Bible chat, kept private. Your private chats are never used to train AI. Private for up to 50 messages a day. After that you can choose free chat, which isn't private; we always ask first."],
    ],
    sources: [["988 Suicide & Crisis Lifeline", "https://988lifeline.org/"], bg("Mark 4:35-41", "Mark 4:35-41 (KJV), Bible Gateway")],
    related: ["/black-bible-chat/", "/questions/african-american-bible/", "/questions/black-christian/", "/questions/black-people-in-the-bible/", "/free-bible-chat/"],
  },
];
