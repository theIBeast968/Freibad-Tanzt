import { randomBytes } from 'node:crypto';
import { json, normalizeEmail, requireAreaLeiter, requireAreaMember, staffStore } from './lib/staff-auth.js';

const ALLOWED_PHASES = new Set(['aufbau', 'freitag', 'samstag', 'sonntag', 'abbau']);

function shiftsKey(areaId) {
  return `shifts-area-${areaId}`;
}

async function readAreaShifts(areaId) {
  return (await staffStore().get(shiftsKey(areaId), { type: 'json' })) || [];
}

async function updateAggregate(areaId, areaShifts) {
  const store = staffStore();
  const all = (await store.get('shifts-all', { type: 'json' })) || [];
  // Verwirft Alt-Eintraege aus dem frueheren Freitext-Schema (vor dem Bereichs-Umbau),
  // die kein areaId/station im aktuellen Format haben.
  const withoutArea = all.filter(
    (shift) => shift.areaId !== areaId && typeof shift.areaId === 'string' && typeof shift.station === 'string'
  );
  const merged = [...withoutArea, ...areaShifts].sort((a, b) =>
    String(a.updatedAt || '').localeCompare(String(b.updatedAt || ''))
  );
  await store.setJSON('shifts-all', merged.slice(-1000));
}

async function writeAreaShifts(areaId, shifts) {
  await staffStore().setJSON(shiftsKey(areaId), shifts);
  await updateAggregate(areaId, shifts);
}

function sanitizeExtraFields(raw) {
  const extraFields = {};
  if (!raw || typeof raw !== 'object') {
    return extraFields;
  }
  Object.keys(raw)
    .slice(0, 20)
    .forEach((key) => {
      if (typeof raw[key] === 'string') {
        extraFields[String(key).slice(0, 40)] = raw[key].trim().slice(0, 300);
      }
    });
  return extraFields;
}

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

  const areaId = body && typeof body.areaId === 'string' ? body.areaId : '';
  const action = body && typeof body.action === 'string' ? body.action : 'create';

  if (!areaId) {
    return json({ error: 'Bereich fehlt.' }, 400);
  }

  if (action === 'signup' || action === 'cancel') {
    const auth = await requireAreaMember(request, areaId);
    if (auth.error) {
      return auth.error;
    }

    const shiftId = body && typeof body.id === 'string' ? body.id : '';
    const shifts = await readAreaShifts(areaId);
    const idx = shifts.findIndex((shift) => shift.id === shiftId);
    if (idx < 0) {
      return json({ error: 'Schicht nicht gefunden.' }, 404);
    }
    const shift = shifts[idx];
    const email = normalizeEmail(auth.user.email);

    if (action === 'cancel') {
      shift.assignments = (shift.assignments || []).filter(
        (assignment) => normalizeEmail(assignment.email) !== email
      );
    } else {
      const already = (shift.assignments || []).some(
        (assignment) => normalizeEmail(assignment.email) === email
      );
      if (already) {
        return json({ error: 'Du bist bereits eingetragen.' }, 400);
      }
      if ((shift.assignments || []).length >= shift.neededCount) {
        return json({ error: 'Schicht ist bereits voll.' }, 400);
      }
      const note = body && typeof body.note === 'string' ? body.note.trim().slice(0, 300) : '';
      const phone =
        body && typeof body.phone === 'string' ? body.phone.trim().slice(0, 40) : auth.user.phone || '';
      shift.assignments = [
        ...(shift.assignments || []),
        {
          email,
          name: auth.user.name || email,
          phone,
          note,
          assignedAt: new Date().toISOString(),
        },
      ];
    }
    shift.updatedAt = new Date().toISOString();
    shifts[idx] = shift;
    await writeAreaShifts(areaId, shifts);
    return json({ ok: true, shift, shifts });
  }

  const auth = await requireAreaLeiter(request, areaId);
  if (auth.error) {
    return auth.error;
  }

  if (action === 'delete') {
    const shiftId = body && typeof body.id === 'string' ? body.id : '';
    const shifts = (await readAreaShifts(areaId)).filter((shift) => shift.id !== shiftId);
    await writeAreaShifts(areaId, shifts);
    return json({ ok: true, shifts });
  }

  const phase = body && body.phase;
  if (!ALLOWED_PHASES.has(phase)) {
    return json({ error: 'Bitte eine gültige Phase wählen.' }, 400);
  }
  const date = body && typeof body.date === 'string' ? body.date.trim().slice(0, 20) : '';
  const timeFrom = body && typeof body.timeFrom === 'string' ? body.timeFrom.trim().slice(0, 10) : '';
  const timeTo = body && typeof body.timeTo === 'string' ? body.timeTo.trim().slice(0, 10) : '';
  const station = body && typeof body.station === 'string' ? body.station.trim().slice(0, 120) : '';
  const neededCount = Math.max(1, Math.min(50, parseInt(body && body.neededCount, 10) || 1));
  const extraFields = sanitizeExtraFields(body && body.extraFields);

  if (!station) {
    return json({ error: 'Bitte Station/Aufgabe angeben.' }, 400);
  }

  const shifts = await readAreaShifts(areaId);
  const id = body && typeof body.id === 'string' ? body.id : '';
  const now = new Date().toISOString();

  if (id) {
    const idx = shifts.findIndex((shift) => shift.id === id);
    if (idx < 0) {
      return json({ error: 'Schicht nicht gefunden.' }, 404);
    }
    shifts[idx] = {
      ...shifts[idx],
      phase,
      date,
      timeFrom,
      timeTo,
      station,
      neededCount,
      extraFields,
      updatedAt: now,
    };
  } else {
    shifts.push({
      id: `${Date.now()}-${randomBytes(3).toString('hex')}`,
      areaId,
      phase,
      date,
      timeFrom,
      timeTo,
      station,
      neededCount,
      assignments: [],
      extraFields,
      createdAt: now,
      updatedAt: now,
    });
  }

  await writeAreaShifts(areaId, shifts);
  return json({ ok: true, shifts });
};
