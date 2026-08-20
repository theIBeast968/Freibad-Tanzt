import { json, requireStaffUser, staffStore } from './lib/staff-auth.js';

const KEY = 'chat-admin';
const CAP = 500;

export default async (request) => {
  const auth = await requireStaffUser(request);
  if (auth.error) {
    return auth.error;
  }
  if (auth.user.role !== 'admin') {
    return json({ error: 'Nur für Admins.' }, 403);
  }

  if (request.method === 'GET') {
    const url = new URL(request.url);
    const since = url.searchParams.get('since') || '';
    const messages = (await staffStore().get(KEY, { type: 'json' })) || [];
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

  const text = typeof body.body === 'string' ? body.body.trim().slice(0, 1000) : '';
  if (!text) {
    return json({ error: 'Nachricht darf nicht leer sein.' }, 400);
  }

  const messages = (await staffStore().get(KEY, { type: 'json' })) || [];
  const message = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    authorEmail: auth.user.email,
    authorName: auth.user.name || auth.user.email,
    body: text,
    createdAt: new Date().toISOString(),
  };
  messages.push(message);
  await staffStore().setJSON(KEY, messages.slice(-CAP));

  return json({ ok: true, message });
};
