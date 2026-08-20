import { randomBytes } from 'node:crypto';
import { getArea, json, requireStaffUser, staffStore } from './lib/staff-auth.js';
import { notifyAdmins } from './lib/push-send.js';

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

  const areaId = body && typeof body.areaId === 'string' && body.areaId ? body.areaId : null;
  let areaName = null;
  if (areaId) {
    const area = await getArea(areaId);
    if (!area) {
      return json({ error: 'Bereich nicht gefunden.' }, 404);
    }
    areaName = area.name;
  }

  const store = staffStore();
  const applications = (await store.get('leader-applications-index', { type: 'json' })) || [];
  const now = new Date().toISOString();
  const application = {
    id: `${Date.now()}-${randomBytes(3).toString('hex')}`,
    email: auth.user.email,
    name: auth.user.name || auth.user.email,
    areaId,
    status: 'pending',
    requestedAt: now,
  };
  applications.push(application);
  await store.setJSON('leader-applications-index', applications);

  await notifyAdmins({
    title: 'Bereichsleiter-Bewerbung',
    body: `${application.name} möchte Bereichsleiter werden${areaName ? ` (${areaName})` : ''}.`,
    url: '/mitarbeiter.html#admin-leader-applications',
  });

  return json({ ok: true, application });
};
