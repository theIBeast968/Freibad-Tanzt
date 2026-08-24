import { randomBytes } from 'node:crypto';
import { json, requireAreaLeiter, requireStaffUser } from './lib/staff-auth.js';
import { mediaKey, mediaStore } from './lib/media-store.js';

const MAX_FILE_SIZE = 8 * 1024 * 1024;
const ALLOWED_PREFIXES = ['image/', 'video/'];

export default async (request) => {
  if (request.method !== 'POST') {
    return json({ error: 'Method not allowed' }, 405);
  }

  const url = new URL(request.url);
  const areaId = url.searchParams.get('areaId') || '';

  let auth;
  if (areaId) {
    auth = await requireAreaLeiter(request, areaId);
  } else {
    auth = await requireStaffUser(request);
    if (!auth.error && !(auth.user.role === 'admin' || auth.user.canPostGlobal)) {
      auth = { error: json({ error: 'Nur für Admin oder Presseverantwortliche.' }, 403) };
    }
  }
  if (auth.error) {
    return auth.error;
  }

  const contentType = (request.headers.get('content-type') || '').split(';')[0].trim();
  if (!ALLOWED_PREFIXES.some((prefix) => contentType.startsWith(prefix))) {
    return json({ error: 'Nur Fotos und Videos erlaubt.' }, 400);
  }

  const buffer = await request.arrayBuffer();
  if (buffer.byteLength === 0) {
    return json({ error: 'Datei ist leer.' }, 400);
  }
  if (buffer.byteLength > MAX_FILE_SIZE) {
    return json({ error: `Datei zu groß (max. ${Math.floor(MAX_FILE_SIZE / (1024 * 1024))} MB).` }, 400);
  }

  const filename = decodeURIComponent(url.searchParams.get('filename') || 'datei').slice(0, 120);
  const id = `${Date.now()}-${randomBytes(4).toString('hex')}`;

  await mediaStore().set(mediaKey(id), buffer, {
    metadata: {
      contentType,
      filename,
      areaId: areaId || null,
      uploadedBy: auth.user.email,
      uploadedAt: new Date().toISOString(),
    },
  });

  return json({ ok: true, id, contentType, filename });
};
