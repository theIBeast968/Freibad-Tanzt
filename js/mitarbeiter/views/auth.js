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

(async function loadRegisterOptions() {
  try {
    var res = await fetch('/.netlify/functions/staff-public-options');
    var data = await res.json();
    var originSelect = document.getElementById('regOrigin');

    (data.origins || []).forEach(function (origin) {
      var opt = document.createElement('option');
      opt.value = origin;
      opt.textContent = origin;
      originSelect.appendChild(opt);
    });
  } catch (e) {}
})();

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
  var registerOk = document.getElementById('registerOk');
  showErr(registerErr, '');
  showErr(registerOk, '');
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
        origin: document.getElementById('regOrigin').value,
        consentAccepted: document.getElementById('regConsent').checked,
        inviteCode: document.getElementById('regInvite').value
      })
    });
    if (data.pending) {
      registerForm.reset();
      registerOk.textContent = 'Registrierung eingegangen. Ein Admin muss dein Konto noch freischalten, danach kannst du dich einloggen.';
      registerOk.classList.remove('hidden');
    } else {
      setTab('login');
      registerOk.textContent = 'Konto angelegt. Du kannst dich jetzt einloggen.';
      registerOk.classList.remove('hidden');
    }
  } catch (e) {
    showErr(registerErr, e.message || 'Registrierung fehlgeschlagen.');
  }
});

document.getElementById('logoutBtn').addEventListener('click', function () {
  clearToken();
  showAuth();
  setTab('login');
});
