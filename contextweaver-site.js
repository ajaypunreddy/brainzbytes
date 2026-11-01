(function () {
  'use strict';

  var header = document.querySelector('.cw-header');
  var menu = document.querySelector('.cw-menu');
  if (header && menu) {
    menu.addEventListener('click', function () {
      var open = header.classList.toggle('open');
      menu.setAttribute('aria-expanded', String(open));
    });
  }

  var progress = document.querySelector('.cw-progress');
  function updateProgress() {
    if (!progress) return;
    var max = document.documentElement.scrollHeight - window.innerHeight;
    progress.style.width = (max > 0 ? Math.min(100, (window.scrollY / max) * 100) : 0) + '%';
  }
  updateProgress();
  window.addEventListener('scroll', updateProgress, { passive: true });
  window.addEventListener('resize', updateProgress);

  var search = document.querySelector('[data-doc-search]');
  if (search) {
    search.addEventListener('input', function () {
      var term = search.value.trim().toLowerCase();
      document.querySelectorAll('[data-doc-card]').forEach(function (card) {
        var haystack = (card.getAttribute('data-search') || '') + ' ' + card.textContent;
        card.classList.toggle('hidden', term && haystack.toLowerCase().indexOf(term) === -1);
      });
    });
  }
}());
