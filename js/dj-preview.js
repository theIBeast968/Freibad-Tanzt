(function () {
  var media = window.SFREIBAD_DJ_MEDIA || {};
  var modal = document.getElementById('djModal');
  var title = document.getElementById('djModalTitle');
  var slot = document.getElementById('djModalSlot');
  var mediaWrap = document.getElementById('djModalMedia');
  var fallback = document.getElementById('djModalFallback');
  var lastTrigger = null;

  if (!modal || !title || !slot || !mediaWrap || !fallback) {
    return;
  }

  function clearMedia() {
    mediaWrap.innerHTML = '';
  }

  function closeModal() {
    clearMedia();
    modal.hidden = true;
    document.body.classList.remove('dj-modal-open');
    if (lastTrigger) {
      lastTrigger.focus();
    }
  }

  function openModal(key, trigger) {
    var item = media[key];
    if (!item) {
      return;
    }

    lastTrigger = trigger;
    if (typeof window.SFREIBAD_PAUSE_MUSIC === 'function') {
      window.SFREIBAD_PAUSE_MUSIC();
    }

    title.textContent = item.name;
    slot.textContent = item.slot || '';
    fallback.hidden = Boolean(item.video || item.instagram);
    clearMedia();

    if (item.video) {
      var video = document.createElement('video');
      video.controls = true;
      video.playsInline = true;
      video.setAttribute('playsinline', '');
      video.setAttribute('webkit-playsinline', '');
      video.preload = 'auto';
      video.src = item.video;

      video.addEventListener('loadeddata', function () {
        video.play().catch(function () {});
      }, { once: true });

      mediaWrap.appendChild(video);
    } else if (item.instagram) {
      var link = document.createElement('a');
      link.className = 'dj-modal-instagram';
      link.href = item.instagram;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      link.textContent = 'Reel auf Instagram öffnen';
      mediaWrap.appendChild(link);
    }

    modal.hidden = false;
    document.body.classList.add('dj-modal-open');
  }

  document.querySelectorAll('[data-dj]').forEach(function (button) {
    button.addEventListener('click', function () {
      openModal(button.getAttribute('data-dj'), button);
    });
  });

  modal.querySelectorAll('[data-dj-close]').forEach(function (button) {
    button.addEventListener('click', closeModal);
  });

  document.addEventListener('keydown', function (event) {
    if (event.key === 'Escape' && !modal.hidden) {
      closeModal();
    }
  });
}());
