// Tiny canvas confetti. ~60 particles, gravity, no deps.
export function burstConfetti(durationMs = 1600) {
  const canvas = document.createElement('canvas');
  canvas.className = 'confetti';
  document.body.appendChild(canvas);
  const ctx = canvas.getContext('2d');
  const dpr = Math.min(window.devicePixelRatio || 1, 2);

  const resize = () => {
    canvas.width = innerWidth * dpr;
    canvas.height = innerHeight * dpr;
    canvas.style.width = innerWidth + 'px';
    canvas.style.height = innerHeight + 'px';
  };
  resize();
  addEventListener('resize', resize);

  const colors = ['#ff6ec4', '#7c3aed', '#22d3ee', '#f59e0b', '#10b981', '#ef4444'];
  const N = 80;
  const parts = Array.from({ length: N }, () => ({
    x: innerWidth / 2 * dpr,
    y: innerHeight / 2 * dpr,
    vx: (Math.random() - 0.5) * 18 * dpr,
    vy: (Math.random() - 1.2) * 18 * dpr,
    g: 0.5 * dpr,
    s: (4 + Math.random() * 6) * dpr,
    r: Math.random() * Math.PI,
    vr: (Math.random() - 0.5) * 0.4,
    c: colors[Math.floor(Math.random() * colors.length)],
  }));

  const start = performance.now();
  function frame(t) {
    const elapsed = t - start;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    parts.forEach((p) => {
      p.vy += p.g;
      p.x += p.vx;
      p.y += p.vy;
      p.r += p.vr;
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.r);
      ctx.fillStyle = p.c;
      ctx.fillRect(-p.s / 2, -p.s / 2, p.s, p.s * 0.5);
      ctx.restore();
    });
    if (elapsed < durationMs) requestAnimationFrame(frame);
    else {
      removeEventListener('resize', resize);
      canvas.remove();
    }
  }
  requestAnimationFrame(frame);
}
