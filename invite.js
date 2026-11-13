const intro = document.querySelector('.site-intro');
const openingImage = document.querySelector('.opening-art img');
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
const opening = openingImage.closest('.image-section');

function finishIntroWhenReady() {
  const minimumDisplay = new Promise(resolve => window.setTimeout(resolve, 820));
  const imageReady = openingImage.decode().catch(() => {});
  Promise.all([minimumDisplay, imageReady]).then(() => intro.classList.add('is-ready'));
}

intro.addEventListener('animationend', event => {
  if (event.target !== intro) return;
  intro.hidden = true;
  opening.classList.add('scene-entered');
  observeScenes();
});

finishIntroWhenReady();
window.addEventListener('pageshow', event => {
  if (!event.persisted) return;
  intro.classList.remove('is-ready');
  intro.hidden = false;
  finishIntroWhenReady();
});

function observeScenes() {
  if (!('IntersectionObserver' in window)) return;

  // Play a scene once when it enters view. Scrolling stays in the browser's control.
  const scenes = new IntersectionObserver(entries => {
    for (const entry of entries) {
      const minimumVisible = entry.target.id === 'ceremony' ? .67 :
        entry.target.classList.contains('venue') ? .52 : .28;
      if (entry.intersectionRatio < minimumVisible) continue;
      entry.target.classList.add('scene-entered');
      scenes.unobserve(entry.target);
    }
  }, { threshold: [.28, .52, .67] });

  for (const section of document.querySelectorAll('.image-section:not(.opening, .scene-entered)')) {
    scenes.observe(section);
  }
}

if (reducedMotion.matches) observeScenes();

const countdown = document.querySelector('.countdown');
const units = [...countdown.querySelectorAll('[data-unit]')];
const ceremonyStarts = new Date(countdown.dataset.start).getTime();
const receptionStarts = new Date(document.querySelector('#reception-time').dateTime).getTime();
let countdownTimeout;

function updateCountdown() {
  const now = Date.now();
  const seconds = Math.max(0, Math.ceil((ceremonyStarts - now) / 1000));

  if (seconds === 0) {
    const message = document.createElement('p');
    message.className = 'countdown-finished';
    const weddingDayEnds = new Date('2026-12-11T00:00:00+05:30').getTime();
    message.textContent = now < weddingDayEnds
      ? (now < receptionStarts ? 'It’s wedding day!' : 'It’s time to celebrate!')
      : 'Thank you for celebrating with us.';
    countdown.removeAttribute('aria-label');
    countdown.removeAttribute('role');
    countdown.replaceChildren(message);
    if (now < weddingDayEnds) {
      const nextChange = now < receptionStarts ? receptionStarts : weddingDayEnds;
      countdownTimeout = window.setTimeout(updateCountdown, nextChange - now);
    }
    return;
  }

  const values = [
    Math.floor(seconds / 86400),
    Math.floor(seconds / 3600) % 24,
    Math.floor(seconds / 60) % 60,
    seconds % 60
  ];

  units.forEach((unit, index) => {
    const value = String(values[index]).padStart(2, '0');
    if (unit.textContent === value) return;
    unit.textContent = value;
  });

  countdownTimeout = window.setTimeout(updateCountdown, 1000 - now % 1000);
}

updateCountdown();
countdown.hidden = false;
document.addEventListener('visibilitychange', () => {
  if (document.hidden) return;
  clearTimeout(countdownTimeout);
  updateCountdown();
});

const dateTrigger = document.querySelector('.date-trigger');
const dateCard = document.querySelector('.date-card');
const confetti = document.querySelector('.date-confetti');

dateCard.hidden = true;
dateTrigger.hidden = false;
dateTrigger.addEventListener('click', () => {
  const animate = !reducedMotion.matches;
  if (animate) {
    dateTrigger.classList.add('is-opening');
    window.setTimeout(() => { dateTrigger.hidden = true; }, 560);
  } else {
    dateTrigger.hidden = true;
  }
  dateCard.hidden = false;
  dateCard.classList.add('just-revealed');
  dateCard.querySelector('time').focus({ preventScroll: true });

  if (!animate) return;

  const colors = ['#a14c35', '#d49358', '#788655', '#eab09e', '#cba45e'];
  const pieces = document.createDocumentFragment();
  for (let index = 0; index < 38; index += 1) {
    const angle = (index / 38) * 2 * Math.PI;
    const reach = 70 + (index % 7) * 20;
    const piece = document.createElement('span');
    piece.style.setProperty('--x', Math.cos(angle) * reach + 'px');
    piece.style.setProperty('--y', Math.sin(angle) * reach + 'px');
    piece.style.setProperty('--spin', 180 + index * 29 + 'deg');
    piece.style.setProperty('--color', colors[index % colors.length]);
    piece.style.setProperty('--delay', 470 + (index % 6) * 24 + 'ms');
    pieces.append(piece);
  }
  confetti.append(pieces);
  window.setTimeout(() => confetti.replaceChildren(), 1900);
}, { once: true });

const calendarDialog = document.querySelector('.calendar-dialog');
if (typeof calendarDialog.showModal === 'function') {
  for (const link of document.querySelectorAll('[data-calendar]')) {
    link.addEventListener('click', (event) => {
      if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
      event.preventDefault();
      calendarDialog.showModal();
    });
  }
}

const share = document.querySelector('[data-share]');
const shareDialog = document.querySelector('.share-dialog');
const shareUrl = document.querySelector('#share-url');
const copyStatus = document.querySelector('[data-copy-status]');

if (typeof shareDialog.showModal === 'function') {
  share.hidden = false;
  share.addEventListener('click', () => {
    copyStatus.textContent = '';
    shareDialog.showModal();
  });

  document.querySelector('[data-copy]').addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(shareUrl.value);
      copyStatus.textContent = 'Link copied.';
    } catch {
      shareUrl.focus();
      shareUrl.select();
      copyStatus.textContent = 'The invitation link is selected. Copy it to share.';
    }
  });
}

for (const dialog of [calendarDialog, shareDialog]) {
  dialog.addEventListener('click', (event) => {
    if (event.target !== dialog) return;
    const bounds = dialog.getBoundingClientRect();
    if (event.clientX < bounds.left || event.clientX > bounds.right ||
        event.clientY < bounds.top || event.clientY > bounds.bottom) {
      dialog.close();
    }
  });
}
