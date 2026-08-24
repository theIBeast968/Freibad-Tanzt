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
  if (!endpoint) {
    return json({ error: 'Endpoint fehlt.' }, 400);
  }

  const channels = {
    global: Boolean(body.global),
    areas: Array.isArray(body.areas) ? body.areas.filter((area) => typeof area === 'string') : [],
    chatAreas: Array.isArray(body.chatAreas) ? body.chatAreas.filter((area) => typeof area === 'string') : [],
  };

  const store = staffStore();
  const subs = (await store.get('push-subscriptions-index', { type: 'json' })) || [];
  const idx = subs.findIndex(
    (sub) => sub.endpoint === endpoint && sub.email === normalizeEmail(auth.user.email)
  );
  if (idx < 0) {
    return json({ error: 'Subscription nicht gefunden.' }, 404);
  }
  subs[idx].subscribedChannels = channels;
  await store.setJSON('push-subscriptions-index', subs);

  return json({ ok: true, subscribedChannels: channels });
};
