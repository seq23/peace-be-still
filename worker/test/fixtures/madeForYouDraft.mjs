// A clean made-for-you draft in either language: ten paragraphs of nine varied sentences (about 950
// words), the shape the Worker's draft check accepts. Shared by the local Worker and the unit test.
const SENTENCES = {
  es: ['La lluvia toca la ventana con un ritmo lento y tranquilo.', 'Puedes soltar los hombros y dejar que la cama te sostenga.',
    'El aire entra despacio y sale despacio, sin ninguna prisa.', 'Lo que cargaste durante el día puede quedarse a un lado ahora.',
    'Hay una lámpara pequeña encendida y su luz es suave.', 'Tus manos descansan abiertas sobre la manta tibia.',
    'Afuera las calles están quietas y el mundo baja la voz.', 'Cada respiración es un poco más larga que la anterior.',
    'No tienes que resolver nada en este momento.', 'El silencio de la casa te acompaña con calma.'],
  en: ['Rain taps the window in a slow and easy rhythm.', 'Your shoulders can loosen and let the bed hold their weight.',
    'Air comes in slowly and leaves slowly, with no hurry at all.', 'Whatever you carried through the day can rest beside you now.',
    'A small lamp glows in the corner, and its light is soft.', 'Your hands lie open on the warm blanket.',
    'Outside, the street is still and the world lowers its voice.', 'Each breath runs a little longer than the one before.',
    'Nothing needs solving in this moment.', 'The quiet of the house keeps you company.'],
};
export function cleanDraft(lang, paragraphs = 10) {
  const pool = SENTENCES[lang];
  return Array.from({ length: paragraphs }, (_, p) => Array.from({ length: 9 }, (_, s) => pool[(p + s) % pool.length]).join(' ')).join('\n\n');
}
