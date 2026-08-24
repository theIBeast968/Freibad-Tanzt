import { api, authHeaders } from '../api.js';
import { showErr } from '../dom.js';

var pollTimer = null;
var since = '';

function appendMessages(messages) {
  var list = document.getElementById('adminChatMessageList');
  var placeholder = list.querySelector('[data-placeholder]');
  if (placeholder) placeholder.remove();
  messages.forEach(function (message) {
    var li = document.createElement('li');
    li.innerHTML =
      '<strong>' + (message.authorName || message.authorEmail) + '</strong>' +
      new Date(message.createdAt).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' }) +
      '<br>' + message.body;
    list.appendChild(li);
    since = message.id;
  });
}

export async function loadAdminChat() {
  since = '';
  var list = document.getElementById('adminChatMessageList');
  list.innerHTML = '<li data-placeholder="1">Noch keine Nachrichten.</li>';
  try {
    var data = await api('staff-chat-admin', { headers: authHeaders() });
    appendMessages(data.messages || []);
  } catch (e) {}
}

async function poll() {
  try {
    var data = await api('staff-chat-admin?since=' + encodeURIComponent(since), { headers: authHeaders() });
    appendMessages(data.messages || []);
  } catch (e) {}
}

export function startAdminChatPolling() {
  stopAdminChatPolling();
  pollTimer = setInterval(poll, 6000);
}

export function stopAdminChatPolling() {
  if (pollTimer) {
    clearInterval(pollTimer);
    pollTimer = null;
  }
}

document.getElementById('adminChatForm').addEventListener('submit', async function (event) {
  event.preventDefault();
  var err = document.getElementById('adminChatErr');
  showErr(err, '');
  var input = document.getElementById('adminChatBody');
  var text = input.value.trim();
  if (!text) return;
  try {
    await api('staff-chat-admin', {
      method: 'POST',
      headers: authHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ body: text })
    });
    input.value = '';
    await poll();
  } catch (e) {
    showErr(err, e.message || 'Nachricht konnte nicht gesendet werden.');
  }
});
