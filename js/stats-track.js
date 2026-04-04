(function () {
  var endpoint = '/.netlify/functions/track';
  function visitorId() {
    var k = 'sfreibad_vid';
    try {
      var v = localStorage.getItem(k);
      if (v && v.length >= 16) {
        return v;
      }
      v =
        typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
          ? crypto.randomUUID()
          : 'v-' + String(Date.now()) + '-' + Math.random().toString(36).slice(2);
      localStorage.setItem(k, v);
      return v;
    } catch {
      return 'sess-' + String(Date.now());
    }
  }
  function send() {
    var path = window.location.pathname + window.location.search;
    fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        path: path,
        visitorId: visitorId()
      }),
      keepalive: true
    }).catch(function () {});
  }
  if (document.visibilityState === 'prerender') {
    return;
  }
  if (window.requestIdleCallback) {
    requestIdleCallback(send, { timeout: 4000 });
  } else {
    setTimeout(send, 1200);
  }
})();
