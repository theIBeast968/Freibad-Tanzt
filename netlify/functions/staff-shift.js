import { verifyStaffToken } from './lib/jwt.js';
import {
  json,
  normalizeEmail,
  staffConfigOk,
  staffStore,
} from './lib/staff-auth.js';

export default async (request) => {
  if (request.method !== 'POST') {
    return json({ error: 'Method not allowed' }, 405);
  }

  const secret = process.env.STAFF_JWT_SECRET;
  if (!staffConfigOk() || !secret) {
    return json({ error: 'Server misconfigured' }, 503);
  }

  const auth = request.headers.get('authorization') || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7).trim() : '';
  const payload = verifyStaffToken(token, secret);
  if (!payload || !payload.email) {
    return json({ error: 'Unauthorized' }, 401);
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: 'Invalid body' }, 400);
  }

  const day = body && typeof body.day === 'string' ? body.day.trim() : '';
  const area = body && typeof body.area === 'string' ? body.area.trim() : '';
  const note = body && typeof body.note === 'string' ? body.note.trim().slice(0, 500) : '';
  const phone = body && typeof body.phone === 'string' ? body.phone.trim().slice(0, 40) : '';

  const allowedDays = new Set(['freitag', 'samstag', 'sonntag', 'aufbau', 'abbau']);
  const allowedAreas = new Set([
    'einlass',
    'bar',
    'technik',
    'camping',
    'food',
    'familientag',
    'sonstiges',
  ]);

  if (!allowedDays.has(day) || !allowedAreas.has(area)) {
    return json({ error: 'Bitte Tag und Bereich wählen.' }, 400);
  }

  const email = normalizeEmail(payload.email);
  const entry = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    email,
    name: payload.name || '',
    day,
    area,
    phone,
    note,
    createdAt: new Date().toISOString(),
  };

  const store = staffStore();
  const key = `shifts-${email}`;
  const existing = (await store.get(key, { type: 'json' })) || [];
  existing.push(entry);
  await store.setJSON(key, existing);

  const allKey = 'shifts-all';
  const all = (await store.get(allKey, { type: 'json' })) || [];
  all.push(entry);
  await store.setJSON(allKey, all.slice(-500));

  return json({ ok: true, entry, shifts: existing });
};
