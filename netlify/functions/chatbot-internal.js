import { getArea, json, requireStaffUser, staffStore } from './lib/staff-auth.js';
import { askClaude } from './lib/claude.js';

const MODEL = 'claude-sonnet-5';

export default async (request) => {
  if (request.method !== 'POST') {
    return json({ error: 'Method not allowed' }, 405);
  }

  const auth = await requireStaffUser(request);
  if (auth.error) {
    return auth.error;
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: 'Invalid body' }, 400);
  }

  const question = typeof body.question === 'string' ? body.question.trim().slice(0, 800) : '';
  if (!question) {
    return json({ error: 'Bitte eine Frage stellen.' }, 400);
  }

  const areaIds = (auth.user.areaMemberships || [])
    .filter((membership) => membership.status === 'active')
    .map((membership) => membership.areaId);

  const areaKnowledge = [];
  for (const areaId of areaIds) {
    const area = await getArea(areaId);
    if (area && area.knowledgeBase) {
      areaKnowledge.push(`## ${area.name}\n${area.knowledgeBase}`);
    }
  }

  const globalKnowledge = (await staffStore().get('helferbereich-knowledge', { type: 'json' })) || '';

  const system =
    'Du bist der interne Info-Bot fuer die Helfer und Bereichsleiter des Festivals "s\'Freibad tanzt". ' +
    'Beantworte Fragen ausschliesslich anhand der folgenden Wissensbasis (allgemeine Infos plus die ' +
    'Bereiche der fragenden Person). Wenn die Antwort nicht darin steht, sag ehrlich, dass du es nicht ' +
    'weisst, und verweise auf die Bereichsleitung. Antworte kurz, konkret, auf Deutsch.\n\n' +
    '## Allgemein\n' +
    globalKnowledge +
    '\n\n' +
    areaKnowledge.join('\n\n');

  const result = await askClaude({ model: MODEL, system, question, maxTokens: 500 });
  if (result.error) {
    return json({ error: 'Der Chatbot ist gerade nicht verfügbar.' }, 503);
  }
  return json({ answer: result.answer });
};
