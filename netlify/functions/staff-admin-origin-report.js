import { getUser, json, requireAdmin, staffStore } from './lib/staff-auth.js';

export default async (request) => {
  if (request.method !== 'GET') {
    return json({ error: 'Method not allowed' }, 405);
  }

  const auth = await requireAdmin(request);
  if (auth.error) {
    return auth.error;
  }

  const store = staffStore();
  const index = (await store.get('users-index', { type: 'json' })) || [];
  const counts = {};
  for (const email of index) {
    const user = await getUser(email);
    if (!user) continue;
    const origin = user.origin || 'Unbekannt';
    counts[origin] = (counts[origin] || 0) + 1;
  }

  const report = Object.keys(counts)
    .sort()
    .map((origin) => ({ origin, count: counts[origin] }));

  return json({ report, total: index.length });
};
