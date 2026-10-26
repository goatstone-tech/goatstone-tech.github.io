// Goatstone fix 17 2026-10-24: scrollbar fade. The thumb stays faded when idle and goes solid while scrolling, then fades again 1.5 seconds after scrolling stops.
(function () {
  var timer = null;
  function onScroll() {
    document.documentElement.classList.add('is-scrolling');
    if (timer) clearTimeout(timer);
    timer = setTimeout(function () {
      document.documentElement.classList.remove('is-scrolling');
    }, 1500);
  }
  window.addEventListener('scroll', onScroll, { passive: true });
})();

// Goatstone fix 48 2026-10-25: contact form photo drop zone. Clicking the
// zone or dropping files onto it fills the hidden file input, and the
// chosen file names are listed. No-ops on pages without the zone.
(function () {
  var zone = document.getElementById('photo-drop');
  if (!zone) {
    return;
  }
  var input = document.getElementById('photos');
  var list = document.getElementById('photo-list');
  function showFiles(files) {
    list.innerHTML = '';
    Array.prototype.forEach.call(files, function (file) {
      var li = document.createElement('li');
      li.textContent = file.name + ' (' + Math.round(file.size / 1024) + ' KB)';
      list.appendChild(li);
    });
  }
  zone.addEventListener('click', function (e) {
    if (e.target.closest('label')) {
      return;
    }
    input.click();
  });
  zone.addEventListener('keydown', function (e) {
    if (e.target.closest('label')) {
      return;
    }
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      input.click();
    }
  });
  input.addEventListener('change', function () {
    showFiles(input.files);
  });
  ['dragenter', 'dragover'].forEach(function (evt) {
    zone.addEventListener(evt, function (e) {
      e.preventDefault();
      zone.classList.add('dragging');
    });
  });
  ['dragleave', 'drop'].forEach(function (evt) {
    zone.addEventListener(evt, function (e) {
      e.preventDefault();
      zone.classList.remove('dragging');
    });
  });
  zone.addEventListener('drop', function (e) {
    input.files = e.dataTransfer.files;
    showFiles(input.files);
  });
})();
