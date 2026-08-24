import { safePasswordEqual } from './lib/jwt.js';
import {
  ensureOriginsSeeded,
  getUser,
  hashPassword,
  isValidEmail,
  json,
  normalizeEmail,
  resolveRole,
  saveUser,
  staffConfigOk,
} from './lib/staff-auth.js';
import { notifyAdmins } from './lib/push-send.js';

function cleanNamePart(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function cleanPhone(value) {
  return typeof value === 'string' ? value.trim().replace(/\s+/g, ' ') : '';
}

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

  const firstName = cleanNamePart(body && body.firstName);
  const lastName = cleanNamePart(body && body.lastName);
  const phone = cleanPhone(body && body.phone);
  const email = normalizeEmail(body && body.email);
  const password = body && typeof body.password === 'string' ? body.password : '';
  const inviteCode =
    body && typeof body.inviteCode === 'string' ? body.inviteCode.trim() : '';
  const origin = body && typeof body.origin === 'string' ? body.origin.trim() : '';
  const consentAccepted = Boolean(body && body.consentAccepted === true);

  if (firstName.length < 2 || firstName.length > 60) {
    return json({ error: 'Bitte einen gültigen Vornamen angeben.' }, 400);
  }
  if (lastName.length < 2 || lastName.length > 60) {
    return json({ error: 'Bitte einen gültigen Nachnamen angeben.' }, 400);
  }
  if (phone.length < 6 || phone.length > 40) {
    return json({ error: 'Bitte eine gültige Telefonnummer angeben.' }, 400);
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
  if (!consentAccepted) {
    return json({ error: 'Bitte der Datenspeicherung zustimmen.' }, 400);
  }

  const origins = await ensureOriginsSeeded();
  if (!origins.includes(origin)) {
    return json({ error: 'Bitte eine gültige Herkunft wählen.' }, 400);
  }

  const existing = await getUser(email);
  if (existing) {
    return json({ error: 'Für diese E-Mail existiert bereits ein Konto.' }, 409);
  }

  const now = new Date().toISOString();
  const name = `${firstName} ${lastName}`.trim();

  // Admins (STAFF_ADMIN_EMAILS) schalten sich selbst frei, sonst koennte der allererste
  // Admin von niemandem freigeschaltet werden. Alle anderen starten als 'pending' und
  // brauchen eine explizite Admin-Bestaetigung, bevor ein Login moeglich ist.
  const isAdmin = resolveRole({ email, role: 'staff' }) === 'admin';

  const draft = {
    firstName,
    lastName,
    name,
    phone,
    email,
    origin,
    consentAcceptedAt: now,
    consentVersion: '1',
    areaMemberships: [],
    accountStatus: isAdmin ? 'approved' : 'pending',
    role: 'staff',
    passwordHash: hashPassword(password),
    createdAt: now,
  };
  draft.role = resolveRole(draft);

  await saveUser(draft);

  if (!isAdmin) {
    await notifyAdmins({
      title: 'Neue Registrierung',
      body: `${name} wartet auf Freischaltung.`,
      url: '/mitarbeiter.html#admin-registrations',
    });
  }

  return json({ ok: true, pending: !isAdmin });
};
