import { api, authHeaders } from '../api.js';
import { showErr } from '../dom.js';
import { dayLabel, areaLabel } from '../format.js';
import { getCurrentUser } from '../state.js';

export function renderMyTasks(tasks) {
  var list = document.getElementById('myTaskList');
  list.innerHTML = '';
  if (!tasks || !tasks.length) {
    list.innerHTML = '<li>Aktuell keine Aufgaben zugewiesen.</li>';
    return;
  }
  tasks.forEach(function (task) {
    var li = document.createElement('li');
    var meta = [];
    if (task.dueDay) meta.push(dayLabel(task.dueDay));
    if (task.area) meta.push(areaLabel(task.area));
    li.innerHTML =
      '<strong>' + task.title + (task.status === 'done' ? ' ✓' : '') + '</strong>' +
      (meta.length ? meta.join(' · ') + '<br>' : '') +
      (task.description || '') +
      (task.status === 'open'
        ? '<div class="actions"><button type="button" class="button-secondary mini-btn" data-done="' + task.id + '">Erledigt</button></div>'
        : '');
    list.appendChild(li);
  });
}

export function renderAdminTasks(tasks) {
  var body = document.getElementById('adminTasksBody');
  body.innerHTML = '';
  if (!tasks || !tasks.length) {
    body.innerHTML = '<tr><td colspan="4">Noch keine Aufgaben.</td></tr>';
    return;
  }
  tasks.forEach(function (task) {
    var tr = document.createElement('tr');
    tr.innerHTML =
      '<td><strong>' + task.title + '</strong>' +
      (task.description ? ('<br>' + task.description) : '') + '</td>' +
      '<td>' + (task.assigneeName || task.assigneeEmail) + '</td>' +
      '<td>' + (task.status === 'done' ? 'erledigt' : 'offen') + '</td>' +
      '<td></td>';
    if (task.status === 'open') {
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'button-secondary mini-btn';
      btn.textContent = 'Erledigt';
      btn.addEventListener('click', function () { updateTask(task.id, 'done'); });
      tr.lastChild.appendChild(btn);
    }
    body.appendChild(tr);
  });
}

export async function loadTasks() {
  try {
    var data = await api('staff-tasks', { headers: authHeaders() });
    renderMyTasks(data.tasks || []);
    var currentUser = getCurrentUser();
    if (currentUser && currentUser.role === 'admin') {
      renderAdminTasks(data.tasks || []);
    }
  } catch (e) {
    renderMyTasks([]);
  }
}

export async function updateTask(id, status) {
  try {
    var data = await api('staff-tasks', {
      method: 'POST',
      headers: authHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ action: 'update', id: id, status: status })
    });
    var currentUser = getCurrentUser();
    if (currentUser && currentUser.role === 'admin') {
      renderAdminTasks(data.tasks || []);
    }
    await loadTasks();
  } catch (e) {}
}

document.getElementById('myTaskList').addEventListener('click', function (event) {
  var btn = event.target.closest('[data-done]');
  if (!btn) return;
  updateTask(btn.getAttribute('data-done'), 'done');
});

document.getElementById('adminTaskForm').addEventListener('submit', async function (event) {
  event.preventDefault();
  var err = document.getElementById('adminTaskErr');
  var ok = document.getElementById('adminTaskOk');
  showErr(err, '');
  showErr(ok, '');
  try {
    var data = await api('staff-tasks', {
      method: 'POST',
      headers: authHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({
        title: document.getElementById('taskTitle').value,
        assigneeEmail: document.getElementById('taskAssignee').value,
        dueDay: document.getElementById('taskDay').value,
        area: document.getElementById('taskArea').value,
        description: document.getElementById('taskDesc').value
      })
    });
    renderAdminTasks(data.tasks || []);
    document.getElementById('adminTaskForm').reset();
    ok.textContent = 'Aufgabe zugewiesen.';
    ok.classList.remove('hidden');
    await loadTasks();
  } catch (e) {
    showErr(err, e.message || 'Aufgabe konnte nicht gespeichert werden.');
  }
});
