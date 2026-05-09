// Wordle-style share text. Maps accuracy → 5 emoji squares (red→green ramp).

const RAMP = ['🟥', '🟧', '🟨', '🟩', '🟦'];

/** Build the 5-square emoji bar based on accuracy bands. */
function bar(accuracy) {
  // Accuracy in 0–100. Each square fills if accuracy crosses its threshold.
  const thresholds = [40, 55, 70, 85, 95];
  return thresholds.map((t, i) => (accuracy >= t ? RAMP[i] : '⬛')).join('');
}

export function shareText({ day, accuracy, streak }) {
  const acc = Math.round(accuracy);
  const lines = [
    `Hue 🎨 Day ${day}`,
    `Accuracy: ${acc}%`,
    bar(acc),
    `Streak: ${streak} 🔥`,
    location.host || 'hue.app',
  ];
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
