import { signStaffToken } from './lib/jwt.js';
import {
  getUser,
  isValidEmail,
  json,
  normalizeEmail,
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

  const token = signStaffToken(
    process.env.STAFF_JWT_SECRET,
    user.email,
    user.name
  );
  return json({
    token,
    user: { name: user.name, email: user.email },
    expiresInSeconds: 8 * 3600,
  });
};
