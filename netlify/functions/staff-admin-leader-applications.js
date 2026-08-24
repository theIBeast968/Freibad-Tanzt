import { grantAreaLeader, json, requireAdmin, staffStore } from './lib/staff-auth.js';
import { notifyUser } from './lib/push-send.js';

export default async (request) => {
  const auth = await requireAdmin(request);
  if (auth.error) {
    return auth.error;
  }

  const store = staffStore();

  if (request.method === 'GET') {
    const applications = (await store.get('leader-applications-index', { type: 'json' })) || [];
    return json({ applications: applications.filter((application) => application.status === 'pending') });
  }

  if (request.method !== 'POST') {
    return json({ error: 'Method not allowed' }, 405);
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: 'Invalid body' }, 400);
  }

  const applicationId = typeof body.applicationId === 'string' ? body.applicationId : '';
  const decision = body.decision === 'reject' ? 'reject' : 'approve';
  const chosenAreaId = typeof body.areaId === 'string' && body.areaId ? body.areaId : '';

  const applications = (await store.get('leader-applications-index', { type: 'json' })) || [];
  const idx = applications.findIndex((application) => application.id === applicationId);
  if (idx < 0) {
    return json({ error: 'Bewerbung nicht gefunden.' }, 404);
  }
  const application = applications[idx];

  if (decision === 'approve') {
    const areaId = application.areaId || chosenAreaId;
    if (!areaId) {
      return json({ error: 'Bitte einen Bereich für diese Bewerbung wählen.' }, 400);
    }
    const result = await grantAreaLeader(areaId, application.email, true, auth.user.email);
    if (result.error) {
      return json({ error: result.error }, result.error.includes('nicht gefunden') ? 404 : 400);
    }
    applications[idx] = { ...application, status: 'approved', decidedAt: new Date().toISOString(), decidedBy: auth.user.email };
    await store.setJSON('leader-applications-index', applications);
    await notifyUser(application.email, {
      title: 'Bereichsleiter-Bewerbung angenommen',
      body: `Du bist jetzt Bereichsleiter für ${result.area.name}.`,
      url: '/mitarbeiter.html#mein-bereich',
    });
    return json({ ok: true, decision, area: result.area });
  }

  applications[idx] = { ...application, status: 'rejected', decidedAt: new Date().toISOString(), decidedBy: auth.user.email };
  await store.setJSON('leader-applications-index', applications);
  await notifyUser(application.email, {
    title: 'Bereichsleiter-Bewerbung abgelehnt',
    body: 'Deine Bewerbung als Bereichsleiter wurde abgelehnt.',
    url: '/mitarbeiter.html',
  });

  return json({ ok: true, decision });
};
