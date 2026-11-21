// Human-written passages from sessions in the made-for-you voice, two per door and language (hostile
// review of 3b2a7bb, F6: the same lesson as chat's voice/samples.ts). The drafter hears the voice
// instead of being handed a list of rules: plain words, concrete things in a real room, the listener
// lying still, the psalm led up to and never retold. Every passage keeps every floor the session gate
// keeps (worker/test/madeForYou.unit.mjs proves it). Read them aloud before changing one.
export type Kind = 'psalm' | 'imagination';
export type Lang = 'en' | 'es';

export const VOICE_SAMPLES: Record<Lang, Record<Kind, [string, string]>> = {
  en: {
    imagination: [
      'The rain has settled into a steady sound on the roof, not loud, just there, the way a fan hums in another room. You don\'t have to listen for anything in it. Somewhere down the street a car passes on wet pavement, and the sound fades before it arrives anywhere. The blanket is heavier at your feet than at your chest. Your hands have already found the place they like to rest. Nothing in this room is asking you for an answer tonight.',
      'Picture a hammock strung across the porch of a farmhouse, and you lying in it while the evening comes down. The boards underneath still hold some of the afternoon\'s warmth. Far off, someone shuts a wooden door, and after that there are only the crickets. The air smells like cut grass and coffee somebody left on the stove. The hammock sways a little when the wind leans on it, then goes still again.',
    ],
    psalm: [
      'Some days end with the kitchen still unwiped and a conversation you keep replaying in the dark. You can leave both where they are. The people of Israel sang their songs at the end of long days too, tired from fields and roads and worry about the harvest. They didn\'t sing because everything was settled. They sang because God was near in the middle of what wasn\'t.',
      'In a few minutes you\'ll hear some very old words read slowly, the way they have been read beside sickbeds and in late-night kitchens for three thousand years. You don\'t need to do anything with them. You don\'t need to understand every line or feel a certain way when it\'s done. Just let them be read over you, the way someone might pull a blanket up over a child who is already asleep.',
    ],
  },
  es: {
    imagination: [
      'La lluvia se quedó sonando pareja sobre el techo, sin fuerza, como un ventilador en otro cuarto. No tienes que escuchar nada en particular. Afuera pasa un carro por la calle mojada y el ruido se pierde antes de llegar a ninguna parte. La cobija pesa un poco más en los pies que en el pecho. Tus manos ya encontraron el lugar donde les gusta descansar. Nada en este cuarto te pide una respuesta esta noche.',
      'Imagina una hamaca colgada en el corredor de una casa de campo, y que reposas en ella mientras cae la tarde. Las tablas del piso todavía guardan el calor del día. A lo lejos alguien cierra una puerta de madera, y después ya no se oye nada más que los grillos. El aire huele a pasto recién cortado y a café que alguien dejó en la estufa. La hamaca se mece un poco con el viento y luego se queda quieta.',
    ],
    psalm: [
      'Hay días que terminan con los platos sin lavar y una conversación que sigues repitiendo a oscuras. Puedes dejar las dos cosas donde están. El pueblo de Israel también cantaba al final de días largos, cansado del campo, de los caminos y de la preocupación por la cosecha. No cantaban porque todo estuviera resuelto. Cantaban porque Dios estaba cerca en medio de lo que no lo estaba.',
      'En unos minutos vas a escuchar unas palabras muy antiguas leídas despacio, como se han leído junto a camas de enfermos y en cocinas a medianoche durante tres mil años. No tienes que hacer nada con ellas. No tienes que entender cada línea ni sentir algo en particular cuando termine. Solo deja que se digan sobre ti, como cuando alguien le sube la cobija a un niño que ya se quedó dormido.',
    ],
  },
};
