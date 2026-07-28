import { verifyStaffToken } from './lib/jwt.js';
import { getUser, json, staffConfigOk } from './lib/staff-auth.js';

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

  const user = await getUser(payload.email);
  if (!user) {
    return json({ error: 'Unauthorized' }, 401);
  }

  return json({
    user: {
      name: user.name,
      firstName: user.firstName || null,
      lastName: user.lastName || null,
      phone: user.phone || null,
      email: user.email,
      createdAt: user.createdAt || null,
    },
  });
};
