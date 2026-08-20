import { api, authHeaders } from '../api.js';
import { getCurrentUser } from '../state.js';

function renderMyTasks(tasks) {
  var list = document.getElementById('myTaskList');
  list.innerHTML = '';
  if (!tasks || !tasks.length) {
    list.innerHTML = '<li>Aktuell keine Aufgaben zugewiesen.</li>';
    return;
  }
  tasks.forEach(function (task) {
    var li = document.createElement('li');
    li.innerHTML =
      '<strong>' + task.title + (task.status === 'done' ? ' ✓' : '') + '</strong>' +
      task.areaName + (task.dueDate ? (' · Fällig: ' + task.dueDate) : '') + '<br>' +
      (task.body || '') +
      (task.status === 'open'
        ? '<div class="actions"><button type="button" class="button-secondary mini-btn" data-done="' + task.id + '" data-area="' + task.areaId + '">Erledigt</button></div>'
        : '');
    list.appendChild(li);
  });
}

export async function loadMyTasks() {
  var currentUser = getCurrentUser();
  if (!currentUser) {
    return;
  }
  var areaIds = (currentUser.areaMemberships || [])
    .filter(function (m) { return m.status === 'active'; })
    .map(function (m) { return m.areaId; });

  if (!areaIds.length) {
    renderMyTasks([]);
    return;
  }

  try {
    var areasData = await api('staff-admin-areas', { headers: authHeaders() });
    var namesById = {};
    (areasData.areas || []).forEach(function (area) { namesById[area.id] = area.name; });

    var allTasks = [];
    for (var i = 0; i < areaIds.length; i++) {
      var areaId = areaIds[i];
      var data = await api('staff-dashboard-area?areaId=' + encodeURIComponent(areaId), { headers: authHeaders() });
      (data.posts || [])
        .filter(function (post) { return post.type === 'task' && post.assigneeEmail === currentUser.email; })
        .forEach(function (post) {
          allTasks.push(Object.assign({}, post, { areaId: areaId, areaName: namesById[areaId] || areaId }));
        });
    }
    renderMyTasks(allTasks);
  } catch (e) {
    renderMyTasks([]);
  }
}

document.getElementById('myTaskList').addEventListener('click', async function (event) {
  var btn = event.target.closest('[data-done]');
  if (!btn) return;
  try {
    await api('staff-dashboard-area', {
      method: 'POST',
      headers: authHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({
        areaId: btn.getAttribute('data-area'),
        action: 'task-status',
        postId: btn.getAttribute('data-done'),
        status: 'done'
      })
    });
    await loadMyTasks();
  } catch (e) {}
});
