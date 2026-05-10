// Deterministic daily seed.
// Same date → same target color, anywhere in the world (using local date,
// which is intentional — every player crosses midnight in their own timezone
// and gets the next puzzle then. Wordle does the same thing.)

const EPOCH_UTC = Date.UTC(2026, 0, 1);

/** Local-date key like "2026-05-08". */
export function todayKey(now = new Date()) {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** Day number since epoch. Used as the puzzle index (Day 1, Day 2, ...). */
export function dayNumber(now = new Date()) {
  // Compare in UTC using only the local Y/M/D components — otherwise a DST
  // transition between EPOCH and `now` shortens the ms diff by an hour and
  // Math.floor rounds the day count down by one.
  const localUtc = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.floor((localUtc - EPOCH_UTC) / 86400000) + 1;
}

// Tiny xorshift PRNG. Deterministic, no deps.
function xorshift32(seed) {
  let s = seed | 0 || 1;
  return () => {
    s ^= s << 13;
    s ^= s >>> 17;
    s ^= s << 5;
    return ((s >>> 0) / 0xffffffff);
  };
}

// Hash a string into a 32-bit int (FNV-1a).
function hash32(str) {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/**
 * Today's target color. Punchy, saturated colors — not muddy mids —
 * by biasing each channel away from the [80, 175] range.
 */
export function targetForDate(now = new Date()) {
  const rng = xorshift32(hash32('hue:' + todayKey(now)));
  const channel = () => {
    const r = rng();
    // 50% chance of low (0–80), 50% chance of high (175–255).
    return r < 0.5 ? Math.floor(r * 2 * 80) : 175 + Math.floor((r - 0.5) * 2 * 80);
  };
  return [channel(), channel(), channel()];
}

/**
 * Stable "global average" accuracy for today, since we have no backend.
 * Range ~62–82%. Same value for everyone on the same date.
 */
export function fakeGlobalAverage(now = new Date()) {
  const rng = xorshift32(hash32('hue-avg:' + todayKey(now)));
  return Math.round((62 + rng() * 20) * 10) / 10;
}

/**
 * Non-deterministic target for free play — different every round, same
 * "punchy color" distribution as the daily target.
 */
export function randomTarget() {
  const channel = () => {
    const r = Math.random();
    return r < 0.5 ? Math.floor(r * 2 * 80) : 175 + Math.floor((r - 0.5) * 2 * 80);
  };
  return [channel(), channel(), channel()];
}
