import { json, requireAdmin } from './lib/staff-auth.js';
import { runInactivityCheck, todayISO } from './lib/inactivity-check.js';

/**
 * Manueller Trigger fuer den Inaktivitaets-Check (siehe lib/inactivity-check.js).
 * Noetig, weil Netlify direkte HTTP-Aufrufe der eigentlichen Scheduled Function
 * (scheduled-inactivity-check.js) blockiert -- weder lokal noch produktiv gedacht
 * fuer manuelles Testen/Ops. forceDate ist optional, fuer Tests vor dem 01.03.2027.
 */
export default async (request) => {
  if (request.method !== 'POST') {
    return json({ error: 'Method not allowed' }, 405);
  }

  const auth = await requireAdmin(request);
  if (auth.error) {
    return auth.error;
  }

  let body = {};
  try {
    body = await request.json();
  } catch {}

  const forceDate = typeof body.forceDate === 'string' && body.forceDate ? body.forceDate : todayISO();
  const result = await runInactivityCheck(forceDate);
  return json(result);
};
