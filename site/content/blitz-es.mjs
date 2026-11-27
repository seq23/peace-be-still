// Páginas en español (blitz-top50.json, grupo "Spanish"). Escritas en español de EE. UU., no traducidas.
// Toda cita bíblica sale de la Reina-Valera 1909 guardada (scripture.mjs), nunca de la RVR1960.
import { DES, V, Q, P, F, bg, RV_SRC, MI_REFUGIO_ES } from "./blitz-common.mjs";

const es = "es";
const v = (r) => V(r, es);
const q = (r) => Q(r, es);
const f = (r, t) => F(r, t, es);
const rv = (search, label) => bg(search, label, "RVES");
const GN = "Oraciones de la noche";
const GM = "Oraciones de la mañana";
const GS = "Salmos";
const GV = "Versículos";
const MI_REFUGIO = MI_REFUGIO_ES;
const NOTA_RV = `<p class="muted">Los versículos se citan tal como están en la Reina-Valera 1909, con su ortografía antigua (“á”, “fué”). Algunos salmos empiezan con su título y la primera palabra en mayúsculas, como en la edición impresa.</p>`;

export const ES = [
  {
    ...DES, lang: es, door: "faith", group: GM, path: "/es/preguntas/devocional-diario/",
    title: "Devocional diario: versículo y oración de hoy · Peace Be Still",
    description: "Cómo hacer un devocional diario en 10 minutos: un versículo de la Reina-Valera 1909 palabra por palabra, una reflexión corta y una oración para hoy.",
    h1: "Devocional diario: un versículo, una reflexión y una oración para hoy",
    indexLabel: "Devocional diario",
    indexNote: "Cómo hacerlo en 10 minutos, con un ejemplo para hoy.",
    definition: `Un devocional diario es un rato corto con Dios cada día: lees un versículo, piensas en lo que dice y oras. Diez minutos bastan. Un ejemplo para hoy: lee Lamentaciones 3:22-23, ${f("LAM 3:22-23", "Nuevas son cada mañana; grande es tu fidelidad")}, y dale gracias a Dios por algo concreto de esta mañana.`,
    quick: "Elige un versículo, léelo dos veces despacio, escribe una frase sobre lo que te dice y termina con una oración corta. Hazlo a la misma hora todos los días, aunque sean cinco minutos.",
    bestFor: "quien quiere empezar un devocional en español, corto y sin complicaciones.",
    sections: [
      ["¿Qué es un devocional cristiano?", `<p>Es un tiempo personal de lectura de la Biblia y oración. No es un estudio largo ni una clase. La palabra viene de “devoción”: dedicarle a Dios un momento del día. Muchas personas lo hacen al despertar, antes de mirar el celular; otras al acostarse.</p>`],
      ["¿Cómo hacer un devocional diario?", `<ol>
<li><strong>Un versículo.</strong> Uno solo. Léelo dos veces, despacio, en voz baja si puedes.</li>
<li><strong>Una pregunta.</strong> ¿Qué dice de Dios? ¿Qué me pide a mí hoy?</li>
<li><strong>Una frase escrita.</strong> En una libreta o en el celular. Una línea basta.</li>
<li><strong>Una oración.</strong> Habla con Dios de lo que leíste y de lo que te espera hoy.</li>
<li><strong>El mismo lugar y la misma hora.</strong> La costumbre hace más que las ganas.</li>
</ol>`],
      ["Un devocional de ejemplo para hoy", `${v("LAM 3:22-23")}
<p><strong>Reflexión.</strong> Jeremías escribió esto después de ver su ciudad destruida. No lo dijo en un día bonito. Lo dijo cuando no le quedaba nada, y aun así vio que la misericordia de Dios amanecía otra vez.</p>
<p><strong>Oración.</strong> “Señor, gracias porque hoy tu misericordia es nueva. No cargo con lo de ayer. Ayúdame a vivir este día contigo. Amén.”</p>`],
      ["¿Qué versículo leer hoy?", `<p>Si no sabes por dónde empezar, estos siete sirven para una semana:</p>
<table class="t"><thead><tr><th>Día</th><th>Versículo (RV 1909)</th></tr></thead><tbody>
<tr><td>Lunes</td><td>${q("PSA 118:24")} (Salmos 118:24)</td></tr>
<tr><td>Martes</td><td>${q("PRO 3:5-6")} (Proverbios 3:5-6)</td></tr>
<tr><td>Miércoles</td><td>${q("ISA 40:31")} (Isaías 40:31)</td></tr>
<tr><td>Jueves</td><td>${q("PHI 4:13")} (Filipenses 4:13)</td></tr>
<tr><td>Viernes</td><td>${q("PSA 37:5")} (Salmos 37:5)</td></tr>
<tr><td>Sábado</td><td>${q("MAT 11:28")} (Mateo 11:28)</td></tr>
<tr><td>Domingo</td><td>${q("PSA 107:1")} (Salmos 107:1)</td></tr>
</tbody></table>`],
      ["¿Hay un devocional diario gratis en español?", `${MI_REFUGIO}
<p>La versión gratis, que no se acaba, incluye la Biblia completa para leer, la historia bíblica del día, un chat al día de hasta 5 mensajes y una declaración diaria con su versículo. No hay anuncios ni prueba gratuita.</p>`],
    ],
    faq: [
      ["¿Cuánto tiempo debe durar un devocional?", "Entre cinco y quince minutos. Es mejor un devocional corto todos los días que uno largo una vez al mes."],
      ["¿Qué Biblia usar para el devocional?", "La que entiendas y leas con gusto. Aquí citamos la Reina-Valera 1909, que es de dominio público en Estados Unidos y se puede leer, grabar y compartir libremente."],
      ["¿Es mejor hacer el devocional en la mañana o en la noche?", "Las dos sirven. En la mañana pone el día en manos de Dios; en la noche ayuda a soltar lo que pasó. Lo importante es escoger una hora y mantenerla."],
    ],
    sources: [RV_SRC, rv("Lamentaciones 3:22-23", "Lamentaciones 3:22-23 (RVES), Bible Gateway")],
    related: ["/es/preguntas/oracion-de-la-manana/", "/es/preguntas/oracion-de-la-manana-de-hoy/", "/es/preguntas/versiculos-de-fe/", "/es/chat-biblico-gratis/"],
  },
  {
    ...DES, lang: es, door: "faith", group: GM, path: "/es/preguntas/oracion-de-la-manana/",
    title: "Oración de la mañana: empezar el día con Dios · Peace Be Still",
    description: "Una oración de la mañana corta para decir al despertar, los salmos que se leen de mañana (Reina-Valera 1909) y cómo armar tu propia oración en cuatro pasos.",
    h1: "Oración de la mañana: una oración corta para empezar el día con Dios",
    indexLabel: "Oración de la mañana",
    indexNote: "Una oración corta y cómo armar la tuya en cuatro pasos.",
    definition: "Una oración de la mañana es lo primero que le dices a Dios al despertar. Puede ser así de corta: “Señor, gracias por este día. Te lo entrego. Guíame en lo que tengo que hacer y cuida a los míos. Amén.” Muchas personas la acompañan con un salmo de la mañana, como el Salmo 5:3.",
    quick: "Dale gracias por el día, entrégale lo que te espera, pide guía para una cosa concreta y termina con un versículo. Dos minutos, antes de abrir el celular.",
    bestFor: "quien quiere empezar el día orando y no sabe qué decir.",
    sections: [
      ["¿Cuál es una oración corta para la mañana?", `<p>Tres que puedes aprender de memoria:</p>
<ol>
<li><strong>Para empezar:</strong> “Buenos días, Señor. Este día es tuyo antes que mío. Úsalo como quieras. Amén.”</li>
<li><strong>Para un día pesado:</strong> “Padre, hoy me espera mucho. No lo puedo solo. Dame calma y dame fuerzas para lo que venga. Amén.”</li>
<li><strong>Por la familia:</strong> “Jesús, cuida hoy a mis hijos, a mi casa y a los que quiero, donde estén. Amén.”</li>
</ol>`],
      ["¿Qué salmo se lee en la mañana?", `<p>El Salmo 5 es una oración de la mañana. David dice que de mañana presenta su voz a Dios y espera:</p>
${v("PSA 5:3")}
<p>También se leen de mañana el Salmo 143:8 y el Salmo 90:14:</p>
${v("PSA 143:8")}`],
      ["¿Cómo empezar el día con Dios?", `<ol>
<li><strong>Gracias.</strong> Por una cosa concreta: dormiste, despertaste, hay café.</li>
<li><strong>Entrega.</strong> Nombra lo que te espera hoy y pónselo en las manos.</li>
<li><strong>Petición.</strong> Pide por una sola cosa que necesitas hoy.</li>
<li><strong>Palabra.</strong> Lee un versículo y llévatelo en la mente.</li>
</ol>
<p>Jesús mismo oraba temprano: ${q("MAR 1:35")}</p>`],
      ["Lo que esta página no promete", `<p>Orar en la mañana no garantiza un buen día. Es poner el día delante de Dios, pase lo que pase. Si hoy viene algo difícil, la oración no cambia que venga; cambia con quién lo enfrentas.</p>`],
      ["Mi Refugio en Peace Be Still", `${MI_REFUGIO}
<p>Cada mañana, Morning Word trae un versículo, una declaración para decir en voz alta y una oración corta, con un solo recordatorio suave al día como máximo, que puedes apagar.</p>`],
    ],
    faq: [
      ["¿Qué oración se dice al despertar?", "Una corta y sincera: dar gracias por el día, entregárselo a Dios y pedir guía. Muchas personas rezan también el Padre Nuestro (Mateo 6:9-13) al levantarse."],
      ["¿Hay que orar de rodillas en la mañana?", "No hace falta. Puedes orar sentada en la cama, en la cocina o camino al trabajo. Dios escucha en cualquier postura."],
      ["¿Qué versículo leer en la mañana?", `Lamentaciones 3:22-23 es uno de los favoritos: ${q("LAM 3:22-23")}`],
    ],
    sources: [RV_SRC, rv("Salmos 5", "Salmos 5 (RVES), Bible Gateway")],
    related: ["/es/preguntas/oracion-de-la-manana-de-hoy/", "/es/preguntas/devocional-diario/", "/es/preguntas/versiculos-de-fortaleza/", "/es/chat-biblico-gratis/"],
  },
  {
    ...DES, lang: es, door: "faith", group: GM, path: "/es/preguntas/oracion-de-la-manana-de-hoy/",
    title: "Oración de la mañana de hoy, y una para cada día · Peace Be Still",
    description: "La oración de la mañana para hoy, más una oración corta para cada día de la semana, cada una con su versículo de la Reina-Valera 1909 palabra por palabra.",
    h1: "Oración de la mañana de hoy, y una para cada día de la semana",
    indexLabel: "Oración de la mañana de hoy",
    indexNote: "Una oración distinta para cada día, con su versículo.",
    definition: "La oración de la mañana de hoy puede ser esta: “Señor, este es el día que tú hiciste. Me alegro en él aunque no sé lo que trae. Camina conmigo. Amén.” Sale del Salmo 118:24. Abajo tienes una oración distinta para cada día de la semana, cada una con su versículo.",
    quick: "Busca el día de hoy en la tabla, lee el versículo y di la oración en voz baja. Si te gusta, vuelve mañana por la siguiente.",
    bestFor: "quien busca cada mañana una oración nueva y corta.",
    sections: [
      ["La oración de hoy", `${v("PSA 118:24")}
<p>“Señor, este es el día que tú hiciste. Me alegro en él aunque no sé lo que trae. Camina conmigo en cada cosa que haga. Amén.”</p>`],
      ["Una oración para cada día de la semana", `<table class="t"><thead><tr><th>Día</th><th>Oración</th><th>Versículo (RV 1909)</th></tr></thead><tbody>
<tr><td>Lunes</td><td>“Señor, empiezo la semana contigo. Pon orden en lo que tengo pendiente.”</td><td>${q("PSA 37:5")} (Salmos 37:5)</td></tr>
<tr><td>Martes</td><td>“Dame sabiduría para las decisiones de hoy.”</td><td>${q("JAM 1:5")} (Santiago 1:5)</td></tr>
<tr><td>Miércoles</td><td>“Estoy cansada a mitad de semana. Renueva mis fuerzas.”</td><td>${q("ISA 40:29")} (Isaías 40:29)</td></tr>
<tr><td>Jueves</td><td>“Quita el miedo que traigo. Tú vas conmigo.”</td><td>${q("JOS 1:9")} (Josué 1:9)</td></tr>
<tr><td>Viernes</td><td>“Gracias por esta semana, con lo bueno y lo difícil.”</td><td>${q("1TH 5:18")} (1 Tesalonicenses 5:18)</td></tr>
<tr><td>Sábado</td><td>“Hoy descanso en ti. Cuida a mi familia.”</td><td>${q("MAT 11:28")} (Mateo 11:28)</td></tr>
<tr><td>Domingo</td><td>“Hoy te alabo con los míos. Que mi boca hable bien de ti.”</td><td>${q("PSA 19:14")} (Salmos 19:14)</td></tr>
</tbody></table>`],
      ["¿Cómo empezar el día con Dios?", `<p>Antes de abrir el celular, siéntate un minuto. Di la oración del día, lee el versículo una vez más y pide por una sola cosa concreta. Luego empieza. Lo que hace la diferencia es la costumbre, no las palabras perfectas.</p>`],
      ["¿Qué salmo se lee en la mañana?", `<p>El Salmo 5 (${f("PSA 5:3", "de mañana oirás mi voz")}) y el Salmo 30:5 son clásicos de la mañana:</p>
${v("PSA 30:5")}`],
      ["Mi Refugio en Peace Be Still", `${MI_REFUGIO}
<p>Su Morning Word te da cada día un versículo nuevo (a veces dos), una declaración para decir en voz alta y una oración corta, gratis.</p>`],
    ],
    faq: [
      ["¿Cuál es la oración de la mañana de hoy?", "“Señor, este es el día que tú hiciste. Me alegro en él aunque no sé lo que trae. Camina conmigo. Amén.” Está basada en el Salmo 118:24. Cada día de la semana tiene la suya en la tabla de arriba."],
      ["¿Puedo repetir la misma oración todos los días?", "Sí. Repetir una oración no la hace menos sincera. Muchas personas rezan el Padre Nuestro cada mañana desde niñas."],
      ["¿Es mejor orar en voz alta?", "Ayuda a no distraerse, pero Dios escucha igual en silencio. Un susurro sirve si hay gente durmiendo."],
    ],
    sources: [RV_SRC, rv("Salmos 118:24", "Salmos 118:24 (RVES), Bible Gateway")],
    related: ["/es/preguntas/oracion-de-la-manana/", "/es/preguntas/devocional-diario/", "/es/preguntas/versiculos-de-agradecimiento/", "/es/preguntas/oracion-de-la-noche/"],
  },
  {
    ...DES, updated: "2026-11-21", updatedText: "21 nov 2026", lang: es, door: "faith", group: GN, path: "/es/preguntas/oracion-de-la-noche/", alt: "/questions/night-prayer/",
    title: "Oración de la noche: para cerrar el día con Dios · Peace Be Still",
    description: "Una oración de la noche para cerrar el día: dar gracias, pedir perdón y entregar lo que quedó pendiente, con los salmos de la noche de la Reina-Valera 1909.",
    h1: "Oración de la noche: cómo cerrar el día con Dios",
    indexLabel: "Oración de la noche",
    indexNote: "Gracias, perdón y entrega: cerrar el día en tres pasos.",
    definition: "Una oración de la noche cierra el día delante de Dios en tres partes: dar gracias por lo bueno, pedir perdón por lo que salió mal y entregarle lo que quedó pendiente. Por ejemplo: “Señor, gracias por hoy. Perdóname lo que hice mal. Te dejo lo que no terminé. Guarda mi casa esta noche. Amén.”",
    quick: "Gracias, perdón, entrega. Tres frases y un salmo corto, como el Salmo 4:8. Luego apaga la luz sin volver a pensar en la lista.",
    bestFor: "quien quiere una oración para cerrar el día, no solo para dormirse.",
    sections: [
      ["¿Qué oración se reza por la noche?", `<p>Muchas familias rezan el Padre Nuestro antes de dormir. Otras usan una oración propia. Esta es para cerrar el día:</p>
<p>“Señor, gracias por este día, por lo que salió bien y por lo que me enseñó lo que salió mal. Perdóname donde fallé. Te entrego lo que no pude terminar. Cuida a los míos esta noche. Amén.”</p>`],
      ["¿Cómo hacer una oración por la noche?", `<ol>
<li><strong>Repasa el día un minuto.</strong> ¿Dónde viste a Dios hoy?</li>
<li><strong>Da gracias</strong> por una o dos cosas concretas.</li>
<li><strong>Pide perdón</strong> por lo que salió mal, sin darle mil vueltas.</li>
<li><strong>Entrega lo pendiente.</strong> Lo que no terminaste sigue ahí mañana.</li>
<li><strong>Termina con un versículo</strong> y apaga la luz.</li>
</ol>
${v("PSA 141:2")}`],
      ["¿Qué salmo se lee antes de dormir?", `<p>El Salmo 4, la oración de la tarde de David. Su último versículo es el más rezado al acostarse:</p>
${v("PSA 4:8")}`],
      ["¿Qué dice la Biblia sobre dormir en paz?", `<p>Que el sueño es un regalo de Dios y que se puede dormir aun en tiempos difíciles. David lo escribió huyendo de su propio hijo:</p>
${v("PSA 3:5")}`],
      ["¿Cuál es una oración corta para dormir?", `<p>“Señor, en tus manos dejo este día. Dame descanso. Amén.” Si quieres más, mira <a href="/es/preguntas/oracion-para-dormir/">oraciones para dormir</a>.</p>`],
      ["¿Qué orar si me despierto a las 3 de la mañana?", `<p>Algo corto, para que la oración no se vuelva una lista de preocupaciones: “Señor, tú estás despierto cuando yo despierto. Te entrego lo que me despertó. Cuídame hasta la mañana. Amén.”</p>
${v("PSA 63:6")}
<p>Luego vuelve a acostarte. Si algo concreto te despertó, escríbelo en un papel junto a la cama y déjalo ahí hasta la mañana. Si te despiertas de noche con frecuencia, coméntalo con tu médico.</p>`],
      ["¿Se ora a medianoche en la Biblia?", `<p>Sí. En la cárcel de Filipos, Pablo y Silas oraban y cantaban a medianoche:</p>
${v("ACT 16:25")}
<p>El 31 de diciembre muchas iglesias pasan la noche orando: mira el <a href="/es/preguntas/culto-de-fin-de-ano/">culto de fin de año</a> y el <a href="/es/preguntas/ayuno-de-21-dias/">ayuno de 21 días</a> de enero.</p>`],
      ["Mi Refugio en Peace Be Still", `${MI_REFUGIO}
<p>De noche, los Salmos se leen en susurro con la pantalla siempre oscura y un temporizador que apaga la voz poco a poco. La primera noche es gratis y luego una por semana; un plan de pago ($7.99 al mes o $39.99 al año, sin prueba) abre una cada noche.</p>`],
    ],
    faq: [
      ["¿Qué se reza antes de dormir?", "Muchas personas rezan el Padre Nuestro o una oración propia: dar gracias por el día, pedir perdón y pedir descanso. Terminar con el Salmo 4:8 es una costumbre muy antigua."],
      ["¿Está mal quedarse dormido orando?", "No. Quedarse dormido mientras hablas con Dios no es una falta. Es un buen lugar para quedarse dormido."],
      ["¿Cuánto debe durar la oración de la noche?", "Unos minutos. Si se alarga, suele convertirse en una lista de preocupaciones. Di lo importante y descansa."],
    ],
    sources: [RV_SRC, rv("Salmos 4", "Salmos 4 (RVES), Bible Gateway")],
    related: ["/es/preguntas/oracion-por-la-noche/", "/es/preguntas/oracion-para-dormir/", "/es/preguntas/salmos-para-dormir/", "/es/preguntas/salmo-4-8/"],
  },
  {
    ...DES, lang: es, door: "faith", group: GN, path: "/es/preguntas/oracion-por-la-noche/",
    title: "Oración por la noche por tu familia y tu casa · Peace Be Still",
    description: "Una oración por la noche para cubrir a tu familia: los hijos, la casa, quien está lejos y quien está enfermo, con versículos de la Reina-Valera 1909.",
    h1: "Oración por la noche: por tu familia, tu casa y los que quieres",
    indexLabel: "Oración por la noche",
    indexNote: "Orar de noche por los hijos, la casa y quien está lejos.",
    definition: "Una oración por la noche es la que haces antes de acostarte por los tuyos: tus hijos, tu casa, quien está lejos o enfermo. Por ejemplo: “Señor, cuida esta noche a mis hijos, guarda esta casa y acompaña a los que están lejos. Que todos amanezcamos en tus manos. Amén.” El Salmo 121 es el salmo de esa oración.",
    quick: "Nombra a cada persona, pide una sola cosa por cada una y termina con el Salmo 121:7-8 sobre toda la casa.",
    bestFor: "madres, padres y abuelos que oran de noche por su familia.",
    sections: [
      ["¿Qué oración se dice por la noche por la familia?", `<p>“Padre, antes de dormir te entrego a mi familia. Cuida a mis hijos en su sueño. Guarda esta casa por dentro y por fuera. Acompaña a los que están lejos y a los que están enfermos. Danos paz a todos. Amén.”</p>
${v("PSA 121:7-8")}`],
      ["Oraciones cortas por cada persona", `<ul>
<li><strong>Por un hijo:</strong> “Señor, guarda su mente y su corazón esta noche.”</li>
<li><strong>Por quien está lejos:</strong> “Dios, tú estás donde yo no puedo estar. Cuídalo.”</li>
<li><strong>Por un enfermo:</strong> “Señor, dale descanso y alivio esta noche, y a quienes lo cuidan.”</li>
<li><strong>Por la casa:</strong> “Que esta casa sea un lugar de paz.”</li>
</ul>`],
      ["¿Cómo hacer una oración por la noche en familia?", `<ol>
<li>Que cada uno diga una cosa por la que da gracias.</li>
<li>Que cada uno nombre a una persona por quien orar.</li>
<li>Terminen juntos con el mismo versículo todas las noches.</li>
<li>Cinco minutos bastan. Si se hace pesado, nadie quiere repetir.</li>
</ol>
${v("NUM 6:24-26")}`],
      ["¿Qué salmo se lee antes de dormir?", `<p>Para la familia, el Salmo 121, que habla del que ${f("PSA 121:4", "no se adormecerá ni dormirá")}. Para uno mismo, el Salmo 4. Mira <a href="/es/preguntas/salmos-para-dormir/">salmos para dormir</a>.</p>`],
      ["Mi Refugio en Peace Be Still", `${MI_REFUGIO}
<p>La historia bíblica del día se puede escuchar en familia antes de dormir, gratis. El chat no está disponible para menores de 13 años.</p>`],
    ],
    faq: [
      ["¿Qué salmo se reza para proteger la casa de noche?", `Muchas familias rezan el Salmo 91 o el Salmo 121. El 121 termina así: ${q("PSA 121:8")}`],
      ["¿Qué es la bendición de Números 6?", `Es la bendición que Aarón decía sobre el pueblo, y muchos padres la dicen sobre sus hijos de noche: ${q("NUM 6:24-26")}`],
      ["¿Puedo orar por alguien sin decirle?", "Sí. Orar por otros en silencio es una costumbre muy antigua entre cristianos. Dios escucha aunque la otra persona no lo sepa."],
    ],
    sources: [RV_SRC, rv("Salmos 121", "Salmos 121 (RVES), Bible Gateway")],
    related: ["/es/preguntas/oracion-de-la-noche/", "/es/preguntas/oracion-para-dormir-en-paz/", "/es/preguntas/salmo-91-reina-valera/", "/es/preguntas/salmos-para-dormir/"],
  },
  {
    ...DES, lang: es, door: "faith", group: GN, path: "/es/preguntas/oracion-para-dormir/", alt: "/questions/prayer-for-sleep/",
    title: "Oración para dormir: oraciones cortas · Peace Be Still",
    description: "Oraciones cortas para dormir que puedes decir acostada, con los versículos de la Reina-Valera 1909 en que se apoyan, y qué hacer cuando la mente no para.",
    h1: "Oración para dormir: oraciones cortas para decir acostado",
    indexLabel: "Oración para dormir",
    indexNote: "Tres oraciones cortas y qué hacer si la mente no para.",
    definition: "Una oración para dormir es una oración corta que dices ya acostada, para entregarle a Dios el día y descansar. Por ejemplo: “Señor, ya me acuesto. Te dejo lo de hoy. Dame descanso. Amén.” Termina con el Salmo 4:8 y apaga la luz.",
    quick: "Corta, sencilla y repetible: dale gracias por una cosa, entrégale una preocupación y pide descanso. Si la mente sigue corriendo, repite la misma frase en vez de empezar otra.",
    bestFor: "quien está acostado sin poder dormir y quiere palabras sencillas para orar.",
    sections: [
      ["¿Cuál es una oración corta para dormir?", `<ol>
<li>“Señor, ya me acuesto. Te dejo lo de hoy. Dame descanso. Amén.”</li>
<li>“Padre, tengo miedo de lo de mañana. Tú estás despierto mientras duermo. Guárdame. Amén.”</li>
<li>“Jesús, tú dijiste: vengan a mí los cansados. Aquí estoy. Amén.”</li>
</ol>
${v("MAT 11:28")}`],
      ["¿Qué salmo se lee antes de dormir?", `<p>El Salmo 4. Su último versículo es una oración para dormir en sí misma:</p>
${v("PSA 4:8")}`],
      ["¿Qué dice la Biblia sobre dormir en paz?", `<p>Proverbios lo promete a quien camina con sabiduría:</p>
${v("PRO 3:24")}`],
      ["Cuando la mente no para", `<ul>
<li>Repite una sola frase al soltar el aire, despacio.</li>
<li>Nombra la preocupación una vez y no la sigas discutiendo. Ya se la dijiste a Dios.</li>
<li>Si te acuerdas de algo pendiente, anótalo en un papel junto a la cama.</li>
<li>Si prefieres escuchar, pon un salmo leído en voz baja con temporizador.</li>
</ul>`],
      ["Si te despiertas a media noche", `<p>No prendas el celular. Quédate acostado y di despacio el Salmo 63:6, que David escribió pensando en Dios desde su cama:</p>
${v("PSA 63:6")}
<p>Luego una frase sola: “Señor, aquí sigo. Tú también.” Y vuelve a intentar dormir sin pelear con la hora.</p>`],
      ["¿Hay salmos en audio para dormir sin anuncios?", `${MI_REFUGIO}
<p>Los Salmos se leen en susurro, sin anuncios, con la pantalla siempre oscura y un temporizador. La primera noche es gratis y luego una por semana.</p>`],
    ],
    faq: [
      ["¿Qué oración rezar para dormir rápido?", "Ninguna oración es una pastilla para dormir. Una oración corta y repetida ayuda a soltar el día. Si no duermes bien por semanas, habla también con un médico."],
      ["¿Puedo dormirme escuchando la Biblia?", "Sí. Muchas personas ponen un salmo leído en voz baja con un temporizador para que se apague solo. Deja la pantalla oscura y quita la reproducción automática."],
      ["¿Qué versículo decir antes de dormir?", `El Salmo 4:8 es el más conocido: ${q("PSA 4:8")}`],
    ],
    sources: [RV_SRC, rv("Proverbios 3:24", "Proverbios 3:24 (RVES), Bible Gateway")],
    related: ["/es/preguntas/oracion-para-dormir-en-paz/", "/es/preguntas/oracion-de-la-noche/", "/es/preguntas/salmos-para-dormir/", "/es/preguntas/salmo-4-8/"],
  },
  {
    ...DES, lang: es, door: "faith", group: GN, path: "/es/preguntas/oracion-para-dormir-en-paz/",
    title: "Oración para dormir en paz sin preocupación · Peace Be Still",
    description: "Una oración para dormir en paz cuando la preocupación o el miedo no te dejan descansar, con Filipenses 4:6-7, Juan 14:27 y Salmo 91:5 (Reina-Valera 1909).",
    h1: "Oración para dormir en paz cuando la preocupación no te deja",
    indexLabel: "Oración para dormir en paz",
    indexNote: "Para la noche en que el miedo o la preocupación no te dejan.",
    definition: "Una oración para dormir en paz es para la noche en que la preocupación no te deja: le dices a Dios lo que te pesa, le pides su paz y te acuestas en ella. Por ejemplo: “Señor, me preocupa esto. No lo puedo resolver esta noche. Dame tu paz y guarda mi corazón. Amén.” Así lo pide Filipenses 4:6-7.",
    quick: `Lee Filipenses 4:6-7, nombra la preocupación una sola vez, da gracias por algo y acuéstate repitiendo: ${f("JOH 14:27", "No se turbe vuestro corazón, ni tenga miedo")}.`,
    bestFor: "quien no puede dormir por miedo o preocupación y busca la paz de Dios, no un truco.",
    sections: [
      ["¿Qué oración me ayuda a dormir en paz?", `<p>“Señor, esta noche me preocupa (dilo con nombre). No lo puedo arreglar desde esta cama. Te lo entrego hasta mañana. Gracias porque estás conmigo. Dame tu paz, la que no se entiende, y guarda mi corazón. Amén.”</p>
${v("PHI 4:6-7")}`],
      ["Versículos para cuando hay miedo de noche", `${v("PSA 91:5")}
${v("JOH 14:27")}
${v("ISA 26:3")}`],
      ["¿Qué dice la Biblia sobre dormir en paz?", `<p>Que la paz no depende de que todo esté resuelto. Jesús durmió en la barca en medio de la tormenta (Marcos 4:38), y David durmió huyendo. La paz que promete la Biblia es estar en manos de Dios, no tener todo arreglado.</p>
${v("PSA 4:8")}`],
      ["¿Cuál es una oración corta para dormir?", `<p>“Echo en ti mi preocupación, porque tú cuidas de mí.” Viene de 1 Pedro 5:7: ${q("1PE 5:7")}</p>`],
      ["Cuándo pedir más ayuda", `<p>La oración consuela, pero no reemplaza la atención médica. Si la preocupación o la falta de sueño duran semanas, habla con un médico. Si piensas en hacerte daño, llama o escribe al 988 (oprime 2 para español).</p>`],
      ["Mi Refugio en Peace Be Still", `${MI_REFUGIO}
<p>Si en el chat escribes algo sobre hacerte daño, la app no lo manda a la IA: te muestra el 988 y otras ayudas de inmediato.</p>`],
    ],
    faq: [
      ["¿Qué salmo leer para dormir tranquilo?", `El Salmo 4 y el Salmo 91. El 91 dice: ${q("PSA 91:5")}`],
      ["¿Cómo dejar la preocupación en manos de Dios?", "Dila una vez, con nombre, en oración. Da gracias por algo. Luego, cada vez que vuelva, en vez de pensarla otra vez, repite un versículo como 1 Pedro 5:7."],
      ["¿Es pecado preocuparse?", "La Biblia no condena sentir preocupación; invita a llevarla a Dios. Filipenses 4:6 dice que presentemos nuestras peticiones con oración y acción de gracias."],
    ],
    sources: [RV_SRC, rv("Filipenses 4:6-7", "Filipenses 4:6-7 (RVES), Bible Gateway"), ["988 Lifeline en español", "https://988lifeline.org/es/"]],
    related: ["/es/preguntas/oracion-para-dormir/", "/es/preguntas/oracion-por-la-noche/", "/es/preguntas/salmo-91-reina-valera/", "/es/preguntas/versiculos-de-fortaleza/"],
  },
  {
    ...DES, lang: es, door: "faith", group: GS, path: "/es/preguntas/salmo-4-8/",
    title: "Salmo 4:8: “En paz me acostaré” (RV 1909) · Peace Be Still",
    description: "Qué dice el Salmo 4:8 en la Reina-Valera 1909, qué significa, el Salmo 4 completo y cómo orarlo antes de dormir esta noche.",
    h1: "Salmo 4:8: qué dice y cómo orarlo antes de dormir",
    indexLabel: "Salmo 4:8",
    indexNote: "El versículo, el Salmo 4 completo y cómo orarlo.",
    definition: `El Salmo 4:8 dice en la Reina-Valera 1909: ${q("PSA 4:8")} Es el último versículo de una oración de David para la noche, y por eso es el versículo más rezado al acostarse.`,
    quick: "Léelo despacio dos veces, ya acostado. Luego dilo con tus palabras: “Señor, me acuesto tranquilo porque tú me cuidas.” Si te despiertas, vuelve a él.",
    bestFor: "quien buscó el Salmo 4:8 y quiere entenderlo y usarlo esta noche.",
    sections: [
      ["¿Qué significa el Salmo 4:8?", `<p>David dice dos cosas: que se va a acostar en paz y que va a dormir. Y da la razón: no es que todo esté bien, es que “solo tú, Jehová” lo hace estar confiado. La paz viene de quién lo cuida, no de cómo está su vida.</p>`],
      ["El Salmo 4 completo", `${P("PSA 4:1-8", es)}`],
      ["¿Qué salmos leer para dormir?", `<p>Además del 4, los más leídos de noche son el 3, el 23, el 91 y el 127. Mira <a href="/es/preguntas/salmos-para-dormir/">salmos para dormir</a>.</p>`],
      ["¿Cuál es la diferencia entre el Salmo 91 y el Salmo 23?", `<p>El 23 es un salmo de confianza en el pastor que cuida y guía. El 91 es un salmo de refugio y protección ante el peligro. Mira los dos completos en <a href="/es/preguntas/salmo-91-salmo-23/">Salmo 91 y Salmo 23</a>.</p>`],
      ["Cómo orar el Salmo 4:8 esta noche", `<ol>
<li>Apaga las pantallas.</li>
<li>Lee el Salmo 4 completo una vez.</li>
<li>Quédate solo con el versículo 8 y repítelo despacio.</li>
<li>Dilo con tus palabras y suelta el día.</li>
</ol>`],
      ["Mi Refugio en Peace Be Still", `${MI_REFUGIO}`],
    ],
    faq: [
      ["¿Dónde está “En paz me acostaré, y asimismo dormiré”?", "En el Salmo 4, versículo 8, al final de una oración de David para la noche."],
      ["¿Qué quiere decir “me harás estar confiado”?", "Que Dios le da seguridad. En la Reina-Valera 1909, “confiado” aquí significa seguro, sin temor. La paz de David viene de que Dios lo guarda."],
      ["¿El Salmo 4:8 es igual en la RVR1960?", "Es muy parecido. Aquí citamos la Reina-Valera 1909, que es de dominio público en Estados Unidos; la RVR1960 tiene derechos de autor."],
    ],
    sources: [RV_SRC, rv("Salmos 4", "Salmos 4 (RVES), Bible Gateway")],
    related: ["/es/preguntas/salmos-para-dormir/", "/es/preguntas/oracion-para-dormir/", "/es/preguntas/salmo-91-salmo-23/", "/es/preguntas/oracion-de-la-noche/"],
  },
  {
    ...DES, lang: es, door: "faith", group: GS, path: "/es/preguntas/salmo-91-salmo-23/",
    title: "Salmo 91 y Salmo 23 completos, juntos (RV 1909) · Peace Be Still",
    description: "El Salmo 91 y el Salmo 23 completos en la Reina-Valera 1909, uno junto al otro, con la diferencia entre los dos y cuándo leer cada uno.",
    h1: "Salmo 91 y Salmo 23 completos, uno junto al otro",
    indexLabel: "Salmo 91 y Salmo 23",
    indexNote: "Los dos salmos completos y en qué se diferencian.",
    definition: "El Salmo 23 es el salmo del pastor: Dios guía, cuida y acompaña aun en el valle de sombra de muerte. El Salmo 91 es el salmo del refugio: quien habita al abrigo del Altísimo está protegido del peligro. Aquí están los dos completos en la Reina-Valera 1909, para leerlos juntos.",
    quick: "Lee el 23 cuando necesites compañía y guía; el 91 cuando tengas miedo o necesites protección. Muchas personas los leen juntos de noche: primero el 23, luego el 91.",
    bestFor: "quien quiere leer los dos salmos completos sin buscar en dos lugares.",
    sections: [
      ["¿Cuál es la diferencia entre el Salmo 91 y el Salmo 23?", `<table class="t"><thead><tr><th></th><th>Salmo 23</th><th>Salmo 91</th></tr></thead><tbody>
<tr><td>Imagen</td><td>Un pastor y sus ovejas</td><td>Un refugio, un castillo, unas alas</td></tr>
<tr><td>Tema</td><td>Cuidado, guía y compañía</td><td>Protección en el peligro</td></tr>
<tr><td>Largo</td><td>6 versículos</td><td>16 versículos</td></tr>
<tr><td>Se lee</td><td>En duelo, en funerales, para descansar</td><td>Con miedo, de noche, en tiempos de peligro</td></tr>
</tbody></table>`],
      ["Salmo 23 completo (Reina-Valera 1909)", `${P("PSA 23:1-6", es)}`],
      ["Salmo 91 completo (Reina-Valera 1909)", `${P("PSA 91:1-16", es)}`],
      ["¿Para qué sirve orar el Salmo 91?", `<p>Para poner tus miedos delante de Dios con palabras de la Biblia. No es un amuleto ni una fórmula que garantiza que nada malo pase. Es una oración de confianza: ${f("PSA 91:2", "mi Dios, en él confiaré")}.</p>`],
      ["¿Qué salmos leer para dormir?", `<p>Estos dos, y también el 4 y el 121. Mira <a href="/es/preguntas/salmos-para-dormir/">salmos para dormir</a>.</p>
${NOTA_RV}`],
      ["Mi Refugio en Peace Be Still", `${MI_REFUGIO}
<p>El Salmo 23 y el Salmo 91 se pueden escuchar en susurro antes de dormir, con temporizador y sin anuncios.</p>`],
    ],
    faq: [
      ["¿Se pueden leer juntos el Salmo 91 y el Salmo 23?", "Sí. Muchas personas los leen juntos de noche: el 23 para descansar en el cuidado de Dios y el 91 para entregar los miedos. No hay un orden obligatorio."],
      ["¿Cuál es más fuerte, el Salmo 91 o el 23?", "Ninguno es más fuerte que otro. Los dos son palabra de Dios y hablan de cosas distintas: el 23 de cuidado, el 91 de protección."],
      ["¿Qué dice el Salmo 23:4?", `${q("PSA 23:4")}`],
    ],
    sources: [RV_SRC, rv("Salmos 23", "Salmos 23 (RVES), Bible Gateway"), rv("Salmos 91", "Salmos 91 (RVES), Bible Gateway")],
    related: ["/es/preguntas/salmo-91-reina-valera/", "/es/preguntas/salmos-para-dormir/", "/es/preguntas/salmo-4-8/", "/es/preguntas/oracion-por-la-noche/"],
  },
  {
    ...DES, lang: es, door: "faith", group: GS, path: "/es/preguntas/salmo-91-reina-valera/",
    title: "Salmo 91 Reina-Valera 1909: texto completo · Peace Be Still",
    description: "El Salmo 91 completo en la Reina-Valera 1909, palabra por palabra, con su ortografía original, qué cambia frente a la RVR1960 y cómo escucharlo en audio.",
    h1: "El Salmo 91 en la Reina-Valera 1909, completo",
    indexLabel: "Salmo 91 Reina-Valera",
    indexNote: "El texto completo de 1909 y en qué se diferencia de la 1960.",
    definition: `El Salmo 91 en la Reina-Valera 1909 empieza: ${q("PSA 91:1")} Tiene 16 versículos y habla de Dios como refugio y castillo. Abajo está completo, palabra por palabra, con la ortografía original de 1909.`,
    quick: "Abajo tienes los 16 versículos. La Reina-Valera 1909 es de dominio público en Estados Unidos, así que puedes copiarla, imprimirla o grabarla libremente.",
    bestFor: "quien busca el Salmo 91 exacto en la Reina-Valera, para leerlo, imprimirlo o memorizarlo.",
    sections: [
      ["¿Qué dice el Salmo 91 completo?", `${P("PSA 91:1-16", es)}`],
      ["¿En qué cambia la Reina-Valera 1909 de la 1960?", `<ul>
<li><strong>Ortografía:</strong> la 1909 escribe “á” con tilde (“á Jehová”) y “fué”, como se escribía entonces.</li>
<li><strong>Algunas palabras:</strong> por ejemplo, en el versículo 13 la 1909 dice ${f("PSA 91:13", "basilisco")}.</li>
<li><strong>Derechos:</strong> la 1909 es de dominio público en Estados Unidos; la RVR1960 tiene derechos de autor.</li>
</ul>`],
      ["¿Para qué sirve orar el Salmo 91?", `<p>Para llevar tus miedos a Dios con sus propias palabras. Es una oración de confianza, no una garantía de que nada malo pase. Jesús mismo, cuando el diablo citó este salmo (Mateo 4:6), se negó a usarlo para poner a prueba a Dios.</p>`],
      ["¿Cuál es la diferencia entre el Salmo 91 y el Salmo 23?", `<p>El 91 habla de protección en el peligro; el 23, del pastor que cuida y guía. Míralos juntos en <a href="/es/preguntas/salmo-91-salmo-23/">Salmo 91 y Salmo 23</a>.</p>`],
      ["¿Dónde escuchar el Salmo 91 en audio?", `${MI_REFUGIO}
<p>El Salmo 91 se puede escuchar en susurro, con la Reina-Valera 1909 palabra por palabra, la pantalla siempre oscura y un temporizador. Sin anuncios.</p>
${NOTA_RV}`],
    ],
    faq: [
      ["¿Cuántos versículos tiene el Salmo 91?", "Dieciséis. Empieza con el que habita al abrigo del Altísimo y termina con la promesa de larga vida y salvación."],
      ["¿Qué dice el Salmo 91:11?", `${q("PSA 91:11")}`],
      ["¿Puedo imprimir el Salmo 91 de la Reina-Valera 1909?", "Sí. La Reina-Valera 1909 es de dominio público en Estados Unidos, así que se puede copiar, imprimir y compartir libremente."],
    ],
    sources: [RV_SRC, rv("Salmos 91", "Salmos 91 (RVES), Bible Gateway")],
    related: ["/es/preguntas/salmo-91-salmo-23/", "/es/preguntas/salmos-para-dormir/", "/es/preguntas/oracion-para-dormir-en-paz/", "/es/chat-biblico-gratis/"],
  },
  {
    ...DES, lang: es, door: "faith", group: GS, path: "/es/preguntas/salmos-para-dormir/", alt: "/questions/psalms-for-sleep/",
    title: "Salmos para dormir: 5 salmos (Reina-Valera 1909) · Peace Be Still",
    description: "Cinco salmos que se leen o escuchan antes de dormir, citados de la Reina-Valera 1909, qué dice la Biblia sobre dormir en paz y cómo usarlos esta noche.",
    h1: "Salmos para dormir: 5 salmos para leer o escuchar esta noche",
    indexLabel: "Salmos para dormir",
    indexNote: "Cinco salmos para la noche, con su versículo, y cómo usarlos.",
    definition: "Los Salmos para dormir son salmos que se leen o escuchan antes de acostarse porque hablan de descanso, refugio y confianza en Dios. Los más usados son el Salmo 4, el 3, el 23, el 91 y el 127. Muchas personas escuchan un solo salmo leído despacio o en susurro, con un temporizador, para que la Palabra sea lo último que oyen.",
    quick: `Empieza con el Salmo 4: su último versículo dice ${f("PSA 4:8", "En paz me acostaré, y asimismo dormiré")}. Luego prueba el Salmo 23 o el 91. Lee o escucha un solo salmo, despacio y con poca luz.`,
    bestFor: "quien quiere una lista corta de salmos para la noche, citados con exactitud, y una forma sencilla de usarlos.",
    sections: [
      ["¿Qué salmos leer para dormir?", `<p>Estos cinco son los que más se leen de noche, cada uno con un versículo de la Reina-Valera 1909:</p>
<table class="t"><thead><tr><th>Salmo</th><th>De qué trata</th><th>Versículo (RV 1909)</th></tr></thead><tbody>
<tr><td>Salmo 4</td><td>Paz al final del día</td><td>${q("PSA 4:8")} (4:8)</td></tr>
<tr><td>Salmo 3</td><td>Descanso en medio de la angustia</td><td>${q("PSA 3:5")} (3:5)</td></tr>
<tr><td>Salmo 23</td><td>El pastor que lleva a aguas de reposo</td><td>${q("PSA 23:2")} (23:2)</td></tr>
<tr><td>Salmo 91</td><td>Refugio y protección</td><td>${q("PSA 91:1")} (91:1)</td></tr>
<tr><td>Salmo 127</td><td>Soltar la preocupación</td><td>${q("PSA 127:2")} (127:2)</td></tr>
</tbody></table>
${NOTA_RV}`],
      ["¿Qué salmo se lee antes de dormir?", `<p>El Salmo 4 es el salmo tradicional de la noche. David le pide a Dios que lo escuche y termina acostándose en paz. Si solo vas a leer uno, que sea este. Mira el <a href="/es/preguntas/salmo-4-8/">Salmo 4 completo</a>.</p>`],
      ["¿Qué dice la Biblia sobre dormir en paz?", `<p>Que el sueño es un regalo y no un premio por terminar todo. El Salmo 127 dice que de nada sirve desvelarse con preocupación:</p>
${v("PSA 127:2")}`],
      ["¿Cómo usar los Salmos para dormir?", `<ol>
<li>Elige un solo salmo para la noche.</li>
<li>Léelo despacio, en voz alta o en silencio, o escúchalo leído en voz baja.</li>
<li>Quédate con el versículo que más te hable y repítelo al acostarte.</li>
<li>Si lo escuchas, usa un temporizador para que el audio se apague solo y no siga nada después.</li>
</ol>`],
      ["¿Cuál es una oración corta para dormir?", `<p>Ora el Salmo 4:8 con tus palabras: “Señor, ya me acuesto. Confío en que tú me cuidas esta noche.” Mira más <a href="/es/preguntas/oracion-para-dormir/">oraciones para dormir</a>.</p>`],
      ["¿Hay una Biblia en español para dormir?", `<p>Sí. Muchas personas escuchan la Biblia en español leída despacio para dormir, sobre todo los Salmos y los Evangelios. La Reina-Valera 1909 es de dominio público en Estados Unidos, así que se puede leer, grabar y compartir libremente.</p>
${v("PSA 91:2")}`],
      ["¿Qué hará Peace Be Still?", `<p>Peace Be Still es una app {{stores.tag}}. Su camino <strong>Mi Refugio · Biblia y Chat en Español</strong> trae todo en español: chat bíblico, historias y Salmos susurrados para dormir, con la Reina-Valera 1909 palabra por palabra. La pantalla siempre está oscura y un temporizador apaga la voz poco a poco. La primera noche es gratis y luego una por semana; un plan de pago cuesta $7.99 al mes o $39.99 al año, sin prueba.</p>`],
    ],
    faq: [
      ["¿Qué salmo leer para dormir tranquilo?", `El Salmo 4 es el salmo tradicional de la noche. Su último versículo dice: ${q("PSA 4:8")} Después del 4, los más leídos de noche son el Salmo 23 y el Salmo 91.`],
      ["¿Qué dice el Salmo 91 para la noche?", `El Salmo 91 habla de refugio. También dice que no temerás ${f("PSA 91:5", "de espanto nocturno")}. Por eso muchas personas lo leen o lo escuchan antes de dormir.`],
      ["¿Puedo escuchar la Biblia mientras duermo?", "Sí. Muchas personas ponen un salmo leído despacio o en susurro con un temporizador, para que el audio se apague solo. Deja la pantalla oscura y quita la reproducción automática para que no empiece nada nuevo."],
      ["¿Qué versión de la Biblia se usa aquí?", "La Reina-Valera 1909, de dominio público en Estados Unidos, citada palabra por palabra con libro, capítulo y versículo. Se respeta su ortografía original, como “á” y “fué”."],
    ],
    sources: [RV_SRC],
    related: ["/es/preguntas/salmo-4-8/", "/es/preguntas/salmo-91-salmo-23/", "/es/preguntas/oracion-para-dormir/", "/es/chat-biblico-gratis/"],
  },
  {
    ...DES, lang: es, door: "faith", group: GV, path: "/es/preguntas/versiculos-de-agradecimiento/",
    title: "Versículos de agradecimiento (Reina-Valera 1909) · Peace Be Still",
    description: "Versículos de agradecimiento a Dios en la Reina-Valera 1909, palabra por palabra: para dar gracias en todo, en la mesa, en un día difícil y en familia.",
    h1: "Versículos de agradecimiento: para dar gracias a Dios en todo",
    indexLabel: "Versículos de agradecimiento",
    indexNote: "Para dar gracias en la mesa, en familia y en un día difícil.",
    definition: `Los versículos de agradecimiento más conocidos son 1 Tesalonicenses 5:18, el Salmo 107:1, el Salmo 100:4 y Colosenses 3:17. El más citado es ${q("1TH 5:18")} Dar gracias “en todo” no es dar gracias por todo lo malo, sino seguir agradeciendo en medio de todo.`,
    quick: "Para hoy: lee el Salmo 103:2 y escribe tres cosas concretas por las que das gracias. Para la mesa: el Salmo 107:1. Para un día difícil: 1 Tesalonicenses 5:18.",
    bestFor: "quien busca versículos para dar gracias, para una tarjeta, una oración o la mesa familiar.",
    sections: [
      ["Versículos para dar gracias en todo", `${v("1TH 5:18")}
${v("EPH 5:20")}
${v("COL 3:17")}`],
      ["Versículos para la mesa y la familia", `${v("PSA 107:1")}
${v("PSA 100:4")}`],
      ["Versículos para cuando cuesta dar gracias", `<p>El agradecimiento en la Biblia muchas veces nace en tiempos duros. David escribió este salmo cuando fingió locura para salvar su vida:</p>
<p>${f("PSA 34:1", "BENDECIRÉ á Jehová en todo tiempo; su alabanza será siempre en mi boca")} (Salmos 34:1)</p>
${v("PSA 28:7")}`],
      ["¿Cuál es el versículo más poderoso de la Biblia?", `<p>No hay uno oficial. Muchos cristianos responden con Juan 3:16, porque resume el evangelio:</p>
${v("JOH 3:16")}`],
      ["¿Qué versículo leer cuando estoy triste?", `<p>Para un día triste, el Salmo 30:5 recuerda que el llanto no es para siempre: ${q("PSA 30:5")}</p>`],
      ["¿Dónde encuentro versículos de la Reina-Valera 1909?", `<p>En eBible.org, que publica el texto completo de dominio público, y en Bible Gateway (versión RVES). Todos los versículos de esta página se pegan de una copia guardada de la Reina-Valera 1909.</p>
${MI_REFUGIO}`],
    ],
    faq: [
      ["¿Qué dice la Biblia sobre ser agradecido?", "Que demos gracias en todo (1 Tesalonicenses 5:18), siempre y por todo (Efesios 5:20), y que entremos a la presencia de Dios con reconocimiento (Salmo 100:4)."],
      ["¿Qué versículo poner en una tarjeta de agradecimiento?", `El Salmo 107:1 es corto y conocido: ${q("PSA 107:1")}`],
      ["¿Cómo agradecer a Dios por un día?", "Nombra tres cosas concretas del día, aunque sean pequeñas, y dale gracias por cada una. Termina con el Salmo 103:2: no olvides ninguno de sus beneficios."],
    ],
    sources: [RV_SRC, rv("1 Tesalonicenses 5:18", "1 Tesalonicenses 5:18 (RVES), Bible Gateway")],
    related: ["/es/preguntas/versiculos-de-fe/", "/es/preguntas/versiculos-de-fortaleza/", "/es/preguntas/devocional-diario/", "/es/preguntas/oracion-de-la-manana-de-hoy/"],
  },
  {
    ...DES, lang: es, door: "faith", group: GV, path: "/es/preguntas/versiculos-de-fortaleza/",
    title: "Versículos de fortaleza para el cansancio · Peace Be Still",
    description: "Versículos de fortaleza en la Reina-Valera 1909 para cuando estás cansado, débil o con miedo: Isaías 40:29-31, Filipenses 4:13, Josué 1:9 y más.",
    h1: "Versículos de fortaleza para cuando estás cansado o débil",
    indexLabel: "Versículos de fortaleza",
    indexNote: "Para el cansancio, la debilidad y el miedo.",
    definition: `Los versículos de fortaleza más leídos son Isaías 40:29-31, Filipenses 4:13, Josué 1:9, Nehemías 8:10 y 2 Corintios 12:9. Para cuando estás cansado, Isaías 40:29 es directo: ${q("ISA 40:29")} La fuerza que promete la Biblia viene de Dios, no de aguantar sola.`,
    quick: "Si estás agotado, Isaías 40:29-31. Si tienes miedo, Josué 1:9. Si te sientes débil, 2 Corintios 12:9. Lee uno solo y llévalo contigo todo el día.",
    bestFor: "quien está cansado, débil o con miedo y busca un versículo que le dé fuerzas.",
    sections: [
      ["Versículos para cuando estás cansado", `${v("ISA 40:31")}
${v("MAT 11:28")}`],
      ["Versículos para cuando tienes miedo", `${v("JOS 1:9")}
${v("ISA 41:10")}
${v("2TI 1:7")}`],
      ["Versículos para cuando te sientes débil", `${v("2CO 12:9")}
${v("PHI 4:13")}
<p>Nehemías 8:10 lo dice en pocas palabras: ${f("NEH 8:10", "el gozo de Jehová es vuestra fortaleza")}.</p>`],
      ["¿Qué versículo leer cuando estoy triste?", `${v("JOH 16:33")}`],
      ["¿Cuál es el versículo más poderoso de la Biblia?", `<p>Para muchos que buscan fuerza, es Filipenses 4:13. Pero ojo: Pablo lo escribió hablando de aprender a vivir con poco o con mucho. No promete que podrás lograr cualquier meta; promete que Cristo te sostiene en cualquier situación.</p>`],
      ["¿Dónde encuentro versículos de la Reina-Valera 1909?", `${MI_REFUGIO}
<p>En el chat puedes decir lo que estás cargando y recibir versículos de la Reina-Valera 1909 pegados palabra por palabra. El chat es IA y lo dice en cada respuesta.</p>`],
    ],
    faq: [
      ["¿Qué versículo da fuerzas?", `Isaías 40:31 es uno de los más queridos: ${q("ISA 40:31")}`],
      ["¿Qué dice Filipenses 4:13 en la Reina-Valera 1909?", `${q("PHI 4:13")} En contexto, Pablo habla de estar contento en la escasez y en la abundancia (Filipenses 4:11-12).`],
      ["¿Qué versículo leer en un día difícil?", "Josué 1:9 para el miedo, Isaías 40:29 para el cansancio y Juan 16:33 para cuando el mundo pesa."],
    ],
    sources: [RV_SRC, rv("Isaías 40:28-31", "Isaías 40:28-31 (RVES), Bible Gateway")],
    related: ["/es/preguntas/versiculos-de-fe/", "/es/preguntas/versiculos-de-agradecimiento/", "/es/preguntas/oracion-para-dormir-en-paz/", "/es/chat-biblico-gratis/"],
  },
  {
    ...DES, lang: es, door: "faith", group: GV, path: "/es/preguntas/versiculos-de-fe/",
    title: "Versículos de fe en la Reina-Valera 1909 · Peace Be Still",
    description: "Versículos de fe en la Reina-Valera 1909: qué es la fe (Hebreos 11:1), cómo crece (Romanos 10:17), la fe como un grano de mostaza y la fe en tiempos difíciles.",
    h1: "Versículos de fe: qué es, cómo crece y cómo se vive",
    indexLabel: "Versículos de fe",
    indexNote: "Qué es la fe, cómo crece y cómo se vive, verso por verso.",
    definition: `La Biblia define la fe en Hebreos 11:1: ${q("HEB 11:1")} Otros versículos de fe muy leídos son Romanos 10:17, Marcos 11:22, Mateo 17:20 y Proverbios 3:5-6. Juntos dicen qué es la fe, de dónde viene y cómo se vive.`,
    quick: "Qué es la fe: Hebreos 11:1. De dónde viene: Romanos 10:17. Cuánta hace falta: Mateo 17:20. Cómo se vive: Proverbios 3:5-6.",
    bestFor: "quien busca versículos sobre la fe para estudiar, compartir o memorizar.",
    sections: [
      ["¿Qué es la fe según la Biblia?", `${v("HEB 11:1")}
${v("HEB 11:6")}`],
      ["¿Cómo crece la fe?", `<p>Pablo dice que la fe nace de oír la palabra de Dios. Por eso leerla y escucharla todos los días importa:</p>
${v("ROM 10:17")}`],
      ["¿Cuánta fe hace falta?", `<p>Jesús dijo que basta una fe pequeña como un grano de mostaza, una de las semillas más pequeñas que conocían:</p>
${v("MAT 17:20")}`],
      ["Versículos para vivir por fe", `${v("PRO 3:5-6")}
${v("GAL 2:20")}`],
      ["¿Qué versículos leer para dormir?", `<p>Para la noche, la fe se vuelve confianza: ${q("PSA 4:8")} Mira <a href="/es/preguntas/salmos-para-dormir/">salmos para dormir</a>.</p>`],
      ["¿Dónde encuentro versículos de la Reina-Valera 1909?", `${MI_REFUGIO}`],
    ],
    faq: [
      ["¿Cuál es el versículo más conocido sobre la fe?", "Hebreos 11:1, que define la fe como la sustancia de lo que se espera y la demostración de lo que no se ve. Todo el capítulo 11 de Hebreos cuenta historias de fe."],
      ["¿Qué dice la Biblia de la fe como un grano de mostaza?", "En Mateo 17:20 Jesús dice que con una fe como un grano de mostaza nada será imposible. El punto no es el tamaño de la fe, sino en quién está puesta."],
      ["¿Qué versículo de fe compartir con alguien que sufre?", `Proverbios 3:5-6 invita a confiar sin entenderlo todo: ${q("PRO 3:5-6")}`],
    ],
    sources: [RV_SRC, rv("Hebreos 11", "Hebreos 11 (RVES), Bible Gateway")],
    related: ["/es/preguntas/versiculos-de-fortaleza/", "/es/preguntas/versiculos-de-agradecimiento/", "/es/preguntas/versiculos-para-jovenes/", "/es/preguntas/devocional-diario/"],
  },
  {
    ...DES, lang: es, door: "faith", group: GV, path: "/es/preguntas/versiculos-para-jovenes/",
    title: "Versículos para jóvenes (Reina-Valera 1909) · Peace Be Still",
    description: "Versículos para jóvenes en la Reina-Valera 1909: sobre la edad, las decisiones, la presión de grupo, el miedo y el propósito, con qué significa cada uno.",
    h1: "Versículos para jóvenes: edad, decisiones, presión y propósito",
    indexLabel: "Versículos para jóvenes",
    indexNote: "Para la edad, las decisiones, la presión y el miedo.",
    definition: `Los versículos para jóvenes más usados son 1 Timoteo 4:12, Eclesiastés 12:1, Salmo 119:9, Romanos 12:2 y Jeremías 29:11. El favorito de muchos grupos de jóvenes es ${q("1TI 4:12")} Dice que la edad no te descalifica para ser ejemplo.`,
    quick: "Para la edad: 1 Timoteo 4:12. Para la presión de grupo: Romanos 12:2. Para decisiones: Proverbios 3:5-6. Para el miedo: 2 Timoteo 1:7.",
    bestFor: "jóvenes, padres y líderes de jóvenes que buscan versículos claros y exactos.",
    sections: [
      ["Versículos sobre ser joven", `${v("1TI 4:12")}
<p>Eclesiastés 12:1 empieza así: ${f("ECC 12:1", "Criador en los días de tu juventud")}, una invitación a buscar a Dios desde ahora.</p>`],
      ["Versículos para la presión de grupo", `${v("ROM 12:2")}
<p>El Salmo 119:9 hace la pregunta y la responde: ${f("PSA 119:9", "¿Con qué limpiará el joven su camino? Con guardar tu palabra.")}</p>`],
      ["Versículos para decidir", `${v("PRO 3:5-6")}
${v("JAM 1:5")}`],
      ["Versículos para el miedo y la ansiedad", `${v("2TI 1:7")}
${v("JOS 1:9")}`],
      ["¿Qué versículo leer cuando estoy triste?", `${v("PSA 34:18")}
<p>Si la tristeza no se va o piensas en hacerte daño, habla con un adulto de confianza y llama o escribe al 988 (oprime 2 para español).</p>`],
      ["Young Faith en Peace Be Still", `<p>Peace Be Still, {{stores.short}}, tiene Young Faith · Bible for Teens para jóvenes de 13 a 17 años: una historia bíblica de 3 minutos, una declaración y respuestas claras a preguntas reales. Las compras pasan por “Solicitar la compra” (Ask to Buy) de Apple. Para menores de 13 no hay chat.</p>`],
    ],
    faq: [
      ["¿Qué versículo es bueno para un joven?", "1 Timoteo 4:12, que anima a ser ejemplo en palabra, conducta, amor, espíritu, fe y pureza, sin importar la edad."],
      ["¿Qué dice Jeremías 29:11?", `${q("JER 29:11")} Dios se lo dijo al pueblo en el exilio; muchos jóvenes lo leen hoy como recordatorio de que Dios tiene buenos pensamientos sobre ellos.`],
      ["¿Qué versículo compartir en un grupo de jóvenes?", "Romanos 12:2 abre buena conversación: qué significa no conformarse a este siglo y cómo se renueva la mente."],
    ],
    sources: [RV_SRC, rv("1 Timoteo 4:12", "1 Timoteo 4:12 (RVES), Bible Gateway"), ["988 Lifeline en español", "https://988lifeline.org/es/"]],
    related: ["/es/preguntas/versiculos-de-fe/", "/es/preguntas/versiculos-de-fortaleza/", "/es/preguntas/devocional-diario/", "/es/chat-biblico-gratis/"],
  },
];
