import {
  areaSummary,
  getArea,
  json,
  listAreas,
  requireAdmin,
  saveArea,
  saveAreasIndex,
} from './lib/staff-auth.js';

const ALLOWED_PHASES = new Set(['aufbau', 'freitag', 'samstag', 'sonntag', 'abbau']);

export default async (request) => {
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

  const id = body && typeof body.id === 'string' ? body.id : '';
  const area = await getArea(id);
  if (!area) {
    return json({ error: 'Bereich nicht gefunden.' }, 404);
  }

  const updated = { ...area };

  if (typeof body.name === 'string') {
    const name = body.name.trim();
    if (name.length < 2 || name.length > 80) {
      return json({ error: 'Name muss 2-80 Zeichen haben.' }, 400);
    }
    updated.name = name;
  }
  if (typeof body.active === 'boolean') {
    updated.active = body.active;
  }
  if (body.type === 'operational' || body.type === 'planning') {
    updated.type = body.type;
    if (body.type === 'planning') {
      updated.phases = [];
    }
  }
  if (Array.isArray(body.phases) && updated.type !== 'planning') {
    updated.phases = body.phases.filter((phase) => ALLOWED_PHASES.has(phase));
  }
  if (typeof body.parentPlanningAreaId === 'string' || body.parentPlanningAreaId === null) {
    updated.parentPlanningAreaId = body.parentPlanningAreaId || null;
  }
  if (typeof body.description === 'string') {
    updated.description = body.description.trim().slice(0, 2000);
  }
  if (typeof body.knowledgeBase === 'string') {
    updated.knowledgeBase = body.knowledgeBase.trim().slice(0, 8000);
  }
  if (Array.isArray(body.extraFieldDefs)) {
    updated.extraFieldDefs = body.extraFieldDefs
      .filter((field) => field && typeof field.key === 'string' && typeof field.label === 'string')
      .slice(0, 20)
      .map((field) => ({ key: field.key.trim(), label: field.label.trim() }));
  }

  updated.updatedAt = new Date().toISOString();
  await saveArea(updated);

  const index = await listAreas();
  const idx = index.findIndex((entry) => entry.id === id);
  if (idx >= 0) {
    index[idx] = areaSummary(updated);
    await saveAreasIndex(index);
  }

  return json({ ok: true, area: updated, areas: index });
};
