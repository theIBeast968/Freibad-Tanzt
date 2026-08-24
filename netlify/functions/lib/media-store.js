import { getStore } from '@netlify/blobs';

export function mediaStore() {
  return getStore('sfreibad-media');
}

export function mediaKey(id) {
  return `media-${id}`;
}
