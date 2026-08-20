import { api, authHeaders } from '../api.js';

var messages = document.getElementById('internalChatMessages');
var form = document.getElementById('internalChatForm');
var input = document.getElementById('internalChatInput');

function addMessage(text, who) {
  var placeholder = messages.querySelector('[data-placeholder]');
  if (placeholder) placeholder.remove();
  var p = document.createElement('p');
  p.className = 'sub';
  p.style.color = who === 'user' ? 'var(--yellow)' : 'var(--muted)';
  p.textContent = (who === 'user' ? 'Du: ' : 'Bot: ') + text;
  messages.appendChild(p);
  messages.scrollTop = messages.scrollHeight;
  return p;
}

form.addEventListener('submit', async function (event) {
  event.preventDefault();
  var question = input.value.trim();
  if (!question) return;
  addMessage(question, 'user');
  input.value = '';
  input.disabled = true;
  var pending = addMessage('…', 'bot');

  try {
    var data = await api('chatbot-internal', {
      method: 'POST',
      headers: authHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ question: question })
    });
    pending.textContent = 'Bot: ' + data.answer;
  } catch (e) {
    pending.textContent = 'Bot: ' + (e.message || 'Da ist etwas schiefgelaufen.');
  } finally {
    input.disabled = false;
  }
});
