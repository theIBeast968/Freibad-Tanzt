import { api, authHeaders, token, clearToken } from './api.js';
import { setCurrentUser } from './state.js';
import { loadAdmin } from './views/admin.js';
import { loadAreasAdmin } from './views/areas.js';
import { loadMyAreas } from './views/area-members.js';
import { loadWorkAreas, stopWorkspacePolling } from './views/area-workspace.js';
import { loadAdminChat, startAdminChatPolling, stopAdminChatPolling } from './views/admin-chat.js';
import { loadOriginReport } from './views/privacy-ops.js';
import { loadGlobalDashboard } from './views/dashboard-global.js';
import { loadMyTasks } from './views/my-tasks.js';
import { loadPushSettings } from './views/push.js';

var authView = document.getElementById('authView');
var appView = document.getElementById('appView');

export function showAuth() {
  appView.classList.add('hidden');
  authView.classList.remove('hidden');
  stopWorkspacePolling();
  stopAdminChatPolling();
}

async function roleLabel(user) {
  if (user.role === 'admin') return 'Admin';
  var leaderMemberships = (user.areaMemberships || []).filter(function (m) {
    return m.isLeiter && m.status === 'active';
  });
  if (!leaderMemberships.length) return 'Helfer';
  try {
    var data = await api('staff-admin-areas', { headers: authHeaders() });
    var byId = {};
    (data.areas || []).forEach(function (a) { byId[a.id] = a.name; });
    var names = leaderMemberships.map(function (m) { return byId[m.areaId] || m.areaId; });
    return 'Bereichsleiter (' + names.join(', ') + ')';
  } catch (e) {
    return 'Bereichsleiter';
  }
}

export async function showApp(user) {
  setCurrentUser(user);
  authView.classList.add('hidden');
  appView.classList.remove('hidden');
  document.getElementById('welcomeTitle').textContent = 'Hallo, ' + (user.firstName || user.name || 'Team');
  var label = await roleLabel(user);
  document.getElementById('userEmail').textContent =
    (user.email || '') + (user.phone ? (' · ' + user.phone) : '') + ' · ' + label;
  var adminView = document.getElementById('adminView');
  var tocAdmin = document.getElementById('tocAdmin');
  if (user.role === 'admin') {
    adminView.classList.remove('hidden');
    tocAdmin.classList.remove('hidden');
    loadAdmin();
    loadAreasAdmin();
    loadAdminChat();
    startAdminChatPolling();
    loadOriginReport();
  } else {
    adminView.classList.add('hidden');
    tocAdmin.classList.add('hidden');
  }

  var pendingNotice = document.getElementById('pendingNotice');
  var memberships = user.areaMemberships || [];
  var hasActiveArea = memberships.some(function (m) { return m.status === 'active'; });
  var hasPendingOnly = memberships.length > 0 && !hasActiveArea;
  pendingNotice.classList.toggle('hidden', user.role === 'admin' || !hasPendingOnly);

  loadGlobalDashboard();
  loadMyTasks();
  loadMyAreas();
  loadWorkAreas();
  loadPushSettings();
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
