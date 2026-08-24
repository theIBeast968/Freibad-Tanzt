import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { json, staffStore } from './lib/staff-auth.js';
import { askClaude } from './lib/claude.js';

const MAX_PER_DAY = 20;
const MODEL = 'claude-haiku-4-5-20251001';

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

function ipHash(request) {
  const ip = request.headers.get('x-nf-client-connection-ip') || 'unknown';
  return createHash('sha256').update(ip).digest('hex').slice(0, 16);
}

let knowledgeCache = null;
function loadKnowledge() {
  if (knowledgeCache !== null) {
    return knowledgeCache;
  }
  try {
    knowledgeCache = readFileSync(new URL('../../content/chatbot-public-knowledge.md', import.meta.url), 'utf8');
  } catch (e) {
    knowledgeCache = '';
  }
  return knowledgeCache;
}

export default async (request) => {
  if (request.method !== 'POST') {
    return json({ error: 'Method not allowed' }, 405);
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

  const store = staffStore();
  const rateKey = `chatbot-rate-${todayKey()}-${ipHash(request)}`;
  const count = (await store.get(rateKey, { type: 'json' })) || 0;
  if (count >= MAX_PER_DAY) {
    return json({ error: 'Limit erreicht, bitte später nochmal versuchen.' }, 429);
  }
  await store.setJSON(rateKey, count + 1);

  const system =
    'Du bist der Info-Bot fuer das Festival "s\'Freibad tanzt" in Langenburg. ' +
    'Beantworte Fragen von Festivalgaesten ausschliesslich anhand der folgenden Wissensbasis. ' +
    'Wenn die Antwort nicht in der Wissensbasis steht, sag ehrlich, dass du es nicht weisst, ' +
    'und verweise auf die Kontaktmoeglichkeiten der Website. Antworte kurz, freundlich, auf Deutsch.\n\n' +
    loadKnowledge();

  const result = await askClaude({ model: MODEL, system, question, maxTokens: 400 });
  if (result.error) {
    return json({ error: 'Der Chatbot ist gerade nicht verfügbar.' }, 503);
  }
  return json({ answer: result.answer });
};
