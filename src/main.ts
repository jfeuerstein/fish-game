import './style.css';
import { Game } from './game/main';
import { drawLogo } from './ui/logo';
import { liveTitle } from './ui/titleArt';

/**
 * Launched from the Home Screen, iOS can lay the page out shorter than the screen it shows.
 * Measure that and size #app to the whole screen, saying how much taller it is.
 */
function fillScreen(): void {
  const standalone = (navigator as { standalone?: boolean }).standalone === true || window.matchMedia('(display-mode: standalone)').matches;
  const upright = window.innerHeight >= window.innerWidth;
  const full = upright ? Math.max(screen.width, screen.height) : Math.min(screen.width, screen.height);
  const root = document.documentElement;
  const page = Math.min(root.clientHeight || window.innerHeight, window.innerHeight);
  if (standalone && page < full - 1) {
    root.style.setProperty('--app-height', `${full}px`);
    root.style.setProperty('--app-extra', `${full - page}px`);
  } else {
    root.style.removeProperty('--app-height');
    root.style.removeProperty('--app-extra');
  }
}
fillScreen();
for (const ev of ['resize', 'orientationchange', 'pageshow']) window.addEventListener(ev, fillScreen);
for (const d of [300, 1500, 4000]) setTimeout(fillScreen, d);

if ('serviceWorker' in navigator && location.protocol === 'https:') {
  navigator.serviceWorker.register('sw.js').then((reg) => {
    // Once the game is running, keep a copy of all of it for playing with no signal.
    setTimeout(() => (reg.active ?? navigator.serviceWorker.controller)?.postMessage('keep-all'), 20000);
  });
}

// The title picture moves from the moment it is up: the water laps, gulls drift, the bobber dips.
const art = document.querySelector<HTMLElement>('#title .title-art');
if (art && !/[?&]title=0/.test(location.search)) {
  const stop = liveTitle(art, `${import.meta.env.BASE_URL}art/title.webp`);
  // It stops when the title is taken away.
  new MutationObserver((_, watch) => {
    if (document.getElementById('title')) return;
    stop();
    watch.disconnect();
  }).observe(document.getElementById('app')!, { childList: true });
}

const name = document.querySelector<HTMLElement>('#title .title-name h1');
if (name) void drawLogo(name);

new Game().boot().catch((e) => {
  console.error(e);
  (window as unknown as { __cove: { error: string } }).__cove = { error: String(e?.stack ?? e) } as never;
  const start = document.getElementById('start') as HTMLButtonElement;
  start.textContent = 'Something went wrong. Tap to try again.';
  start.disabled = false;
  start.onclick = () => location.reload();
});
