import { activeMembership, json, normalizeEmail, requireStaffUser, staffStore } from './lib/staff-auth.js';

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

  // Bewusst requireStaffUser statt requireAreaMember: der Schichtplan muss auch von
  // Nicht-Mitgliedern einsehbar sein, damit sie sich ueberhaupt fuer eine Schicht in
  // einem neuen Bereich bewerben koennen (siehe staff-shift.js action:'signup').
  const auth = await requireStaffUser(request);
  if (auth.error) {
    return auth.error;
  }

  const membership = activeMembership(auth.user, areaId);
  const isPrivileged = auth.user.role === 'admin' || Boolean(membership && membership.isLeiter);
  const viewerEmail = normalizeEmail(auth.user.email);

  const shifts = (await staffStore().get(`shifts-area-${areaId}`, { type: 'json' })) || [];
  const filtered = phase ? shifts.filter((shift) => shift.phase === phase) : shifts;

  // Kontaktdaten (Telefon/E-Mail) sind nur fuer Admin und die Bereichsleitung sichtbar.
  // Normale Mitglieder sehen bei anderen nur den Namen, bei sich selbst weiterhin alles
  // (damit "bin ich schon eingetragen"-Checks im Frontend funktionieren). Die Warteliste
  // ist komplett auf Bereichsleitung/Admin beschraenkt.
  const shaped = filtered.map((shift) => {
    if (isPrivileged) {
      return shift;
    }
    const assignments = (shift.assignments || []).map((assignment) => {
      if (normalizeEmail(assignment.email) === viewerEmail) {
        return assignment;
      }
      return { name: assignment.name, note: assignment.note };
    });
    // Warteliste bleibt privat, ausser dem eigenen Eintrag (damit der Helfer seinen
    // eigenen Anfrage-Status sieht, ohne die Anfragen anderer einsehen zu koennen).
    const waitlist = (shift.waitlist || []).filter((entry) => normalizeEmail(entry.email) === viewerEmail);
    return { ...shift, assignments, waitlist };
  });

  return json({ shifts: shaped });
};
