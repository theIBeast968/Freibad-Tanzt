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
