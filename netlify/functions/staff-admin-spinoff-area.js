import { randomBytes } from 'node:crypto';
import {
  areaSummary,
  getArea,
  json,
  listAreas,
  requireAdmin,
  saveArea,
  saveAreasIndex,
  uniqueAreaSlug,
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

  const planningAreaId = typeof body.planningAreaId === 'string' ? body.planningAreaId : '';
  const planningArea = await getArea(planningAreaId);
  if (!planningArea || planningArea.type !== 'planning') {
    return json({ error: 'Kein gültiger Planungsbereich.' }, 400);
  }

  const name = typeof body.name === 'string' ? body.name.trim() : '';
  if (name.length < 2 || name.length > 80) {
    return json({ error: 'Name muss 2-80 Zeichen haben.' }, 400);
  }

  const phasesInput = Array.isArray(body.phases) && body.phases.length ? body.phases : ['sonntag'];
  const phases = phasesInput.filter((phase) => ALLOWED_PHASES.has(phase));

  const index = await listAreas();
  const slug = await uniqueAreaSlug(name, index);
  const now = new Date().toISOString();
  const area = {
    id: `${Date.now()}-${randomBytes(3).toString('hex')}`,
    name,
    slug,
    active: true,
    type: 'operational',
    phases: phases.length ? phases : ['sonntag'],
    parentPlanningAreaId: planningAreaId,
    leaderEmails: [],
    description: '',
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
