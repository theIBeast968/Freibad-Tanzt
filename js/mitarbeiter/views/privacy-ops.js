import { api, authHeaders } from '../api.js';
import { showErr } from '../dom.js';

export async function loadOriginReport() {
  var body = document.getElementById('originReportBody');
  try {
    var data = await api('staff-admin-origin-report', { headers: authHeaders() });
    body.innerHTML = '';
    if (!data.report || !data.report.length) {
      body.innerHTML = '<tr><td colspan="2">Noch keine Anmeldungen.</td></tr>';
      return;
    }
    data.report.forEach(function (row) {
      var tr = document.createElement('tr');
      tr.innerHTML = '<td>' + row.origin + '</td><td>' + row.count + '</td>';
      body.appendChild(tr);
    });
  } catch (e) {
    body.innerHTML = '<tr><td colspan="2">Konnte nicht geladen werden.</td></tr>';
  }
}

document.getElementById('seasonResetForm').addEventListener('submit', async function (event) {
  event.preventDefault();
  var err = document.getElementById('seasonResetErr');
  var ok = document.getElementById('seasonResetOk');
  showErr(err, '');
  showErr(ok, '');

  var confirmText = document.getElementById('seasonResetConfirm').value.trim();
  if (confirmText !== 'SAISON ZURUECKSETZEN') {
    showErr(err, 'Bitte den Text exakt eingeben.');
    return;
  }
  if (!window.confirm('Wirklich alle Nutzerdaten archivieren und Bereichs-Inhalte loeschen? Das laesst sich nicht rueckgaengig machen.')) {
    return;
  }

  try {
    var data = await api('staff-admin-season-reset', {
      method: 'POST',
      headers: authHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ confirm: confirmText })
    });
    ok.textContent = data.archivedUsers + ' Nutzer archiviert, ' + data.resetAreas + ' Bereiche zurückgesetzt.';
    ok.classList.remove('hidden');
    document.getElementById('seasonResetForm').reset();
  } catch (e) {
    showErr(err, e.message || 'Saison-Reset fehlgeschlagen.');
  }
});
