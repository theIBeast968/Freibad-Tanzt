import { mediaUrl } from './media.js';

var TYPE_LABELS = {
  announcement: 'Ankündigung',
  poll: 'Umfrage',
  task: 'Aufgabe',
  checklist: 'Checkliste'
};

export function renderPostCard(post, currentUserEmail, handlers) {
  var li = document.createElement('li');
  li.style.display = 'block';

  var header = document.createElement('div');
  header.innerHTML =
    '<strong>' + post.title + '</strong> ' +
    '<span class="badge">' + (TYPE_LABELS[post.type] || post.type) + '</span>';
  li.appendChild(header);

  var meta = document.createElement('div');
  meta.className = 'sub';
  meta.style.margin = '0.3rem 0';
  meta.textContent = 'von ' + (post.authorName || post.authorEmail) + ' · ' + new Date(post.createdAt).toLocaleString('de-DE');
  li.appendChild(meta);

  if (post.body) {
    var bodyP = document.createElement('p');
    bodyP.style.margin = '0 0 0.5rem';
    bodyP.textContent = post.body;
    li.appendChild(bodyP);
  }

  if (post.media && post.media.length) {
    var mediaWrap = document.createElement('div');
    mediaWrap.style.display = 'flex';
    mediaWrap.style.flexWrap = 'wrap';
    mediaWrap.style.gap = '0.5rem';
    mediaWrap.style.margin = '0 0 0.5rem';
    post.media.forEach(function (item) {
      var src = mediaUrl(item);
      var el;
      if (item.contentType && item.contentType.indexOf('video/') === 0) {
        el = document.createElement('video');
        el.src = src;
        el.controls = true;
      } else {
        el = document.createElement('img');
        el.src = src;
        el.alt = item.filename || '';
        el.style.objectFit = 'cover';
        el.style.cursor = 'pointer';
        el.addEventListener('click', function () { window.open(src, '_blank'); });
      }
      el.style.maxWidth = '160px';
      el.style.maxHeight = '160px';
      el.style.borderRadius = '0.6rem';
      el.style.border = '1px solid rgba(255,255,255,0.12)';
      mediaWrap.appendChild(el);
    });
    li.appendChild(mediaWrap);
  }

  if (post.type === 'poll') {
    var pollWrap = document.createElement('div');
    (post.pollOptions || []).forEach(function (option, index) {
      var voted = currentUserEmail && (option.votes || []).indexOf(currentUserEmail) !== -1;
      var row = document.createElement('div');
      row.className = 'actions';
      row.style.marginTop = '0.35rem';
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = voted ? 'button-primary mini-btn' : 'button-secondary mini-btn';
      btn.textContent = option.text + ' (' + (option.votes ? option.votes.length : 0) + ')';
      btn.addEventListener('click', function () { handlers.onVote(post.id, index); });
      row.appendChild(btn);
      pollWrap.appendChild(row);
    });
    li.appendChild(pollWrap);
  }

  if (post.type === 'task') {
    var taskRow = document.createElement('div');
    taskRow.className = 'sub';
    taskRow.style.margin = '0.3rem 0';
    taskRow.textContent =
      'Zugewiesen: ' + (post.assigneeName || post.assigneeEmail) +
      (post.dueDate ? (' · Fällig: ' + post.dueDate) : '') +
      ' · ' + (post.status === 'done' ? 'Erledigt' : 'Offen');
    li.appendChild(taskRow);
    if (post.status === 'open' && handlers.onTaskToggle && (currentUserEmail === post.assigneeEmail || handlers.isLeiter)) {
      var doneBtn = document.createElement('button');
      doneBtn.type = 'button';
      doneBtn.className = 'button-secondary mini-btn';
      doneBtn.textContent = 'Erledigt';
      doneBtn.addEventListener('click', function () { handlers.onTaskToggle(post.id, 'done'); });
      li.appendChild(doneBtn);
    }
  }

  if (post.type === 'checklist') {
    var list = document.createElement('ul');
    list.style.margin = '0.4rem 0';
    (post.items || []).forEach(function (item) {
      var itemLi = document.createElement('li');
      var label = document.createElement('label');
      label.style.display = 'flex';
      label.style.alignItems = 'center';
      label.style.gap = '0.4rem';
      label.style.fontWeight = '400';
      var cb = document.createElement('input');
      cb.type = 'checkbox';
      cb.checked = Boolean(item.done);
      cb.addEventListener('change', function () { handlers.onChecklistToggle(post.id, item.id); });
      label.appendChild(cb);
      var span = document.createElement('span');
      span.textContent = item.text;
      if (item.done) span.style.textDecoration = 'line-through';
      label.appendChild(span);
      itemLi.appendChild(label);
      list.appendChild(itemLi);
    });
    li.appendChild(list);
  }

  if ((post.comments || []).length) {
    var commentsWrap = document.createElement('div');
    commentsWrap.style.marginTop = '0.5rem';
    commentsWrap.style.paddingTop = '0.5rem';
    commentsWrap.style.borderTop = '1px solid rgba(255,255,255,0.08)';
    post.comments.forEach(function (comment) {
      var c = document.createElement('p');
      c.style.margin = '0.25rem 0';
      c.style.fontSize = '0.85rem';
      c.innerHTML = '<strong>' + (comment.authorName || comment.authorEmail) + ':</strong> ' + comment.body;
      commentsWrap.appendChild(c);
    });
    li.appendChild(commentsWrap);
  }

  if (handlers.onComment) {
    var form = document.createElement('form');
    form.className = 'actions';
    form.style.marginTop = '0.5rem';
    var input = document.createElement('input');
    input.type = 'text';
    input.placeholder = 'Kommentieren …';
    input.style.flex = '1';
    input.maxLength = 1000;
    form.appendChild(input);
    var submitBtn = document.createElement('button');
    submitBtn.type = 'submit';
    submitBtn.className = 'button-secondary mini-btn';
    submitBtn.textContent = 'Senden';
    form.appendChild(submitBtn);
    form.addEventListener('submit', function (event) {
      event.preventDefault();
      if (!input.value.trim()) return;
      handlers.onComment(post.id, input.value.trim());
      input.value = '';
    });
    li.appendChild(form);
  }

  return li;
}
