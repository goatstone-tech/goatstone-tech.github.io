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

// Goatstone 2026-10-26: contact form is a plain mailto form. No backend,
// no service, no storage limit. On submit, the visitor's email app opens
// with the pickup request ready to send to goatstone-tech@outlook.com.
// No-ops on pages without the form.
(function () {
  var form = document.getElementById('contact-form');
  if (!form) {
    return;
  }
  form.addEventListener('submit', function (e) {
    e.preventDefault();
    if (window.goatstoneCheckEmail && !window.goatstoneCheckEmail()) {
      return;
    }
    var name = form.querySelector('input[name="name"]');
    var email = form.querySelector('input[name="email"]');
    var items = form.querySelector('textarea[name="items"]');
    var body = 'Name: ' + (name ? name.value.trim() : '') + '\n'
      + 'Email: ' + (email ? email.value.trim() : '') + '\n\n'
      + 'What I have, and where:\n' + (items ? items.value.trim() : '');
    var subject = 'New pickup request from the Goatstone Tech website';
    window.location.href = 'mailto:goatstone-tech@outlook.com'
      + '?subject=' + encodeURIComponent(subject)
      + '&body=' + encodeURIComponent(body);
  });
})();

// Goatstone 2026-10-26: contact form email check. The Email field only
// accepts a valid email address. Any domain is allowed, including custom
// company domains, so there is no provider whitelist. A domain that looks
// like a typo of a common provider (gmial.com for gmail.com) is flagged
// with a one-click fix, and the sender can still use it as entered.
(function () {
  var form = document.getElementById('contact-form');
  if (!form) {
    return;
  }
  var input = form.querySelector('input[name="email"]');
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
