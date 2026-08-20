export const TOKEN_KEY = 'sfreibad_staff_jwt';

export function token() {
  try { return sessionStorage.getItem(TOKEN_KEY); } catch (e) { return null; }
}

export function setToken(value) {
  try { sessionStorage.setItem(TOKEN_KEY, value); } catch (e) {}
}

export function clearToken() {
  try { sessionStorage.removeItem(TOKEN_KEY); } catch (e) {}
}

export function authHeaders(extra) {
  return Object.assign({ Authorization: 'Bearer ' + token() }, extra || {});
}

export async function api(path, options) {
  var res = await fetch('/.netlify/functions/' + path, options);
  var data = {};
  try { data = await res.json(); } catch (e) {}
  if (!res.ok) {
    var err = new Error((data && data.error) || 'Request failed');
    err.status = res.status;
    throw err;
  }
  return data;
}
