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
