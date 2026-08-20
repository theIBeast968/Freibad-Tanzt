import { api, authHeaders } from '../api.js';
import { showErr } from '../dom.js';
import { getCurrentUser } from '../state.js';
import { dayLabel, areaLabel } from '../format.js';
import { loadTasks } from './tasks.js';

export function renderAdminUsers(users) {
  var body = document.getElementById('adminUsersBody');
  var select = document.getElementById('taskAssignee');
  var currentUser = getCurrentUser();
  body.innerHTML = '';
  select.innerHTML = '<option value="">Bitte wählen</option>';
  (users || []).forEach(function (user) {
    var tr = document.createElement('tr');
    tr.innerHTML =
      '<td><strong>' + (user.name || '–') + '</strong></td>' +
      '<td>' + (user.email || '') + (user.phone ? ('<br>' + user.phone) : '') + '</td>' +
      '<td>' + (user.role === 'admin' ? 'Admin' : 'Mitarbeiter') + '</td>' +
      '<td></td>';
    if (user.role !== 'admin') {
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'button-secondary mini-btn';
      btn.textContent = 'Zum Admin';
      btn.addEventListener('click', function () { setRole(user.email, 'admin'); });
      tr.lastChild.appendChild(btn);
    } else if (user.email !== (currentUser && currentUser.email)) {
      var btn2 = document.createElement('button');
      btn2.type = 'button';
      btn2.className = 'button-secondary mini-btn';
      btn2.textContent = 'Admin entziehen';
      btn2.addEventListener('click', function () { setRole(user.email, 'staff'); });
      tr.lastChild.appendChild(btn2);
    }
    body.appendChild(tr);

    var opt = document.createElement('option');
    opt.value = user.email;
    opt.textContent = (user.name || user.email) + ' (' + user.email + ')';
    select.appendChild(opt);
  });
}

export function renderAdminShifts(shifts) {
  var body = document.getElementById('adminShiftsBody');
  body.innerHTML = '';
  if (!shifts || !shifts.length) {
    body.innerHTML = '<tr><td colspan="4">Noch keine Schichtmeldungen.</td></tr>';
    return;
  }
  shifts.forEach(function (shift) {
    var tr = document.createElement('tr');
    tr.innerHTML =
      '<td><strong>' + (shift.name || shift.email) + '</strong><br>' +
      (shift.email || '') + (shift.phone ? ('<br>' + shift.phone) : '') + '</td>' +
      '<td>' + dayLabel(shift.day) + '</td>' +
      '<td>' + areaLabel(shift.area) + '</td>' +
      '<td>' + (shift.note || '–') + '</td>';
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

export async function loadAdmin() {
  var currentUser = getCurrentUser();
  if (!currentUser || currentUser.role !== 'admin') return;
  try {
    var usersData = await api('staff-admin-users', { headers: authHeaders() });
    renderAdminUsers(usersData.users || []);
  } catch (e) {
    showErr(document.getElementById('adminUsersErr'), e.message || 'Mitarbeiter konnten nicht geladen werden.');
  }
  try {
    var shiftsData = await api('staff-admin-shifts', { headers: authHeaders() });
    renderAdminShifts(shiftsData.shifts || []);
  } catch (e) {
    renderAdminShifts([]);
  }
  await loadTasks();
}
