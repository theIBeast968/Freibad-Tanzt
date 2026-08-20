import { json, requireAreaMember, staffStore } from './lib/staff-auth.js';

export default async (request) => {
  if (request.method !== 'GET') {
    return json({ error: 'Method not allowed' }, 405);
  }

  const url = new URL(request.url);
  const areaId = url.searchParams.get('areaId') || '';
  const phase = url.searchParams.get('phase') || '';

  if (!areaId) {
    return json({ error: 'Bereich fehlt.' }, 400);
  }

  const auth = await requireAreaMember(request, areaId);
  if (auth.error) {
    return auth.error;
  }

  const shifts = (await staffStore().get(`shifts-area-${areaId}`, { type: 'json' })) || [];
  const filtered = phase ? shifts.filter((shift) => shift.phase === phase) : shifts;
  return json({ shifts: filtered });
};
