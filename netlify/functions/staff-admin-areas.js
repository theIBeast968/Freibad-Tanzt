import { randomBytes } from 'node:crypto';
import {
  areaSummary,
  ensureAreasSeeded,
  json,
  listAreas,
  requireAdmin,
  requireStaffUser,
  saveArea,
  saveAreasIndex,
  uniqueAreaSlug,
} from './lib/staff-auth.js';

const ALLOWED_PHASES = new Set(['aufbau', 'freitag', 'samstag', 'sonntag', 'abbau']);

export default async (request) => {
  if (request.method === 'GET') {
    const auth = await requireStaffUser(request);
    if (auth.error) {
      return auth.error;
    }
    return json({ areas: await ensureAreasSeeded() });
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

  const name = body && typeof body.name === 'string' ? body.name.trim() : '';
  if (name.length < 2 || name.length > 80) {
    return json({ error: 'Name muss 2-80 Zeichen haben.' }, 400);
  }

  const type = body && body.type === 'planning' ? 'planning' : 'operational';
  const phasesInput = body && Array.isArray(body.phases) ? body.phases : [];
  const phases = type === 'planning' ? [] : phasesInput.filter((phase) => ALLOWED_PHASES.has(phase));
  const description = body && typeof body.description === 'string' ? body.description.trim().slice(0, 2000) : '';
  const parentPlanningAreaId =
    body && typeof body.parentPlanningAreaId === 'string' && body.parentPlanningAreaId
      ? body.parentPlanningAreaId
      : null;

  const index = await listAreas();
  const slug = await uniqueAreaSlug(name, index);
  const now = new Date().toISOString();
  const area = {
    id: `${Date.now()}-${randomBytes(3).toString('hex')}`,
    name,
    slug,
    active: true,
    type,
    phases,
    parentPlanningAreaId,
    leaderEmails: [],
    description,
    knowledgeBase: '',
    extraFieldDefs: [],
    createdAt: now,
    updatedAt: now,
  };

  await saveArea(area);
  index.push(areaSummary(area));
  await saveAreasIndex(index);

  return json({ ok: true, area, areas: index }, 201);
};
