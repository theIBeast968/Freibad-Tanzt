import { api, authHeaders } from '../api.js';
import { showErr } from '../dom.js';

var joinForm = document.getElementById('areaJoinForm');
var joinSelect = document.getElementById('joinAreaSelect');
var applyForm = document.getElementById('leaderApplyForm');
var applySelect = document.getElementById('leaderApplyAreaSelect');

export async function loadAreaActionOptions() {
  try {
    var data = await api('staff-admin-areas', { headers: authHeaders() });
    var areas = (data.areas || []).filter(function (area) { return area.active && area.type === 'operational'; });

    var joinSelected = joinSelect.value;
    joinSelect.innerHTML = '<option value="">Bitte wählen</option>';
    areas.forEach(function (area) {
      var opt = document.createElement('option');
      opt.value = area.id;
      opt.textContent = area.name;
      joinSelect.appendChild(opt);
    });
    joinSelect.value = joinSelected;

    var applySelected = applySelect.value;
    applySelect.innerHTML = '<option value="">Egal, weiß nicht welcher Bereich</option>';
    areas.forEach(function (area) {
      var opt = document.createElement('option');
      opt.value = area.id;
      opt.textContent = area.name;
      applySelect.appendChild(opt);
    });
    applySelect.value = applySelected;
  } catch (e) {}
}

joinForm.addEventListener('submit', async function (event) {
  event.preventDefault();
  var err = document.getElementById('areaJoinErr');
  var ok = document.getElementById('areaJoinOk');
  showErr(err, '');
  showErr(ok, '');
  try {
    await api('staff-area-join', {
      method: 'POST',
      headers: authHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ areaId: joinSelect.value })
    });
    ok.textContent = 'Anfrage gesendet, wartet auf die Bereichsleitung.';
    ok.classList.remove('hidden');
    joinForm.reset();
  } catch (e) {
    showErr(err, e.message || 'Beitritt fehlgeschlagen.');
  }
});

applyForm.addEventListener('submit', async function (event) {
  event.preventDefault();
  var err = document.getElementById('leaderApplyErr');
  var ok = document.getElementById('leaderApplyOk');
  showErr(err, '');
  showErr(ok, '');
  try {
    await api('staff-leader-application', {
      method: 'POST',
      headers: authHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ areaId: applySelect.value || undefined })
    });
    ok.textContent = 'Bewerbung eingereicht, wartet auf den Admin.';
    ok.classList.remove('hidden');
    applyForm.reset();
  } catch (e) {
    showErr(err, e.message || 'Bewerbung fehlgeschlagen.');
  }
});
