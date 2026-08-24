import { getArea, json, requireStaffUser, saveUser } from './lib/staff-auth.js';

const MAX_MEMBERSHIPS = 5;

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

  const areaId = typeof body.areaId === 'string' ? body.areaId : '';
  const area = await getArea(areaId);
  if (!area || !area.active || area.type !== 'operational') {
    return json({ error: 'Bitte einen gültigen Bereich wählen.' }, 400);
  }

  const memberships = Array.isArray(auth.user.areaMemberships) ? auth.user.areaMemberships.slice() : [];
  const existing = memberships.find((membership) => membership.areaId === areaId);
  if (existing) {
    return json({ error: 'Du bist diesem Bereich bereits zugeordnet.' }, 400);
  }
  if (memberships.length >= MAX_MEMBERSHIPS) {
    return json({ error: `Du kannst maximal ${MAX_MEMBERSHIPS} Bereichen zugeordnet sein.` }, 400);
  }

  const now = new Date().toISOString();
  memberships.push({ areaId, status: 'pending', isLeiter: false, requestedAt: now });
  await saveUser({ ...auth.user, areaMemberships: memberships });

  return json({ ok: true, areaId, status: 'pending' });
};
