import { api, authHeaders } from '../api.js';
import { showErr } from '../dom.js';
import { getCurrentUser } from '../state.js';
import { phaseLabel } from '../format.js';

var areaNamesById = {};

export function renderAdminUsers(users) {
  var body = document.getElementById('adminUsersBody');
  var currentUser = getCurrentUser();
  body.innerHTML = '';
  (users || []).forEach(function (user) {
    var tr = document.createElement('tr');
    tr.innerHTML =
      '<td><strong>' + (user.name || '–') + '</strong></td>' +
      '<td>' + (user.email || '') + (user.phone ? ('<br>' + user.phone) : '') + '</td>' +
      '<td>' + (user.role === 'admin' ? 'Admin' : 'Mitarbeiter') + '</td>' +
      '<td></td><td></td>';

    var roleCell = tr.children[3];
    if (user.role !== 'admin') {
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'button-secondary mini-btn';
      btn.textContent = 'Zum Admin';
      btn.addEventListener('click', function () { setRole(user.email, 'admin'); });
      roleCell.appendChild(btn);
    } else if (user.email !== (currentUser && currentUser.email)) {
      var btn2 = document.createElement('button');
      btn2.type = 'button';
      btn2.className = 'button-secondary mini-btn';
      btn2.textContent = 'Admin entziehen';
      btn2.addEventListener('click', function () { setRole(user.email, 'staff'); });
      roleCell.appendChild(btn2);
    }

    var pressCell = tr.children[4];
    var pressBtn = document.createElement('button');
    pressBtn.type = 'button';
    pressBtn.className = 'button-secondary mini-btn';
    pressBtn.textContent = user.canPostGlobal ? 'Presse entziehen' : 'Presse geben';
    pressBtn.addEventListener('click', function () { setPress(user.email, !user.canPostGlobal); });
    pressCell.appendChild(pressBtn);

    body.appendChild(tr);
  });
}

function shiftAssigneeNames(shift) {
  return (shift.assignments || []).map(function (a) { return a.name || a.email; }).join(', ') || '–';
}

export function renderAdminShifts(shifts) {
  var body = document.getElementById('adminShiftsBody');
  body.innerHTML = '';
  if (!shifts || !shifts.length) {
    body.innerHTML = '<tr><td colspan="6">Noch keine Schichten.</td></tr>';
    return;
  }
  shifts.forEach(function (shift) {
    var count = (shift.assignments || []).length;
    var tr = document.createElement('tr');
    tr.innerHTML =
      '<td>' + (areaNamesById[shift.areaId] || shift.areaId) + '</td>' +
      '<td>' + phaseLabel(shift.phase) + '</td>' +
      '<td>' + (shift.date || '') + ' ' + (shift.timeFrom || '') + (shift.timeTo ? ('–' + shift.timeTo) : '') + '</td>' +
      '<td>' + (shift.station || '') + '</td>' +
      '<td>' + count + '/' + shift.neededCount + '</td>' +
      '<td>' + shiftAssigneeNames(shift) + '</td>';
    body.appendChild(tr);
  });
}

export async function setRole(email, role) {
  showErr(document.getElementById('adminUsersErr'), '');
  try {
    await api('staff-admin-set-role', {
      method: 'POST',
      headers: authHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ email: email, role: role })
    });
    await loadAdmin();
  } catch (e) {
    showErr(document.getElementById('adminUsersErr'), e.message || 'Rolle konnte nicht geändert werden.');
  }
}

async function setPress(email, canPostGlobal) {
  showErr(document.getElementById('adminUsersErr'), '');
  try {
    await api('staff-admin-set-press', {
      method: 'POST',
      headers: authHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ email: email, canPostGlobal: canPostGlobal })
    });
    await loadAdmin();
  } catch (e) {
    showErr(document.getElementById('adminUsersErr'), e.message || 'Presse-Recht konnte nicht geändert werden.');
  }
}

async function loadAdminShifts() {
  var areaId = document.getElementById('adminShiftsAreaFilter').value;
  var phase = document.getElementById('adminShiftsPhaseFilter').value;
  var query = [];
  if (areaId) query.push('areaId=' + encodeURIComponent(areaId));
  if (phase) query.push('phase=' + encodeURIComponent(phase));
  try {
    var shiftsData = await api('staff-admin-shifts' + (query.length ? '?' + query.join('&') : ''), {
      headers: authHeaders()
    });
    renderAdminShifts(shiftsData.shifts || []);
  } catch (e) {
    renderAdminShifts([]);
  }
}

document.getElementById('adminShiftsAreaFilter').addEventListener('change', loadAdminShifts);
document.getElementById('adminShiftsPhaseFilter').addEventListener('change', loadAdminShifts);

export async function loadAdmin() {
  var currentUser = getCurrentUser();
  if (!currentUser || currentUser.role !== 'admin') return;

  try {
    var areasData = await api('staff-admin-areas', { headers: authHeaders() });
    areaNamesById = {};
    var areaFilter = document.getElementById('adminShiftsAreaFilter');
    var selected = areaFilter.value;
    areaFilter.innerHTML = '<option value="">Alle Bereiche</option>';
    (areasData.areas || []).forEach(function (area) {
      areaNamesById[area.id] = area.name;
      var opt = document.createElement('option');
      opt.value = area.id;
      opt.textContent = area.name;
      areaFilter.appendChild(opt);
    });
    areaFilter.value = selected;
  } catch (e) {}

  try {
    var usersData = await api('staff-admin-users', { headers: authHeaders() });
    renderAdminUsers(usersData.users || []);
  } catch (e) {
    showErr(document.getElementById('adminUsersErr'), e.message || 'Mitarbeiter konnten nicht geladen werden.');
  }

  await loadAdminShifts();
}
