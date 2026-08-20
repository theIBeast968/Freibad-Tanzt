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
  const store = staffStore();
  const subs = (await store.get('push-subscriptions-index', { type: 'json' })) || [];
  const next = subs.filter((sub) => !(sub.endpoint === endpoint && sub.email === normalizeEmail(auth.user.email)));

  await store.setJSON('push-subscriptions-index', next);
  return json({ ok: true });
};
