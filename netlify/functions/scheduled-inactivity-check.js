import { json } from './lib/staff-auth.js';
import { runInactivityCheck, todayISO } from './lib/inactivity-check.js';

export default async () => {
  const result = await runInactivityCheck(todayISO());
  return json(result);
};

export const config = {
  schedule: '@daily',
};
