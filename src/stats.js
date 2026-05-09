// Tiny localStorage wrapper. All stats stay on-device.

const KEY = 'hue.stats.v1';

const defaults = {
  currentStreak: 0,
  longestStreak: 0,
  bestAccuracy: 0,
  puzzlesPlayed: 0,
  lastPlayedDate: null,
  muted: false,
  tutorialSeen: false,
  todayResult: null, // { dateKey, guess: [r,g,b], target: [r,g,b], accuracy, journey: [[r,g,b],...] }
};

export function load() {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? { ...defaults, ...JSON.parse(raw) } : { ...defaults };
  } catch {
    return { ...defaults };
  }
}

export function save(stats) {
  try {
    localStorage.setItem(KEY, JSON.stringify(stats));
  } catch {
    // Storage unavailable (private mode, full quota) — fail silently.
  }
}

/** Day-difference between two YYYY-MM-DD keys. */
export function daysBetween(aKey, bKey) {
  if (!aKey || !bKey) return Infinity;
  const a = new Date(aKey + 'T00:00:00');
  const b = new Date(bKey + 'T00:00:00');
  return Math.round((b - a) / (1000 * 60 * 60 * 24));
}

/** Update streak based on consecutive-day play. */
export function recordPlay(stats, todayDateKey, accuracy, target, guess, journey) {
  const gap = daysBetween(stats.lastPlayedDate, todayDateKey);
  if (gap === 1) stats.currentStreak += 1;
  else if (gap === 0) {/* same day, no change */}
  else stats.currentStreak = 1;

  stats.longestStreak = Math.max(stats.longestStreak, stats.currentStreak);
  stats.bestAccuracy = Math.max(stats.bestAccuracy, accuracy);
  if (gap !== 0) stats.puzzlesPlayed += 1;
  stats.lastPlayedDate = todayDateKey;
  stats.todayResult = { dateKey: todayDateKey, guess, target, accuracy, journey };
  save(stats);
  return stats;
}
