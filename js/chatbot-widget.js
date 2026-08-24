(function () {
  var toggle = document.getElementById('chatbotToggle');
  var panel = document.getElementById('chatbotPanel');
  var closeBtn = document.getElementById('chatbotClose');
  var form = document.getElementById('chatbotForm');
  var input = document.getElementById('chatbotInput');
  var messages = document.getElementById('chatbotMessages');

  if (!toggle || !panel || !form) return;

  function addMessage(text, who) {
    var p = document.createElement('p');
    p.className = 'chatbot-msg chatbot-msg--' + who;
    p.textContent = text;
    messages.appendChild(p);
    messages.scrollTop = messages.scrollHeight;
  }

  function setOpen(open) {
    panel.classList.toggle('hidden', !open);
    toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    if (open) input.focus();
  }

  toggle.addEventListener('click', function () {
    setOpen(panel.classList.contains('hidden'));
  });
  closeBtn.addEventListener('click', function () { setOpen(false); });

  form.addEventListener('submit', async function (event) {
    event.preventDefault();
    var question = input.value.trim();
    if (!question) return;
    addMessage(question, 'user');
    input.value = '';
    input.disabled = true;
    var pending = document.createElement('p');
    pending.className = 'chatbot-msg chatbot-msg--bot';
    pending.textContent = '…';
    messages.appendChild(pending);
    messages.scrollTop = messages.scrollHeight;

    try {
      var res = await fetch('/.netlify/functions/chatbot-public', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: question })
      });
      var data = await res.json();
      pending.textContent = res.ok ? data.answer : (data.error || 'Da ist etwas schiefgelaufen.');
    } catch (e) {
      pending.textContent = 'Da ist etwas schiefgelaufen. Bitte später nochmal versuchen.';
    } finally {
      input.disabled = false;
      input.focus();
    }
  });
})();
