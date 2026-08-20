import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';
import { getStore } from '@netlify/blobs';

export function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
    },
  });
}

export function staffStore() {
  return getStore('sfreibad-staff');
}

export function normalizeEmail(email) {
  return String(email || '')
    .trim()
    .toLowerCase();
}

export function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function hashPassword(password) {
  const salt = randomBytes(16).toString('hex');
  const hash = scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

export function verifyPassword(password, stored) {
  if (!stored || typeof stored !== 'string' || !stored.includes(':')) {
    return false;
  }
  const [salt, hash] = stored.split(':');
  if (!salt || !hash) {
    return false;
  }
  const check = scryptSync(password, salt, 64);
  const expected = Buffer.from(hash, 'hex');
  if (check.length !== expected.length) {
    return false;
  }
  return timingSafeEqual(check, expected);
}

export function userKey(email) {
  return `user-${normalizeEmail(email)}`;
}

export async function getUser(email) {
  return staffStore().get(userKey(email), { type: 'json' });
}

export async function saveUser(user) {
  const store = staffStore();
  const email = normalizeEmail(user.email);
  await store.setJSON(userKey(email), {
    ...user,
    email,
  });

  const index = (await store.get('users-index', { type: 'json' })) || [];
  if (!index.includes(email)) {
    index.push(email);
    await store.setJSON('users-index', index);
  }
}

export async function listUsers() {
  const store = staffStore();
  const index = (await store.get('users-index', { type: 'json' })) || [];
  const users = [];
  for (const email of index) {
    const user = await getUser(email);
    if (user) {
      users.push(publicUser(user));
    }
  }
  users.sort((a, b) => String(a.name || '').localeCompare(String(b.name || ''), 'de'));
  return users;
}

export function publicUser(user) {
  return {
    email: user.email,
    name: user.name || `${user.firstName || ''} ${user.lastName || ''}`.trim(),
    firstName: user.firstName || null,
    lastName: user.lastName || null,
    phone: user.phone || null,
    role: resolveRole(user),
    areaMemberships: Array.isArray(user.areaMemberships) ? user.areaMemberships : [],
    canPostGlobal: Boolean(user.canPostGlobal),
    createdAt: user.createdAt || null,
  };
}

export function resolveRole(user) {
  const admins = String(process.env.STAFF_ADMIN_EMAILS || '')
    .split(',')
    .map((entry) => normalizeEmail(entry))
    .filter(Boolean);
  if (admins.includes(normalizeEmail(user.email))) {
    return 'admin';
  }
  return user.role === 'admin' ? 'admin' : 'staff';
}

export async function requireStaffUser(request) {
  const secret = process.env.STAFF_JWT_SECRET;
  if (!staffConfigOk() || !secret) {
    return { error: json({ error: 'Server misconfigured' }, 503) };
  }
  const auth = request.headers.get('authorization') || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7).trim() : '';
  const { verifyStaffToken } = await import('./jwt.js');
  const payload = verifyStaffToken(token, secret);
  if (!payload || !payload.email) {
    return { error: json({ error: 'Unauthorized' }, 401) };
  }
  const user = await getUser(payload.email);
  if (!user) {
    return { error: json({ error: 'Unauthorized' }, 401) };
  }
  const role = resolveRole(user);
  return {
    secret,
    payload,
    user: { ...user, role },
    publicUser: publicUser({ ...user, role }),
  };
}

export async function requireAdmin(request) {
  const result = await requireStaffUser(request);
  if (result.error) {
    return result;
  }
  if (result.user.role !== 'admin') {
    return { error: json({ error: 'Nur für Admins.' }, 403) };
  }
  return result;
}

export function staffConfigOk() {
  const secret = process.env.STAFF_JWT_SECRET;
  const invite = process.env.STAFF_INVITE_CODE;
  return Boolean(
    secret &&
      secret.length >= 16 &&
      invite &&
      invite.length >= 6
  );
}

// --- Bereiche (Areas) ---
// Key-Konvention: areaKey(id) = Vollobjekt, 'areas-index' = Array von Kurzobjekten (siehe CLAUDE.md).

export function areaKey(id) {
  return `area-${id}`;
}

export async function getArea(id) {
  if (!id) return null;
  return staffStore().get(areaKey(id), { type: 'json' });
}

export async function saveArea(area) {
  await staffStore().setJSON(areaKey(area.id), area);
}

export async function listAreas() {
  return (await staffStore().get('areas-index', { type: 'json' })) || [];
}

export async function saveAreasIndex(index) {
  await staffStore().setJSON('areas-index', index);
}

export function slugify(name) {
  return String(name || '')
    .trim()
    .toLowerCase()
    .replace(/ä/g, 'ae')
    .replace(/ö/g, 'oe')
    .replace(/ü/g, 'ue')
    .replace(/ß/g, 'ss')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

export async function uniqueAreaSlug(name, index) {
  const base = slugify(name) || 'bereich';
  let slug = base;
  let n = 2;
  while (index.some((area) => area.slug === slug)) {
    slug = `${base}-${n++}`;
  }
  return slug;
}

export function areaSummary(area) {
  return {
    id: area.id,
    name: area.name,
    slug: area.slug,
    active: area.active,
    type: area.type,
    phases: area.phases || [],
    parentPlanningAreaId: area.parentPlanningAreaId || null,
    leaderEmails: area.leaderEmails || [],
  };
}

export function activeMembership(user, areaId) {
  return (user.areaMemberships || []).find(
    (membership) => membership.areaId === areaId && membership.status === 'active'
  );
}

export const MAX_LED_AREAS = 3;
export const MAX_MEMBER_AREAS = 5;

/**
 * Setzt/entfernt die Bereichsleiter-Rolle einer Person fuer einen Bereich (inkl. Cap-Pruefung
 * und aktiver Mitgliedschaft). Gemeinsam genutzt von staff-admin-set-area-leader.js (direkte
 * Admin-Zuweisung) und staff-admin-leader-applications.js (Freigabe einer Selbstbewerbung),
 * damit die 3-Bereiche-Grenze an genau einer Stelle geprueft wird.
 */
export async function grantAreaLeader(areaId, email, isLeiter, decidedBy) {
  const area = await getArea(areaId);
  if (!area) {
    return { error: 'Bereich nicht gefunden.' };
  }
  const user = await getUser(email);
  if (!user) {
    return { error: 'Mitarbeiter nicht gefunden.' };
  }

  if (isLeiter) {
    const ledElsewhere = (user.areaMemberships || []).filter(
      (membership) => membership.isLeiter && membership.status === 'active' && membership.areaId !== areaId
    ).length;
    if (ledElsewhere >= MAX_LED_AREAS) {
      return { error: `Diese Person leitet bereits ${MAX_LED_AREAS} Bereiche, das Maximum.` };
    }
  }

  const now = new Date().toISOString();
  const memberships = Array.isArray(user.areaMemberships) ? user.areaMemberships.slice() : [];
  const idx = memberships.findIndex((membership) => membership.areaId === areaId);
  if (idx >= 0) {
    memberships[idx] = {
      ...memberships[idx],
      isLeiter,
      status: 'active',
      approvedAt: memberships[idx].approvedAt || now,
      approvedBy: decidedBy,
    };
  } else {
    memberships.push({
      areaId,
      status: 'active',
      isLeiter,
      requestedAt: now,
      approvedAt: now,
      approvedBy: decidedBy,
    });
  }
  await saveUser({ ...user, areaMemberships: memberships });

  const leaderEmails = new Set(area.leaderEmails || []);
  if (isLeiter) {
    leaderEmails.add(normalizeEmail(email));
  } else {
    leaderEmails.delete(normalizeEmail(email));
  }
  const updatedArea = { ...area, leaderEmails: [...leaderEmails], updatedAt: now };
  await saveArea(updatedArea);

  const index = await listAreas();
  const indexIdx = index.findIndex((entry) => entry.id === areaId);
  if (indexIdx >= 0) {
    index[indexIdx] = areaSummary(updatedArea);
    await saveAreasIndex(index);
  }

  return { area: updatedArea };
}

// Startliste aus dem Konzept (Kapitel 3), angelehnt an die bewaehrten Bereiche aus 2026.
// Erweiterbar durch Admins ueber staff-admin-areas.js, das hier ist nur der Startzustand.
export const DEFAULT_AREAS = [
  { name: 'Getränke/Ausschank', phases: ['freitag', 'samstag'] },
  { name: 'Essensstände', phases: ['freitag', 'samstag'] },
  { name: 'Kuchenteam', phases: ['sonntag'] },
  { name: 'Bühne/Technik/Sound', phases: ['aufbau', 'freitag', 'samstag', 'abbau'] },
  { name: 'Security-Koordination', phases: ['freitag', 'samstag'] },
  { name: 'Aufbau/Logistik', phases: ['aufbau', 'abbau'] },
  { name: 'Camping', phases: ['freitag', 'samstag', 'sonntag'] },
  { name: 'Kasse/Ticketing', phases: ['freitag', 'samstag'] },
  { name: 'Sanitär/Reinigung', phases: ['freitag', 'samstag', 'sonntag', 'abbau'] },
  { name: 'Presse/Social Media', phases: ['freitag', 'samstag', 'sonntag'] },
  { name: 'Kinderprogramm', phases: ['sonntag'] },
];

const DEFAULT_PLANNING_AREA = { name: 'Sonntag – 50 Jahre Freibad', type: 'planning' };

/**
 * Ergaenzt fehlende Startlisten-Bereiche (per Namensabgleich), ohne bestehende
 * Bereiche zu duplizieren oder zu veraendern. Idempotent, laeuft bei jedem Listing mit.
 */
export async function ensureAreasSeeded() {
  const index = await listAreas();
  const existingNames = new Set(index.map((area) => area.name));
  const toCreate = DEFAULT_AREAS.filter((def) => !existingNames.has(def.name));
  if (!existingNames.has(DEFAULT_PLANNING_AREA.name)) {
    toCreate.push(DEFAULT_PLANNING_AREA);
  }
  if (!toCreate.length) {
    return index;
  }

  let nextIndex = index;
  for (const def of toCreate) {
    const slug = await uniqueAreaSlug(def.name, nextIndex);
    const now = new Date().toISOString();
    const area = {
      id: `${Date.now()}-${randomBytes(3).toString('hex')}`,
      name: def.name,
      slug,
      active: true,
      type: def.type || 'operational',
      phases: def.type === 'planning' ? [] : def.phases || [],
      parentPlanningAreaId: null,
      leaderEmails: [],
      description: '',
      knowledgeBase: '',
      extraFieldDefs: [],
      createdAt: now,
      updatedAt: now,
    };
    await saveArea(area);
    nextIndex = [...nextIndex, areaSummary(area)];
  }
  await saveAreasIndex(nextIndex);
  return nextIndex;
}

export async function requireAreaLeiter(request, areaId) {
  const result = await requireStaffUser(request);
  if (result.error) {
    return result;
  }
  if (result.user.role === 'admin') {
    return result;
  }
  const membership = activeMembership(result.user, areaId);
  if (!membership || !membership.isLeiter) {
    return { error: json({ error: 'Nur für die Bereichsleitung.' }, 403) };
  }
  return result;
}

export async function requireAreaMember(request, areaId) {
  const result = await requireStaffUser(request);
  if (result.error) {
    return result;
  }
  if (result.user.role === 'admin') {
    return result;
  }
  if (!activeMembership(result.user, areaId)) {
    return { error: json({ error: 'Kein Zugriff auf diesen Bereich.' }, 403) };
  }
  return result;
}

// --- Herkunft (Origins) ---

export const DEFAULT_ORIGINS = [
  'Freiwilliger Helfer',
  'Freibadfreunde',
  'Orga Team',
  'Bauwagen',
  'FC Langenburg',
  'TC Langenburg',
  'TSV Langenburg',
  'Volleyball',
];

export async function ensureOriginsSeeded() {
  const store = staffStore();
  const existing = await store.get('origins-index', { type: 'json' });
  if (existing && existing.length) {
    return existing;
  }
  await store.setJSON('origins-index', DEFAULT_ORIGINS);
  return DEFAULT_ORIGINS;
}
