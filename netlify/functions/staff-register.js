import { signStaffToken, safePasswordEqual } from './lib/jwt.js';
import {
  ensureOriginsSeeded,
  getUser,
  hashPassword,
  isValidEmail,
  json,
  listAreas,
  normalizeEmail,
  publicUser,
  resolveRole,
  saveUser,
  staffConfigOk,
} from './lib/staff-auth.js';

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
  const areaId = body && typeof body.areaId === 'string' ? body.areaId.trim() : '';
  const areaIdSecondary =
    body && typeof body.areaIdSecondary === 'string' ? body.areaIdSecondary.trim() : '';
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

  const areas = await listAreas();
  const area = areas.find((entry) => entry.id === areaId && entry.active && entry.type === 'operational');
  if (!area) {
    return json({ error: 'Bitte einen gültigen Bereich wählen.' }, 400);
  }
  let areaSecondary = null;
  if (areaIdSecondary) {
    areaSecondary = areas.find(
      (entry) => entry.id === areaIdSecondary && entry.active && entry.type === 'operational' && entry.id !== areaId
    );
    if (!areaSecondary) {
      return json({ error: 'Ungültiger Zweitwunsch.' }, 400);
    }
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
  const areaMemberships = [
    { areaId: area.id, status: 'pending', isLeiter: false, requestedAt: now },
  ];
  if (areaSecondary) {
    areaMemberships.push({ areaId: areaSecondary.id, status: 'pending', isLeiter: false, requestedAt: now });
  }

  const name = `${firstName} ${lastName}`.trim();
  const draft = {
    firstName,
    lastName,
    name,
    phone,
    email,
    origin,
    consentAcceptedAt: now,
    consentVersion: '1',
    areaMemberships,
    role: 'staff',
    passwordHash: hashPassword(password),
    createdAt: now,
  };
  const role = resolveRole(draft);
  draft.role = role;

  await saveUser(draft);

  const token = signStaffToken(process.env.STAFF_JWT_SECRET, email, name, role);
  return json({
    token,
    user: publicUser(draft),
    expiresInSeconds: 8 * 3600,
  });
};
