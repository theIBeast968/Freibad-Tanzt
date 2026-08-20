import { json, requireAdmin, staffStore } from './lib/staff-auth.js';

export default async (request) => {
  if (request.method === 'GET') {
    const auth = await requireAdmin(request);
    if (auth.error) {
      return auth.error;
    }
    const knowledge = (await staffStore().get('helferbereich-knowledge', { type: 'json' })) || '';
    return json({ knowledge });
  }

  if (request.method !== 'POST') {
    return json({ error: 'Method not allowed' }, 405);
  }

  const auth = await requireAdmin(request);
  if (auth.error) {
    return auth.error;
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: 'Invalid body' }, 400);
  }

  const knowledge = typeof body.knowledge === 'string' ? body.knowledge.trim().slice(0, 8000) : '';
  await staffStore().setJSON('helferbereich-knowledge', knowledge);

  return json({ ok: true, knowledge });
};
