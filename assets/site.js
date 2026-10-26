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
// across picks and drops, up to 10 MB total. Photos over 1 MB are
// compressed in the browser before sending (longest side 1600px, JPEG
// quality 0.85, stepping down if still over 1 MB), so the 100 MB
// Forminit storage lasts. Small photos are sent as is, PNGs keep their
// format, and any photo that cannot be compressed is sent as is. No-ops
// on pages without the zone.
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
  var COMPRESS_MAX_BYTES = 1024 * 1024;
  var COMPRESS_STEPS = [
    { maxSide: 1600, quality: 0.85 },
    { maxSide: 1200, quality: 0.8 },
    { maxSide: 800, quality: 0.75 }
  ];
  var store = (typeof DataTransfer !== 'undefined') ? new DataTransfer() : null;
  var seenSignatures = [];
  var pendingCompressions = [];
  var skippedCount = 0;
  var skippedBytes = 0;
  window.goatstonePhotosPending = function () {
    return Promise.all(pendingCompressions.slice());
  };
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
        note.textContent = 'Photos help us plan the pickup. Up to 10 photos and 10 MB total per message. Large photos are compressed before sending.';
      }
    }
  }
  function signature(file) {
    return file.name + '|' + file.size + '|' + file.lastModified;
  }
  function addOne(file) {
    if (store.files.length >= MAX_FILES) {
      skippedCount += 1;
      return;
    }
    if (totalBytes() + file.size > MAX_BYTES) {
      skippedBytes += 1;
      return;
    }
    store.items.add(file);
  }
  function finish() {
    input.files = store.files;
    showFiles();
    if (skippedCount && note) {
      note.textContent += ' Max 10 photos per message.';
    }
    if (skippedBytes && note) {
      note.textContent += ' Some photos were left out: the 10 MB total was reached.';
    }
  }
  function compressImage(file) {
    if (file.size <= COMPRESS_MAX_BYTES) {
      return Promise.resolve(file);
    }
    if (!file.type || file.type.indexOf('image/') !== 0) {
      return Promise.resolve(file);
    }
    if (typeof Blob !== 'undefined' && !(file instanceof Blob)) {
      return Promise.resolve(file);
    }
    if (typeof createImageBitmap === 'undefined' || typeof document === 'undefined' || !document.createElement) {
      return Promise.resolve(file);
    }
    return createImageBitmap(file).then(function (bitmap) {
      var width = bitmap.width;
      var height = bitmap.height;
      var isPng = file.type === 'image/png';
      var stepIndex = 0;
      function attempt() {
        var step = COMPRESS_STEPS[stepIndex];
        var scale = Math.min(1, step.maxSide / Math.max(width, height));
        var w = Math.max(1, Math.round(width * scale));
        var h = Math.max(1, Math.round(height * scale));
        var canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        var ctx = canvas.getContext('2d');
        if (!ctx) {
          return Promise.resolve(file);
        }
        ctx.drawImage(bitmap, 0, 0, w, h);
        return new Promise(function (resolve) {
          canvas.toBlob(function (blob) {
            if (!blob) {
              resolve(file);
              return;
            }
            if (blob.size <= COMPRESS_MAX_BYTES || stepIndex === COMPRESS_STEPS.length - 1) {
              var outType = isPng ? 'image/png' : 'image/jpeg';
              var outName = file.name;
              if (!isPng && !/\.jpe?g$/i.test(outName)) {
                outName = outName.replace(/\.[^.]*$/, '') + '.jpg';
              }
              resolve(new File([blob], outName, { type: outType, lastModified: file.lastModified }));
            } else {
              stepIndex += 1;
              resolve(attempt());
            }
          }, isPng ? 'image/png' : 'image/jpeg', isPng ? undefined : step.quality);
        });
      }
      return attempt().then(function (result) {
        if (bitmap.close) {
          bitmap.close();
        }
        return result;
      });
    }).catch(function () {
      return file;
    });
  }
  function addFiles(files) {
    if (!store) {
      input.files = files;
      showFilesFallback(files);
      return Promise.resolve();
    }
    skippedCount = 0;
    skippedBytes = 0;
    var jobs = [];
    Array.prototype.forEach.call(files, function (file) {
      var sig = signature(file);
      if (seenSignatures.indexOf(sig) !== -1) {
        return;
      }
      seenSignatures.push(sig);
      if (store.files.length >= MAX_FILES) {
        skippedCount += 1;
        return;
      }
      var needsCompression = file.size > COMPRESS_MAX_BYTES && file.type && file.type.indexOf('image/') === 0 && (typeof Blob === 'undefined' || file instanceof Blob) && typeof createImageBitmap !== 'undefined';
      if (!needsCompression) {
        addOne(file);
        return;
      }
      var job = compressImage(file).then(function (compressed) {
        addOne(compressed);
        finish();
      });
      jobs.push(job);
      pendingCompressions.push(job);
      job.then(function () {
        var idx = pendingCompressions.indexOf(job);
        if (idx !== -1) {
          pendingCompressions.splice(idx, 1);
        }
      });
    });
    finish();
    return Promise.all(jobs);
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

// Goatstone 2026-10-26: contact form submit via Forminit (Form ID
// w0zlgpwpqxp, public). AJAX submit, so the page never leaves and the
// visitor gets the thank-you page only on success. On submit, the Send
// button changes to "Sending! Please wait!", grays out, and cannot be
// clicked again, so the form cannot be sent twice. No-ops on pages
// without the form.
(function () {
  var FORM_ID = 'w0zlgpwpqxp';
  var form = document.querySelector('form[action*="forminit.com"]');
  if (!form) {
    return;
  }
  var button = form.querySelector('input[type="submit"]');
  var statusEl = document.getElementById('form-status');
  if (!button) {
    return;
  }
  var originalText = button.value;
  var sending = false;
  function showStatus(text) {
    if (!statusEl) {
      return;
    }
    statusEl.textContent = text;
    statusEl.hidden = false;
  }
  function clearStatus() {
    if (!statusEl) {
      return;
    }
    statusEl.textContent = '';
    statusEl.hidden = true;
  }
  form.addEventListener('submit', function (e) {
    e.preventDefault();
    if (sending) {
      return;
    }
    if (window.goatstoneCheckEmail && !window.goatstoneCheckEmail()) {
      return;
    }
    sending = true;
    button.disabled = true;
    button.value = 'Sending! Please wait!';
    clearStatus();
    function proceed() {
      if (typeof Forminit === 'undefined' || !Forminit.submit) {
        showStatus('The form service did not load. Please email goatstone-tech@outlook.com instead.');
        sending = false;
        button.disabled = false;
        button.value = originalText;
        return;
      }
      var fd = new FormData(form);
      var nameValue = fd.get('fi-sender-fullName');
      if (typeof nameValue === 'string') {
        fd.set('fi-sender-fullName', nameValue.replace(/[\u2018\u2019]/g, "'"));
      }
      var totalBytes = 0;
      var files = form.querySelectorAll('input[type="file"]');
      for (var i = 0; i < files.length; i++) {
        for (var j = 0; j < files[i].files.length; j++) {
          totalBytes += files[i].files[j].size;
        }
      }
      if (totalBytes > 24 * 1024 * 1024) {
        showStatus('Those photos are over the 24 MB limit. Please send fewer photos.');
        sending = false;
        button.disabled = false;
        button.value = originalText;
        return;
      }
      Forminit.submit(FORM_ID, fd).then(function (result) {
        var data = result && result.data;
        var error = result && result.error;
        if (!error && data && typeof data.hashId === 'string') {
          window.location.href = 'thank-you.html';
          return;
        }
        var message = 'Something went wrong. Please try again, or email goatstone-tech@outlook.com instead.';
        if (error && error.code === 'TOO_MANY_REQUESTS') {
          message = 'Please wait a few seconds and try again.';
        }
        if (typeof console !== 'undefined' && console.error) {
          console.error(error);
        }
        showStatus(message);
      }).catch(function (err) {
        if (typeof console !== 'undefined' && console.error) {
          console.error(err);
        }
        showStatus('Something went wrong. Please try again, or email goatstone-tech@outlook.com instead.');
      }).then(function () {
        sending = false;
        button.disabled = false;
        button.value = originalText;
      });
    }
    var pending = (typeof window.goatstonePhotosPending === 'function') ? window.goatstonePhotosPending() : null;
    if (pending && typeof pending.then === 'function') {
      var proceeded = false;
      var timer = setTimeout(function () {
        if (!proceeded) {
          proceeded = true;
          proceed();
        }
      }, 5000);
      pending.then(function () {
        if (!proceeded) {
          proceeded = true;
          clearTimeout(timer);
          proceed();
        }
      });
    } else {
      proceed();
    }
  });
  window.addEventListener('pageshow', function () {
    sending = false;
    button.disabled = false;
    button.value = originalText;
  });
})();

// Goatstone 2026-10-26: contact form email check. The Email field only
// accepts a valid email address. Any domain is allowed, including custom
// company domains, so there is no provider whitelist. A domain that looks
// like a typo of a common provider (gmial.com for gmail.com) is flagged
// with a one-click fix, and the sender can still use it as entered.
(function () {
  var form = document.querySelector('form[action*="forminit.com"]');
  if (!form) {
    return;
  }
  var input = form.querySelector('input[name="fi-sender-email"]');
  var errorEl = document.getElementById('contact-error');
  if (!input || !errorEl) {
    return;
  }
  var COMMON_DOMAINS = ['gmail.com', 'googlemail.com', 'outlook.com', 'hotmail.com', 'live.com', 'msn.com', 'yahoo.com', 'ymail.com', 'icloud.com', 'me.com', 'mac.com', 'proton.me', 'protonmail.com', 'aol.com', 'zoho.com', 'gmx.com', 'mail.com'];
  var allowTypo = false;
  function levenshtein(a, b) {
    var m = a.length, n = b.length, i, j;
    if (!m) return n;
    if (!n) return m;
    var row = [];
    for (j = 0; j <= n; j++) row[j] = j;
    for (i = 1; i <= m; i++) {
      var prev = row[0];
      row[0] = i;
      for (j = 1; j <= n; j++) {
        var temp = row[j];
        row[j] = Math.min(row[j] + 1, row[j - 1] + 1, prev + (a[i - 1] === b[j - 1] ? 0 : 1));
        prev = temp;
      }
    }
    return row[n];
  }
  function isValidFormat(email) {
    return /^[^\s@]+@[^\s@]+\.[a-zA-Z]{2,}$/.test(email) && email.indexOf('..') === -1;
  }
  function suggestDomain(domain) {
    var best = null, bestDist = 99;
    COMMON_DOMAINS.forEach(function (common) {
      var dist = levenshtein(domain, common);
      if (dist < bestDist) {
        bestDist = dist;
        best = common;
      }
    });
    return bestDist >= 1 && bestDist <= 2 ? best : null;
  }
  function clearError() {
    errorEl.textContent = '';
    errorEl.hidden = true;
    input.classList.remove('invalid');
  }
  function showError(text) {
    errorEl.textContent = text;
    errorEl.hidden = false;
    input.classList.add('invalid');
  }
  function checkEmail() {
    var email = input.value.trim();
    if (!isValidFormat(email)) {
      showError('Enter a valid email, like name@company.com.');
      return false;
    }
    if (!allowTypo) {
      var domain = email.split('@')[1].toLowerCase();
      var suggestion = suggestDomain(domain);
      if (suggestion && suggestion !== domain) {
        var local = email.split('@')[0];
        var fixed = local + '@' + suggestion;
        errorEl.textContent = '';
        errorEl.appendChild(document.createTextNode('Did you mean ' + fixed + '? '));
        var fixBtn = document.createElement('button');
        fixBtn.type = 'button';
        fixBtn.textContent = 'Use ' + suggestion;
        fixBtn.addEventListener('click', function () {
          input.value = fixed;
          clearError();
          if (form.requestSubmit) {
            form.requestSubmit();
          } else {
            form.submit();
          }
        });
        errorEl.appendChild(fixBtn);
        var keepBtn = document.createElement('button');
        keepBtn.type = 'button';
        keepBtn.textContent = 'Use as entered';
        keepBtn.addEventListener('click', function () {
          allowTypo = true;
          clearError();
          if (form.requestSubmit) {
            form.requestSubmit();
          } else {
            form.submit();
          }
        });
        errorEl.appendChild(keepBtn);
        errorEl.hidden = false;
        input.classList.add('invalid');
        return false;
      }
    }
    clearError();
    return true;
  }
  window.goatstoneCheckEmail = checkEmail;
  input.addEventListener('input', function () {
    allowTypo = false;
    clearError();
  });
  input.addEventListener('blur', function () {
    if (input.value.trim()) {
      checkEmail();
    }
  });
  form.addEventListener('submit', function (e) {
    if (!checkEmail()) {
      e.preventDefault();
    }
  });
})();
