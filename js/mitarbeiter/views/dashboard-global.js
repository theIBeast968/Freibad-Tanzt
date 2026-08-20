import { api, authHeaders } from '../api.js';
import { showErr } from '../dom.js';
import { getCurrentUser } from '../state.js';
import { renderPostCard } from '../dashboard-ui.js';
import { uploadFiles } from '../media.js';

var form = document.getElementById('globalDashboardForm');
var formWrap = document.getElementById('globalPostForm');
var typeSelect = document.getElementById('globalPostType');
var pollWrap = document.getElementById('globalPollOptionsWrap');

typeSelect.addEventListener('change', function () {
  pollWrap.classList.toggle('hidden', typeSelect.value !== 'poll');
});

async function handleVote(postId, optionIndex) {
  try {
    await api('staff-dashboard-global', {
      method: 'POST',
      headers: authHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ action: 'vote', postId: postId, optionIndex: optionIndex })
    });
    await loadGlobalDashboard();
  } catch (e) {}
}

async function handleComment(postId, text) {
  try {
    await api('staff-dashboard-global', {
      method: 'POST',
      headers: authHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ action: 'comment', postId: postId, body: text })
    });
    await loadGlobalDashboard();
  } catch (e) {}
}

function renderPosts(posts) {
  var list = document.getElementById('globalPostList');
  var currentUser = getCurrentUser();
  list.innerHTML = '';
  if (!posts || !posts.length) {
    var empty = document.createElement('p');
    empty.className = 'sub';
    empty.textContent = 'Noch keine Ankündigungen.';
    list.appendChild(empty);
    return;
  }
  var ul = document.createElement('ul');
  ul.className = 'shift-list';
  posts.forEach(function (post) {
    ul.appendChild(renderPostCard(post, currentUser && currentUser.email, {
      onVote: handleVote,
      onComment: handleComment
    }));
  });
  list.appendChild(ul);
}

export async function loadGlobalDashboard() {
  var currentUser = getCurrentUser();
  formWrap.classList.toggle('hidden', !(currentUser && (currentUser.role === 'admin' || currentUser.canPostGlobal)));
  try {
    var data = await api('staff-dashboard-global', { headers: authHeaders() });
    renderPosts(data.posts || []);
  } catch (e) {
    renderPosts([]);
  }
}

form.addEventListener('submit', async function (event) {
  event.preventDefault();
  var err = document.getElementById('globalPostErr');
  var ok = document.getElementById('globalPostOk');
  showErr(err, '');
  showErr(ok, '');
  var type = typeSelect.value;
  var payload = {
    action: 'create',
    type: type,
    title: document.getElementById('globalPostTitle').value,
    body: document.getElementById('globalPostBody').value
  };
  if (type === 'poll') {
    payload.pollOptions = document.getElementById('globalPollOptions').value
      .split(',')
      .map(function (s) { return s.trim(); })
      .filter(Boolean);
  }
  try {
    var files = document.getElementById('globalPostMedia').files;
    if (files && files.length) {
      payload.media = await uploadFiles(files, null);
    }
    await api('staff-dashboard-global', {
      method: 'POST',
      headers: authHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify(payload)
    });
    ok.textContent = 'Veröffentlicht.';
    ok.classList.remove('hidden');
    form.reset();
    pollWrap.classList.add('hidden');
    await loadGlobalDashboard();
  } catch (e) {
    showErr(err, e.message || 'Konnte nicht veröffentlicht werden.');
  }
});
