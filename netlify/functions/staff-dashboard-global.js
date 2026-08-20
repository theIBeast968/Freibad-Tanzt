import { json, requireStaffUser } from './lib/staff-auth.js';
import { addComment, newPost, readPosts, toggleVote, writePosts } from './lib/dashboard.js';
import { notifyChannel } from './lib/push-send.js';

const KEY = 'dashboard-global';
const CAP = 200;

export default async (request) => {
  if (request.method === 'GET') {
    const auth = await requireStaffUser(request);
    if (auth.error) {
      return auth.error;
    }
    const posts = await readPosts(KEY);
    return json({ posts: posts.slice().reverse() });
  }

  if (request.method !== 'POST') {
    return json({ error: 'Method not allowed' }, 405);
  }

  const auth = await requireStaffUser(request);
  if (auth.error) {
    return auth.error;
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: 'Invalid body' }, 400);
  }

  const action =
    body && body.action === 'create' ? 'create' : body && body.action === 'vote' ? 'vote' : 'comment';

  const posts = await readPosts(KEY);

  if (action === 'create') {
    if (!(auth.user.role === 'admin' || auth.user.canPostGlobal)) {
      return json({ error: 'Nur für Admin oder Presseverantwortliche.' }, 403);
    }
    const type = body.type === 'poll' ? 'poll' : 'announcement';
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
    const post = newPost({
      type,
      authorEmail: auth.user.email,
      authorName: auth.user.name || auth.user.email,
      title,
      body: text,
      pollOptions,
      media: body.media,
    });
    posts.push(post);
    await writePosts(KEY, posts, CAP);
    await notifyChannel(
      'global',
      { title: 'Neue Ankündigung', body: post.title, url: '/mitarbeiter.html#dashboard-global' },
      auth.user.email
    );
    return json({ ok: true, posts: posts.slice().reverse() });
  }

  const postId = typeof body.postId === 'string' ? body.postId : '';
  const idx = posts.findIndex((post) => post.id === postId);
  if (idx < 0) {
    return json({ error: 'Beitrag nicht gefunden.' }, 404);
  }

  if (action === 'vote') {
    const optionIndex = Number.isInteger(body.optionIndex) ? body.optionIndex : -1;
    if (!toggleVote(posts[idx], optionIndex, auth.user.email)) {
      return json({ error: 'Ungültige Option.' }, 400);
    }
  } else {
    const text = typeof body.body === 'string' ? body.body.trim().slice(0, 1000) : '';
    if (!text) {
      return json({ error: 'Kommentar darf nicht leer sein.' }, 400);
    }
    addComment(posts[idx], auth.user.email, auth.user.name || auth.user.email, text);
  }

  await writePosts(KEY, posts, CAP);
  return json({ ok: true, post: posts[idx], posts: posts.slice().reverse() });
};
