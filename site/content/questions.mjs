// Seed question pages, from the blue-ocean research of 18 Nov 2026
// (~/Work/codex-briefs/peace-be-still/blue-ocean-keywords.html). Rules:
// - door "faith" pages never link a "mindset" page and never use mindset words; and the reverse.
// - scripture is quoted word for word: KJV (English), Reina-Valera 1909 (Spanish).
// - no outcome or health promises; no launch date; no other app is disparaged.
const D = { published: "2026-11-18", updated: "2026-11-18", publishedText: "18 Nov 2026", updatedText: "18 Nov 2026" };
const DES = { published: "2026-11-18", updated: "2026-11-18", publishedText: "18 nov 2026", updatedText: "18 nov 2026" };
const v = (ref, text) => `<blockquote class="verse"><p>“${text}”</p><cite>${ref}</cite></blockquote>`;

export const PAGES = [
  {
    ...D, lang: "en", door: "faith", path: "/questions/whispered-bible-for-sleep/",
    title: "Whispered Bible for sleep: what it is and how to use it · Peace Be Still",
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
${v("Psalm 4:8 · KJV", "I will both lay me down in peace, and sleep: for thou, LORD, only makest me dwell in safety.")}`],
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
    ...D, lang: "en", door: "faith", path: "/questions/psalms-for-sleep/",
    title: "Psalms for sleep: 6 bedtime psalms to read or hear tonight · Peace Be Still",
    description: "Six psalms people read or listen to at bedtime, each quoted from the King James Version, with what each one is about and how to use them for sleep.",
    h1: "Psalms for sleep: 6 bedtime psalms to read or hear tonight",
    definition: "Psalms for sleep are psalms people read or listen to at bedtime because they speak of rest, safety and trust in God. The most used are Psalm 4, 3, 23, 91, 121 and 127. Many people play one psalm read slowly, or whispered, with a sleep timer, so scripture is the last thing they hear before sleeping.",
    quick: "Start with Psalm 4: its last verse is “I will both lay me down in peace, and sleep.” Then try Psalm 23 or Psalm 91. Read or listen to one psalm, slowly, with the lights low.",
    bestFor: "people who want a short list of bedtime psalms, quoted exactly, and a simple way to use them.",
    sections: [
      ["Which psalms are best to read before bed?", `<p>These six are the ones most often read at night, each with a verse from the King James Version:</p>
<table class="t"><thead><tr><th>Psalm</th><th>What it is about</th><th>Bedtime verse (KJV)</th></tr></thead><tbody>
<tr><td>Psalm 4</td><td>Peace after a hard day</td><td>“I will both lay me down in peace, and sleep: for thou, LORD, only makest me dwell in safety.” (4:8)</td></tr>
<tr><td>Psalm 3</td><td>Rest in trouble</td><td>“I laid me down and slept; I awaked; for the LORD sustained me.” (3:5)</td></tr>
<tr><td>Psalm 23</td><td>The shepherd who leads to still waters</td><td>“He maketh me to lie down in green pastures: he leadeth me beside the still waters.” (23:2)</td></tr>
<tr><td>Psalm 91</td><td>Shelter and protection</td><td>“He that dwelleth in the secret place of the most High shall abide under the shadow of the Almighty.” (91:1)</td></tr>
<tr><td>Psalm 121</td><td>The keeper who does not sleep</td><td>“Behold, he that keepeth Israel shall neither slumber nor sleep.” (121:4)</td></tr>
<tr><td>Psalm 127</td><td>Letting go of worry</td><td>“It is vain for you to rise up early, to sit up late, to eat the bread of sorrows: for so he giveth his beloved sleep.” (127:2)</td></tr>
</tbody></table>`],
      ["Why is Psalm 4 called the bedtime psalm?", `<p>Psalm 4 is an evening prayer. David asks to be heard, tells the reader to “commune with your own heart upon your bed, and be still,” and ends with lying down in peace. That last verse has made it the traditional psalm for the end of the day.</p>
${v("Psalm 4:8 · KJV", "I will both lay me down in peace, and sleep: for thou, LORD, only makest me dwell in safety.")}`],
      ["How do I use the psalms for sleep?", `<ol>
<li>Choose one psalm for the night.</li>
<li>Read it slowly, out loud or in your head, or play it read in a soft voice.</li>
<li>Stay with one verse that stands out and repeat it as you settle.</li>
<li>Use a sleep timer if you listen, so the audio fades out and nothing plays next.</li>
</ol>`],
      ["Is Psalm 91 good to read at night?", `<p>Yes. Psalm 91 is one of the most-played psalms at bedtime; on YouTube, Psalm 91 sleep readings have gathered millions of views. It speaks of shelter “under the shadow of the Almighty” and of not being afraid “for the terror by night.”</p>`],
      ["How does Peace Be Still do it?", `<p>Peace Be Still is a phone app that is coming soon to the App Store and Google Play. Its Psalm Nights journey reads a King James psalm in a whisper on an always-dark screen, with a sleep timer that fades out and nothing playing afterwards. The first night is free, then one a week; the paid lane ($7.99 a month or $39.99 a year, no trial) opens one every night.</p>`],
    ],
    faq: [
      ["What psalm do you read before bed?", "Psalm 4 is the traditional bedtime psalm. Its last verse reads: “I will both lay me down in peace, and sleep: for thou, LORD, only makest me dwell in safety.” Psalm 23 and Psalm 91 are the next most read at night."],
      ["Which psalm is for peace of mind at night?", "Many people turn to Psalm 4 for peace at the end of the day, and to Psalm 121, which says the Lord who keeps you “shall neither slumber nor sleep.” Read one slowly and stay with the verse that stands out to you."],
      ["Can I listen to psalms while I sleep?", "Yes. Many people play a psalm read slowly or whispered, with a sleep timer so the audio fades out. Keep the screen dark and turn off autoplay so nothing new starts once the reading ends."],
      ["Are these verses quoted exactly?", "Yes. Every verse on this page is quoted word for word from the King James Version, which is in the public domain in the United States, with the psalm and verse number."],
    ],
    sources: [["Psalm 4 (KJV), Bible Gateway", "https://www.biblegateway.com/passage/?search=Psalm%204&version=KJV"], ["Psalm 91 (KJV), Bible Gateway", "https://www.biblegateway.com/passage/?search=Psalm%2091&version=KJV"]],
  },
  {
    ...D, lang: "en", door: "faith", path: "/questions/black-bible-app/",
    title: "A Bible app for Black believers: what to look for · Peace Be Still",
    description: "What people mean by a Black Bible app, what to look for (exact scripture, a familiar church voice, Bible stories with Black faces) and what Peace Be Still's Hush Harbor will offer.",
    h1: "A Bible app for Black believers: what to look for",
    definition: "A Black Bible app is a Bible app made with Black believers in mind: the same scripture, but with a voice that sounds like the Black church, Bible stories drawn with Black faces and names, and room for the songs and history that shaped that faith. People search for it because most Bible apps' art and voices rarely look or sound like them.",
    quick: "Look for three things: scripture quoted word for word from a named translation, a voice and art that feel like home, and clear prices with no surprise charges. Peace Be Still's Hush Harbor journey is built around all three and is coming soon.",
    bestFor: "Black Christians, and the people who love them, looking for a Bible app that feels like their own church.",
    sections: [
      ["What do people mean by a Black Bible app?", `<p>Searches like “African American Bible app”, “Bible app for Black women” and “best Bible app for Black people” come from the same wish: to read and talk about scripture in a space that reflects your family, your church and your history. The Bible is the same; the setting, the faces and the voice are what change.</p>`],
      ["What should a Bible app for Black believers have?", `<ul>
<li><strong>Exact scripture.</strong> Every verse quoted word for word from a named translation, with book, chapter and verse. An AI should never write a verse from memory.</li>
<li><strong>A voice that feels like home.</strong> Warm, plain, church-family language, without stereotypes.</li>
<li><strong>Faces and names that look like you.</strong> Bible Stories with Black Faces, faithful to the text.</li>
<li><strong>History told truthfully.</strong> Hush harbors were the hidden places where enslaved people met to worship in secret; that history belongs in the story.</li>
<li><strong>Honest prices.</strong> The price in dollars before you tap, no trial that turns into a charge, and an easy way to cancel.</li>
</ul>`],
      ["What is Hush Harbor in Peace Be Still?", `<p><strong>Hush Harbor · Black Bible Chat &amp; Stories</strong> is a journey inside Peace Be Still, a phone app coming soon to the App Store and Google Play. You talk through what is on your heart in a Black church voice, and the answer comes back with real King James verses. Each day there is a short Bible story drawn with Black faces and names, to read or to hear. The chat is AI and says so on every answer; it is not a pastor or a person.</p>
${v("Matthew 11:28 · KJV", "Come unto me, all ye that labour and are heavy laden, and I will give you rest.")}`],
      ["Is it free?", `<p>Yes, there is a free lane that stays free: the whole King James Bible to read and to hear, today's story, one chat a day of up to 10 messages, and a daily declaration. The paid lane is $7.99 a month or $39.99 a year, with no trial and no ads, and you can cancel in two taps.</p>`],
    ],
    faq: [
      ["Is there a Bible app made for Black people?", "Peace Be Still, coming soon to the App Store and Google Play, has a journey called Hush Harbor · Black Bible Chat & Stories: a chat in a Black church voice that answers with exact King James verses, and a daily Bible story drawn with Black faces and names."],
      ["What is a hush harbor?", "Hush harbors were hidden places, often in woods or swamps, where enslaved African Americans gathered to worship, pray and sing away from those who enslaved them. The journey takes its name from that history of faith kept alive in secret."],
      ["Which Bible translation does Hush Harbor use?", "The King James Version, quoted word for word from a stored copy with book, chapter and verse. The AI chooses which verses to show, but the words always come from the stored text, never from the AI's memory."],
      ["Is Hush Harbor only for Black users?", "No. Everyone is welcome in every journey. Hush Harbor is made with Black believers in mind, in its voice, its art and its stories, and the rest of Peace Be Still is open to everyone."],
    ],
    sources: [],
  },
  {
    ...DES, lang: "es", door: "faith", path: "/es/preguntas/salmos-para-dormir/",
    title: "Salmos para dormir: 5 salmos para leer o escuchar esta noche · Peace Be Still",
    description: "Cinco salmos que se leen o escuchan antes de dormir, citados de la Reina-Valera 1909, y cómo usarlos esta noche. También la Biblia en español para dormir.",
    h1: "Salmos para dormir: 5 salmos para leer o escuchar esta noche",
    definition: "Los Salmos para dormir son salmos que se leen o escuchan antes de acostarse porque hablan de descanso, refugio y confianza en Dios. Los más usados son el Salmo 4, el 3, el 23, el 91 y el 127. Muchas personas escuchan un solo salmo leído despacio o en susurro, con un temporizador, para que la Palabra sea lo último que oyen.",
    quick: "Empieza con el Salmo 4: su último versículo dice “En paz me acostaré, y asimismo dormiré”. Luego prueba el Salmo 23 o el 91. Lee o escucha un solo salmo, despacio y con poca luz.",
    bestFor: "quien quiere una lista corta de salmos para la noche, citados con exactitud, y una forma sencilla de usarlos.",
    sections: [
      ["¿Qué salmos leer antes de dormir?", `<p>Estos cinco son los que más se leen de noche, cada uno con un versículo de la Reina-Valera 1909:</p>
<table class="t"><thead><tr><th>Salmo</th><th>De qué trata</th><th>Versículo (RV 1909)</th></tr></thead><tbody>
<tr><td>Salmo 4</td><td>Paz al final del día</td><td>“En paz me acostaré, y asimismo dormiré; porque solo tú, Jehová, me harás estar confiado.” (4:8)</td></tr>
<tr><td>Salmo 3</td><td>Descanso en medio de la angustia</td><td>“Yo me acosté, y dormí, y desperté; porque Jehová me sostuvo.” (3:5)</td></tr>
<tr><td>Salmo 23</td><td>El pastor que lleva a aguas de reposo</td><td>“En lugares de delicados pastos me hará yacer: junto á aguas de reposo me pastoreará.” (23:2)</td></tr>
<tr><td>Salmo 91</td><td>Refugio y protección</td><td>“EL que habita al abrigo del Altísimo, morará bajo la sombra del Omnipotente.” (91:1)</td></tr>
<tr><td>Salmo 127</td><td>Soltar la preocupación</td><td>“Por demás os es el madrugar á levantaros, el veniros tarde á reposar, el comer pan de dolores: pues que á su amado dará Dios el sueño.” (127:2)</td></tr>
</tbody></table>
<p class="muted">Los versículos se citan tal como están en la Reina-Valera 1909, con su ortografía antigua (“á”).</p>`],
      ["¿Cómo usar los Salmos para dormir?", `<ol>
<li>Elige un solo salmo para la noche.</li>
<li>Léelo despacio, en voz alta o en silencio, o escúchalo leído en voz baja.</li>
<li>Quédate con el versículo que más te hable y repítelo al acostarte.</li>
<li>Si lo escuchas, usa un temporizador para que el audio se apague solo y no siga nada después.</li>
</ol>`],
      ["¿Hay una Biblia en español para dormir?", `<p>Sí. Muchas personas escuchan la Biblia en español leída despacio para dormir, sobre todo los Salmos y los Evangelios. La Reina-Valera 1909 es de dominio público en Estados Unidos, así que se puede leer, grabar y compartir libremente.</p>
${v("Salmo 91:2 · RV 1909", "Diré yo á Jehová: Esperanza mía, y castillo mío; mi Dios, en él confiaré.")}`],
      ["¿Qué hará Peace Be Still?", `<p>Peace Be Still es una app que llega muy pronto al App Store y a Google Play. Su camino <strong>Mi Refugio · Biblia y Chat en Español</strong> trae todo en español: chat bíblico, historias y Salmos susurrados para dormir, con la Reina-Valera 1909 palabra por palabra. La pantalla siempre está oscura y un temporizador apaga la voz poco a poco. La primera noche es gratis y luego una por semana; la parte de pago cuesta $7.99 al mes o $39.99 al año, sin prueba.</p>`],
    ],
    faq: [
      ["¿Qué salmo leer para dormir tranquilo?", "El Salmo 4 es el salmo tradicional de la noche. Su último versículo dice: “En paz me acostaré, y asimismo dormiré; porque solo tú, Jehová, me harás estar confiado.” Después del 4, los más leídos de noche son el Salmo 23 y el Salmo 91."],
      ["¿Qué dice el Salmo 91 para la noche?", "El Salmo 91 habla de refugio: “EL que habita al abrigo del Altísimo, morará bajo la sombra del Omnipotente.” También dice que no temerás “de espanto nocturno”. Por eso muchas personas lo leen o lo escuchan antes de dormir."],
      ["¿Puedo escuchar la Biblia mientras duermo?", "Sí. Muchas personas ponen un salmo leído despacio o en susurro con un temporizador, para que el audio se apague solo. Deja la pantalla oscura y quita la reproducción automática para que no empiece nada nuevo."],
      ["¿Qué versión de la Biblia se usa aquí?", "La Reina-Valera 1909, de dominio público en Estados Unidos, citada palabra por palabra con libro, capítulo y versículo. Se respeta su ortografía original, como “á” y “fué”."],
    ],
    sources: [["Reina-Valera 1909, eBible.org", "https://ebible.org/find/details.php?id=spaRV1909"]],
  },
  {
    ...D, lang: "en", door: "mindset", path: "/questions/law-of-assumption-sleep-meditation/",
    title: "Law of assumption sleep meditation: how the nightly practice works · Peace Be Still",
    description: "A law of assumption sleep meditation is a night practice: you picture a scene you hope for as if it is already true and fall asleep inside it. Here is how people do it.",
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
    ...D, lang: "en", door: "neutral", path: "/questions/how-to-cancel-bible-chat-subscription/",
    title: "How to cancel a Bible Chat subscription on iPhone or Android · Peace Be Still",
    description: "Step-by-step: cancel a Bible Chat subscription bought through the App Store or Google Play, using Apple's and Google's own steps. Deleting the app does not cancel it.",
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
    ...D, lang: "en", door: "neutral", path: "/questions/how-to-cancel-haven-subscription/",
    title: "How to cancel a Haven subscription on iPhone or Android · Peace Be Still",
    description: "How to cancel a Haven Bible app subscription bought through the App Store or Google Play, with Apple's and Google's own steps, plus what happens after you cancel.",
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
      ["Can I get a refund?", `<p>For App Store purchases, you can ask Apple at reportaproblem.apple.com; Apple decides. For Google Play purchases, Google Play's refund policy applies.</p>`],
      ["Is there a Bible app with no trial?", `<p>Peace Be Still, coming soon to the App Store and Google Play, has no trial and no weekly plan: a free lane that stays free and a paid lane at $7.99 a month or $39.99 a year, with the price shown in dollars before you tap and cancel in two taps from the paid screen.</p>`],
    ],
    faq: [
      ["Why don't I see Haven under Subscriptions?", "Make sure you are signed in with the Apple ID or Google account you used to subscribe. If you paid on a website rather than in the store, cancel it on that website. On iPhone, no Cancel button means it is already cancelled."],
      ["Does deleting Haven stop the charges?", "No. The App Store or Google Play bills the subscription, so it keeps renewing until you cancel it in iPhone Settings or in Google Play. Deleting the app only removes it from your phone."],
      ["When should I cancel a free trial?", "Apple advises cancelling at least 24 hours before a trial ends so it does not renew as a paid subscription. You can usually keep using the trial until its end date after cancelling."],
    ],
    sources: [["Apple Support: Cancel a subscription from Apple", "https://support.apple.com/en-us/118428"], ["Google Play Help: Cancel, pause, or change a subscription", "https://support.google.com/googleplay/answer/7018481"], ["Apple: Request a refund", "https://reportaproblem.apple.com/"]],
  },
];
