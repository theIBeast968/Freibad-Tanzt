import { signStatsToken, safePasswordEqual } from './lib/jwt.js';

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store'
    }
  });
}

export default async (request) => {
  if (request.method !== 'POST') {
    return json({ error: 'Method not allowed' }, 405);
  }

  const secret = process.env.STATS_JWT_SECRET;
  const expected = process.env.STATS_PASSWORD;
  if (!secret || secret.length < 16 || !expected || expected.length < 8) {
    console.error('stats-login: missing STATS_JWT_SECRET or STATS_PASSWORD');
    return json({ error: 'Server misconfigured' }, 503);
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: 'Invalid body' }, 400);
  }

  const password = body && typeof body.password === 'string' ? body.password : '';
  if (!safePasswordEqual(password, expected)) {
    return json({ error: 'Unauthorized' }, 401);
  }

  const token = signStatsToken(secret);
  return json({ token, expiresInSeconds: 8 * 3600 });
};
