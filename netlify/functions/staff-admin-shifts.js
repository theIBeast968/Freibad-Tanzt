import { json, requireAdmin, staffStore } from './lib/staff-auth.js';

export default async (request) => {
  if (request.method !== 'GET') {
    return json({ error: 'Method not allowed' }, 405);
  }

  const auth = await requireAdmin(request);
  if (auth.error) {
    return auth.error;
  }

  const shifts = (await staffStore().get('shifts-all', { type: 'json' })) || [];
  return json({
    shifts: shifts.slice().reverse(),
  });
};
