import { api, authHeaders } from '../api.js';
import { showErr } from '../dom.js';
import { getCurrentUser } from '../state.js';

var PHASE_LABELS = {
  aufbau: 'Aufbau',
  freitag: 'Freitag',
  samstag: 'Samstag',
  sonntag: 'Sonntag',
  abbau: 'Abbau'
};

var areaForm = document.getElementById('areaForm');
var areaIdField = document.getElementById('areaId');
var areaTypeField = document.getElementById('areaType');
var areaSubmitBtn = document.getElementById('areaSubmitBtn');
var areaCancelEdit = document.getElementById('areaCancelEdit');

function phaseCheckboxes() {
  return Array.prototype.slice.call(document.querySelectorAll('#areaPhases input[type="checkbox"]'));
}

function phasesText(phases) {
  if (!phases || !phases.length) return '–';
  return phases.map(function (phase) { return PHASE_LABELS[phase] || phase; }).join(', ');
}

function setPhasesDisabled(disabled) {
  phaseCheckboxes().forEach(function (box) {
    box.disabled = disabled;
    if (disabled) box.checked = false;
  });
}

areaTypeField.addEventListener('change', function () {
  setPhasesDisabled(areaTypeField.value === 'planning');
});

function resetAreaForm() {
  areaForm.reset();
  areaIdField.value = '';
  areaSubmitBtn.textContent = 'Bereich anlegen';
  areaCancelEdit.hidden = true;
  setPhasesDisabled(false);
}

areaCancelEdit.addEventListener('click', resetAreaForm);

function startEditArea(area) {
  areaIdField.value = area.id;
  document.getElementById('areaName').value = area.name || '';
  areaTypeField.value = area.type || 'operational';
  setPhasesDisabled(area.type === 'planning');
  var phases = area.phases || [];
  phaseCheckboxes().forEach(function (box) {
    box.checked = phases.indexOf(box.value) !== -1;
  });
  document.getElementById('areaDescription').value = area.description || '';
  areaSubmitBtn.textContent = 'Bereich speichern';
  areaCancelEdit.hidden = false;
  areaForm.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function roleTag(area, currentUser) {
  var leaders = area.leaderEmails || [];
  if (!leaders.length) return '–';
  return leaders.join(', ');
}

export function renderAreas(areas) {
  var body = document.getElementById('adminAreasBody');
  var currentUser = getCurrentUser();
  body.innerHTML = '';
  if (!areas || !areas.length) {
    body.innerHTML = '<tr><td colspan="6">Noch keine Bereiche angelegt.</td></tr>';
  } else {
    areas.forEach(function (area) {
      var tr = document.createElement('tr');
      tr.innerHTML =
        '<td><strong>' + area.name + '</strong><br><span style="color:var(--muted);font-size:0.8rem;">' + area.slug + '</span></td>' +
        '<td>' + (area.type === 'planning' ? 'Planung' : 'Operativ') + '</td>' +
        '<td>' + phasesText(area.phases) + '</td>' +
        '<td>' + (area.active ? 'Aktiv' : 'Inaktiv') + '</td>' +
        '<td>' + roleTag(area, currentUser) + '</td>' +
        '<td></td>';
      var actions = document.createElement('div');
      actions.className = 'actions';

      var editBtn = document.createElement('button');
      editBtn.type = 'button';
      editBtn.className = 'button-secondary mini-btn';
      editBtn.textContent = 'Bearbeiten';
      editBtn.addEventListener('click', function () { startEditArea(area); });
      actions.appendChild(editBtn);

      var toggleBtn = document.createElement('button');
      toggleBtn.type = 'button';
      toggleBtn.className = 'button-secondary mini-btn';
      toggleBtn.textContent = area.active ? 'Deaktivieren' : 'Aktivieren';
      toggleBtn.addEventListener('click', function () { toggleActive(area); });
      actions.appendChild(toggleBtn);

      tr.lastChild.appendChild(actions);
      body.appendChild(tr);
    });
  }

  var select = document.getElementById('leaderArea');
  var selected = select.value;
  select.innerHTML = '<option value="">Bitte wählen</option>';
  (areas || []).forEach(function (area) {
    var opt = document.createElement('option');
    opt.value = area.id;
    opt.textContent = area.name;
    select.appendChild(opt);
  });
  select.value = selected;
}

export async function loadAreas() {
  try {
    var data = await api('staff-admin-areas', { headers: authHeaders() });
    renderAreas(data.areas || []);
    return data.areas || [];
  } catch (e) {
    renderAreas([]);
    return [];
  }
}

async function toggleActive(area) {
  try {
    await api('staff-admin-area', {
      method: 'POST',
      headers: authHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ id: area.id, active: !area.active })
    });
    await loadAreas();
  } catch (e) {
    showErr(document.getElementById('areaErr'), e.message || 'Bereich konnte nicht aktualisiert werden.');
  }
}

async function loadLeaderEmailOptions() {
  var select = document.getElementById('leaderEmail');
  try {
    var data = await api('staff-admin-users', { headers: authHeaders() });
    var selected = select.value;
    select.innerHTML = '<option value="">Bitte wählen</option>';
    (data.users || []).forEach(function (user) {
      var opt = document.createElement('option');
      opt.value = user.email;
      opt.textContent = (user.name || user.email) + ' (' + user.email + ')';
      select.appendChild(opt);
    });
    select.value = selected;
  } catch (e) {}
}

areaForm.addEventListener('submit', async function (event) {
  event.preventDefault();
  var err = document.getElementById('areaErr');
  var ok = document.getElementById('areaOk');
  showErr(err, '');
  showErr(ok, '');

  var phases = phaseCheckboxes().filter(function (box) { return box.checked; }).map(function (box) { return box.value; });
  var payload = {
    name: document.getElementById('areaName').value,
    type: areaTypeField.value,
    phases: phases,
    description: document.getElementById('areaDescription').value
  };

  var isEdit = Boolean(areaIdField.value);
  if (isEdit) payload.id = areaIdField.value;

  try {
    await api(isEdit ? 'staff-admin-area' : 'staff-admin-areas', {
      method: 'POST',
      headers: authHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify(payload)
    });
    ok.textContent = isEdit ? 'Bereich gespeichert.' : 'Bereich angelegt.';
    ok.classList.remove('hidden');
    resetAreaForm();
    await loadAreas();
    await loadLeaderEmailOptions();
  } catch (e) {
    showErr(err, e.message || 'Bereich konnte nicht gespeichert werden.');
  }
});

document.getElementById('areaLeaderForm').addEventListener('submit', async function (event) {
  event.preventDefault();
  var err = document.getElementById('areaLeaderErr');
  var ok = document.getElementById('areaLeaderOk');
  showErr(err, '');
  showErr(ok, '');
  try {
    await api('staff-admin-set-area-leader', {
      method: 'POST',
      headers: authHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({
        areaId: document.getElementById('leaderArea').value,
        email: document.getElementById('leaderEmail').value,
        isLeiter: document.getElementById('leaderIsLeiter').checked
      })
    });
    ok.textContent = 'Gespeichert.';
    ok.classList.remove('hidden');
    await loadAreas();
  } catch (e) {
    showErr(err, e.message || 'Bereichsleiter konnte nicht gesetzt werden.');
  }
});

export async function loadAreasAdmin() {
  await loadAreas();
  await loadLeaderEmailOptions();
}
