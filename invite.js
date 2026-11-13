const intro = document.querySelector('.site-intro');
const openingImage = document.querySelector('.opening-art img');

function finishIntroWhenReady() {
  const minimumDisplay = new Promise(resolve => window.setTimeout(resolve, 820));
  const imageReady = openingImage.decode().catch(() => {});
  Promise.all([minimumDisplay, imageReady]).then(() => intro.classList.add('is-ready'));
}

intro.addEventListener('animationend', event => {
  if (event.target === intro) intro.hidden = true;
});

finishIntroWhenReady();
window.addEventListener('pageshow', event => {
  if (!event.persisted) return;
  intro.classList.remove('is-ready');
  intro.hidden = false;
  finishIntroWhenReady();
});

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
    unit.classList.remove('tick');
    requestAnimationFrame(() => unit.classList.add('tick'));
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

const filmMotion = matchMedia('(prefers-reduced-motion: no-preference) and (min-height: 540px)');
const film = document.querySelector('.film');
const stage = film.querySelector('.film-stage');
const progressLine = document.querySelector('.reading-line');
const nextScene = film.querySelector('.film-next');
const scenes = [...film.querySelectorAll('[data-scene]')];

// Each cut starts before the preceding shot ends. Times are in viewport heights.
const cuts = [
  { start: 1.52, end: 2.10, glow: 0.36, origin: '50% 44%' },
  { start: 2.52, end: 3.06, glow: 0.48, origin: '57% 46%' },
  { start: 3.48, end: 4.03, glow: 0.31, origin: '48% 56%' },
  { start: 4.52, end: 5.08, glow: 0.42, origin: '42% 60%' },
  { start: 5.53, end: 6.18, glow: 0.22, origin: '55% 52%' }
];
const stops = [
  { id: 'invitation', time: 0.96 },
  { id: 'arrival', time: 2.22 },
  { id: 'details', time: 3.18 },
  { id: 'ceremony', time: 4.16 },
  { id: 'venues', time: 5.20 },
  { id: 'closing', time: 6.29 }
];
const filmDuration = 6.48;
let frame = 0;
let seekFrame = 0;
let previousActive = -1;
film.style.setProperty('--film-duration', filmDuration);

function easeBetween(value, start, end) {
  const t = Math.max(0, Math.min(1, (value - start) / (end - start)));
  return t * t * (3 - 2 * t);
}

function playAt(time) {
  const mixes = cuts.map(cut => easeBetween(time, cut.start, cut.end));
  const active = mixes.filter(mix => mix >= 0.5).length;

  scenes.forEach((scene, index) => {
    const incoming = mixes[index - 1] ?? 1;
    const outgoing = mixes[index] ?? 0;
    const start = cuts[index - 1]?.start ?? 0;
    const end = cuts[index]?.end ?? filmDuration;
    const camera = Math.max(0, Math.min(1, (time - start) / (end - start)));
    const caption = easeBetween(incoming, 0.42, 1) * (1 - easeBetween(outgoing, 0, 0.58));

    scene.style.setProperty('--mix', incoming);
    scene.style.setProperty('--shot-visibility', incoming > 0 && outgoing < 1 ? 'visible' : 'hidden');
    scene.style.setProperty('--scene-progress', camera);
    scene.style.setProperty('--caption', caption);
    scene.style.setProperty('--push', outgoing * (index === 0 ? 0.31 : 0.13));

    if (active !== previousActive) scene.inert = index !== active;
  });
  previousActive = active;

  const boardEnter = easeBetween(time, 0.29, 0.83);
  const boardExit = easeBetween(time, 1.17, 1.77);
  const titleOpacity = 1 - easeBetween(time, 0.22, 0.58);
  stage.style.setProperty('--title-opacity', titleOpacity);
  stage.style.setProperty('--board-enter', boardEnter);
  stage.style.setProperty('--board-exit', boardExit);
  stage.style.setProperty('--board-opacity', boardEnter * (1 - boardExit));

  const cutIndex = mixes.findIndex(mix => mix > 0 && mix < 1);
  if (cutIndex >= 0) {
    const { glow, origin } = cuts[cutIndex];
    stage.style.setProperty('--light', Math.sin(mixes[cutIndex] * Math.PI) * glow);
    stage.style.setProperty('--light-origin', origin);
  } else {
    stage.style.setProperty('--light', 0);
  }

  const upcoming = stops.find(stop => stop.time > time + 0.17);
  nextScene.hidden = !upcoming;
  if (upcoming && nextScene.dataset.stop !== upcoming.id) {
    nextScene.dataset.stop = upcoming.id;
    nextScene.setAttribute('aria-label', upcoming.id === 'invitation' ? 'Scroll to begin' : 'Next scene');
  }
}

function updateStory() {
  if (filmMotion.matches) playAt(-film.getBoundingClientRect().top / stage.clientHeight);
  const scrollLength = document.documentElement.scrollHeight - document.documentElement.clientHeight;
  progressLine.style.setProperty('--progress', scrollLength > 0 ? window.scrollY / scrollLength : 0);
  frame = 0;
}

function requestProgressUpdate() {
  if (!frame) frame = requestAnimationFrame(updateStory);
}

function seek(id, behavior) {
  const stop = stops.find(item => item.id === id);
  if (!stop || !filmMotion.matches) return false;
  cancelSeek();
  if (behavior !== 'instant') stage.focus({ preventScroll: true });
  const from = window.scrollY;
  const to = from + film.getBoundingClientRect().top + stop.time * stage.clientHeight;
  if (behavior === 'instant') {
    window.scrollTo({ top: to, behavior });
    return true;
  }

  const duration = Math.min(1350, 650 + Math.abs(to - from) * 0.32);
  const started = performance.now();
  function advance(now) {
    const elapsed = now - started;
    const progress = easeBetween(elapsed, 0, duration);
    window.scrollTo({ top: from + (to - from) * progress, behavior: 'instant' });
    seekFrame = elapsed < duration ? requestAnimationFrame(advance) : 0;
  }
  seekFrame = requestAnimationFrame(advance);
  return true;
}

function cancelSeek() {
  cancelAnimationFrame(seekFrame);
  seekFrame = 0;
}

function configureStory() {
  document.documentElement.classList.toggle('story-motion', filmMotion.matches);
  if (!filmMotion.matches) {
    cancelSeek();
    scenes.forEach(scene => { scene.inert = false; });
    nextScene.hidden = true;
    previousActive = -1;
  }
  requestProgressUpdate();
}

nextScene.addEventListener('click', () => seek(nextScene.dataset.stop, 'smooth'));
window.addEventListener('wheel', cancelSeek, { passive: true });
window.addEventListener('touchstart', cancelSeek, { passive: true });
window.addEventListener('keydown', event => {
  if (['ArrowUp', 'ArrowDown', 'PageUp', 'PageDown', 'Home', 'End', ' '].includes(event.key)) cancelSeek();
});
window.addEventListener('scroll', requestProgressUpdate, { passive: true });
window.addEventListener('resize', requestProgressUpdate);
window.addEventListener('hashchange', () => seek(location.hash.slice(1), 'instant'));
filmMotion.addEventListener('change', configureStory);
configureStory();
requestAnimationFrame(() => seek(location.hash.slice(1), 'instant'));

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
