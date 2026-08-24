import {
  ensureOriginsSeeded,
  json,
  requireAdmin,
  requireStaffUser,
  staffStore,
} from './lib/staff-auth.js';

export default async (request) => {
  if (request.method === 'GET') {
    const auth = await requireStaffUser(request);
    if (auth.error) {
      return auth.error;
    }
    return json({ origins: await ensureOriginsSeeded() });
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

  const value = body && typeof body.origin === 'string' ? body.origin.trim() : '';
  if (!value || value.length > 60) {
    return json({ error: 'Ungültige Herkunft.' }, 400);
  }
  const action = body && body.action === 'remove' ? 'remove' : 'add';

  const origins = await ensureOriginsSeeded();
  const next =
    action === 'remove'
      ? origins.filter((entry) => entry !== value)
      : origins.includes(value)
        ? origins
        : [...origins, value];

  await staffStore().setJSON('origins-index', next);
  return json({ ok: true, origins: next });
};
