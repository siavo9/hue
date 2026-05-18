// Wordle-style share text. Maps accuracy → 5 emoji squares (red→green ramp).

const RAMP = ['🟥', '🟧', '🟨', '🟩', '🟦'];

/** Build the 5-square emoji bar based on accuracy bands. */
function bar(accuracy) {
  // Accuracy in 0–100. Each square fills if accuracy crosses its threshold.
  const thresholds = [40, 55, 70, 85, 95];
  return thresholds.map((t, i) => (accuracy >= t ? RAMP[i] : '⬛')).join('');
}

/** Build a shareable URL — deep-links to a specific day's puzzle if seed given. */
function shareUrl(seed) {
  const host = location.host || 'hue.app';
  return seed ? `${host}/?seed=${seed}` : host;
}

export function shareText({ day, accuracy, streak, seed }) {
  const acc = Math.round(accuracy);
  const lines = [
    `Hue 🎨 Day ${day}`,
    `Accuracy: ${acc}%`,
    bar(acc),
    `Streak: ${streak} 🔥`,
    shareUrl(seed),
  ];
  return lines.join('\n');
}

/** Short streak-only summary for the "Copy my streak" share loop. */
export function streakText({ streak, longestStreak, seed }) {
  const flames = '🔥'.repeat(Math.min(Math.max(streak, 1), 5));
  const day = streak === 1 ? 'day' : 'days';
  const lines = [`Hue 🎨 — ${streak} ${day} streak ${flames}`];
  if (longestStreak > streak) lines.push(`Best: ${longestStreak}`);
  lines.push(shareUrl(seed));
  return lines.join('\n');
}

/** Copy text to clipboard. Returns true on success. */
export async function copyToClipboard(text) {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {/* fall through */}
  // Fallback for older Safari / non-secure contexts.
  try {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(ta);
    return ok;
  } catch {
    return false;
  }
}
