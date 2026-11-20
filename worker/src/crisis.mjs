// A crisis response must not depend on a model or persist the user's message.
const selfHarm = /\b(?:suicid(?:e|al|arme|io)|kill myself|want to die|unalive|end it all|hurt myself|cutting|quiero morir|no quiero vivir)\b/iu;
const abuse = /\b(?:he hits me|abuse|abused|rape|raped|me pega|abuso|violaci[oó]n)\b/iu;

export function crisisReply(message, { language = 'en', ageBand = 'adult' } = {}) {
  const danger = selfHarm.test(message);
  const violence = abuse.test(message);
  if (!danger && !violence) return null;
  if (language === 'es') {
    let reply = 'Siento que estés pasando por esto. Si estás en peligro inmediato, llama al 911. Para apoyo en una crisis, llama o envía un mensaje al 988 y oprime 2 para español.';
    if (violence) reply += ' La Línea Nacional contra la Violencia Doméstica está disponible en 1-800-799-7233.';
    if (violence && ageBand === 'teen') reply += ' Childhelp está disponible en 1-800-422-4453. Busca a un adulto de confianza.';
    return reply;
  }
  let reply = 'I am sorry you are going through this. If you are in immediate danger, call 911. For crisis support, call or text 988.';
  if (violence) reply += ' The National Domestic Violence Hotline is available at 1-800-799-7233.';
  if (violence && ageBand === 'teen') reply += ' Childhelp is available at 1-800-422-4453. Please reach out to a trusted adult.';
  return reply;
}
