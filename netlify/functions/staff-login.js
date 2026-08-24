import { signStaffToken } from './lib/jwt.js';
import {
  getUser,
  isValidEmail,
  json,
  normalizeEmail,
  publicUser,
  resolveRole,
  saveUser,
  staffConfigOk,
  verifyPassword,
} from './lib/staff-auth.js';

export default async (request) => {
  if (request.method !== 'POST') {
    return json({ error: 'Method not allowed' }, 405);
  }

  if (!staffConfigOk()) {
    console.error('staff-login: missing STAFF_JWT_SECRET or STAFF_INVITE_CODE');
    return json({ error: 'Server misconfigured' }, 503);
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: 'Invalid body' }, 400);
  }

  const email = normalizeEmail(body && body.email);
  const password = body && typeof body.password === 'string' ? body.password : '';

  if (!isValidEmail(email) || !password) {
    return json({ error: 'E-Mail und Passwort erforderlich.' }, 400);
  }

  const user = await getUser(email);
  if (!user || !verifyPassword(password, user.passwordHash)) {
    return json({ error: 'E-Mail oder Passwort falsch.' }, 401);
  }

  const role = resolveRole(user);

  // Nur explizit 'pending' sperrt den Login. Accounts ohne accountStatus-Feld
  // (aus der Zeit vor dieser Freischaltungspflicht) bleiben bewusst nutzbar.
  if (user.accountStatus === 'pending' && role !== 'admin') {
    return json({ error: 'Deine Registrierung wartet noch auf Freischaltung durch den Admin.' }, 403);
  }

  if (user.role !== role) {
    await saveUser({ ...user, role });
  }

  const token = signStaffToken(
    process.env.STAFF_JWT_SECRET,
    user.email,
    user.name || `${user.firstName || ''} ${user.lastName || ''}`.trim(),
    role
  );
  return json({
    token,
    user: publicUser({ ...user, role }),
    expiresInSeconds: 8 * 3600,
  });
};
