const countdown = document.querySelector('.countdown');
const units = [...countdown.querySelectorAll('[data-unit]')];
const ceremonyStarts = new Date(countdown.dataset.start).getTime();
const receptionStarts = new Date(document.querySelector('.venue-reception time').dateTime).getTime();
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
document.addEventListener('visibilitychange', () => {
  if (document.hidden) return;
  clearTimeout(countdownTimeout);
  updateCountdown();
});

const motion = matchMedia('(prefers-reduced-motion: reduce)');
if ('IntersectionObserver' in window && !motion.matches) {
  const revealObserver = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      entry.target.classList.remove('reveal-pending');
      revealObserver.unobserve(entry.target);
    }
  }, { threshold: 0.12 });

  for (const element of document.querySelectorAll('.reveal')) {
    element.classList.add('reveal-pending');
    revealObserver.observe(element);
  }
}

const photo = document.querySelector('.photo-frame');
if (matchMedia('(hover: hover) and (pointer: fine)').matches) {
  photo.addEventListener('pointermove', (event) => {
    if (motion.matches || event.pointerType !== 'mouse') return;
    const rect = photo.getBoundingClientRect();
    const x = (event.clientX - rect.left) / rect.width - 0.5;
    const y = (event.clientY - rect.top) / rect.height - 0.5;
    photo.style.setProperty('--photo-x', x * 14 + 'px');
    photo.style.setProperty('--photo-y', y * 14 + 'px');
  });
  photo.addEventListener('pointerleave', () => {
    photo.style.removeProperty('--photo-x');
    photo.style.removeProperty('--photo-y');
  });
}

const progress = document.querySelector('.reading-line');
const arrival = document.querySelector('.arrival');
const arrivalTrack = arrival.querySelector('.arrival-track');
const arrivalStage = arrival.querySelector('.arrival-stage');
const walker = arrival.querySelector('.arrival-walker');
let progressFrame;

function updateArrival() {
  if (motion.matches) return;

  const track = arrivalTrack.getBoundingClientRect();
  const stage = arrivalStage.getBoundingClientRect();
  const travel = track.height - stage.height;
  if (travel <= 0) return;

  const progress = Math.max(0, Math.min(1, (stage.top - track.top) / travel));
  const stride = progress * Math.PI * 14;
  const sway = Math.sin(stride) * (1 - progress);
  const opacity = 1 - Math.max(0, (progress - 0.82) / 0.18);
  walker.style.setProperty('--bride-y', 95 - 39 * progress + '%');
  walker.style.setProperty('--bride-scale', 1 - 0.62 * progress);
  walker.style.setProperty('--bride-opacity', opacity);
  walker.style.setProperty('--bride-sway', sway * 3 + '%');
  walker.style.setProperty('--bride-step', -Math.abs(Math.sin(stride)) * (1 - progress) * 1.4 + '%');
  walker.style.setProperty('--bride-lean', sway * 3 + 'deg');
}

function requestProgressUpdate() {
  if (progressFrame) return;
  progressFrame = requestAnimationFrame(() => {
    const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
    const fraction = maxScroll > 0 ? Math.max(0, Math.min(1, window.scrollY / maxScroll)) : 0;
    progress.style.setProperty('--progress', fraction);
    updateArrival();
    progressFrame = null;
  });
}

window.addEventListener('scroll', requestProgressUpdate, { passive: true });
window.addEventListener('resize', requestProgressUpdate);
window.addEventListener('load', requestProgressUpdate);
motion.addEventListener('change', requestProgressUpdate);
arrival.classList.add('arrival-animated');
requestProgressUpdate();

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
