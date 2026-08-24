import { authHeaders, token } from './api.js';

export function mediaUrl(item) {
  return '/.netlify/functions/staff-media?id=' + encodeURIComponent(item.id) + '&token=' + encodeURIComponent(token() || '');
}

export async function uploadFiles(files, areaId) {
  var uploaded = [];
  for (var i = 0; i < files.length; i++) {
    var file = files[i];
    var query = 'filename=' + encodeURIComponent(file.name) + (areaId ? '&areaId=' + encodeURIComponent(areaId) : '');
    var res = await fetch('/.netlify/functions/staff-media-upload?' + query, {
      method: 'POST',
      headers: authHeaders({ 'Content-Type': file.type || 'application/octet-stream' }),
      body: file
    });
    var data = {};
    try { data = await res.json(); } catch (e) {}
    if (!res.ok) {
      throw new Error((data && data.error) || ('Upload fehlgeschlagen: ' + file.name));
    }
    uploaded.push({ id: data.id, contentType: data.contentType, filename: data.filename });
  }
  return uploaded;
}
