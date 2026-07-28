import { verifyStaffToken } from './lib/jwt.js';
import { json, normalizeEmail, staffConfigOk, staffStore } from './lib/staff-auth.js';

export default async (request) => {
  if (request.method !== 'GET') {
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

  const email = normalizeEmail(payload.email);
  const shifts = (await staffStore().get(`shifts-${email}`, { type: 'json' })) || [];
  return json({ shifts });
};
