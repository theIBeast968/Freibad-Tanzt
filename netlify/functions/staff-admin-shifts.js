import { json, requireAdmin, staffStore } from './lib/staff-auth.js';

export default async (request) => {
  if (request.method !== 'GET') {
    return json({ error: 'Method not allowed' }, 405);
  }

  const auth = await requireAdmin(request);
  if (auth.error) {
    return auth.error;
  }

  const url = new URL(request.url);
  const areaId = url.searchParams.get('areaId') || '';
  const phase = url.searchParams.get('phase') || '';

  let shifts = (await staffStore().get('shifts-all', { type: 'json' })) || [];
  shifts = shifts.filter((shift) => typeof shift.areaId === 'string' && typeof shift.station === 'string');
  if (areaId) {
    shifts = shifts.filter((shift) => shift.areaId === areaId);
  }
  if (phase) {
    shifts = shifts.filter((shift) => shift.phase === phase);
  }

  return json({ shifts: shifts.slice().reverse() });
};
