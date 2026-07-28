import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';
import { getStore } from '@netlify/blobs';

export function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
    },
  });
}

export function staffStore() {
  return getStore('sfreibad-staff');
}

export function normalizeEmail(email) {
  return String(email || '')
    .trim()
    .toLowerCase();
}

export function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function hashPassword(password) {
  const salt = randomBytes(16).toString('hex');
  const hash = scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

export function verifyPassword(password, stored) {
  if (!stored || typeof stored !== 'string' || !stored.includes(':')) {
    return false;
  }
  const [salt, hash] = stored.split(':');
  if (!salt || !hash) {
    return false;
  }
  const check = scryptSync(password, salt, 64);
  const expected = Buffer.from(hash, 'hex');
  if (check.length !== expected.length) {
    return false;
  }
  return timingSafeEqual(check, expected);
}

export function userKey(email) {
  return `user-${normalizeEmail(email)}`;
}

export async function getUser(email) {
  return staffStore().get(userKey(email), { type: 'json' });
}

export async function saveUser(user) {
  const store = staffStore();
  const email = normalizeEmail(user.email);
  await store.setJSON(userKey(email), {
    ...user,
    email,
  });

  const index = (await store.get('users-index', { type: 'json' })) || [];
  if (!index.includes(email)) {
    index.push(email);
    await store.setJSON('users-index', index);
  }
}

export async function listUsers() {
  const store = staffStore();
  const index = (await store.get('users-index', { type: 'json' })) || [];
  const users = [];
  for (const email of index) {
    const user = await getUser(email);
    if (user) {
      users.push(publicUser(user));
    }
  }
  users.sort((a, b) => String(a.name || '').localeCompare(String(b.name || ''), 'de'));
  return users;
}

export function publicUser(user) {
  return {
    email: user.email,
    name: user.name || `${user.firstName || ''} ${user.lastName || ''}`.trim(),
    firstName: user.firstName || null,
    lastName: user.lastName || null,
    phone: user.phone || null,
    role: resolveRole(user),
    createdAt: user.createdAt || null,
  };
}

export function resolveRole(user) {
  const admins = String(process.env.STAFF_ADMIN_EMAILS || '')
    .split(',')
    .map((entry) => normalizeEmail(entry))
    .filter(Boolean);
  if (admins.includes(normalizeEmail(user.email))) {
    return 'admin';
  }
  return user.role === 'admin' ? 'admin' : 'staff';
}

export async function requireStaffUser(request) {
  const secret = process.env.STAFF_JWT_SECRET;
  if (!staffConfigOk() || !secret) {
    return { error: json({ error: 'Server misconfigured' }, 503) };
  }
  const auth = request.headers.get('authorization') || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7).trim() : '';
  const { verifyStaffToken } = await import('./jwt.js');
  const payload = verifyStaffToken(token, secret);
  if (!payload || !payload.email) {
    return { error: json({ error: 'Unauthorized' }, 401) };
  }
  const user = await getUser(payload.email);
  if (!user) {
    return { error: json({ error: 'Unauthorized' }, 401) };
  }
  const role = resolveRole(user);
  return {
    secret,
    payload,
    user: { ...user, role },
    publicUser: publicUser({ ...user, role }),
  };
}

export async function requireAdmin(request) {
  const result = await requireStaffUser(request);
  if (result.error) {
    return result;
  }
  if (result.user.role !== 'admin') {
    return { error: json({ error: 'Nur für Admins.' }, 403) };
  }
  return result;
}

export function staffConfigOk() {
  const secret = process.env.STAFF_JWT_SECRET;
  const invite = process.env.STAFF_INVITE_CODE;
  return Boolean(
    secret &&
      secret.length >= 16 &&
      invite &&
      invite.length >= 6
  );
}
