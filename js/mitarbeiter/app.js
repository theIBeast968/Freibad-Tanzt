import { api, token, clearToken } from './api.js';
import { setCurrentUser } from './state.js';
import { loadShifts } from './views/shifts.js';
import { loadTasks } from './views/tasks.js';
import { loadAdmin } from './views/admin.js';

var authView = document.getElementById('authView');
var appView = document.getElementById('appView');

export function showAuth() {
  appView.classList.add('hidden');
  authView.classList.remove('hidden');
}

export function showApp(user) {
  setCurrentUser(user);
  authView.classList.add('hidden');
  appView.classList.remove('hidden');
  document.getElementById('welcomeTitle').textContent = 'Hallo, ' + (user.firstName || user.name || 'Team');
  document.getElementById('userEmail').textContent =
    (user.email || '') + (user.phone ? (' · ' + user.phone) : '') +
    (user.role === 'admin' ? ' · Admin' : '');
  var adminView = document.getElementById('adminView');
  var tocAdmin = document.getElementById('tocAdmin');
  if (user.role === 'admin') {
    adminView.classList.remove('hidden');
    tocAdmin.classList.remove('hidden');
    loadAdmin();
  } else {
    adminView.classList.add('hidden');
    tocAdmin.classList.add('hidden');
    loadTasks();
  }
  loadShifts();
}

export async function loadMe() {
  var t = token();
  if (!t) {
    showAuth();
    return;
  }
  try {
    var data = await api('staff-me', {
      headers: { Authorization: 'Bearer ' + t }
    });
    showApp(data.user);
  } catch (e) {
    clearToken();
    showAuth();
  }
}
