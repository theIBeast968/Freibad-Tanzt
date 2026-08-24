import { getUser, saveUser, staffStore } from './staff-auth.js';
import { notifyUser } from './push-send.js';

const ACTIVATION_DATE = '2027-03-01';
const NUDGE_GRACE_DAYS = 14;

export function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

async function hasShiftAssignment(areaId, email) {
  const shifts = (await staffStore().get(`shifts-area-${areaId}`, { type: 'json' })) || [];
  return shifts.some((shift) => (shift.assignments || []).some((assignment) => assignment.email === email));
}

/**
 * Kernlogik des Inaktivitaets-Workflows (Kapitel "Phase 11" im Plan), separat von den
 * beiden Aufrufstellen: der echten Scheduled Function (scheduled-inactivity-check.js,
 * von Netlify automatisch getriggert) und dem manuellen Admin-Endpoint fuers Testen/Ops
 * (staff-admin-run-inactivity-check.js). Netlify blockiert direkte HTTP-Aufrufe von
 * Scheduled Functions sowohl lokal als auch produktiv, daher braucht es die Trennung.
 */
export async function runInactivityCheck(today) {
  if (today < ACTIVATION_DATE) {
    return { skipped: true, reason: 'before-activation', today };
  }
  // Alle Zeitstempel-Schreibvorgaenge leiten sich bewusst von `today` ab statt von der
  // echten Wanduhr (new Date()), damit die Funktion ueber forceDate vollstaendig
  // durchtestbar ist (mehrtaegiger Ablauf simulierbar). In Produktion ist `today` ohnehin
  // immer das echte aktuelle Datum (siehe scheduled-inactivity-check.js), daher kein
  // Unterschied zum bisherigen Verhalten.
  const nowIso = `${today}T12:00:00.000Z`;

  const store = staffStore();
  const userIndex = (await store.get('users-index', { type: 'json' })) || [];
  let nudged = 0;
  let flagged = 0;

  for (const email of userIndex) {
    const user = await getUser(email);
    if (!user) continue;

    const memberships = Array.isArray(user.areaMemberships) ? user.areaMemberships.slice() : [];
    let changed = false;

    for (let i = 0; i < memberships.length; i++) {
      const membership = memberships[i];
      if (membership.status !== 'active' || membership.isLeiter || membership.flaggedInactiveAt) {
        continue;
      }

      const hasShift = await hasShiftAssignment(membership.areaId, email);
      if (hasShift) {
        continue;
      }

      if (!membership.inactivityNudgeSentAt) {
        memberships[i] = { ...membership, inactivityNudgeSentAt: nowIso };
        changed = true;
        nudged += 1;
        await notifyUser(email, {
          title: 'Noch keine Schicht eingetragen',
          body: 'Bitte trag dich in eine Schicht ein, sonst meldet dich die Bereichsleitung als inaktiv.',
          url: '/mitarbeiter.html#mein-bereich',
        });
      } else {
        const daysSince = (Date.parse(nowIso) - Date.parse(membership.inactivityNudgeSentAt)) / (1000 * 60 * 60 * 24);
        if (daysSince >= NUDGE_GRACE_DAYS) {
          memberships[i] = { ...membership, flaggedInactiveAt: nowIso };
          changed = true;
          flagged += 1;
        }
      }
    }

    if (changed) {
      await saveUser({ ...user, areaMemberships: memberships });
    }
  }

  return { ok: true, today, nudged, flagged };
}
