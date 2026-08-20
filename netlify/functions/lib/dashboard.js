import { randomBytes } from 'node:crypto';
import { staffStore } from './staff-auth.js';

export function newPost({
  type,
  authorEmail,
  authorName,
  title,
  body,
  pollOptions,
  assigneeEmail,
  assigneeName,
  dueDate,
  items,
}) {
  const now = new Date().toISOString();
  const post = {
    id: `${Date.now()}-${randomBytes(3).toString('hex')}`,
    type,
    authorEmail,
    authorName,
    title,
    body,
    comments: [],
    createdAt: now,
    updatedAt: now,
  };
  if (type === 'poll') {
    post.pollOptions = (pollOptions || []).map((text) => ({ text, votes: [] }));
  }
  if (type === 'task') {
    post.assigneeEmail = assigneeEmail;
    post.assigneeName = assigneeName;
    post.status = 'open';
    post.dueDate = dueDate || '';
  }
  if (type === 'checklist') {
    post.items = (items || []).map((text) => ({
      id: `${Date.now()}-${randomBytes(2).toString('hex')}`,
      text,
      done: false,
    }));
  }
  return post;
}

export async function readPosts(key) {
  return (await staffStore().get(key, { type: 'json' })) || [];
}

export async function writePosts(key, posts, cap) {
  await staffStore().setJSON(key, posts.slice(-cap));
}

export function addComment(post, authorEmail, authorName, body) {
  post.comments = [
    ...(post.comments || []),
    {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      authorEmail,
      authorName,
      body,
      createdAt: new Date().toISOString(),
    },
  ];
  post.updatedAt = new Date().toISOString();
}

export function toggleVote(post, optionIndex, email) {
  if (!post.pollOptions || !post.pollOptions[optionIndex]) {
    return false;
  }
  post.pollOptions.forEach((option) => {
    option.votes = (option.votes || []).filter((voter) => voter !== email);
  });
  post.pollOptions[optionIndex].votes.push(email);
  post.updatedAt = new Date().toISOString();
  return true;
}
