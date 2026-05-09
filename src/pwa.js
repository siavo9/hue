// Service worker registration. No-ops in dev (where /sw.js isn't served from public root).
export function registerSW() {
  if (!('serviceWorker' in navigator)) return;
  if (location.hostname === 'localhost' || location.hostname === '127.0.0.1') return;
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {/* offline by graceful degradation */});
  });
}
