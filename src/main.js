// Hue — game entry point.
// Orchestrates the three phases: ready → playing → result.
// One puzzle per day, locked via stats.todayResult.dateKey === today.

import { todayKey, dayNumber, targetForDate, fakeGlobalAverage, randomTarget } from './seed.js';
import { load, save, recordPlay } from './stats.js';
import { shareText, copyToClipboard } from './share.js';
import { burstConfetti } from './confetti.js';
import { maybeShowTutorial } from './tutorial.js';
import { wireAdminLink } from './admin.js';
import { registerSW } from './pwa.js';

// --- constants ---
const DURATION_MS = 30_000;
const SAMPLE_INTERVAL_MS = 6_000; // 5 samples across 30s
const MAX_DIST = Math.sqrt(255 * 255 * 3); // diagonal of RGB cube

// --- helpers ---
const $ = (sel, root = document) => root.querySelector(sel);
const rgbStr = ([r, g, b]) => `rgb(${r}, ${g}, ${b})`;
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

function accuracyOf(target, guess) {
  const dr = target[0] - guess[0];
  const dg = target[1] - guess[1];
  const db = target[2] - guess[2];
  const dist = Math.sqrt(dr * dr + dg * dg + db * db);
  return clamp(100 * (1 - dist / MAX_DIST), 0, 100);
}

function vibrate(ms) {
  try { if (navigator.vibrate) navigator.vibrate(ms); } catch {}
}

// Lazy-built audio context for the submit chime.
let audioCtx = null;
function chime(type = 'submit') {
  const stats = load();
  if (stats.muted) return;
  try {
    audioCtx ||= new (window.AudioContext || window.webkitAudioContext)();
    const ctx = audioCtx;
    if (ctx.state === 'suspended') ctx.resume();
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.connect(g); g.connect(ctx.destination);
    o.type = 'sine';
    const now = ctx.currentTime;
    if (type === 'submit') {
      o.frequency.setValueAtTime(523.25, now); // C5
      o.frequency.exponentialRampToValueAtTime(783.99, now + 0.18); // G5
    } else { // streak
      o.frequency.setValueAtTime(659.25, now); // E5
      o.frequency.exponentialRampToValueAtTime(987.77, now + 0.22); // B5
    }
    g.gain.setValueAtTime(0.0001, now);
    g.gain.exponentialRampToValueAtTime(0.18, now + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, now + 0.4);
    o.start(now);
    o.stop(now + 0.45);
  } catch {/* audio unavailable, no-op */}
}

// --- state ---
const state = {
  mode: 'daily', // 'daily' | 'free' — free play doesn't touch persistent stats
  phase: 'ready',
  target: [128, 128, 128],
  guess: [128, 128, 128],
  journey: [],
  startedAt: 0,
  remaining: DURATION_MS,
  timerHandle: null,
  sampleHandle: null,
  hasInteracted: false,
  accuracy: 0,
};

// --- render ---
const root = $('#app');

function render() {
  const stats = load();
  // Already played today? Skip straight to the daily result with stored data.
  // Free play has its own ready/playing/result lifecycle and never restores.
  if (state.mode === 'daily' && state.phase === 'ready'
      && stats.todayResult && stats.todayResult.dateKey === todayKey()) {
    state.target = stats.todayResult.target;
    state.guess = stats.todayResult.guess;
    state.journey = stats.todayResult.journey || [];
    state.accuracy = stats.todayResult.accuracy;
    state.phase = 'result';
  }

  if (state.phase === 'ready' || state.phase === 'playing') renderGame(stats);
  else renderResult(stats);
}

function renderGame(stats) {
  const day = dayNumber();
  const muted = stats.muted;
  const pill = state.mode === 'free'
    ? `<div class="day-pill day-pill-free">Free Play</div>`
    : `<div class="day-pill">Day ${day}</div>`;
  root.innerHTML = `
    <header class="topbar">
      <div class="brand">Hue <span class="brand-emoji">🎨</span></div>
      <div class="topbar-right">
        ${pill}
        <button class="icon-btn" id="mute-btn" aria-label="${muted ? 'Unmute' : 'Mute'}">
          ${muted ? '🔇' : '🔊'}
        </button>
      </div>
    </header>

    <section class="swatches">
      <div class="swatch swatch-target" id="swatch-target" style="background:${rgbStr(state.target)}">
        <div class="swatch-label">Target</div>
      </div>
      <div class="swatch swatch-guess" id="swatch-guess" style="background:${rgbStr(state.guess)}">
        <div class="swatch-label">You</div>
      </div>
    </section>

    <section class="timer-row">
      <div class="timer" id="timer">${state.phase === 'ready' ? '0:30' : formatTime(state.remaining)}</div>
      <div class="timer-bar"><div class="timer-bar-fill" id="timer-fill" style="width:${(state.remaining / DURATION_MS) * 100}%"></div></div>
    </section>

    <section class="sliders">
      ${sliderHTML('R', 0, state.guess[0])}
      ${sliderHTML('G', 1, state.guess[1])}
      ${sliderHTML('B', 2, state.guess[2])}
    </section>

    <section class="actions">
      <button class="btn btn-primary" id="submit-btn">${state.phase === 'ready' ? 'Start' : 'Submit'}</button>
    </section>
  `;

  // Wire sliders
  for (let i = 0; i < 3; i++) {
    const input = $(`#slider-${i}`);
    input.addEventListener('input', (e) => onSliderInput(i, +e.target.value));
  }
  $('#submit-btn').addEventListener('click', onSubmitOrStart);
  $('#mute-btn').addEventListener('click', onToggleMute);
  paintSliderTracks();
}

function sliderHTML(label, idx, value) {
  return `
    <div class="slider-row" data-channel="${label}">
      <div class="slider-label">${label}</div>
      <input type="range" min="0" max="255" step="1" value="${value}" id="slider-${idx}" class="slider" aria-label="${label} channel" />
      <div class="slider-value" id="slider-val-${idx}">${value}</div>
    </div>
  `;
}

function paintSliderTracks() {
  // Each track shows what the color would be if you swept that channel.
  // Uses the guess's other two channels so the gradient feels "live".
  const [r, g, b] = state.guess;
  const tracks = [
    `linear-gradient(to right, rgb(0,${g},${b}), rgb(255,${g},${b}))`,
    `linear-gradient(to right, rgb(${r},0,${b}), rgb(${r},255,${b}))`,
    `linear-gradient(to right, rgb(${r},${g},0), rgb(${r},${g},255))`,
  ];
  for (let i = 0; i < 3; i++) {
    const s = document.getElementById(`slider-${i}`);
    if (s) s.style.setProperty('--track', tracks[i]);
  }
}

function formatTime(ms) {
  const s = Math.max(0, Math.ceil(ms / 1000));
  return `0:${String(s).padStart(2, '0')}`;
}

// --- gameplay ---
function startPlaying() {
  state.phase = 'playing';
  state.startedAt = performance.now();
  state.remaining = DURATION_MS;
  state.journey = [];
  state.hasInteracted = false;

  state.timerHandle = setInterval(tick, 100);
  state.sampleHandle = setInterval(sampleJourney, SAMPLE_INTERVAL_MS);

  // Re-render to update button label etc.
  render();
}

function tick() {
  state.remaining = DURATION_MS - (performance.now() - state.startedAt);
  if (state.remaining <= 0) {
    state.remaining = 0;
    onTimeUp();
    return;
  }
  // Surgical update — don't re-render the whole tree every 100ms.
  const t = $('#timer');
  if (t) t.textContent = formatTime(state.remaining);
  const f = $('#timer-fill');
  if (f) f.style.width = ((state.remaining / DURATION_MS) * 100) + '%';
  if (state.remaining < 5000) t?.classList.add('timer-urgent');
}

function sampleJourney() {
  state.journey.push([...state.guess]);
  if (state.journey.length >= 5) clearInterval(state.sampleHandle);
}

function onSliderInput(channel, value) {
  state.guess[channel] = value;
  // Start the timer on first interaction.
  if (state.phase === 'ready') startPlaying();
  state.hasInteracted = true;
  // Surgical updates only.
  const swatch = $('#swatch-guess');
  if (swatch) swatch.style.background = rgbStr(state.guess);
  const valEl = $(`#slider-val-${channel}`);
  if (valEl) valEl.textContent = value;
  paintSliderTracks();
  vibrate(5);
}

function onSubmitOrStart() {
  if (state.phase === 'ready') {
    startPlaying();
    return;
  }
  finalize();
}

function onTimeUp() {
  finalize();
}

function finalize() {
  if (state.phase === 'result') return;
  clearInterval(state.timerHandle);
  clearInterval(state.sampleHandle);

  // Pad journey to exactly 5 samples (use final guess for tail).
  while (state.journey.length < 5) state.journey.push([...state.guess]);
  state.journey = state.journey.slice(0, 5);

  state.accuracy = accuracyOf(state.target, state.guess);
  state.phase = 'result';

  // Persist result + streak — daily only. Free play never touches stats.
  if (state.mode === 'daily') {
    const stats = load();
    recordPlay(stats, todayKey(), state.accuracy, state.target, state.guess, state.journey);
  }

  vibrate([15, 40, 15]);
  chime('submit');
  if (state.accuracy >= 90) burstConfetti();

  render();
}

// --- result screen ---
function renderResult(stats) {
  const day = dayNumber();
  const acc = state.accuracy;
  const accDisplay = acc.toFixed(1);
  const isFree = state.mode === 'free';
  const globalAvg = fakeGlobalAverage();
  const ranks =
    acc >= globalAvg + 10 ? 'Way above average' :
    acc >= globalAvg ? 'Above average' :
    acc >= globalAvg - 10 ? 'Just below average' :
    'Below average';

  const pill = isFree
    ? `<div class="day-pill day-pill-free">Free Play</div>`
    : `<div class="day-pill">Day ${day}</div>`;

  // Daily result: Share + a free-play CTA. Free result: Back to daily + Play again.
  // Free play never affects streak/best/played, but the stats row still shows
  // those persistent values (they reflect the user's daily history).
  const actions = isFree
    ? `<section class="actions actions-double">
         <button class="btn btn-secondary" id="back-daily-btn">Back to Daily</button>
         <button class="btn btn-primary" id="play-again-btn">Play Again</button>
       </section>`
    : `<section class="actions">
         <button class="btn btn-primary" id="share-btn">Share</button>
       </section>
       <section class="actions actions-secondary">
         <button class="btn btn-secondary" id="free-play-btn">Try Free Play →</button>
       </section>`;

  const subline = isFree
    ? `<p class="come-back">Free play doesn't affect your streak or best.</p>`
    : `<p class="come-back">Come back tomorrow for a new color.</p>`;

  const subText = isFree
    ? `Free play round`
    : `${ranks} · global avg ${globalAvg}%`;

  root.innerHTML = `
    <header class="topbar">
      <div class="brand">Hue <span class="brand-emoji">🎨</span></div>
      <div class="topbar-right">
        ${pill}
        <button class="icon-btn" id="mute-btn" aria-label="${stats.muted ? 'Unmute' : 'Mute'}">
          ${stats.muted ? '🔇' : '🔊'}
        </button>
      </div>
    </header>

    <section class="result-swatches">
      <div class="swatch-mini" style="background:${rgbStr(state.target)}">
        <div class="swatch-mini-label">Target</div>
        <div class="swatch-mini-rgb">${state.target.join(', ')}</div>
      </div>
      <div class="swatch-mini" style="background:${rgbStr(state.guess)}">
        <div class="swatch-mini-label">You</div>
        <div class="swatch-mini-rgb">${state.guess.join(', ')}</div>
      </div>
    </section>

    <section class="accuracy">
      <div class="accuracy-num">${accDisplay}%</div>
      <div class="accuracy-sub">${subText}</div>
    </section>

    <section class="journey" aria-label="Your guess journey">
      ${state.journey.map((c) => `<div class="journey-row" style="background:${rgbStr(c)}"></div>`).join('')}
    </section>

    <section class="stats-row">
      <div class="stat"><div class="stat-num">${stats.currentStreak}</div><div class="stat-label">Streak 🔥</div></div>
      <div class="stat"><div class="stat-num">${stats.bestAccuracy.toFixed(1)}%</div><div class="stat-label">Best</div></div>
      <div class="stat"><div class="stat-num">${stats.puzzlesPlayed}</div><div class="stat-label">Played</div></div>
    </section>

    ${actions}

    ${subline}
  `;

  $('#mute-btn').addEventListener('click', onToggleMute);
  if (isFree) {
    $('#back-daily-btn').addEventListener('click', onBackToDaily);
    $('#play-again-btn').addEventListener('click', onPlayAgain);
  } else {
    $('#share-btn').addEventListener('click', onShare);
    $('#free-play-btn').addEventListener('click', onStartFreePlay);
  }
}

// --- free play transitions ---
function resetRoundState() {
  clearInterval(state.timerHandle);
  clearInterval(state.sampleHandle);
  state.guess = [128, 128, 128];
  state.journey = [];
  state.startedAt = 0;
  state.remaining = DURATION_MS;
  state.hasInteracted = false;
  state.accuracy = 0;
}

function onStartFreePlay() {
  state.mode = 'free';
  state.target = randomTarget();
  resetRoundState();
  state.phase = 'ready';
  render();
}

function onPlayAgain() {
  // Already in free mode; just spin up a fresh round with a new target.
  state.target = randomTarget();
  resetRoundState();
  state.phase = 'ready';
  render();
}

function onBackToDaily() {
  state.mode = 'daily';
  resetRoundState();
  state.phase = 'ready';
  // render() will auto-restore today's daily result if it was already played.
  render();
}

async function onShare() {
  const stats = load();
  const text = shareText({
    day: dayNumber(),
    accuracy: state.accuracy,
    streak: stats.currentStreak,
  });
  // Try native share first (better on iOS), fall back to clipboard.
  if (navigator.share) {
    try {
      await navigator.share({ text });
      return;
    } catch {/* user canceled or unsupported, fall through */}
  }
  const ok = await copyToClipboard(text);
  flashShareButton(ok ? 'Copied!' : 'Copy failed');
}

function flashShareButton(label) {
  const btn = $('#share-btn');
  if (!btn) return;
  const original = btn.textContent;
  btn.textContent = label;
  btn.classList.add('btn-flash');
  setTimeout(() => {
    btn.textContent = original;
    btn.classList.remove('btn-flash');
  }, 1400);
}

function onToggleMute() {
  const stats = load();
  stats.muted = !stats.muted;
  save(stats);
  // Surgical icon swap, no full re-render.
  const btn = $('#mute-btn');
  if (btn) btn.textContent = stats.muted ? '🔇' : '🔊';
}

function onAdminReset() {
  state.mode = 'daily';
  state.target = targetForDate();
  resetRoundState();
  state.phase = 'ready';
  render();
}

// --- boot ---
function boot() {
  state.target = targetForDate();
  registerSW();
  maybeShowTutorial();
  wireAdminLink(onAdminReset);
  render();
}

document.addEventListener('DOMContentLoaded', boot);
