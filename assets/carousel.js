// Goatstone home card carousels. One timer per card, 6 seconds per slide.
// Adapted from the slidein/slideout idea Daniel supplied: the supplied SCSS
// was a single left-menu scene with radio buttons and no auto advance, so it
// could not be dropped in as four card carousels. This keeps the slide
// animation and adds the 6 second auto advance. With one image per card
// for now, a card shows its single slide until more images are added.
(function () {
  var carousels = document.querySelectorAll('.carousel');
  carousels.forEach(function (carousel) {
    var slides = carousel.querySelectorAll('.slide');
    if (slides.length < 2) {
      return;
    }
    var current = 0;
    setInterval(function () {
      slides[current].classList.remove('active');
      current = (current + 1) % slides.length;
      slides[current].classList.add('active');
    }, 6000);
  });
})();

// Card image carousels (S.D.R and Data Destruction). Track slider adapted
// from the Stylus slider Daniel supplied: a track of slides translated by
// -100% per step, with prev/next arrows and dot indicators. The supplied
// Stylus is a manual radio-button scene with no auto advance, so this keeps
// the site's 6 second auto advance and drives the track with JavaScript
// instead. One timer per card, each card advances on its own.
(function () {
  var carousels = document.querySelectorAll('.photo-carousel');
  carousels.forEach(function (carousel) {
    var track = carousel.querySelector('.carousel__track');
    var slides = carousel.querySelectorAll('.carousel__slide');
    var indicators = carousel.querySelectorAll('.carousel__indicator');
    var prev = carousel.querySelector('.carousel__control--backward');
    var next = carousel.querySelector('.carousel__control--forward');
    if (slides.length < 2) {
      return;
    }
    var current = 0;
    function goTo(index) {
      current = (index + slides.length) % slides.length;
      track.style.transform = 'translateX(-' + (current * 100) + '%)';
      indicators.forEach(function (dot, i) {
        dot.classList.toggle('active', i === current);
      });
    }
    prev.addEventListener('click', function () { goTo(current - 1); });
    next.addEventListener('click', function () { goTo(current + 1); });
    indicators.forEach(function (dot, i) {
      dot.addEventListener('click', function () { goTo(i); });
    });
    setInterval(function () { goTo(current + 1); }, 6000);
    goTo(0);
  });
})();
