import { getStore } from '@netlify/blobs';
import { todayKeyBerlin } from './lib/day.js';

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store'
    }
  });
}

function normalizePath(pathRaw) {
  if (!pathRaw || typeof pathRaw !== 'string') {
    return '/';
  }
  let p = pathRaw.split('?')[0] || '/';
  if (p === '/index.html' || p === '') {
    p = '/';
  }
  if (p.length > 1 && p.endsWith('/')) {
    p = p.slice(0, -1);
  }
  if (!p.startsWith('/')) {
    p = `/${p}`;
  }
  if (p.length > 240) {
    p = `${p.slice(0, 240)}…`;
  }
  return p;
}

const MAX_VISITORS = 12000;

export default async (request) => {
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Max-Age': '86400'
      }
    });
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

  const path = normalizePath(body.path);
  let visitorId = typeof body.visitorId === 'string' ? body.visitorId.trim() : '';
  if (visitorId.length > 64 || visitorId.length < 8) {
    visitorId = 'unknown';
  }

  try {
    const store = getStore('sfreibad-analytics');
    const day = todayKeyBerlin();
    const key = `day-${day}`;
    const prev = await store.get(key, { type: 'json' });
    const row =
      prev && typeof prev === 'object'
        ? prev
        : { pv: 0, paths: {}, visitors: [] };

    row.pv = Number(row.pv || 0) + 1;
    row.paths = row.paths && typeof row.paths === 'object' ? row.paths : {};
    row.paths[path] = Number(row.paths[path] || 0) + 1;
    const vis = Array.isArray(row.visitors) ? row.visitors : [];
    if (vis.length < MAX_VISITORS && !vis.includes(visitorId)) {
      vis.push(visitorId);
    }
    row.visitors = vis;

    await store.setJSON(key, row);
  } catch (e) {
    console.error('track blob error', e);
    return json({ error: 'Storage error' }, 500);
  }

  return json({ ok: true });
};
