import { api, authHeaders } from '../api.js';
import { showErr } from '../dom.js';
import { getCurrentUser } from '../state.js';

var enableBtn = document.getElementById('pushEnableBtn');
var disableBtn = document.getElementById('pushDisableBtn');
var statusText = document.getElementById('pushStatusText');
var channelsWrap = document.getElementById('pushChannels');
var globalCheckbox = document.getElementById('pushGlobal');
var areaChannelsWrap = document.getElementById('pushAreaChannels');

function urlBase64ToUint8Array(base64String) {
  var padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  var base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  var rawData = window.atob(base64);
  var outputArray = new Uint8Array(rawData.length);
  for (var i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

function arrayBufferToBase64(buffer) {
  var bytes = new Uint8Array(buffer);
  var binary = '';
  for (var i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary);
}

function supported() {
  return 'serviceWorker' in navigator && 'PushManager' in window;
}

function getRegistration() {
  return navigator.serviceWorker.register('/sw-mitarbeiter.js', { scope: '/mitarbeiter.html' });
}

async function currentSubscription() {
  if (!supported()) return null;
  var reg = await navigator.serviceWorker.ready.catch(function () { return null; });
  if (!reg) return null;
  return reg.pushManager.getSubscription();
}

function renderAreaChannels(myAreas) {
  areaChannelsWrap.innerHTML = '';
  myAreas.forEach(function (area) {
    var dashLabel = document.createElement('label');
    var dashCb = document.createElement('input');
    dashCb.type = 'checkbox';
    dashCb.checked = true;
    dashCb.dataset.area = area.id;
    dashCb.dataset.kind = 'area';
    dashLabel.appendChild(dashCb);
    dashLabel.appendChild(document.createTextNode(' ' + area.name + ' – Dashboard'));
    areaChannelsWrap.appendChild(dashLabel);

    var chatLabel = document.createElement('label');
    var chatCb = document.createElement('input');
    chatCb.type = 'checkbox';
    chatCb.checked = true;
    chatCb.dataset.area = area.id;
    chatCb.dataset.kind = 'chat';
    chatLabel.appendChild(chatCb);
    chatLabel.appendChild(document.createTextNode(' ' + area.name + ' – Chat'));
    areaChannelsWrap.appendChild(chatLabel);
  });
}

async function savePreferences(subscription) {
  var areaBoxes = Array.prototype.slice.call(areaChannelsWrap.querySelectorAll('input[data-kind="area"]'));
  var chatBoxes = Array.prototype.slice.call(areaChannelsWrap.querySelectorAll('input[data-kind="chat"]'));
  var payload = {
    endpoint: subscription.endpoint,
    global: globalCheckbox.checked,
    areas: areaBoxes.filter(function (b) { return b.checked; }).map(function (b) { return b.dataset.area; }),
    chatAreas: chatBoxes.filter(function (b) { return b.checked; }).map(function (b) { return b.dataset.area; })
  };
  try {
    await api('staff-push-preferences', {
      method: 'POST',
      headers: authHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify(payload)
    });
  } catch (e) {}
}

async function updateUiForSubscription(subscription) {
  var subscribed = Boolean(subscription);
  enableBtn.classList.toggle('hidden', subscribed);
  disableBtn.classList.toggle('hidden', !subscribed);
  channelsWrap.classList.toggle('hidden', !subscribed);
  statusText.textContent = subscribed
    ? 'Push-Benachrichtigungen sind aktiv.'
    : 'Push-Benachrichtigungen sind noch nicht aktiviert.';

  if (!subscribed) return;

  var currentUser = getCurrentUser();
  try {
    var areasData = await api('staff-admin-areas', { headers: authHeaders() });
    var allAreas = areasData.areas || [];
    var myAreas =
      currentUser.role === 'admin'
        ? allAreas
        : (currentUser.areaMemberships || [])
            .filter(function (m) { return m.status === 'active'; })
            .map(function (m) { return allAreas.find(function (a) { return a.id === m.areaId; }); })
            .filter(Boolean);
    renderAreaChannels(myAreas);
  } catch (e) {}
}

enableBtn.addEventListener('click', async function () {
  var err = document.getElementById('pushErr');
  showErr(err, '');
  if (!supported()) {
    showErr(err, 'Push wird von diesem Browser nicht unterstützt.');
    return;
  }
  try {
    var permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      showErr(err, 'Benachrichtigungen wurden nicht erlaubt.');
      return;
    }
    var optionsRes = await api('staff-public-options', {});
    if (!optionsRes.vapidPublicKey) {
      showErr(err, 'Push ist serverseitig noch nicht eingerichtet.');
      return;
    }
    var reg = await getRegistration();
    var sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(optionsRes.vapidPublicKey)
    });
    await api('staff-push-subscribe', {
      method: 'POST',
      headers: authHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({
        endpoint: sub.endpoint,
        keys: {
          p256dh: arrayBufferToBase64(sub.getKey('p256dh')),
          auth: arrayBufferToBase64(sub.getKey('auth'))
        }
      })
    });
    await updateUiForSubscription(sub);
    await savePreferences(sub);
  } catch (e) {
    showErr(err, e.message || 'Push konnte nicht aktiviert werden.');
  }
});

disableBtn.addEventListener('click', async function () {
  try {
    var sub = await currentSubscription();
    if (sub) {
      await api('staff-push-unsubscribe', {
        method: 'POST',
        headers: authHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ endpoint: sub.endpoint })
      });
      await sub.unsubscribe();
    }
  } catch (e) {}
  await updateUiForSubscription(null);
});

document.getElementById('push-settings').addEventListener('change', async function (event) {
  if (!event.target.matches('input[type="checkbox"]')) return;
  var sub = await currentSubscription();
  if (sub) await savePreferences(sub);
});

export async function loadPushSettings() {
  if (!supported()) {
    statusText.textContent = 'Push wird von diesem Browser nicht unterstützt.';
    enableBtn.classList.add('hidden');
    return;
  }
  try {
    await getRegistration();
  } catch (e) {}
  var sub = await currentSubscription();
  await updateUiForSubscription(sub);
}
