import {
  getUser,
  json,
  normalizeEmail,
  requireAreaLeiter,
  saveUser,
  staffStore,
} from './lib/staff-auth.js';

async function allUserRecords() {
  const store = staffStore();
  const index = (await store.get('users-index', { type: 'json' })) || [];
  const users = [];
  for (const email of index) {
    const user = await getUser(email);
    if (user) {
      users.push(user);
    }
  }
  return users;
}

export default async (request) => {
  const url = new URL(request.url);

  if (request.method === 'GET') {
    const areaId = url.searchParams.get('areaId') || '';
    const auth = await requireAreaLeiter(request, areaId);
    if (auth.error) {
      return auth.error;
    }

    const users = await allUserRecords();
    const members = [];
    users.forEach((user) => {
      const membership = (user.areaMemberships || []).find((entry) => entry.areaId === areaId);
      if (!membership) {
        return;
      }
      members.push({
        email: user.email,
        name: user.name || `${user.firstName || ''} ${user.lastName || ''}`.trim(),
        phone: user.phone || null,
        origin: user.origin || null,
        status: membership.status,
        isLeiter: Boolean(membership.isLeiter),
        requestedAt: membership.requestedAt || null,
      });
    });
    return json({ members });
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

  const areaId = body && typeof body.areaId === 'string' ? body.areaId : '';
  const auth = await requireAreaLeiter(request, areaId);
  if (auth.error) {
    return auth.error;
  }

  const email = normalizeEmail(body && body.email);
  const action = body && body.action === 'reject' ? 'reject' : 'approve';

  const user = await getUser(email);
  if (!user) {
    return json({ error: 'Mitarbeiter nicht gefunden.' }, 404);
  }

  const memberships = Array.isArray(user.areaMemberships) ? user.areaMemberships.slice() : [];
  const idx = memberships.findIndex((entry) => entry.areaId === areaId);
  if (idx < 0) {
    return json({ error: 'Keine Anfrage für diesen Bereich gefunden.' }, 404);
  }

  if (action === 'reject') {
    memberships.splice(idx, 1);
  } else {
    memberships[idx] = {
      ...memberships[idx],
      status: 'active',
      approvedAt: new Date().toISOString(),
      approvedBy: auth.user.email,
    };
  }

  await saveUser({ ...user, areaMemberships: memberships });
  return json({ ok: true, email, action });
};
