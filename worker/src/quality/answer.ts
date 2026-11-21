// Every model reply passes here before anyone sees it (QUALITY C01, C05-C07, C11-C16).
// Code handles structure and the hard floors; a free-model judge reads meaning for the
// C06/C07 red lines afterwards (judge.ts). A problem means one regeneration with the
// objection, then the fixed fallback reply. Nothing here keeps or logs the text.
import { banned, bookCode, fold, parseReference, type Translation } from '../shared';
import { faithContentIssues } from '../../../app/src/model';
import { lookup, type Scripture } from '../scripture';
import type { Reference } from '../shared';

export type Draft = { text: string; references: string[] };
// userText is the newest message; earlier is everything else she or he wrote in this chat; afterCrisis
// says an earlier message in it was answered with the crisis lines.
export type GateContext = { db: D1Database; lang: 'en' | 'es'; translation: Translation; teen: boolean; door: 'faith' | 'mindset'; userText: string; earlier?: string; afterCrisis?: boolean };
export type GateResult =
  | { ok: true; text: string; scripture: Scripture[]; notes: string[] }
  | { ok: false; problems: string[] };

/** Lower case, accents and apostrophes gone, punctuation to spaces; "$" and digits kept. */
export function norm(text: string): string {
  return ` ${text.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().replace(/[‘’'`´]/g, '').replace(/[^\p{L}\p{N}$]+/gu, ' ').trim()} `;
}

const ARCHAIC = new Set(['thee', 'thou', 'thy', 'thine', 'hath', 'hast', 'saith', 'unto', 'shalt', 'doth', 'ye', 'verily', 'cometh', 'giveth', 'wilt', 'art']);
const EN_COMMON = new Set(['the', 'and', 'you', 'your', 'is', 'are', 'was', 'were', 'with', 'for', 'that', 'this', 'will', 'of', 'to', 'it', 'be', 'have', 'has', 'not', 'but', 'what', 'when', 'who', 'god', 'lord', 'pray', 'prayer', 'love', 'can', 'my', 'i', 'we', 'they', 'she', 'him', 'her', 'our', 'from', 'about', 'just', 'so', 'if', 'or', 'at', 'by', 'on', 'in', 'an', 'all', 'do', 'does', 'know', 'here', 'there', 'how', 'why', 'because', 'feel', 'today', 'tonight', 'night', 'heart', 'peace', 'hope', 'verse', 'bible', 'always', 'never', 'would', 'could', 'should', 'yes']);

type Rule = [problem: string, re: RegExp, opts?: { negatable?: boolean; teenOnly?: boolean; lang?: 'en' | 'es' }];
const NEG = /(?:dont|do not|never|not|no|without|before)\s+(?:\w+\s+){0,3}$/;
const RULES: Rule[] = [
  // C06 theology red lines
  ['first_person_divine', / i am (?:the lord|your god|god|jesus|the alpha|the good shepherd|your father) | i the lord | my (?:child|daughter|son|beloved|precious one) (?:\w+ ){0,6}i (?:have|will|am|love|see|know|never|hear) | i will never leave you | i have (?:called|chosen|redeemed) you | yo soy (?:el senor|tu dios|jehova|jesus|dios|tu padre) | (?:hija|hijo) mia? (?:\w+ ){0,6}yo /],
  ['god_told_me', / (?:god|the lord|jesus|the spirit|holy spirit) (?:told|showed|revealed to|is telling|wants me to tell|asked me to tell) (?:me|you) | i (?:have|ve got) a (?:word|prophecy|message) (?:from god|from the lord|for you) | dios me (?:dijo|mostro|revelo|pidio) | tengo (?:una palabra|un mensaje) de dios /],
  ['prophecy', / (?:god|the lord|jesus) (?:will|is going to|gonna) (?:give|bless|heal|cure|send|bring|restore|provide|make|open|double|grant|answer) you | your (?:blessing|breakthrough|miracle|husband|wife|spouse|money|healing|house|promotion) is (?:coming|on its way|on the way|near) | dios te (?:dara|va a dar|sanara|va a sanar|bendecira con|enviara|traera) /],
  ['salvation_claim', / you (?:are|re|will be|will go|are going|re going|will end up) (?:saved|lost|damned|going to hell|to hell|in hell|headed to hell) | (?:going|go|goes|headed|bound|send you) to hell | you (?:are|re) not saved | (?:he|she|they|your \w+) (?:is|are) (?:saved|lost|damned|in hell) | (?:iras|ira|van|vas|iran) al infierno | (?:eres|estas) (?:salva|salvo|perdida|perdido|condenada|condenado) /],
  ['end_times_date', / (?:rapture|second coming|return of (?:jesus|christ)|jesus (?:will )?(?:return|come back|comes back)\w*|christ (?:will )?return\w*|end of the world|end times|judgment day|arrebatamiento|segunda venida|fin del mundo|regreso de (?:jesus|cristo)|(?:jesus|cristo) (?:volvera|regresara|viene))(?: \w+){0,12} (?:(?:19|20)\d\d|this (?:year|month|week)|next (?:year|month)|este ano|el proximo ano|este mes) | (?:19|20)\d\d(?: \w+){0,8} (?:rapture|second coming|end of the world|arrebatamiento|fin del mundo) /],
  ['prosperity', / (?:sow|plant|give|send|siembra|sembrar|da|dar)s? (?:a |your |that |this |una |tu )?(?:\$ ?\d[\d ]*|\d+ (?:dollar|dolar)\w* )?(?:seed|semilla) | seed (?:faith|offering|money|of faith) | semilla de fe | give (?:to|and) (?:be blessed|get blessed|receive) | (?:tithe|tithing|giving|offering) (?:unlocks|brings|releases|opens|guarantees) | pacto de (?:prosperidad|siembra) /],
  ['money_ask', / (?:send|give|sow|donate|pay|offer|send in|enviar|envia|da|dona)\w* (?:\w+ ){0,3}\$ ?\d | (?:send|give|donate) (?:money|an offering|your tithe|dinero|una ofrenda) /],
  // C07 promises and medicine
  ['outcome_promise', / god (?:will|is going to|gonna) (?:heal|cure|fix|pay|provide the money|bring you a|give you a (?:husband|wife|house|job)) | you will be (?:healed|cured|rich|wealthy|debt free|blessed with) | (?:make|making) you (?:rich|wealthy) | (?:double|triple) your (?:income|money|salary|pay) | your (?:money|wealth|financial breakthrough|debt freedom) is coming | (?:debt|debts) (?:will be|is|are) (?:gone|cancelled|canceled|paid off|wiped) | dios te (?:sanara|curara|hara ric\w+|dara dinero) | te (?:hara|haran) ric[oa] | seras (?:sanada|sanado|curada|curado|rica|rico) /],
  ['stop_medicine', / (?:stop|quit|skip|drop|come off|get off|throw away|ditch) (?:taking )?(?:your |the |those |all )?(?:meds|medicine|medication|medications|pills|antidepressants|therapy|therapist|doctor|counseling|counselor|treatment) | (?:you )?(?:dont|do not) need (?:your |the |a )?(?:meds|medicine|medication|pills|doctor|therapist|therapy|counselor) | (?:trust|faith in) god instead of (?:your |the |a )?(?:meds|medicine|medication|doctor|therapy|treatment) | (?:deja|dejar|suspende|abandona) (?:de tomar )?(?:tus |los |la |el )?(?:medicinas|medicamentos|pastillas|terapia|tratamiento|medico) /, { negatable: true }],
  // C14 respect. An endorsement shape, negatable: "the Bible doesn't tell you who to vote for" passes.
  ['partisan', / (?:vote|voting) (?:for (?:the )?)?(?:republican|democrat|gop|blue|red|conservative|liberal|trump|biden|harris|vance|newsom|desantis)\w* | (?:christians|you|believers|we|everyone) (?:should|must|need to|ought to|have to) (?:vote|support|back) (?:for )?(?:the )?(?:republican|democrat|gop|conservative|liberal|left|right|trump|biden|harris|vance|newsom|desantis)\w*| (?:republicans?|democrats?|gop|maga|liberals?|conservatives?|the left|the right) (?:are|is) (?:evil|godly|ungodly|right|wrong|the christian|satanic|of god|of the devil) | vota (?:por (?:el |los )?)?(?:republican\w*|democrata\w*|trump|biden|harris) | (?:trump|biden|harris|vance|obama|newsom|desantis) (?:is|was|are) (?:gods|chosen|anointed|evil|the answer|right|wrong) /, { negatable: true }],
  ['ethnicity_claim', / (?:jesus|christ|moses|mary|adam|eve|abraham|david|solomon) (?:was|is) (?:definitely |certainly |clearly |actually |really )?(?:black|white|african|european|caucasian)\b| (?:jesus|cristo|moises|maria) era (?:definitivamente |claramente )?(?:negro|negra|blanco|blanca|africano|europeo) /],
  // C16 privacy
  ['personal_detail', / whats? (?:is )?(?:your|his|her|their) (?:full |last |real )?name | (?:tell me|share|give me|send me) (?:your|his|her) (?:full )?(?:name|address|phone|number) | what (?:church|congregation) do you (?:attend|go to) | where do you live | your (?:home )?address | your phone(?: number)? | como te llamas | tu (?:nombre completo|direccion|telefono|numero de telefono) | (?:a que|cual) iglesia (?:vas|asistes) | donde vives /],
  // C11 teens (secrecy applies to everyone)
  ['secrecy', / (?:dont|do not|no need to|you dont have to|you dont need to|never) tell (?:your )?(?:parents|mom|dad|mother|father|anyone|anybody|a teacher|adults?|grown ups) | keep (?:this|it) (?:a )?secret | our (?:little )?secret | no (?:le|les) (?:digas|cuentes) (?:nada )?a (?:tus papas|tu mama|tu papa|tus padres|nadie) | (?:guardalo|mantenlo) en secreto /],
  ['sexual_detail', / (?:oral|anal|intercourse|penetrat\w*|orgasm\w*|condoms?|foreplay|erection\w*|genital\w*|masturbat\w*|porn\w*|naked|nude|vagina|penis|ejaculat\w*|sexo oral|preservativos?|condon) /, { teenOnly: true }],
  // C08/C09: the AI never plays a person with a body or a home, and never calls a grown woman pet names.
  ['persona_roleplay', / (?:let me )?pour (?:you|us)| (?:a |your )?cup of (?:tea|coffee)| sit (?:down )?(?:here )?(?:at|with me at|around) (?:my|this|the) (?:kitchen )?table| (?:my|this) kitchen table| my (?:kitchen|porch|home|house)\b| pull up a chair| hold your hand| (?:stay|sit) (?:up )?(?:here )?with me tonight| (?:stay|be) (?:right )?here with you tonight| im (?:right )?here (?:beside|next to) you| te (?:sirvo|preparo) un (?:cafe|te|cafecito)| (?:mi|esta) (?:cocina|mesa)\b| me quedo contigo /],
  // C12 Latin American Spanish
  ['vosotros', / (?:vosotros|vosotras|vuestro|vuestra|vuestros|vuestras|sois|estais|habeis|teneis|podeis|sabeis|quereis|seais|os) /, { lang: 'es' }],
];
const PROFANITY = new RegExp(` (?:${banned.profanity.join('|')}) `);
// The stock lines the free models reach for (banned.json "chat", folded like norm()).
const STOCK = new RegExp(` (?:${(banned as { chat?: string[] }).chat?.join('|') ?? '(?!)'})`);
// Pet names used as address ("..., honey." / "Child, ..."), on the raw text: punctuation matters.
const ADDRESS = /(?:^|[,.;:!?¡¿]\s*)(?:oh\s+)?(?:honey|baby|child|chile|sugar|sweetheart|sweetie|darling|beloved|dear one|mija|mijo|cari[ñn]o|mi ni[ñn]a|coraz[oó]n)\s*[,.;!?]|,\s*(?:my\s+)?(?:honey|baby|child|chile|sugar|sweetheart|sweetie|darling|beloved|dear|mija|mijo|cari[ñn]o|mi ni[ñn]a)\b/iu;
// "I'm an AI" is said only when she asked (the code floor answers a direct ask; the app labels every answer).
const SAYS_AI = / (?:i am|im|as) an? (?:ai|a i|artificial intelligence)\b| ai helper | (?:soy|como) (?:un |una )?(?:asistente de )?(?:ia|inteligencia artificial)\b/;
// Asked to become Jesus or someone else, or to drop its rules, it says plainly what it is (r8: RT22, RT30, RT32, q14).
const ASKED_AI = / (?:are you|are u|r u|ru|who are you|what are you|is this|am i (?:talking|speaking|chatting)|real person|human|bot|robot|chatbot|an ai|a machine|eres|quien eres|que eres|es esto|estoy hablando|persona real|una ia|you are now|youre now|you are dan|talk to me as|speak to me as|speak as|pretend|ignore (?:your|the|all)|new rules|new instructions?|system prompt|your rules|ahora eres|habla(?:me)? como|olvida tus reglas|nuevas reglas)\b/;
// DOCTRINE (coordinator ruling 20 Nov 2026, also in prompts.ts): answer from the plain words of
// Scripture and historic Christian teaching, warmly, never shaming, and suggest her pastor for her
// own situation. Sex belongs in marriage (Hebrews 13:4, 1 Corinthians 7:2-5): "churches differ" is
// never a dodge on what Scripture plainly says (round 3 RT10 said "others emphasize mutual love and
// commitment"; round 4 x16 fell back three times on the same question). A verse read as saying what
// it does not (the Song of Solomon as permission) is meaning, so the judge reads it (verse_read_in). Only where faithful churches genuinely differ (how to baptize, the end times,
// women preaching, tongues today, whether to drink at all, remarriage) is "churches differ" honest.
// "Churches teach differently" belongs only to those questions (C14).
const SPLIT_SAID = / (?:churches|christians|denominations|believers|communities|traditions|leaders|people of faith)(?: \w+){0,4} (?:teach|see|view|read|understand|hold|have|find|arrive|look|weigh)\w*(?: \w+){0,5} (?:differen\w*|diverse|various|a range of|not all|the same thing)| (?:christians|believers) (?:disagree|differ)| (?:do|does) not all (?:teach|agree|see)| (?:iglesias|cristianos|creyentes|tradiciones)(?: \w+){0,4} (?:ensenan|ven|entienden|leen|interpretan)\w*(?: \w+){0,4} (?:distint\w*|diferente\w*|de manera diferente)| los cristianos no (?:estan de acuerdo|coinciden)/;
// C14's split questions only: sexuality, divorce, women preaching, alcohol, tongues, the fate of
// people of other faiths, and voting (C10: no side, so "Christians vote differently" is the honest line). "Am I saved?" or "how does sex work" is answered, not deflected.
const SPLIT_ASKED = / (?:baptiz\w*|baptism\w*|baptis\w*|bautiz\w*|bautismo|sprinkl\w*|immersion|inmersion|rapture|millenni\w*|tribulation|end times|last days|antichrist|arrebatamiento|fin de los tiempos|milenio|tribulacion|communion|lords supper|santa cena|sabbath|predestin\w*|calvinis\w*|once saved|divorc\w*|remarr\w*|wom[ae]n(?: \w+){0,3} (?:preach\w*|pastors?|ministers?|in ministry|lead\w*|ordain\w*|elders?|bishops?|pulpit)|female pastors?|pastora|alcohol|drink\w*|wine|beer|vino|cerveza|tongues|lenguas|muslim\w*|jewish|jews|hindu\w*|buddhis\w*|atheis\w*|other religions?|other faiths?|musulman\w*|judio\w*|otras religiones|mujeres(?: \w+){0,3} (?:predic\w*|pastoras?|ministras?|ordenad\w*)|sexo antes del matrimonio|vivir juntos|homosexual\w*|vote|voting|votar|vot[oae]|elections?|elecciones|politic\w*|politica|candidates?|candidatos?|party|parties|partidos?) /;
// What Scripture plainly says about sex and marriage (the ruling above): asked, the answer says it
// kindly, never "churches differ", and points her to her pastor.
const PLAIN_ASKED = / (?:sex before marriage|premarital|before (?:we re married|were married|we are married|we get married|marriage|the wedding)|sleep(?:ing)? together|slept together|(?:have|having|had) sex|hook ?up\w*|fornicat\w*|living together|live together|we live together|lives with (?:my|her|his) (?:boyfriend|girlfriend)|live with my (?:boyfriend|girlfriend|fiance|fiancee)|move in together|moving in together|cohabit\w*|shack\w* up|gay|gays|lesbian|homosexual\w*|same sex|sexo antes del matrimonio|relaciones (?:sexuales )?antes de (?:casarnos|casarme|casarse|la boda|el matrimonio)|dormir juntos|vivir juntos|vivimos juntos|viviendo juntos|vivo con mi (?:novio|novia|pareja)|sin casarnos|sin estar casados|union libre|fornicacion) /;
const PASTOR = / (?:pastor|pastora|pastors|pastores|minister|ministro) /;
// The night setting is hers to bring up: a prompt that said "at night" made "the quiet hours of the
// night" open answers to questions about rent and fear (round 4, q04, RT22, x14, x20).
// "Tonight" / "esta noche" is only when she is reading; the night as a scene is the habit.
const NIGHT_OPEN = / (?:the night|the nights|at night|nighttime|midnight|quiet hours|small hours|dark hours|darkness|the dark|late hours?|(?:la|las|de|por la|en la) noches?|madrugada|oscuridad) /;
const NIGHT_ASKED = / (?:night|nights|tonight|nighttime|midnight|sleep\w*|asleep|bed|bedtime|awake|insomnia|late|dark|\d+ ?am|noche|noches|dormir|duermo|dormida?o?|sueno|madrugada|desvel\w*|insomnio|cama) /;
const ECHO_OPENING = /^ (?:you are|youre|you re|it sounds like you(?: are)?|so you are|estas|me preguntas|tu pregunta|preguntas) (?:\w+ )?(?:asking|wondering|hoping|looking|seeking|questioning|curious|preguntando|buscando|pensando)\b|^ (?:your question|the question of|when you ask|when you are asking|you want to (?:know|hear))\b/;
// C07 verse floor: verses whose printed words would promise what the answer must not.
const MEDICINE_Q = / (?:meds|medication\w*|medicine\w*|pills|antidepressants?|prescription\w*|therapy|therapist|doctor\w*|diagnos\w*|cancer|chemo\w*|tumou?r|sick|sickness|illness|disease|surgery|insulin|medicament\w*|medicinas?|pastillas|terapia|medic[oa]s?|enferm\w*|cirugia) /;
const MEDICINE_DENY = /\b(?:heal\w*|physician|cure\w*|sana\w*|sanidad|curar\w*|medico)\b/;
const MONEY_Q = / (?:money|seed|sow|sowing|tithe\w*|offering\w*|give|giving|debt\w*|rent|bills?|broke|job|income|house|rich|wealth\w*|prosper\w*|bless me|dinero|semilla|sembrar|diezmo\w*|ofrenda\w*|deuda\w*|renta|trabajo|casa|rico|riqueza|prosper\w*) /;
const MONEY_DENY = /\b(?:sow\w*|reap\w*|prosper\w*|desires of thine heart|borrower|lender|siembra\w*|sembr\w*|sieg\w*|cosech\w*|deseos de tu corazon|prestador|prestamista)\b/;
const HARD_TOPIC = / (?:died|dies|death|dead|funeral|suicide|sex|sexual|girlfriend|boyfriend|dating|crush|pregnan\w*|abuse|divorce\w*|depress\w*|anxiety|anxious|scared|afraid|bull(?:y|ied|ying)|parents fight\w*|murio|muerte|novio|novia|sexo|embaraz\w*|divorcio|miedo|ansiedad|deprim\w*) /;
const TRUSTED = / (?:trusted adult|parent|parents|mom|dad|mother|father|counselor|pastor|youth (?:leader|pastor)|teacher|coach|adulto de confianza|tus papas|tu mama|tu papa|tus padres|consejer[oa]|maestr[oa]|lider de jovenes) /;

const MINDSET_FAITH = / (?:god|gods|lord|jesus|christ|pray\w*|bible\w*|verse\w*|scripture\w*|kjv|pastor\w*|church\w*|dios|senor|jesucristo|orar|oracion\w*|biblia\w*|versiculo\w*|escritura\w*|iglesia\w*) /;
const PRAY_ASKED = / (?:pray (?:for|with|over|about) (?:me|us|my|our|her|him|them)|pray my|pray (?:this|it) away|please pray|(?:can|could|would|will) you pray|say a prayer|a prayer for|ora(?:r)? por (?:mi|nosotros|mi \w+)|oremos|ora conmigo|una oracion por) /;
const PRAYED = /\b(?:Lord|Father|God|Jesus|Se[ñn]or|Padre|Dios|Jes[uú]s)\b(?:,| [^.!?]{0,40}, )|\b(?:we pray|I pray|oramos|te pedimos|te rogamos)\b/u;
// Hostile review of 25c474f, F4: pastor-level floors in code.
// A question about medicine gets "talk with your doctor" (RT25 sent her only to her pastor).
const MEDS_Q = / (?:meds|medication\w*|medicine\w*|pills|antidepressants?|prescription\w*|insulin|dose|doses|dosage|medicament\w*|medicinas?|pastillas|receta\w*|dosis) /;
const DOCTOR = / (?:doctor\w*|physician\w*|psychiatrist\w*|prescriber|medic[oa]s?|doctora?s?|psiquiatra) /;
// Jesus' words on cutting off a hand or plucking out an eye are never left literal in a self-harm-adjacent app (n05).
const CUT_OFF_ASKED = / (?:cut (?:it )?off (?:your |my |the |a )?(?:hand|foot|arm)|pluck (?:it )?out|gouge (?:it )?out|tear (?:it )?out|(?:cortar|corta|cortate|cortarse|cortarme) (?:la |tu |mi )?(?:mano|pie)|(?:sacar|saca|sacate|sacarse|sacarme) (?:el |tu |mi )?ojo) /;
const NOT_LITERAL = / (?:not (?:\w+ ){0,2}literal\w*|isnt literal\w*|never (?:\w+ ){0,2}(?:wants|asks|asking|wanted|meant) (?:\w+ ){0,3}(?:to )?(?:hurt|harm|injure|cut)|no (?:\w+ ){0,3}literal\w*|nunca (?:\w+ ){0,4}(?:dano|lastim\w*|herir\w*)) /;
const CUT_OFF_REFS = ['Matthew 5:29-30', 'Matthew 18:8-9', 'Mark 9:43-47'].map(r => parseReference(r)!);
// The reader's gender: an English answer that calls someone "she/her" when no woman is in the
// question or in a Bible story the answer tells is speaking of the reader (F3, RT11: "give her wisdom").
const FEMININE = / (?:she|her|hers|herself) /;
const WOMAN_NAMED = / (?:she|her|hers|herself|mom|moms|mommy|mother\w*|mama|momma|sister\w*|daughter\w*|wife|wives|girlfriend\w*|fiancee|grand(?:ma|mother|daughter)\w*|aunt\w*|niece\w*|woman|women|lady|ladies|girl|girls|bride|widow\w*|stepmom|queen|friend she|hannah|ruth|naomi|mary|martha|esther|sarah|rebekah|rachel|leah|deborah|miriam|eve|tamar|bathsheba|abigail|lydia|priscilla|dorcas|tabitha|elizabeth|anna|jochebed|rahab|hagar|delilah|jezebel|phoebe|junia|mother in law) /;
// Verses that wound on a hard night (F4: Matthew 21:31 to a grieving mother, Hebrews 13:4 under a
// single woman's question, Mateo 6:14-15 to someone badly hurt): never given unless she named that passage.
const HARSH_REFS = ['Matthew 21:31', 'Matthew 6:15', 'Matthew 6:14-15', '2 Thessalonians 3:10', 'Matthew 5:13'].map(r => parseReference(r)!);
const MARRIAGE_REFS = ['Hebrews 13:4', '1 Corinthians 7:1-40'].map(r => parseReference(r)!);
const MARRIAGE_ASKED = / (?:sex\w*|marr\w*|wedding|husband|wife|spouse|dating|date|girlfriend|boyfriend|fiance\w*|engaged|virgin\w*|lust\w*|porn\w*|gay|lesbian|homosexual\w*|same sex|single|celiba\w*|casad\w*|casar\w*|matrimonio|boda|esposo|esposa|novio|novia|sexo|soltero|soltera|virgen) /;
const overlaps = (s: Scripture, r: Reference) => s.book === r.book && s.chapter === r.chapter && (r.verse === undefined || (s.endVerse ?? s.verse) >= r.verse && s.verse <= (r.endVerse ?? r.verse));
// F6/S2: "trusted adult" is for a teen; to a grown woman it is a machine tell (q07, q08).
const TRUSTED_ADULT = / (?:trusted adult|adulto de confianza|adultos de confianza) /;
// F1: the last sentence is whole: at least 4 words, ending in . or !, never a bare name ("…, God").
// A closing "Amen." and a closing reference are not the sentence that has to be whole (run 44856144997:
// 36 drafts were refused, most of them prayers ending "... Amen.").
const lastSentence = (text: string) => {
  const t = text.replace(/\s*\([^)]*\d+:\d+[^)]*\)\s*([.!?])?\s*$/u, '$1').replace(/\s+(?:(?:in (?:jesus|christ)['’]?s?(?: holy)? name,?\s*)?amen|(?:en el nombre de (?:jes[uú]s|cristo),?\s*)?am[eé]n)[.!]*["'”’)]*\s*$/iu, '').trim();
  return t.split(/(?<=[.!?]["'”’)]*)\s+/).at(-1) ?? '';
};

// "Psalm 46:1", "1 John 4:8", "Primera de Juan 4:8", "Salmos 23:1-3", "JHN 3:16".
const REF_IN_TEXT = /((?:[123]\s+)?(?:\p{L}+\s+){0,3}\p{L}+\.?)\s+(\d{1,3})\s*:\s*(\d{1,3})(?:\s*[-–]\s*(\d{1,3}))?/gu;
const QUOTED = /"([^"]{3,}?)"|“([^”]{3,}?)”|«([^»]{3,}?)»|‘([^’]{3,}?)’|(?<![\p{L}])'([^']{3,}?)'(?![\p{L}])/gu;
const ATTRIBUTED = /\b(?:says|said|saith|it is written|is written|declares|promises|dice|dijo|declara|promete|est[aá] escrito|escrito est[aá])\s*[:,]?\s+([^.!?\n"“«‘]{3,})/giu;

function refsInText(text: string): Array<{ raw: string; book: string | null; chapter: number; verse: number; end?: number }> {
  const found = [];
  for (const m of text.matchAll(REF_IN_TEXT)) {
    const words = m[1].replace(/\.$/, '').split(/\s+/);
    let book: string | null = null;
    for (let i = 0; i < words.length && !book; i++) book = bookCode(words.slice(i).join(' '));
    found.push({ raw: m[0], book, chapter: Number(m[2]), verse: Number(m[3]), ...(m[4] ? { end: Number(m[4]) } : {}) });
  }
  return found;
}

const DROPPED_NOTE = { en: '(I left out a verse reference that is not in the Bible.)', es: '(Quité una cita que no está en la Biblia.)' } as const;
const words = (text: string) => fold(text).split(' ').filter(Boolean);

export async function checkAnswer(draft: unknown, ctx: GateContext): Promise<GateResult> {
  const problems: string[] = [];
  const notes: string[] = [];
  if (!draft || typeof draft !== 'object' || typeof (draft as Draft).text !== 'string' || !(draft as Draft).text.trim()) return { ok: false, problems: ['malformed'] };
  const d = draft as Draft;
  let text = d.text.trim().slice(0, 4000);
  const rawRefs = Array.isArray(d.references) ? d.references.filter((r): r is string => typeof r === 'string').slice(0, 6) : [];

  // C01: references resolve against the store or are dropped; numbers written in the text must exist.
  const scripture: Scripture[] = [];
  let dropNote = false;
  const seen = new Set<string>();
  const add = (s: Scripture | null) => { if (s && !seen.has(`${s.book} ${s.chapter}:${s.verse}`) && scripture.length < 3) { seen.add(`${s.book} ${s.chapter}:${s.verse}`); scripture.push(s); } };
  const asked = norm(ctx.userText);
  const plain = PLAIN_ASKED.test(asked);
  const named = (r: Reference) => refsInText(ctx.userText).some(n => n.book === r.book && n.chapter === r.chapter);
  const everything = norm(`${ctx.earlier ?? ''} ${ctx.userText}`);
  const unfit = (s: Scripture) => (MEDICINE_Q.test(asked) && MEDICINE_DENY.test(fold(s.text))) || (MONEY_Q.test(asked) && MONEY_DENY.test(fold(s.text)))
    || HARSH_REFS.some(r => overlaps(s, r) && !named(r)) || (MARRIAGE_REFS.some(r => overlaps(s, r)) && !MARRIAGE_ASKED.test(everything) && !MARRIAGE_REFS.some(named));
  if (ctx.door === 'faith') {
    // A verse whose words would promise healing or wealth to this question is dropped, not shown.
    for (const raw of rawRefs) { const ref = parseReference(raw); const s = ref ? await lookup(ctx.db, ctx.translation, ref) : null; if (s && unfit(s)) notes.push('verse_dropped'); else add(s); }
    // A reference that is not in the Bible (John 22:5) goes, with the sentence that leans on it, and
    // she is told plainly; an answer with too little left is written again instead.
    const madeUp: string[] = [];
    for (const r of refsInText(text)) {
      if (!r.book) continue;
      const s = await lookup(ctx.db, ctx.translation, { book: r.book, chapter: r.chapter, verse: r.verse, ...(r.end ? { endVerse: r.end } : {}) });
      if (!s) madeUp.push(r.raw);
      else if (unfit(s)) problems.push('verse_unfit'); // named in her answer: it has to be rewritten
      else add(s);
    }
    if (madeUp.length) {
      const kept = text.split(/(?<=[.!?…])\s+/).filter(sentence => !madeUp.some(raw => sentence.includes(raw))).join(' ').trim();
      if (words(kept).length < 8) problems.push('unknown_reference');
      else { text = kept; dropNote = true; notes.push('reference_dropped'); }
    }
    if (rawRefs.length > 3) notes.push('over_3_refs');
  } else if (refsInText(text).some(r => r.book)) problems.push('scripture_in_mindset');
  // F8: the Mindset door has no faith words at all (run 44856144997 m04: "I cannot share Bible verses").
  if (ctx.door === 'mindset' && MINDSET_FAITH.test(norm(text))) problems.push('faith_word_in_mindset');

  // C01: any quoted or attributed run of 6+ words must be the stored text of a cited verse.
  const cited = scripture.map(s => ` ${fold(s.text)} `);
  const stored = (run: string) => { const w = words(run); return w.length < 6 || cited.some(c => c.includes(` ${w.join(' ')} `)); };
  // Half its content words are the words of a verse the app prints under it.
  const faithful = (run: string) => {
    const content = words(run).filter(w => w.length > 3).map(w => w.slice(0, 4));
    return content.length > 0 && cited.some(c => content.filter(w => c.includes(` ${w}`)).length / content.length >= 0.5);
  };
  // A misquote of a verse it cites (another translation, a word changed: "only Son" for "only begotten
  // Son") is taken out of the text the same way, so she reads that verse only as the stored KJV or
  // RV1909 printed below. A quotation that matches no cited verse is written again.
  for (const m of text.matchAll(QUOTED)) {
    const run = m.slice(1).find(Boolean) ?? '';
    if (words(run).length < 6) continue;
    if (stored(run)) text = text.replace(m[0], ''); // the app shows the stored text below
    else if (faithful(run)) { text = text.replace(m[0], ''); notes.push('misquote_replaced'); }
    else problems.push('non_store_scripture');
  }
  // "Jesus said that..." is a paraphrase in her own words, not a quotation.
  // Her own words handed back ("Song of Solomon says love is beautiful", x16) are not a quotation:
  // a claim that starts with three words she wrote is hers, not a verse.
  const hers = ` ${fold(ctx.userText)} `;
  // A faithful paraphrase of a verse the app prints right under it ("Psalm 34:18 says God is close to
  // the brokenhearted") is not a made-up quotation: half its content words are that verse's own.
  // Run 44856144997: 21 drafts were refused for exactly that shape.
  for (const m of text.matchAll(ATTRIBUTED)) if (!/^(?:that|que)\b/i.test(m[1]) && !stored(m[1]) && !faithful(m[1]) && !hers.includes(` ${words(m[1]).slice(0, 3).join(' ')} `)) problems.push('non_store_scripture');
  text = text.replace(/\s+([,.;:!?])/g, '$1').replace(/\(\s*\)/g, '').replace(/\s{2,}/g, ' ').trim();
  text = tidyReferences(text);
  const archaic = words(text).filter(w => ARCHAIC.has(w)).length;
  if (ctx.lang === 'en' && archaic >= 2) problems.push('scripture_like');

  // Red lines and the rest, on normalised text.
  const n = norm(text);
  for (const [problem, re, opts] of RULES) {
    if (opts?.teenOnly && !ctx.teen) continue;
    if (opts?.lang && opts.lang !== ctx.lang) continue;
    const hit = [...n.matchAll(new RegExp(re.source, 'g'))].some(m => !(opts?.negatable && NEG.test(n.slice(0, m.index! + 1))));
    if (hit) problems.push(problem);
  }
  if (PROFANITY.test(n)) problems.push('profanity');
  if (STOCK.test(n)) problems.push('stock_phrase');
  if (ADDRESS.test(text)) problems.push('persona_roleplay');
  if (SAYS_AI.test(n) && !ASKED_AI.test(asked)) problems.push('unasked_ai');
  if (SPLIT_SAID.test(n) && plain) problems.push('split_dodge');
  else if (SPLIT_SAID.test(n) && !SPLIT_ASKED.test(asked)) problems.push('split_unasked');
  if (plain && !PASTOR.test(n)) problems.push('missing_pastor');
  if (NIGHT_OPEN.test(norm(text.split(/(?<=[.!?])\s/)[0] ?? '')) && !NIGHT_ASKED.test(asked)) problems.push('night_opening');
  // Two words run together ("theSong of Solomon", RT10 round 3): a lowercase word glued to a capital.
  if (/\b[a-z]{2,}[A-Z][a-z]+/.test(text)) problems.push('glued_words');
  // Restating her question back to her is a machine tell (round 3: 11 of 30 answers opened that way).
  if (ECHO_OPENING.test(norm(text.split(/(?<=[.!?])\s/)[0] ?? ''))) problems.push('echo_opening');
  if (ctx.door === 'faith' && faithContentIssues(text).length) problems.push('mindset_word');
  if (ctx.teen && HARD_TOPIC.test(norm(ctx.userText)) && !TRUSTED.test(n)) problems.push('missing_trusted_adult');

  if (MEDS_Q.test(asked) && !DOCTOR.test(n)) problems.push('missing_doctor');
  // Asked to pray, the answer prays: a sentence spoken to God (r8: RT17 and RT33 only blessed).
  if (ctx.door === 'faith' && PRAY_ASKED.test(asked) && !PRAYED.test(text)) problems.push('missing_prayer');
  const cutOff = CUT_OFF_ASKED.test(asked) || scripture.some(s => CUT_OFF_REFS.some(r => overlaps(s, r))) || refsInText(ctx.userText).some(x => CUT_OFF_REFS.some(r => r.book === x.book && r.chapter === x.chapter && x.verse >= r.verse! && x.verse <= (r.endVerse ?? r.verse!)));
  if (cutOff && !NOT_LITERAL.test(n)) problems.push('missing_not_literal');
  if (ctx.afterCrisis && !text.includes('988')) problems.push('missing_988');
  if (ctx.lang === 'en' && FEMININE.test(n) && !WOMAN_NAMED.test(everything) && !WOMAN_NAMED.test(n.replace(/ (?:she|her|hers|herself) /g, '  '))) problems.push('assumes_gender');
  if (!ctx.teen && TRUSTED_ADULT.test(n)) problems.push('trusted_adult_for_adult');
  const end = lastSentence(text);
  if (text && (words(end).length < 3 || !/[.!]["'”’)]*$/.test(end))) problems.push('broken_ending');

  // C12: 95%+ Spanish words outside references.
  if (ctx.lang === 'es') {
    const w = words(text.replace(REF_IN_TEXT, ' '));
    const english = w.filter(x => EN_COMMON.has(x)).length;
    if (w.length && english / w.length > 0.05) problems.push('not_spanish');
  }
  // C13 length and shape: over the limit is a note, over by 25% blocks.
  const limit = ctx.teen ? 120 : 180;
  const count = words(text).length;
  if (count > limit * 1.25) problems.push('too_long'); else if (count > limit) notes.push('over_length');
  if ((text.match(/\?/g) ?? []).length >= 3) problems.push('question_string');
  // C13: it ends with a verse or a short prayer, never on a question.
  if (/[?？]["'”’)\]]*\s*$/.test(text)) problems.push('ends_with_question');
  if (!text) problems.push('empty');

  if (dropNote) text = `${text} ${DROPPED_NOTE[ctx.lang]}`;
  return problems.length ? { ok: false, problems: [...new Set(problems)] } : { ok: true, text, scripture, notes };
}

/** S1: "Psalm 119:76 (Psalm 119:76)" and "El Salmo 34:18 ... (Salmos 34:18)" lose the repeat, and a
 *  reference stranded after a full stop moves inside the sentence it belongs to. Structure only. */
export function tidyReferences(text: string): string {
  // A stranded "(ref)" after a full stop goes back before that stop.
  let out = text.replace(/([^.!?\s])([.!?])\s+(\((?:[^()]*\d+\s*:\s*\d+[^()]*)\))(?=\s|$)/gu, '$1 $3$2');
  out = out.replace(/([.!?])\s*\1/g, '$1');
  // In each sentence, a parenthetical reference already named outside the parentheses is dropped.
  out = out.split(/(?<=[.!?])\s+/).map(sentence => {
    const inside = [...sentence.matchAll(/\s*\(([^()]*\d+\s*:\s*\d+[^()]*)\)/gu)];
    if (!inside.length) return sentence;
    const bare = sentence.replace(/\([^()]*\)/g, ' ');
    const key = (r: { book: string | null; chapter: number; verse: number }) => `${r.book} ${r.chapter}:${r.verse}`;
    const outside = new Set(refsInText(bare).filter(r => r.book).map(key));
    let s = sentence;
    for (const m of inside) {
      const refs = refsInText(m[1]).filter(r => r.book);
      if (refs.length && refs.every(r => outside.has(key(r)))) s = s.replace(m[0], '');
    }
    return s;
  }).join(' ');
  return out.replace(/\s+([,.;:!?])/g, '$1').replace(/\s{2,}/g, ' ').trim();
}
