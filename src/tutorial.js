// First-launch tutorial overlay. Shows once, persists to stats.tutorialSeen.
import { load, save } from './stats.js';

export function maybeShowTutorial() {
  const stats = load();
  if (stats.tutorialSeen) return;

  const overlay = document.createElement('div');
  overlay.className = 'tutorial';
  overlay.innerHTML = `
    <div class="tutorial-card">
      <div class="tutorial-icon">🎨</div>
      <h2>Welcome to Hue</h2>
      <p>Match the target color using the R, G, B sliders.</p>
      <p>You have <b>30 seconds</b>. One new color every day.</p>
      <button class="btn" type="button">Got it</button>
    </div>
  `;
  document.body.appendChild(overlay);

  const dismiss = () => {
    overlay.classList.add('fade-out');
    setTimeout(() => overlay.remove(), 250);
    stats.tutorialSeen = true;
    save(stats);
  };

  overlay.addEventListener('click', dismiss, { once: true });
  // Prevent button from double-firing its parent listener.
  overlay.querySelector('button').addEventListener('click', (e) => e.stopPropagation());
  overlay.querySelector('button').addEventListener('click', dismiss, { once: true });
}
