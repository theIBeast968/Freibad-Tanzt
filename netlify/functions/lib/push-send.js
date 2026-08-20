import webpush from 'web-push';
import { staffStore } from './staff-auth.js';

let configured = false;

function ensureConfigured() {
  if (configured) {
    return true;
  }
  const publicKey = process.env.VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT;
  if (!publicKey || !privateKey || !subject) {
    return false;
  }
  webpush.setVapidDetails(subject, publicKey, privateKey);
  configured = true;
  return true;
}

async function readSubscriptions() {
  return (await staffStore().get('push-subscriptions-index', { type: 'json' })) || [];
}

async function removeSubscription(endpoint) {
  const subs = await readSubscriptions();
  const next = subs.filter((sub) => sub.endpoint !== endpoint);
  if (next.length !== subs.length) {
    await staffStore().setJSON('push-subscriptions-index', next);
  }
}

async function sendToSubscription(sub, payload) {
  try {
    await webpush.sendNotification({ endpoint: sub.endpoint, keys: sub.keys }, JSON.stringify(payload));
  } catch (err) {
    if (err && (err.statusCode === 404 || err.statusCode === 410)) {
      await removeSubscription(sub.endpoint);
    }
  }
}

/**
 * channel: 'global' | { area: areaId } | { chatArea: areaId }
 * Fehler beim Versand duerfen die aufrufende Aktion (Post/Chat-Nachricht) nie scheitern lassen,
 * daher wird hier nirgends geworfen.
 */
export async function notifyChannel(channel, payload, excludeEmail) {
  if (!ensureConfigured()) {
    return;
  }
  try {
    const subs = await readSubscriptions();
    const targets = subs.filter((sub) => {
      if (excludeEmail && sub.email === excludeEmail) {
        return false;
      }
      const prefs = sub.subscribedChannels || {};
      if (channel === 'global') {
        return Boolean(prefs.global);
      }
      if (channel.area) {
        return Array.isArray(prefs.areas) && prefs.areas.includes(channel.area);
      }
      if (channel.chatArea) {
        return Array.isArray(prefs.chatAreas) && prefs.chatAreas.includes(channel.chatArea);
      }
      return false;
    });
    await Promise.all(targets.map((sub) => sendToSubscription(sub, payload)));
  } catch (err) {
    // Push ist ein Zusatzfeature, darf den eigentlichen Request nie kippen.
  }
}
