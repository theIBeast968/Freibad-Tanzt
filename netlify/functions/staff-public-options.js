import { ensureOriginsSeeded, json, listAreas } from './lib/staff-auth.js';

export default async (request) => {
  if (request.method !== 'GET') {
    return json({ error: 'Method not allowed' }, 405);
  }

  const areas = (await listAreas())
    .filter((area) => area.active && area.type === 'operational')
    .map((area) => ({ id: area.id, name: area.name }));
  const origins = await ensureOriginsSeeded();

  return json({ areas, origins, vapidPublicKey: process.env.VAPID_PUBLIC_KEY || null });
};
