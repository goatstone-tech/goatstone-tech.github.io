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

// Goatstone fix 48 2026-10-25, updated 2026-10-26: contact form photo drop
// zone. Clicking the zone or dropping files onto it adds to the hidden
// file input, and the chosen file names are listed. Files accumulate
// across picks and drops, up to 10 MB total. No-ops on pages without
// the zone.
(function () {
  var zone = document.getElementById('photo-drop');
  if (!zone) {
    return;
  }
  var input = document.getElementById('photos');
  var list = document.getElementById('photo-list');
  var note = zone.querySelector('.drop-note');
  var MAX_BYTES = 10 * 1024 * 1024;
  var MAX_FILES = 10;
  var store = (typeof DataTransfer !== 'undefined') ? new DataTransfer() : null;
  function totalBytes() {
    var total = 0;
    Array.prototype.forEach.call(store.files, function (file) {
      total += file.size;
    });
    return total;
  }
  function showFiles() {
    list.innerHTML = '';
    Array.prototype.forEach.call(store.files, function (file) {
      var li = document.createElement('li');
      li.textContent = file.name + ' (' + Math.round(file.size / 1024) + ' KB)';
      list.appendChild(li);
    });
    if (note) {
      if (store.files.length) {
        note.textContent = store.files.length + (store.files.length === 1 ? ' photo, ' : ' photos, ') + (totalBytes() / 1048576).toFixed(1) + ' MB total. Up to 10 photos and 10 MB total per message.';
      } else {
        note.textContent = 'Photos help us plan the pickup. Up to 10 photos and 10 MB total per message.';
      }
    }
  }
  function addFiles(files) {
    if (!store) {
      input.files = files;
      showFilesFallback(files);
      return;
    }
    var skipped = 0;
    var skippedCount = 0;
    Array.prototype.forEach.call(files, function (file) {
      var duplicate = false;
      Array.prototype.forEach.call(store.files, function (existing) {
        if (existing.name === file.name && existing.size === file.size && existing.lastModified === file.lastModified) {
          duplicate = true;
        }
      });
      if (duplicate) {
        return;
      }
      if (store.files.length >= MAX_FILES) {
        skippedCount += 1;
        return;
      }
      if (totalBytes() + file.size > MAX_BYTES) {
        skipped += 1;
        return;
      }
      store.items.add(file);
    });
    input.files = store.files;
    showFiles();
    if (skippedCount && note) {
      note.textContent += ' Max 10 photos per message.';
    }
    if (skipped && note) {
      note.textContent += ' Some photos were left out: the 10 MB total was reached.';
    }
  }
  function showFilesFallback(files) {
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
    addFiles(input.files);
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
    addFiles(e.dataTransfer.files);
  });
})();
