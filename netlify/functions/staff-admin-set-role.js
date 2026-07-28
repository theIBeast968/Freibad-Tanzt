import {
  getUser,
  isValidEmail,
  json,
  normalizeEmail,
  requireAdmin,
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

  const email = normalizeEmail(body && body.email);
  const role = body && body.role === 'admin' ? 'admin' : 'staff';

  if (!isValidEmail(email)) {
    return json({ error: 'Ungültige E-Mail.' }, 400);
  }
  if (email === normalizeEmail(auth.user.email) && role !== 'admin') {
    return json({ error: 'Du kannst dir selbst nicht den Admin entziehen.' }, 400);
  }

  const user = await getUser(email);
  if (!user) {
    return json({ error: 'Mitarbeiter nicht gefunden.' }, 404);
  }

  await saveUser({ ...user, role });
  return json({ ok: true, email, role });
};
