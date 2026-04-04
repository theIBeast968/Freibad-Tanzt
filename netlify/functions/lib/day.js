/** Kalendertag Europe/Berlin als YYYY-MM-DD */
export function todayKeyBerlin() {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Berlin',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(new Date());
}

/**
 * Die letzten n Kalendertage (Berlin), ohne Duplikate.
 * Schrittweise rückwärts, damit bei Sommerzeit keine doppelten Keys entstehen.
 */
export function lastNBerlinDayKeys(n) {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Berlin',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });
  const keys = [];
  const seen = new Set();
  for (let i = 0; i < n + 5 && keys.length < n; i++) {
    const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
    const k = formatter.format(d);
    if (!seen.has(k)) {
      seen.add(k);
      keys.push(k);
    }
  }
  return keys.slice(0, n);
}
