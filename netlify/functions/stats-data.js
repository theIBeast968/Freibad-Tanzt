import { getStore } from '@netlify/blobs';
import { verifyStatsToken } from './lib/jwt.js';
import { lastNBerlinDayKeys } from './lib/day.js';

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store'
    }
  });
}

export default async (request) => {
  if (request.method !== 'GET') {
    return json({ error: 'Method not allowed' }, 405);
  }

  const secret = process.env.STATS_JWT_SECRET;
  if (!secret) {
    return json({ error: 'Server misconfigured' }, 503);
  }

  const auth = request.headers.get('authorization') || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7).trim() : '';
  if (!verifyStatsToken(token, secret)) {
    return json({ error: 'Unauthorized' }, 401);
  }

  const url = new URL(request.url);
  let days = parseInt(url.searchParams.get('days') || '7', 10);
  if (!Number.isFinite(days) || days < 1) {
    days = 7;
  }
  if (days > 31) {
    days = 31;
  }

  const dayKeys = lastNBerlinDayKeys(days);
  const store = getStore('sfreibad-analytics');

  const series = [];
  let totalPv = 0;
  let maxPv = 1;
  const pathTotals = {};
  const mergedVisitors = new Set();

  for (const day of dayKeys) {
    const key = `day-${day}`;
    const row = await store.get(key, { type: 'json' });
    const pv = row && typeof row.pv === 'number' ? row.pv : 0;
    const uniqDay =
      row && Array.isArray(row.visitors) ? row.visitors.length : 0;
    totalPv += pv;
    if (pv > maxPv) {
      maxPv = pv;
    }
    series.push({ date: day, pageviews: pv, uniqueVisitors: uniqDay });
    if (row && Array.isArray(row.visitors)) {
      row.visitors.forEach((v) => mergedVisitors.add(String(v)));
    }
    if (row && row.paths && typeof row.paths === 'object') {
      for (const [p, c] of Object.entries(row.paths)) {
        pathTotals[p] = (pathTotals[p] || 0) + (Number(c) || 0);
      }
    }
  }

  const topPaths = Object.entries(pathTotals)
    .map(([path, count]) => ({ path, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 25);

  return json({
    rangeDays: days,
    series,
    totals: {
      pageviews: totalPv,
      uniqueVisitors: mergedVisitors.size
    },
    topPaths,
    chartScale: maxPv
  });
};
