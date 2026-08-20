import { api, token } from '../api.js';
import { showErr } from '../dom.js';
import { dayLabel, areaLabel } from '../format.js';
import { getCurrentUser } from '../state.js';
import { loadAdmin } from './admin.js';

export function renderShifts(shifts) {
  var list = document.getElementById('shiftList');
  list.innerHTML = '';
  if (!shifts || !shifts.length) {
    list.innerHTML = '<li>Noch keine Schicht gemeldet.</li>';
    return;
  }
  shifts.slice().reverse().forEach(function (shift) {
    var li = document.createElement('li');
    li.innerHTML = '<strong>' + dayLabel(shift.day) + ' · ' + areaLabel(shift.area) + '</strong>' +
      (shift.phone ? ('Tel: ' + shift.phone + '<br>') : '') +
      (shift.note ? shift.note : 'ohne Notiz');
    list.appendChild(li);
  });
}

export async function loadShifts() {
  var t = token();
  if (!t) return;
  try {
    var data = await api('staff-shifts', {
      headers: { Authorization: 'Bearer ' + t }
    });
    renderShifts(data.shifts || []);
  } catch (e) {
    renderShifts([]);
  }
}

document.getElementById('shiftForm').addEventListener('submit', async function (event) {
  event.preventDefault();
  var shiftErr = document.getElementById('shiftErr');
  var shiftOk = document.getElementById('shiftOk');
  showErr(shiftErr, '');
  showErr(shiftOk, '');
  try {
    var data = await api('staff-shift', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer ' + token()
      },
      body: JSON.stringify({
        day: document.getElementById('shiftDay').value,
        area: document.getElementById('shiftArea').value,
        phone: document.getElementById('shiftPhone').value,
        note: document.getElementById('shiftNote').value
      })
    });
    renderShifts(data.shifts || []);
    document.getElementById('shiftForm').reset();
    shiftOk.textContent = 'Schicht gespeichert.';
    shiftOk.classList.remove('hidden');
    var currentUser = getCurrentUser();
    if (currentUser && currentUser.role === 'admin') {
      loadAdmin();
    }
  } catch (e) {
    showErr(shiftErr, e.message || 'Speichern fehlgeschlagen.');
  }
});
