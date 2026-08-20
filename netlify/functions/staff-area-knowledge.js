import { getArea, json, requireAreaLeiter, saveArea } from './lib/staff-auth.js';

export default async (request) => {
  if (request.method !== 'POST') {
    return json({ error: 'Method not allowed' }, 405);
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: 'Invalid body' }, 400);
  }

  const areaId = typeof body.areaId === 'string' ? body.areaId : '';
  const auth = await requireAreaLeiter(request, areaId);
  if (auth.error) {
    return auth.error;
  }

  const area = await getArea(areaId);
  if (!area) {
    return json({ error: 'Bereich nicht gefunden.' }, 404);
  }

  const knowledgeBase = typeof body.knowledgeBase === 'string' ? body.knowledgeBase.trim().slice(0, 8000) : '';
  const updated = { ...area, knowledgeBase, updatedAt: new Date().toISOString() };
  await saveArea(updated);

  return json({ ok: true, area: updated });
};
