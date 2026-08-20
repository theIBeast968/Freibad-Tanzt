import { api, authHeaders } from '../api.js';

function renderAreaBlock(area, members) {
  var pending = members.filter(function (m) { return m.status === 'pending'; });
  var active = members.filter(function (m) { return m.status === 'active'; });

  var wrap = document.createElement('div');
  wrap.style.marginTop = '1.25rem';

  var h4 = document.createElement('h4');
  h4.style.margin = '0 0 0.5rem';
  h4.style.fontFamily = 'var(--font-display)';
  h4.style.letterSpacing = '0.03em';
  h4.style.textTransform = 'uppercase';
  h4.textContent = area.name;
  wrap.appendChild(h4);

  if (!pending.length) {
    var noPending = document.createElement('p');
    noPending.className = 'sub';
    noPending.textContent = 'Keine offenen Anfragen.';
    wrap.appendChild(noPending);
  } else {
    var list = document.createElement('ul');
    list.className = 'shift-list';
    pending.forEach(function (member) {
      var li = document.createElement('li');
      li.innerHTML =
        '<strong>' + (member.name || member.email) + '</strong>' +
        member.email + (member.phone ? (' · ' + member.phone) : '') +
        (member.origin ? ('<br>Herkunft: ' + member.origin) : '') +
        '<div class="actions">' +
        '<button type="button" class="button-primary mini-btn" data-approve="' + member.email + '" data-area="' + area.id + '">Freischalten</button>' +
        '<button type="button" class="button-secondary mini-btn" data-reject="' + member.email + '" data-area="' + area.id + '">Ablehnen</button>' +
        '</div>';
      list.appendChild(li);
    });
    wrap.appendChild(list);
  }

  var activeP = document.createElement('p');
  activeP.className = 'sub';
  activeP.style.marginTop = '0.75rem';
  activeP.textContent = active.length
    ? 'Aktive Helfer: ' + active.map(function (m) { return m.name || m.email; }).join(', ')
    : 'Noch keine aktiven Helfer.';
  wrap.appendChild(activeP);

  return wrap;
}

export async function loadMyAreas() {
  var panel = document.getElementById('meine-helfer');
  var tocLink = document.getElementById('tocMeineHelfer');
  var container = document.getElementById('meineHelferContainer');

  try {
    var meData = await api('staff-me', { headers: authHeaders() });
    var user = meData.user;
    var ledAreaIds = (user.areaMemberships || [])
      .filter(function (m) { return m.isLeiter && m.status === 'active'; })
      .map(function (m) { return m.areaId; });

    if (!ledAreaIds.length) {
      panel.classList.add('hidden');
      tocLink.classList.add('hidden');
      return;
    }

    var areasData = await api('staff-admin-areas', { headers: authHeaders() });
    var ledAreas = (areasData.areas || []).filter(function (a) { return ledAreaIds.indexOf(a.id) !== -1; });
    if (!ledAreas.length) {
      panel.classList.add('hidden');
      tocLink.classList.add('hidden');
      return;
    }

    panel.classList.remove('hidden');
    tocLink.classList.remove('hidden');
    container.innerHTML = '';

    for (var i = 0; i < ledAreas.length; i++) {
      var area = ledAreas[i];
      var membersData = await api('staff-area-members?areaId=' + encodeURIComponent(area.id), { headers: authHeaders() });
      container.appendChild(renderAreaBlock(area, membersData.members || []));
    }
  } catch (e) {
    panel.classList.add('hidden');
    tocLink.classList.add('hidden');
  }
}

document.getElementById('meineHelferContainer').addEventListener('click', async function (event) {
  var approveBtn = event.target.closest('[data-approve]');
  var rejectBtn = event.target.closest('[data-reject]');
  var btn = approveBtn || rejectBtn;
  if (!btn) return;
  var areaId = btn.getAttribute('data-area');
  var email = approveBtn ? approveBtn.getAttribute('data-approve') : rejectBtn.getAttribute('data-reject');
  try {
    await api('staff-area-members', {
      method: 'POST',
      headers: authHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ areaId: areaId, email: email, action: approveBtn ? 'approve' : 'reject' })
    });
    await loadMyAreas();
  } catch (e) {}
});
