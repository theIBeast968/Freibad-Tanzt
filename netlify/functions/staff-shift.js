import { randomBytes } from 'node:crypto';
import {
  MAX_MEMBER_AREAS,
  activeMembership,
  getUser,
  json,
  normalizeEmail,
  requireAreaLeiter,
  requireAreaMember,
  requireStaffUser,
  saveUser,
  staffStore,
} from './lib/staff-auth.js';
import { notifyUser } from './lib/push-send.js';

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

async function grantMembershipIfNeeded(user, areaId) {
  if (activeMembership(user, areaId)) {
    return { ok: true };
  }
  const memberships = Array.isArray(user.areaMemberships) ? user.areaMemberships.slice() : [];
  if (memberships.length >= MAX_MEMBER_AREAS) {
    return { error: `Du kannst maximal ${MAX_MEMBER_AREAS} Bereichen zugeordnet sein.` };
  }
  const now = new Date().toISOString();
  const idx = memberships.findIndex((membership) => membership.areaId === areaId);
  if (idx >= 0) {
    memberships[idx] = { ...memberships[idx], status: 'active', approvedAt: now, approvedBy: 'auto' };
  } else {
    memberships.push({ areaId, status: 'active', isLeiter: false, requestedAt: now, approvedAt: now, approvedBy: 'auto' });
  }
  await saveUser({ ...user, areaMemberships: memberships });
  return { ok: true };
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

  if (action === 'cancel') {
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
    const email = normalizeEmail(auth.user.email);
    const shift = shifts[idx];
    shift.assignments = (shift.assignments || []).filter((assignment) => normalizeEmail(assignment.email) !== email);
    shift.waitlist = (shift.waitlist || []).filter((entry) => normalizeEmail(entry.email) !== email);
    shift.updatedAt = new Date().toISOString();
    shifts[idx] = shift;
    await writeAreaShifts(areaId, shifts);
    return json({ ok: true, shift, shifts });
  }

  if (action === 'signup') {
    // Bewusst requireStaffUser statt requireAreaMember: eine Schicht-Bewerbung ist jetzt
    // auch fuer Bereiche moeglich, in denen man noch kein Mitglied ist (Mitgliedschaft
    // entsteht als Nebenwirkung einer erfolgreichen Zusage, siehe Phase 10 im Plan).
    const auth = await requireStaffUser(request);
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

    if ((shift.assignments || []).some((assignment) => normalizeEmail(assignment.email) === email)) {
      return json({ error: 'Du bist bereits eingetragen.' }, 400);
    }
    if ((shift.waitlist || []).some((entry) => normalizeEmail(entry.email) === email)) {
      return json({ error: 'Deine Anfrage für diese Schicht ist bereits gestellt.' }, 400);
    }

    const hasMembership = Boolean(activeMembership(auth.user, areaId));
    if (!hasMembership && (auth.user.areaMemberships || []).length >= MAX_MEMBER_AREAS) {
      return json({ error: `Du kannst maximal ${MAX_MEMBER_AREAS} Bereichen zugeordnet sein.` }, 400);
    }

    const note = body && typeof body.note === 'string' ? body.note.trim().slice(0, 300) : '';
    const phone =
      body && typeof body.phone === 'string' ? body.phone.trim().slice(0, 40) : auth.user.phone || '';
    const now = new Date().toISOString();
    const hasRoom = (shift.assignments || []).length < shift.neededCount;

    if (hasRoom) {
      shift.assignments = [
        ...(shift.assignments || []),
        { email, name: auth.user.name || email, phone, note, assignedAt: now },
      ];
      if (!hasMembership) {
        await grantMembershipIfNeeded(auth.user, areaId);
      }
    } else {
      shift.waitlist = [
        ...(shift.waitlist || []),
        { email, name: auth.user.name || email, phone, note, requestedAt: now },
      ].slice(-100);
    }
    shift.updatedAt = now;
    shifts[idx] = shift;
    await writeAreaShifts(areaId, shifts);
    return json({ ok: true, waitlisted: !hasRoom, shift, shifts });
  }

  if (action === 'approve-waitlist' || action === 'reject-waitlist') {
    const auth = await requireAreaLeiter(request, areaId);
    if (auth.error) {
      return auth.error;
    }
    const shiftId = body && typeof body.id === 'string' ? body.id : '';
    const targetEmail = normalizeEmail(body && body.email);
    const shifts = await readAreaShifts(areaId);
    const idx = shifts.findIndex((shift) => shift.id === shiftId);
    if (idx < 0) {
      return json({ error: 'Schicht nicht gefunden.' }, 404);
    }
    const shift = shifts[idx];
    const wIdx = (shift.waitlist || []).findIndex((entry) => normalizeEmail(entry.email) === targetEmail);
    if (wIdx < 0) {
      return json({ error: 'Anfrage nicht gefunden.' }, 404);
    }
    const entry = shift.waitlist[wIdx];

    if (action === 'approve-waitlist') {
      const targetUser = await getUser(targetEmail);
      if (!targetUser) {
        return json({ error: 'Mitarbeiter nicht gefunden.' }, 404);
      }
      const membershipResult = await grantMembershipIfNeeded(targetUser, areaId);
      if (membershipResult.error) {
        return json({ error: membershipResult.error }, 400);
      }
      shift.assignments = [
        ...(shift.assignments || []),
        { email: entry.email, name: entry.name, phone: entry.phone, note: entry.note, assignedAt: new Date().toISOString() },
      ];
    }

    shift.waitlist = (shift.waitlist || []).filter((_, i) => i !== wIdx);
    shift.updatedAt = new Date().toISOString();
    shifts[idx] = shift;
    await writeAreaShifts(areaId, shifts);

    await notifyUser(targetEmail, {
      title: action === 'approve-waitlist' ? 'Schicht bestätigt' : 'Schicht-Anfrage abgelehnt',
      body:
        action === 'approve-waitlist'
          ? `Du bist jetzt für "${shift.station}" eingetragen.`
          : `Deine Anfrage für "${shift.station}" wurde abgelehnt.`,
      url: '/mitarbeiter.html#mein-bereich',
    });

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
      waitlist: [],
      extraFields,
      createdAt: now,
      updatedAt: now,
    });
  }

  await writeAreaShifts(areaId, shifts);
  return json({ ok: true, shifts });
};
