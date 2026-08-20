import { api, authHeaders } from '../api.js';
import { showErr } from '../dom.js';
import { getCurrentUser } from '../state.js';
import { phaseLabel } from '../format.js';
import { renderPostCard } from '../dashboard-ui.js';
import { uploadFiles } from '../media.js';

var panel = document.getElementById('mein-bereich');
var tocLink = document.getElementById('tocMeinBereich');
var areaSelect = document.getElementById('workAreaSelect');
var tabDashboard = document.getElementById('workTabDashboard');
var tabShifts = document.getElementById('workTabShifts');
var tabChat = document.getElementById('workTabChat');
var dashboardSection = document.getElementById('workDashboardSection');
var shiftsSection = document.getElementById('workShiftsSection');
var chatSection = document.getElementById('workChatSection');
var chatForm = document.getElementById('chatForm');
var phaseTabsWrap = document.getElementById('shiftPhaseTabs');
var leaderFormWrap = document.getElementById('shiftLeaderForm');
var slotForm = document.getElementById('shiftSlotForm');
var slotIdField = document.getElementById('slotId');
var slotSubmitBtn = document.getElementById('slotSubmitBtn');
var slotCancelEdit = document.getElementById('slotCancelEdit');
var postFormWrap = document.getElementById('areaPostForm');
var postForm = document.getElementById('areaDashboardForm');
var postTypeSelect = document.getElementById('areaPostType');
var pollOptionsWrap = document.getElementById('areaPollOptionsWrap');
var taskAssigneeWrap = document.getElementById('areaTaskAssigneeWrap');
var checklistItemsWrap = document.getElementById('areaChecklistItemsWrap');

var myAreas = [];
var allAreasCache = [];
var currentAreaId = '';
var currentPhase = '';

var planningToolsWrap = document.getElementById('planningAreaTools');
var spinoffForm = document.getElementById('spinoffForm');
var spinoffChildList = document.getElementById('spinoffChildList');

function renderPlanningTools() {
  var area = currentArea();
  var currentUser = getCurrentUser();
  var isPlanning = Boolean(area && area.type === 'planning');
  var canSpinoff = isPlanning && currentUser && currentUser.role === 'admin';
  planningToolsWrap.classList.toggle('hidden', !isPlanning);
  spinoffForm.classList.toggle('hidden', !canSpinoff);

  if (!isPlanning) return;

  var children = allAreasCache.filter(function (a) { return a.parentPlanningAreaId === currentAreaId; });
  spinoffChildList.textContent = children.length
    ? 'Bereits ausgegliedert: ' + children.map(function (a) { return a.name; }).join(', ')
    : 'Noch keine Bereiche ausgegliedert.';
}

spinoffForm.addEventListener('submit', async function (event) {
  event.preventDefault();
  var err = document.getElementById('spinoffErr');
  var ok = document.getElementById('spinoffOk');
  showErr(err, '');
  showErr(ok, '');
  try {
    await api('staff-admin-spinoff-area', {
      method: 'POST',
      headers: authHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ planningAreaId: currentAreaId, name: document.getElementById('spinoffName').value })
    });
    ok.textContent = 'Bereich ausgegliedert.';
    ok.classList.remove('hidden');
    spinoffForm.reset();
    await loadWorkAreas();
  } catch (e) {
    showErr(err, e.message || 'Konnte nicht ausgegliedert werden.');
  }
});

function currentArea() {
  return myAreas.find(function (a) { return a.id === currentAreaId; }) || null;
}

var chatPollTimer = null;
var chatSince = '';

function stopChatPolling() {
  if (chatPollTimer) {
    clearInterval(chatPollTimer);
    chatPollTimer = null;
  }
}

function startChatPolling() {
  stopChatPolling();
  chatPollTimer = setInterval(pollChat, 6000);
}

function setSubTab(which) {
  tabDashboard.classList.toggle('active', which === 'dashboard');
  tabShifts.classList.toggle('active', which === 'shifts');
  tabChat.classList.toggle('active', which === 'chat');
  dashboardSection.classList.toggle('hidden', which !== 'dashboard');
  shiftsSection.classList.toggle('hidden', which !== 'shifts');
  chatSection.classList.toggle('hidden', which !== 'chat');
  var area = currentArea();
  if (which === 'chat') {
    if (area && area.isMember) {
      loadChat();
      startChatPolling();
    } else {
      stopChatPolling();
      document.getElementById('chatMessageList').innerHTML =
        '<li>Chat erst nach Beitritt bzw. Schicht-Zusage in diesem Bereich sichtbar.</li>';
    }
  } else {
    stopChatPolling();
  }
}

tabDashboard.addEventListener('click', function () { setSubTab('dashboard'); });
tabShifts.addEventListener('click', function () { setSubTab('shifts'); });
tabChat.addEventListener('click', function () { setSubTab('chat'); });

function appendChatMessages(messages) {
  var list = document.getElementById('chatMessageList');
  var placeholder = list.querySelector('[data-placeholder]');
  if (placeholder) placeholder.remove();
  messages.forEach(function (message) {
    var li = document.createElement('li');
    li.innerHTML =
      '<strong>' + (message.authorName || message.authorEmail) + '</strong>' +
      new Date(message.createdAt).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' }) +
      '<br>' + message.body;
    list.appendChild(li);
    chatSince = message.id;
  });
}

async function loadChat() {
  if (!currentAreaId) return;
  chatSince = '';
  var list = document.getElementById('chatMessageList');
  list.innerHTML = '<li data-placeholder="1">Noch keine Nachrichten. Schreib die erste!</li>';
  try {
    var data = await api('staff-chat?areaId=' + encodeURIComponent(currentAreaId), { headers: authHeaders() });
    appendChatMessages(data.messages || []);
  } catch (e) {}
}

async function pollChat() {
  if (!currentAreaId || chatSection.classList.contains('hidden')) return;
  try {
    var data = await api(
      'staff-chat?areaId=' + encodeURIComponent(currentAreaId) + '&since=' + encodeURIComponent(chatSince),
      { headers: authHeaders() }
    );
    appendChatMessages(data.messages || []);
  } catch (e) {}
}

chatForm.addEventListener('submit', async function (event) {
  event.preventDefault();
  var err = document.getElementById('chatErr');
  showErr(err, '');
  var input = document.getElementById('chatBody');
  var text = input.value.trim();
  if (!text) return;
  try {
    await api('staff-chat', {
      method: 'POST',
      headers: authHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ areaId: currentAreaId, body: text })
    });
    input.value = '';
    await pollChat();
  } catch (e) {
    showErr(err, e.message || 'Nachricht konnte nicht gesendet werden.');
  }
});

postTypeSelect.addEventListener('change', function () {
  var type = postTypeSelect.value;
  pollOptionsWrap.classList.toggle('hidden', type !== 'poll');
  taskAssigneeWrap.classList.toggle('hidden', type !== 'task');
  checklistItemsWrap.classList.toggle('hidden', type !== 'checklist');
  if (type === 'task') loadTaskAssignees();
});

async function loadTaskAssignees() {
  var select = document.getElementById('areaTaskAssignee');
  try {
    var data = await api('staff-area-members?areaId=' + encodeURIComponent(currentAreaId), { headers: authHeaders() });
    select.innerHTML = '<option value="">Bitte wählen</option>';
    (data.members || [])
      .filter(function (m) { return m.status === 'active'; })
      .forEach(function (member) {
        var opt = document.createElement('option');
        opt.value = member.email;
        opt.textContent = member.name || member.email;
        select.appendChild(opt);
      });
  } catch (e) {}
}

function renderPhaseTabs(area) {
  phaseTabsWrap.innerHTML = '';
  var phases = area ? area.phases || [] : [];
  if (!phases.length) {
    currentPhase = '';
    return;
  }
  if (phases.indexOf(currentPhase) === -1) {
    currentPhase = phases[0];
  }
  phases.forEach(function (phase) {
    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'tab' + (phase === currentPhase ? ' active' : '');
    btn.textContent = phaseLabel(phase);
    btn.addEventListener('click', function () {
      currentPhase = phase;
      renderPhaseTabs(area);
      loadAreaShifts();
    });
    phaseTabsWrap.appendChild(btn);
  });
}

function shiftStatusText(shift) {
  var count = (shift.assignments || []).length;
  if (count >= shift.neededCount) return 'Voll (' + count + '/' + shift.neededCount + ')';
  if (count > 0) return 'Teilweise besetzt (' + count + '/' + shift.neededCount + ')';
  return 'Offen (0/' + shift.neededCount + ')';
}

function renderShiftSlots(shifts) {
  var list = document.getElementById('shiftSlotList');
  var currentUser = getCurrentUser();
  var area = currentArea();
  list.innerHTML = '';
  if (!shifts || !shifts.length) {
    list.innerHTML = '<li>Noch keine Schichten in dieser Phase.</li>';
    return;
  }
  shifts.forEach(function (shift) {
    var li = document.createElement('li');
    var assignedNames = (shift.assignments || []).map(function (a) { return a.name || a.email; }).join(', ') || '–';
    var extraText = Object.keys(shift.extraFields || {})
      .map(function (k) { return k + ': ' + shift.extraFields[k]; })
      .join(', ');
    li.innerHTML =
      '<strong>' + (shift.date || '') + ' ' + (shift.timeFrom || '') + (shift.timeTo ? ('–' + shift.timeTo) : '') + ' · ' + shift.station + '</strong>' +
      shiftStatusText(shift) + '<br>Zugewiesen: ' + assignedNames +
      (extraText ? ('<br>' + extraText) : '');

    var actions = document.createElement('div');
    actions.className = 'actions';

    var myAssignment = currentUser && (shift.assignments || []).find(function (a) { return a.email === currentUser.email; });
    var myWaitlistEntry = currentUser && (shift.waitlist || []).find(function (w) { return w.email === currentUser.email; });
    var isLeiter = Boolean(area && area.isLeiter);

    if (!isLeiter) {
      if (myAssignment) {
        var cancelBtn = document.createElement('button');
        cancelBtn.type = 'button';
        cancelBtn.className = 'button-secondary mini-btn';
        cancelBtn.textContent = 'Austragen';
        cancelBtn.addEventListener('click', function () { signupOrCancel(shift, 'cancel'); });
        actions.appendChild(cancelBtn);
      } else if (myWaitlistEntry) {
        var pendingNote = document.createElement('span');
        pendingNote.className = 'sub';
        pendingNote.style.margin = '0';
        pendingNote.textContent = 'Anfrage wartet auf Bereichsleitung.';
        actions.appendChild(pendingNote);

        var withdrawBtn = document.createElement('button');
        withdrawBtn.type = 'button';
        withdrawBtn.className = 'button-secondary mini-btn';
        withdrawBtn.textContent = 'Zurückziehen';
        withdrawBtn.addEventListener('click', function () { signupOrCancel(shift, 'cancel'); });
        actions.appendChild(withdrawBtn);
      } else {
        var btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'button-primary mini-btn';
        btn.textContent = 'Eintragen';
        btn.addEventListener('click', function () { signupOrCancel(shift, 'signup'); });
        actions.appendChild(btn);
      }
    } else {
      var editBtn = document.createElement('button');
      editBtn.type = 'button';
      editBtn.className = 'button-secondary mini-btn';
      editBtn.textContent = 'Bearbeiten';
      editBtn.addEventListener('click', function () { startEditSlot(shift); });
      actions.appendChild(editBtn);

      var delBtn = document.createElement('button');
      delBtn.type = 'button';
      delBtn.className = 'button-secondary mini-btn';
      delBtn.textContent = 'Löschen';
      delBtn.addEventListener('click', function () { deleteSlot(shift); });
      actions.appendChild(delBtn);
    }

    li.appendChild(actions);

    if (isLeiter && (shift.waitlist || []).length) {
      var waitlistWrap = document.createElement('div');
      waitlistWrap.style.marginTop = '0.5rem';
      waitlistWrap.style.paddingTop = '0.5rem';
      waitlistWrap.style.borderTop = '1px solid rgba(255,255,255,0.08)';
      var waitlistTitle = document.createElement('p');
      waitlistTitle.className = 'sub';
      waitlistTitle.style.margin = '0 0 0.35rem';
      waitlistTitle.textContent = 'Warteliste (' + shift.waitlist.length + '):';
      waitlistWrap.appendChild(waitlistTitle);

      shift.waitlist.forEach(function (entry) {
        var row = document.createElement('div');
        row.className = 'actions';
        row.style.marginTop = '0.3rem';
        var label = document.createElement('span');
        label.textContent = entry.name + (entry.phone ? (' · ' + entry.phone) : '');
        row.appendChild(label);

        var approveBtn = document.createElement('button');
        approveBtn.type = 'button';
        approveBtn.className = 'button-primary mini-btn';
        approveBtn.textContent = 'Annehmen';
        approveBtn.addEventListener('click', function () { decideWaitlist(shift, entry.email, 'approve-waitlist'); });
        row.appendChild(approveBtn);

        var rejectBtn = document.createElement('button');
        rejectBtn.type = 'button';
        rejectBtn.className = 'button-secondary mini-btn';
        rejectBtn.textContent = 'Ablehnen';
        rejectBtn.addEventListener('click', function () { decideWaitlist(shift, entry.email, 'reject-waitlist'); });
        row.appendChild(rejectBtn);

        waitlistWrap.appendChild(row);
      });

      li.appendChild(waitlistWrap);
    }

    list.appendChild(li);
  });
}

async function loadAreaShifts() {
  if (!currentAreaId) return;
  var area = currentArea();
  leaderFormWrap.classList.toggle('hidden', !(area && area.isLeiter));
  if (!currentPhase) {
    document.getElementById('shiftSlotList').innerHTML = '<li>Dieser Bereich hat keine aktiven Phasen.</li>';
    return;
  }
  try {
    var data = await api(
      'staff-shifts?areaId=' + encodeURIComponent(currentAreaId) + '&phase=' + encodeURIComponent(currentPhase),
      { headers: authHeaders() }
    );
    renderShiftSlots(data.shifts || []);
  } catch (e) {
    renderShiftSlots([]);
  }
}

async function signupOrCancel(shift, action) {
  var err = document.getElementById('workAreaErr');
  showErr(err, '');
  try {
    var data = await api('staff-shift', {
      method: 'POST',
      headers: authHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ areaId: currentAreaId, id: shift.id, action: action })
    });
    if (action === 'signup' && data.waitlisted) {
      err.classList.remove('err');
      err.classList.add('ok');
      err.textContent = 'Schicht ist voll — Anfrage an die Bereichsleitung gesendet.';
      err.classList.remove('hidden');
    }
    await loadAreaShifts();
    await loadWorkAreas();
  } catch (e) {
    err.classList.remove('ok');
    err.classList.add('err');
    showErr(err, e.message || 'Aktion fehlgeschlagen.');
  }
}

async function decideWaitlist(shift, email, action) {
  var err = document.getElementById('workAreaErr');
  showErr(err, '');
  try {
    await api('staff-shift', {
      method: 'POST',
      headers: authHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ areaId: currentAreaId, id: shift.id, email: email, action: action })
    });
    await loadAreaShifts();
  } catch (e) {
    showErr(err, e.message || 'Aktion fehlgeschlagen.');
  }
}

function resetSlotForm() {
  slotForm.reset();
  slotIdField.value = '';
  slotSubmitBtn.textContent = 'Schicht anlegen';
  slotCancelEdit.hidden = true;
}

function startEditSlot(shift) {
  slotIdField.value = shift.id;
  document.getElementById('slotDate').value = shift.date || '';
  document.getElementById('slotTimeFrom').value = shift.timeFrom || '';
  document.getElementById('slotTimeTo').value = shift.timeTo || '';
  document.getElementById('slotStation').value = shift.station || '';
  document.getElementById('slotNeeded').value = shift.neededCount || 1;
  slotSubmitBtn.textContent = 'Schicht speichern';
  slotCancelEdit.hidden = false;
}

slotCancelEdit.addEventListener('click', resetSlotForm);

async function deleteSlot(shift) {
  try {
    await api('staff-shift', {
      method: 'POST',
      headers: authHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ areaId: currentAreaId, action: 'delete', id: shift.id })
    });
    await loadAreaShifts();
  } catch (e) {
    showErr(document.getElementById('workAreaErr'), e.message || 'Löschen fehlgeschlagen.');
  }
}

slotForm.addEventListener('submit', async function (event) {
  event.preventDefault();
  var err = document.getElementById('slotErr');
  var ok = document.getElementById('slotOk');
  showErr(err, '');
  showErr(ok, '');
  try {
    await api('staff-shift', {
      method: 'POST',
      headers: authHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({
        areaId: currentAreaId,
        action: 'create',
        id: slotIdField.value || undefined,
        phase: currentPhase,
        date: document.getElementById('slotDate').value,
        timeFrom: document.getElementById('slotTimeFrom').value,
        timeTo: document.getElementById('slotTimeTo').value,
        station: document.getElementById('slotStation').value,
        neededCount: document.getElementById('slotNeeded').value
      })
    });
    ok.textContent = 'Gespeichert.';
    ok.classList.remove('hidden');
    resetSlotForm();
    await loadAreaShifts();
  } catch (e) {
    showErr(err, e.message || 'Speichern fehlgeschlagen.');
  }
});

async function handleAreaVote(postId, optionIndex) {
  try {
    await api('staff-dashboard-area', {
      method: 'POST',
      headers: authHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ areaId: currentAreaId, action: 'vote', postId: postId, optionIndex: optionIndex })
    });
    await loadAreaDashboard();
  } catch (e) {}
}

async function handleAreaComment(postId, text) {
  try {
    await api('staff-dashboard-area', {
      method: 'POST',
      headers: authHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ areaId: currentAreaId, action: 'comment', postId: postId, body: text })
    });
    await loadAreaDashboard();
  } catch (e) {}
}

async function handleTaskToggle(postId, status) {
  try {
    await api('staff-dashboard-area', {
      method: 'POST',
      headers: authHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ areaId: currentAreaId, action: 'task-status', postId: postId, status: status })
    });
    await loadAreaDashboard();
  } catch (e) {}
}

async function handleChecklistToggle(postId, itemId) {
  try {
    await api('staff-dashboard-area', {
      method: 'POST',
      headers: authHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ areaId: currentAreaId, action: 'checklist-toggle', postId: postId, itemId: itemId })
    });
    await loadAreaDashboard();
  } catch (e) {}
}

function renderAreaPosts(posts) {
  var list = document.getElementById('areaPostList');
  var currentUser = getCurrentUser();
  var area = currentArea();
  list.innerHTML = '';
  if (!posts || !posts.length) {
    list.innerHTML = '<p class="sub">Noch keine Beiträge.</p>';
    return;
  }
  var ul = document.createElement('ul');
  ul.className = 'shift-list';
  posts.forEach(function (post) {
    ul.appendChild(renderPostCard(post, currentUser && currentUser.email, {
      onVote: handleAreaVote,
      onComment: handleAreaComment,
      onTaskToggle: handleTaskToggle,
      onChecklistToggle: handleChecklistToggle,
      isLeiter: Boolean(area && area.isLeiter)
    }));
  });
  list.appendChild(ul);
}

async function loadAreaDashboard() {
  if (!currentAreaId) return;
  var area = currentArea();
  postFormWrap.classList.toggle('hidden', !(area && area.isLeiter));
  if (!area || !area.isMember) {
    document.getElementById('areaPostList').innerHTML =
      '<p class="sub">Dashboard erst nach Beitritt bzw. Schicht-Zusage in diesem Bereich sichtbar. Wechsle zum Schichtplan, um dich einzutragen.</p>';
    return;
  }
  try {
    var data = await api('staff-dashboard-area?areaId=' + encodeURIComponent(currentAreaId), { headers: authHeaders() });
    renderAreaPosts(data.posts || []);
  } catch (e) {
    renderAreaPosts([]);
  }
}

postForm.addEventListener('submit', async function (event) {
  event.preventDefault();
  var err = document.getElementById('areaPostErr');
  var ok = document.getElementById('areaPostOk');
  showErr(err, '');
  showErr(ok, '');
  var type = postTypeSelect.value;
  var payload = {
    areaId: currentAreaId,
    action: 'create',
    type: type,
    title: document.getElementById('areaPostTitle').value,
    body: document.getElementById('areaPostBody').value
  };
  if (type === 'poll') {
    payload.pollOptions = document.getElementById('areaPollOptions').value
      .split(',').map(function (s) { return s.trim(); }).filter(Boolean);
  }
  if (type === 'task') {
    payload.assigneeEmail = document.getElementById('areaTaskAssignee').value;
  }
  if (type === 'checklist') {
    payload.items = document.getElementById('areaChecklistItems').value
      .split(',').map(function (s) { return s.trim(); }).filter(Boolean);
  }
  try {
    var files = document.getElementById('areaPostMedia').files;
    if (files && files.length) {
      payload.media = await uploadFiles(files, currentAreaId);
    }
    await api('staff-dashboard-area', {
      method: 'POST',
      headers: authHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify(payload)
    });
    ok.textContent = 'Veröffentlicht.';
    ok.classList.remove('hidden');
    postForm.reset();
    pollOptionsWrap.classList.add('hidden');
    taskAssigneeWrap.classList.add('hidden');
    checklistItemsWrap.classList.add('hidden');
    await loadAreaDashboard();
  } catch (e) {
    showErr(err, e.message || 'Konnte nicht veröffentlicht werden.');
  }
});

function switchArea(areaId) {
  stopChatPolling();
  currentAreaId = areaId;
  currentPhase = '';
  var area = currentArea();
  renderPhaseTabs(area);
  renderPlanningTools();
  loadAreaDashboard();
  loadAreaShifts();
  if (!chatSection.classList.contains('hidden')) {
    if (area && area.isMember) {
      loadChat();
      startChatPolling();
    } else {
      document.getElementById('chatMessageList').innerHTML =
        '<li>Chat erst nach Beitritt bzw. Schicht-Zusage in diesem Bereich sichtbar.</li>';
    }
  }
}

export function stopWorkspacePolling() {
  stopChatPolling();
}

areaSelect.addEventListener('change', function () {
  switchArea(areaSelect.value);
});

export async function loadWorkAreas() {
  var currentUser = getCurrentUser();
  if (!currentUser) return;

  try {
    var areasData = await api('staff-admin-areas', { headers: authHeaders() });
    var allAreas = (areasData.areas || []).filter(function (a) { return a.active; });
    allAreasCache = allAreas;

    // Alle aktiven Bereiche sind grundsaetzlich sichtbar/waehlbar (Schichtplan-Browsing
    // auch ohne bestehende Mitgliedschaft, siehe Phase 10). isMember/isLeiter steuern nur,
    // ob Dashboard/Chat und die Leiter-Werkzeuge freigeschaltet sind.
    if (currentUser.role === 'admin') {
      myAreas = allAreas.map(function (a) { return Object.assign({}, a, { isLeiter: true, isMember: true }); });
    } else {
      var memberships = currentUser.areaMemberships || [];
      myAreas = allAreas.map(function (a) {
        var membership = memberships.find(function (m) { return m.areaId === a.id && m.status === 'active'; });
        return Object.assign({}, a, {
          isLeiter: Boolean(membership && membership.isLeiter),
          isMember: Boolean(membership)
        });
      });
    }

    if (!myAreas.length) {
      panel.classList.add('hidden');
      tocLink.classList.add('hidden');
      return;
    }

    panel.classList.remove('hidden');
    tocLink.classList.remove('hidden');

    var selected = areaSelect.value;
    areaSelect.innerHTML = '';
    myAreas.forEach(function (area) {
      var opt = document.createElement('option');
      opt.value = area.id;
      opt.textContent = area.name + (area.isLeiter ? ' (Leitung)' : area.isMember ? ' (Mitglied)' : '');
      areaSelect.appendChild(opt);
    });
    var toSelect = myAreas.some(function (a) { return a.id === selected; }) ? selected : myAreas[0].id;
    areaSelect.value = toSelect;
    switchArea(toSelect);
  } catch (e) {
    panel.classList.add('hidden');
    tocLink.classList.add('hidden');
  }
}
