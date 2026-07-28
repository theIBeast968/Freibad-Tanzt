import { createHmac, timingSafeEqual } from 'node:crypto';

const b64url = (str) => Buffer.from(str, 'utf8').toString('base64url');

export function signToken(secret, scope, extra = {}, ttlSeconds = 8 * 3600) {
  const header = b64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const now = Math.floor(Date.now() / 1000);
  const payload = b64url(
    JSON.stringify({
      scope,
      ...extra,
      iat: now,
      exp: now + ttlSeconds,
    })
  );
  const data = `${header}.${payload}`;
  const sig = createHmac('sha256', secret).update(data).digest('base64url');
  return `${data}.${sig}`;
}

export function verifyToken(token, secret, expectedScope) {
  if (!token || typeof token !== 'string') {
    return null;
  }
  const parts = token.split('.');
  if (parts.length !== 3) {
    return null;
  }
  const [h, p, s] = parts;
  const data = `${h}.${p}`;
  const expected = createHmac('sha256', secret).update(data).digest('base64url');
  const sigBuf = Buffer.from(s, 'base64url');
  const expBuf = Buffer.from(expected, 'base64url');
  if (sigBuf.length !== expBuf.length || !timingSafeEqual(sigBuf, expBuf)) {
    return null;
  }
  try {
    const payload = JSON.parse(Buffer.from(p, 'base64url').toString('utf8'));
    if (payload.scope !== expectedScope) {
      return null;
    }
    if (payload.exp < Math.floor(Date.now() / 1000)) {
      return null;
    }
    return payload;
  } catch {
    return null;
  }
}

export function signStatsToken(secret) {
  return signToken(secret, 'stats');
}

export function verifyStatsToken(token, secret) {
  return verifyToken(token, secret, 'stats');
}

export function signStaffToken(secret, email, name) {
  return signToken(secret, 'staff', { email, name });
}

export function verifyStaffToken(token, secret) {
  return verifyToken(token, secret, 'staff');
}

export function safePasswordEqual(a, b) {
  const ba = Buffer.from(String(a), 'utf8');
  const bb = Buffer.from(String(b), 'utf8');
  if (ba.length !== bb.length) {
    return false;
  }
  return timingSafeEqual(ba, bb);
}
