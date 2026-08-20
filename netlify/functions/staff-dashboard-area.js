import {
  activeMembership,
  getUser,
  json,
  normalizeEmail,
  requireAreaLeiter,
  requireAreaMember,
} from './lib/staff-auth.js';
import { addComment, newPost, readPosts, toggleVote, writePosts } from './lib/dashboard.js';

const CAP = 200;

function keyFor(areaId) {
  return `dashboard-area-${areaId}`;
}

export default async (request) => {
  const url = new URL(request.url);

  if (request.method === 'GET') {
    const areaId = url.searchParams.get('areaId') || '';
    const auth = await requireAreaMember(request, areaId);
    if (auth.error) {
      return auth.error;
    }
    const posts = await readPosts(keyFor(areaId));
    return json({ posts: posts.slice().reverse() });
  }

  if (request.method !== 'POST') {
    return json({ error: 'Method not allowed' }, 405);
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: 'Invalid body' }, 400);
  }

  const areaId = typeof body.areaId === 'string' ? body.areaId : '';
  if (!areaId) {
    return json({ error: 'Bereich fehlt.' }, 400);
  }

  const action =
    body.action === 'create'
      ? 'create'
      : body.action === 'vote'
        ? 'vote'
        : body.action === 'task-status'
          ? 'task-status'
          : body.action === 'checklist-toggle'
            ? 'checklist-toggle'
            : 'comment';

  if (action === 'create') {
    const auth = await requireAreaLeiter(request, areaId);
    if (auth.error) {
      return auth.error;
    }

    const type = ['announcement', 'poll', 'task', 'checklist'].includes(body.type)
      ? body.type
      : 'announcement';
    const title = typeof body.title === 'string' ? body.title.trim() : '';
    const text = typeof body.body === 'string' ? body.body.trim().slice(0, 4000) : '';
    if (title.length < 3 || title.length > 160) {
      return json({ error: 'Titel muss 3-160 Zeichen haben.' }, 400);
    }

    let pollOptions = [];
    if (type === 'poll') {
      pollOptions = (Array.isArray(body.pollOptions) ? body.pollOptions : [])
        .map((option) => String(option).trim())
        .filter(Boolean)
        .slice(0, 8);
      if (pollOptions.length < 2) {
        return json({ error: 'Umfrage braucht mindestens 2 Optionen.' }, 400);
      }
    }

    let assigneeEmail = '';
    let assigneeName = '';
    if (type === 'task') {
      assigneeEmail = normalizeEmail(body.assigneeEmail);
      const assignee = await getUser(assigneeEmail);
      if (!assignee || !activeMembership(assignee, areaId)) {
        return json({ error: 'Bitte einen Helfer aus diesem Bereich wählen.' }, 400);
      }
      assigneeName = assignee.name || assignee.email;
    }

    let items = [];
    if (type === 'checklist') {
      items = Array.isArray(body.items)
        ? body.items.map((item) => String(item).trim()).filter(Boolean).slice(0, 30)
        : [];
      if (!items.length) {
        return json({ error: 'Checkliste braucht mindestens einen Punkt.' }, 400);
      }
    }

    const post = newPost({
      type,
      authorEmail: auth.user.email,
      authorName: auth.user.name || auth.user.email,
      title,
      body: text,
      pollOptions,
      assigneeEmail,
      assigneeName,
      dueDate: body.dueDate,
      items,
    });
    const posts = await readPosts(keyFor(areaId));
    posts.push(post);
    await writePosts(keyFor(areaId), posts, CAP);
    return json({ ok: true, posts: posts.slice().reverse() });
  }

  const auth = await requireAreaMember(request, areaId);
  if (auth.error) {
    return auth.error;
  }

  const posts = await readPosts(keyFor(areaId));
  const postId = typeof body.postId === 'string' ? body.postId : '';
  const idx = posts.findIndex((post) => post.id === postId);
  if (idx < 0) {
    return json({ error: 'Beitrag nicht gefunden.' }, 404);
  }
  const post = posts[idx];

  if (action === 'vote') {
    const optionIndex = Number.isInteger(body.optionIndex) ? body.optionIndex : -1;
    if (!toggleVote(post, optionIndex, auth.user.email)) {
      return json({ error: 'Ungültige Option.' }, 400);
    }
  } else if (action === 'task-status') {
    if (post.type !== 'task') {
      return json({ error: 'Kein Aufgaben-Beitrag.' }, 400);
    }
    const isAssignee = normalizeEmail(post.assigneeEmail) === normalizeEmail(auth.user.email);
    const membership = activeMembership(auth.user, areaId);
    const isLeiter = auth.user.role === 'admin' || Boolean(membership && membership.isLeiter);
    if (!isAssignee && !isLeiter) {
      return json({ error: 'Nur zugewiesene Person oder Bereichsleitung.' }, 403);
    }
    post.status = body.status === 'done' ? 'done' : 'open';
    post.updatedAt = new Date().toISOString();
  } else if (action === 'checklist-toggle') {
    if (post.type !== 'checklist') {
      return json({ error: 'Keine Checkliste.' }, 400);
    }
    const itemId = typeof body.itemId === 'string' ? body.itemId : '';
    const item = (post.items || []).find((entry) => entry.id === itemId);
    if (!item) {
      return json({ error: 'Punkt nicht gefunden.' }, 404);
    }
    item.done = !item.done;
    post.updatedAt = new Date().toISOString();
  } else {
    const text = typeof body.body === 'string' ? body.body.trim().slice(0, 1000) : '';
    if (!text) {
      return json({ error: 'Kommentar darf nicht leer sein.' }, 400);
    }
    addComment(post, auth.user.email, auth.user.name || auth.user.email, text);
  }

  posts[idx] = post;
  await writePosts(keyFor(areaId), posts, CAP);
  return json({ ok: true, post, posts: posts.slice().reverse() });
};
