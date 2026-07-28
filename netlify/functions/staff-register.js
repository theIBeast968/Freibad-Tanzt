import { signStaffToken, safePasswordEqual } from './lib/jwt.js';
import {
  getUser,
  hashPassword,
  isValidEmail,
  json,
  normalizeEmail,
  saveUser,
  staffConfigOk,
} from './lib/staff-auth.js';

export default async (request) => {
  if (request.method !== 'POST') {
    return json({ error: 'Method not allowed' }, 405);
  }

  if (!staffConfigOk()) {
    console.error('staff-register: missing STAFF_JWT_SECRET or STAFF_INVITE_CODE');
    return json({ error: 'Server misconfigured' }, 503);
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: 'Invalid body' }, 400);
  }

  const name = body && typeof body.name === 'string' ? body.name.trim() : '';
  const email = normalizeEmail(body && body.email);
  const password = body && typeof body.password === 'string' ? body.password : '';
  const inviteCode =
    body && typeof body.inviteCode === 'string' ? body.inviteCode.trim() : '';

  if (name.length < 2 || name.length > 80) {
    return json({ error: 'Bitte einen gültigen Namen angeben.' }, 400);
  }
  if (!isValidEmail(email)) {
    return json({ error: 'Bitte eine gültige E-Mail angeben.' }, 400);
  }
  if (password.length < 8) {
    return json({ error: 'Passwort mindestens 8 Zeichen.' }, 400);
  }
  if (!safePasswordEqual(inviteCode, process.env.STAFF_INVITE_CODE)) {
    return json({ error: 'Einladungscode ungültig.' }, 403);
  }

  const existing = await getUser(email);
  if (existing) {
    return json({ error: 'Für diese E-Mail existiert bereits ein Konto.' }, 409);
  }

  await saveUser({
    name,
    email,
    passwordHash: hashPassword(password),
    createdAt: new Date().toISOString(),
  });

  const token = signStaffToken(process.env.STAFF_JWT_SECRET, email, name);
  return json({
    token,
    user: { name, email },
    expiresInSeconds: 8 * 3600,
  });
};
