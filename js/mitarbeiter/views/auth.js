import { api, setToken, clearToken } from '../api.js';
import { showErr } from '../dom.js';
import { showApp, showAuth } from '../app.js';

var loginForm = document.getElementById('loginForm');
var registerForm = document.getElementById('registerForm');
var loginErr = document.getElementById('loginErr');
var registerErr = document.getElementById('registerErr');
var tabLogin = document.getElementById('tabLogin');
var tabRegister = document.getElementById('tabRegister');

function setTab(which) {
  var isLogin = which === 'login';
  tabLogin.classList.toggle('active', isLogin);
  tabRegister.classList.toggle('active', !isLogin);
  loginForm.classList.toggle('hidden', !isLogin);
  registerForm.classList.toggle('hidden', isLogin);
  showErr(loginErr, '');
  showErr(registerErr, '');
}

tabLogin.addEventListener('click', function () { setTab('login'); });
tabRegister.addEventListener('click', function () { setTab('register'); });

loginForm.addEventListener('submit', async function (event) {
  event.preventDefault();
  showErr(loginErr, '');
  try {
    var data = await api('staff-login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: document.getElementById('loginEmail').value,
        password: document.getElementById('loginPassword').value
      })
    });
    setToken(data.token);
    showApp(data.user);
  } catch (e) {
    showErr(loginErr, e.message || 'Login fehlgeschlagen.');
  }
});

registerForm.addEventListener('submit', async function (event) {
  event.preventDefault();
  showErr(registerErr, '');
  try {
    var data = await api('staff-register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        firstName: document.getElementById('regFirstName').value,
        lastName: document.getElementById('regLastName').value,
        phone: document.getElementById('regPhone').value,
        email: document.getElementById('regEmail').value,
        password: document.getElementById('regPassword').value,
        inviteCode: document.getElementById('regInvite').value
      })
    });
    setToken(data.token);
    showApp(data.user);
  } catch (e) {
    showErr(registerErr, e.message || 'Registrierung fehlgeschlagen.');
  }
});

document.getElementById('logoutBtn').addEventListener('click', function () {
  clearToken();
  showAuth();
  setTab('login');
});
