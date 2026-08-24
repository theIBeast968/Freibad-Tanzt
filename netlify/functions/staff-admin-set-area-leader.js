import { grantAreaLeader, isValidEmail, json, normalizeEmail, requireAdmin } from './lib/staff-auth.js';
import { notifyUser } from './lib/push-send.js';

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

  const result = await grantAreaLeader(areaId, email, isLeiter, auth.user.email);
  if (result.error) {
    return json({ error: result.error }, result.error.includes('nicht gefunden') ? 404 : 400);
  }

  if (isLeiter) {
    await notifyUser(email, {
      title: 'Bereichsleiter-Freigabe',
      body: `Du bist jetzt Bereichsleiter für ${result.area.name}.`,
      url: '/mitarbeiter.html#mein-bereich',
    });
  }

  return json({ ok: true, area: result.area, email, isLeiter });
};
