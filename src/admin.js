// Admin gate: enter the code to reset today's daily play so the puzzle
// can be played again. Free play is unaffected. Persistent stats
// (streak, best, puzzlesPlayed) are also untouched — only `todayResult`
// and `lastPlayedDate` are cleared so a fresh play counts cleanly.
//
// The code is shipped in plaintext — this is a soft gate, not security.

import { load, save } from './stats.js';

const ADMIN_CODE = 'ovaisinamullah';

export function wireAdminLink(onReset) {
  const link = document.getElementById('admin-link');
  if (!link) return;
  link.addEventListener('click', (e) => {
    e.preventDefault();
    showAdminModal(onReset);
  });
}

function showAdminModal(onReset) {
  const overlay = document.createElement('div');
  overlay.className = 'admin-modal';
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');
  overlay.setAttribute('aria-label', 'Admin code');
  overlay.innerHTML = `
    <div class="admin-card">
      <div class="admin-icon">🔐</div>
      <h2>Admin Code</h2>
      <p>Enter the code to reset today's daily game.</p>
      <input type="password" class="admin-input" id="admin-input"
             placeholder="Code" autocomplete="off" autocapitalize="off"
             autocorrect="off" spellcheck="false" />
      <div class="admin-error" id="admin-error" hidden>Incorrect code.</div>
      <div class="admin-actions">
        <button type="button" class="btn btn-secondary" id="admin-cancel">Cancel</button>
        <button type="button" class="btn btn-primary" id="admin-submit">Reset Daily</button>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);

  const input = overlay.querySelector('#admin-input');
  const err = overlay.querySelector('#admin-error');

  const close = () => {
    overlay.classList.add('fade-out');
    setTimeout(() => overlay.remove(), 220);
    document.removeEventListener('keydown', onEsc);
  };
  const onEsc = (e) => { if (e.key === 'Escape') close(); };
  document.addEventListener('keydown', onEsc);

  setTimeout(() => input.focus(), 0);

  const submit = () => {
    if (input.value === ADMIN_CODE) {
      const stats = load();
      stats.todayResult = null;
      stats.lastPlayedDate = null;
      save(stats);
      close();
      onReset();
    } else {
      err.hidden = false;
      input.classList.add('admin-input-error');
      input.focus();
      input.select();
    }
  };

  overlay.querySelector('#admin-cancel').addEventListener('click', close);
  overlay.querySelector('#admin-submit').addEventListener('click', submit);
  input.addEventListener('keydown', (e) => { if (e.key === 'Enter') submit(); });
  input.addEventListener('input', () => {
    err.hidden = true;
    input.classList.remove('admin-input-error');
  });
  // Click on backdrop closes; clicks inside card do not.
  overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });
}
