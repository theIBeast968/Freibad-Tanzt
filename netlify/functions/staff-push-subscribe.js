import { json, normalizeEmail, requireStaffUser, staffStore } from './lib/staff-auth.js';

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

  const endpoint = typeof body.endpoint === 'string' ? body.endpoint : '';
  const keys =
    body.keys && typeof body.keys.p256dh === 'string' && typeof body.keys.auth === 'string' ? body.keys : null;
  if (!endpoint || !keys) {
    return json({ error: 'Ungültige Subscription.' }, 400);
  }

  const store = staffStore();
  const subs = (await store.get('push-subscriptions-index', { type: 'json' })) || [];
  const idx = subs.findIndex((sub) => sub.endpoint === endpoint);
  const entry = {
    email: normalizeEmail(auth.user.email),
    endpoint,
    keys,
    subscribedChannels: { global: true, areas: [], chatAreas: [] },
    createdAt: new Date().toISOString(),
  };
  if (idx >= 0) {
    entry.subscribedChannels = subs[idx].subscribedChannels || entry.subscribedChannels;
    subs[idx] = entry;
  } else {
    subs.push(entry);
  }
  await store.setJSON('push-subscriptions-index', subs);

  return json({ ok: true, subscribedChannels: entry.subscribedChannels });
};
