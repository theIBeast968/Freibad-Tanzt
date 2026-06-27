(function () {
  var modal = document.getElementById('flyerModal');
  var title = document.getElementById('flyerModalTitle');
  var image = document.getElementById('flyerModalImage');
  var lastTrigger = null;

  if (!modal || !title || !image) {
    return;
  }

  function closeModal() {
    modal.hidden = true;
    image.removeAttribute('src');
    document.body.classList.remove('flyer-modal-open');
    if (lastTrigger) {
      lastTrigger.focus();
    }
  }

  function openModal(src, label, trigger) {
    if (!src) {
      return;
    }

    lastTrigger = trigger;
    title.textContent = label || 'Flyer';
    image.src = src;
    image.alt = label ? label + ' Flyer' : 'Flyer';
    modal.hidden = false;
    document.body.classList.add('flyer-modal-open');
    modal.querySelector('.flyer-modal-close').focus();
  }

  document.querySelectorAll('[data-flyer-src]').forEach(function (trigger) {
    trigger.addEventListener('click', function () {
      openModal(
        trigger.getAttribute('data-flyer-src'),
        trigger.getAttribute('data-flyer-title') || '',
        trigger
      );
    });
  });

  modal.querySelectorAll('[data-flyer-close]').forEach(function (button) {
    button.addEventListener('click', closeModal);
  });

  document.addEventListener('keydown', function (event) {
    if (event.key === 'Escape' && !modal.hidden) {
      closeModal();
    }
  });
}());
