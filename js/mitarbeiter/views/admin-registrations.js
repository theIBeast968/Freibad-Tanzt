import { api, authHeaders } from '../api.js';
import { showErr } from '../dom.js';

export async function loadRegistrations() {
  var body = document.getElementById('adminRegistrationsBody');
  try {
    var data = await api('staff-admin-registrations', { headers: authHeaders() });
    body.innerHTML = '';
    if (!data.registrations || !data.registrations.length) {
      body.innerHTML = '<tr><td colspan="4">Keine offenen Registrierungen.</td></tr>';
      return;
    }
    data.registrations.forEach(function (reg) {
      var tr = document.createElement('tr');
      tr.innerHTML =
        '<td><strong>' + reg.name + '</strong></td>' +
        '<td>' + reg.email + (reg.phone ? ('<br>' + reg.phone) : '') + '</td>' +
        '<td>' + (reg.origin || '–') + '</td>' +
        '<td></td>';
      var actions = document.createElement('div');
      actions.className = 'actions';

      var approveBtn = document.createElement('button');
      approveBtn.type = 'button';
      approveBtn.className = 'button-primary mini-btn';
      approveBtn.textContent = 'Freischalten';
      approveBtn.addEventListener('click', function () { decide(reg.email, 'approve'); });
      actions.appendChild(approveBtn);

      var rejectBtn = document.createElement('button');
      rejectBtn.type = 'button';
      rejectBtn.className = 'button-secondary mini-btn';
      rejectBtn.textContent = 'Ablehnen';
      rejectBtn.addEventListener('click', function () { decide(reg.email, 'reject'); });
      actions.appendChild(rejectBtn);

      tr.lastChild.appendChild(actions);
      body.appendChild(tr);
    });
  } catch (e) {
    body.innerHTML = '<tr><td colspan="4">Konnte nicht geladen werden.</td></tr>';
  }
}

async function decide(email, decision) {
  showErr(document.getElementById('adminRegistrationsErr'), '');
  try {
    await api('staff-admin-registrations', {
      method: 'POST',
      headers: authHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ email: email, decision: decision })
    });
    await loadRegistrations();
  } catch (e) {
    showErr(document.getElementById('adminRegistrationsErr'), e.message || 'Aktion fehlgeschlagen.');
  }
}

export async function loadLeaderApplications() {
  var body = document.getElementById('adminLeaderApplicationsBody');
  try {
    var areasData = await api('staff-admin-areas', { headers: authHeaders() });
    var areaNamesById = {};
    (areasData.areas || []).forEach(function (area) { areaNamesById[area.id] = area.name; });

    var data = await api('staff-admin-leader-applications', { headers: authHeaders() });
    body.innerHTML = '';
    if (!data.applications || !data.applications.length) {
      body.innerHTML = '<tr><td colspan="3">Keine offenen Bewerbungen.</td></tr>';
      return;
    }
    data.applications.forEach(function (application) {
      var tr = document.createElement('tr');
      var wantsSpecific = Boolean(application.areaId);
      tr.innerHTML =
        '<td><strong>' + application.name + '</strong><br>' + application.email + '</td>' +
        '<td>' + (wantsSpecific ? (areaNamesById[application.areaId] || application.areaId) : '–') + '</td>' +
        '<td></td>';

      var actions = document.createElement('div');
      actions.className = 'actions';

      if (!wantsSpecific) {
        var select = document.createElement('select');
        select.style.width = 'auto';
        select.style.marginRight = '0.5rem';
        var opt0 = document.createElement('option');
        opt0.value = '';
        opt0.textContent = 'Bereich wählen';
        select.appendChild(opt0);
        (areasData.areas || []).forEach(function (area) {
          var opt = document.createElement('option');
          opt.value = area.id;
          opt.textContent = area.name;
          select.appendChild(opt);
        });
        actions.appendChild(select);

        var approveBtn = document.createElement('button');
        approveBtn.type = 'button';
        approveBtn.className = 'button-primary mini-btn';
        approveBtn.textContent = 'Freischalten';
        approveBtn.addEventListener('click', function () {
          if (!select.value) {
            showErr(document.getElementById('adminLeaderApplicationsErr'), 'Bitte zuerst einen Bereich wählen.');
            return;
          }
          decideLeader(application.id, 'approve', select.value);
        });
        actions.appendChild(approveBtn);
      } else {
        var approveBtn2 = document.createElement('button');
        approveBtn2.type = 'button';
        approveBtn2.className = 'button-primary mini-btn';
        approveBtn2.textContent = 'Freischalten';
        approveBtn2.addEventListener('click', function () { decideLeader(application.id, 'approve'); });
        actions.appendChild(approveBtn2);
      }

      var rejectBtn = document.createElement('button');
      rejectBtn.type = 'button';
      rejectBtn.className = 'button-secondary mini-btn';
      rejectBtn.textContent = 'Ablehnen';
      rejectBtn.addEventListener('click', function () { decideLeader(application.id, 'reject'); });
      actions.appendChild(rejectBtn);

      tr.lastChild.appendChild(actions);
      body.appendChild(tr);
    });
  } catch (e) {
    body.innerHTML = '<tr><td colspan="3">Konnte nicht geladen werden.</td></tr>';
  }
}

async function decideLeader(applicationId, decision, areaId) {
  showErr(document.getElementById('adminLeaderApplicationsErr'), '');
  try {
    await api('staff-admin-leader-applications', {
      method: 'POST',
      headers: authHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ applicationId: applicationId, decision: decision, areaId: areaId })
    });
    await loadLeaderApplications();
  } catch (e) {
    showErr(document.getElementById('adminLeaderApplicationsErr'), e.message || 'Aktion fehlgeschlagen.');
  }
}
