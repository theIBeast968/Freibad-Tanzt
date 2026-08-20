import { getArea, getUser, json, listAreas, requireAdmin, saveAreasIndex, staffStore } from './lib/staff-auth.js';

const CONFIRM_PHRASE = 'SAISON ZURUECKSETZEN';

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

  if (body.confirm !== CONFIRM_PHRASE) {
    return json({ error: `Bitte exakt "${CONFIRM_PHRASE}" eingeben, um zu bestätigen.` }, 400);
  }

  const store = staffStore();
  const year = new Date().getFullYear();

  // Nutzer archivieren (nicht hart loeschen) und Index leeren.
  const userIndex = (await store.get('users-index', { type: 'json' })) || [];
  for (const email of userIndex) {
    const user = await getUser(email);
    if (user) {
      await store.setJSON(`user-${email}-archive-${year}`, user);
      await store.delete(`user-${email}`);
    }
  }
  await store.setJSON('users-index', []);

  // Bereiche bleiben als Struktur bestehen, aber ohne Mitglieder-/Leiter-Daten;
  // bereichsgebundene Inhalte (Chat, Dashboard, Schichten) werden geloescht.
  const areas = await listAreas();
  for (const summary of areas) {
    const area = await getArea(summary.id);
    if (area) {
      await store.delete(`chat-area-${area.id}`);
      await store.delete(`dashboard-area-${area.id}`);
      await store.delete(`shifts-area-${area.id}`);
      area.leaderEmails = [];
      await store.setJSON(`area-${area.id}`, area);
    }
  }
  const resetIndex = areas.map((area) => ({ ...area, leaderEmails: [] }));
  await saveAreasIndex(resetIndex);

  await store.delete('dashboard-global');
  await store.delete('shifts-all');
  await store.delete('chat-admin');
  await store.delete('push-subscriptions-index');

  return json({ ok: true, archivedUsers: userIndex.length, resetAreas: resetIndex.length, year });
};
