import { randomBytes } from 'node:crypto';
import {
  getUser,
  isValidEmail,
  json,
  normalizeEmail,
  requireAdmin,
  requireStaffUser,
  staffStore,
} from './lib/staff-auth.js';

const ALLOWED_STATUS = new Set(['open', 'done']);

async function readTasks() {
  return (await staffStore().get('tasks-all', { type: 'json' })) || [];
}

async function writeTasks(tasks) {
  await staffStore().setJSON('tasks-all', tasks);
}

export default async (request) => {
  if (request.method === 'GET') {
    const auth = await requireStaffUser(request);
    if (auth.error) {
      return auth.error;
    }
    const tasks = await readTasks();
    if (auth.user.role === 'admin') {
      return json({ tasks: tasks.slice().reverse(), isAdmin: true });
    }
    const mine = tasks
      .filter((task) => normalizeEmail(task.assigneeEmail) === normalizeEmail(auth.user.email))
      .reverse();
    return json({ tasks: mine, isAdmin: false });
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

  const action = body && typeof body.action === 'string' ? body.action : 'create';

  if (action === 'update') {
    const id = body && typeof body.id === 'string' ? body.id : '';
    const status = body && body.status;
    if (!id || !ALLOWED_STATUS.has(status)) {
      return json({ error: 'Ungültige Aufgaben-Aktualisierung.' }, 400);
    }
    const tasks = await readTasks();
    const index = tasks.findIndex((task) => task.id === id);
    if (index < 0) {
      return json({ error: 'Aufgabe nicht gefunden.' }, 404);
    }
    tasks[index] = {
      ...tasks[index],
      status,
      updatedAt: new Date().toISOString(),
      updatedBy: auth.user.email,
    };
    await writeTasks(tasks);
    return json({ ok: true, task: tasks[index], tasks: tasks.slice().reverse() });
  }

  const title = body && typeof body.title === 'string' ? body.title.trim() : '';
  const description =
    body && typeof body.description === 'string' ? body.description.trim().slice(0, 1000) : '';
  const assigneeEmail = normalizeEmail(body && body.assigneeEmail);
  const dueDay = body && typeof body.dueDay === 'string' ? body.dueDay.trim() : '';
  const area = body && typeof body.area === 'string' ? body.area.trim() : '';

  if (title.length < 3 || title.length > 120) {
    return json({ error: 'Bitte einen Aufgabentitel angeben.' }, 400);
  }
  if (!isValidEmail(assigneeEmail)) {
    return json({ error: 'Bitte einen Mitarbeiter auswählen.' }, 400);
  }

  const assignee = await getUser(assigneeEmail);
  if (!assignee) {
    return json({ error: 'Mitarbeiter nicht gefunden.' }, 404);
  }

  const task = {
    id: `${Date.now()}-${randomBytes(3).toString('hex')}`,
    title,
    description,
    assigneeEmail,
    assigneeName:
      assignee.name || `${assignee.firstName || ''} ${assignee.lastName || ''}`.trim(),
    dueDay,
    area,
    status: 'open',
    createdBy: auth.user.email,
    createdByName: auth.user.name || auth.user.email,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const tasks = await readTasks();
  tasks.push(task);
  await writeTasks(tasks);

  return json({ ok: true, task, tasks: tasks.slice().reverse() });
};
