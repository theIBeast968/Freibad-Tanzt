import {
  areaSummary,
  getArea,
  getUser,
  isValidEmail,
  json,
  listAreas,
  normalizeEmail,
  requireAdmin,
  saveArea,
  saveAreasIndex,
  saveUser,
} from './lib/staff-auth.js';

export default async (request) => {
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

  const areaId = body && typeof body.areaId === 'string' ? body.areaId : '';
  const email = normalizeEmail(body && body.email);
  const isLeiter = Boolean(body && body.isLeiter);

  if (!areaId || !isValidEmail(email)) {
    return json({ error: 'Bereich und E-Mail erforderlich.' }, 400);
  }

  const area = await getArea(areaId);
  if (!area) {
    return json({ error: 'Bereich nicht gefunden.' }, 404);
  }
  const user = await getUser(email);
  if (!user) {
    return json({ error: 'Mitarbeiter nicht gefunden.' }, 404);
  }

  const now = new Date().toISOString();
  const memberships = Array.isArray(user.areaMemberships) ? user.areaMemberships.slice() : [];
  const idx = memberships.findIndex((membership) => membership.areaId === areaId);
  if (idx >= 0) {
    memberships[idx] = {
      ...memberships[idx],
      isLeiter,
      status: 'active',
      approvedAt: memberships[idx].approvedAt || now,
      approvedBy: auth.user.email,
    };
  } else {
    memberships.push({
      areaId,
      status: 'active',
      isLeiter,
      requestedAt: now,
      approvedAt: now,
      approvedBy: auth.user.email,
    });
  }
  await saveUser({ ...user, areaMemberships: memberships });

  const leaderEmails = new Set(area.leaderEmails || []);
  if (isLeiter) {
    leaderEmails.add(email);
  } else {
    leaderEmails.delete(email);
  }
  const updatedArea = { ...area, leaderEmails: [...leaderEmails], updatedAt: now };
  await saveArea(updatedArea);

  const index = await listAreas();
  const indexIdx = index.findIndex((entry) => entry.id === areaId);
  if (indexIdx >= 0) {
    index[indexIdx] = areaSummary(updatedArea);
    await saveAreasIndex(index);
  }

  return json({ ok: true, area: updatedArea, email, isLeiter });
};
