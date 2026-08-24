import { json, normalizeEmail, requireAreaMember, staffStore } from './lib/staff-auth.js';
import { notifyChannel } from './lib/push-send.js';

const CAP = 300;

function keyFor(areaId) {
  return `chat-area-${areaId}`;
}

export default async (request) => {
  const url = new URL(request.url);

  if (request.method === 'GET') {
    const areaId = url.searchParams.get('areaId') || '';
    const auth = await requireAreaMember(request, areaId);
    if (auth.error) {
      return auth.error;
    }
    const since = url.searchParams.get('since') || '';
    const messages = (await staffStore().get(keyFor(areaId), { type: 'json' })) || [];
    const filtered = since ? messages.filter((message) => message.id > since) : messages;
    return json({ messages: filtered });
  }

  if (request.method !== 'POST') {
    return json({ error: 'Method not allowed' }, 405);
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: 'Invalid body' }, 400);
  }

  const areaId = typeof body.areaId === 'string' ? body.areaId : '';
  const auth = await requireAreaMember(request, areaId);
  if (auth.error) {
    return auth.error;
  }

  const text = typeof body.body === 'string' ? body.body.trim().slice(0, 1000) : '';
  if (!text) {
    return json({ error: 'Nachricht darf nicht leer sein.' }, 400);
  }

  const store = staffStore();
  const key = keyFor(areaId);
  const messages = (await store.get(key, { type: 'json' })) || [];
  const message = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    authorEmail: normalizeEmail(auth.user.email),
    authorName: auth.user.name || auth.user.email,
    body: text,
    createdAt: new Date().toISOString(),
  };
  messages.push(message);
  await store.setJSON(key, messages.slice(-CAP));

  await notifyChannel(
    { chatArea: areaId },
    { title: 'Neue Nachricht in deinem Bereichs-Chat', body: message.authorName + ': ' + message.body, url: '/mitarbeiter.html#mein-bereich' },
    message.authorEmail
  );

  return json({ ok: true, message });
};
