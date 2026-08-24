import { verifyStaffToken } from './lib/jwt.js';
import { activeMembership, getUser, resolveRole, staffConfigOk } from './lib/staff-auth.js';
import { mediaKey, mediaStore } from './lib/media-store.js';

// Liefert Bilder/Videos aus. Akzeptiert das JWT wahlweise per Authorization-Header
// (normale Fetch-Aufrufe) oder als ?token=-Query-Parameter, damit <img>/<video>
// die Datei direkt laden koennen, ohne dass der Browser den Header mitschickt.
export default async (request) => {
  if (request.method !== 'GET') {
    return new Response('Method not allowed', { status: 405 });
  }

  const url = new URL(request.url);
  const id = url.searchParams.get('id') || '';
  if (!id || !staffConfigOk()) {
    return new Response('Not found', { status: 404 });
  }

  const secret = process.env.STAFF_JWT_SECRET;
  const headerAuth = request.headers.get('authorization') || '';
  const token = headerAuth.startsWith('Bearer ')
    ? headerAuth.slice(7).trim()
    : url.searchParams.get('token') || '';
  const payload = verifyStaffToken(token, secret);
  if (!payload || !payload.email) {
    return new Response('Unauthorized', { status: 401 });
  }

  const result = await mediaStore().getWithMetadata(mediaKey(id), { type: 'arrayBuffer' });
  if (!result) {
    return new Response('Not found', { status: 404 });
  }

  const areaId = result.metadata && result.metadata.areaId;
  if (areaId) {
    const user = await getUser(payload.email);
    if (!user) {
      return new Response('Unauthorized', { status: 401 });
    }
    const role = resolveRole(user);
    if (role !== 'admin' && !activeMembership(user, areaId)) {
      return new Response('Forbidden', { status: 403 });
    }
  }

  return new Response(result.data, {
    status: 200,
    headers: {
      'Content-Type': (result.metadata && result.metadata.contentType) || 'application/octet-stream',
      'Cache-Control': 'private, max-age=3600',
    },
  });
};
