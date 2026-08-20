import { getUser, isValidEmail, json, normalizeEmail, requireAdmin, staffStore } from './lib/staff-auth.js';
import { notifyUser } from './lib/push-send.js';

export default async (request) => {
  if (request.method === 'GET') {
    const auth = await requireAdmin(request);
    if (auth.error) {
      return auth.error;
    }
    const store = staffStore();
    const index = (await store.get('users-index', { type: 'json' })) || [];
    const pending = [];
    for (const email of index) {
      const user = await getUser(email);
      if (user && user.accountStatus === 'pending') {
        pending.push({
          email: user.email,
          name: user.name || `${user.firstName || ''} ${user.lastName || ''}`.trim(),
          phone: user.phone || null,
          origin: user.origin || null,
          createdAt: user.createdAt || null,
        });
      }
    }
    return json({ registrations: pending });
  }

  if (request.method !== 'POST') {
    return json({ error: 'Method not allowed' }, 405);
  }

  const auth = await requireAdmin(request);
  if (auth.error) {
    return auth.error;
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: 'Invalid body' }, 400);
  }

  const email = normalizeEmail(body && body.email);
  const decision = body && body.decision === 'reject' ? 'reject' : 'approve';
  if (!isValidEmail(email)) {
    return json({ error: 'Ungültige E-Mail.' }, 400);
  }

  const user = await getUser(email);
  if (!user) {
    return json({ error: 'Registrierung nicht gefunden.' }, 404);
  }

  const store = staffStore();

  if (decision === 'reject') {
    await store.delete(`user-${email}`);
    const index = (await store.get('users-index', { type: 'json' })) || [];
    await store.setJSON(
      'users-index',
      index.filter((entry) => entry !== email)
    );
    return json({ ok: true, email, decision });
  }

  await store.setJSON(`user-${email}`, { ...user, accountStatus: 'approved' });
  await notifyUser(email, {
    title: 'Konto freigeschaltet',
    body: 'Du kannst dich jetzt im Helferbereich einloggen.',
    url: '/mitarbeiter.html',
  });

  return json({ ok: true, email, decision });
};
