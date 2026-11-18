import { useEffect, useRef } from "react";

type StarfieldProps = {
  starCount?: number;   // overrides the auto count (220 mobile / 450 desktop)
  speed?: number;       // travel speed; 0.08 is slow, 0.3+ is fast
  streak?: number;      // streak length multiplier; 0 gives plain dots
  className?: string;
};

type Star = { x: number; y: number; z: number; warm: boolean };
type BigStar = { x: number; y: number; z: number; hue: number; size: number };
type Nebula = { x: number; y: number; z: number; sprite: number; size: number; angle: number };

const rand = (a: number, b: number) => a + Math.random() * (b - a);
const NUM_BUCKETS = 8;

const makeNebulaSprite = (baseHue: number) => {
  const c = document.createElement("canvas");
  c.width = c.height = 256;
  const g = c.getContext("2d")!;
  g.globalCompositeOperation = "lighter";
  for (let i = 0; i < 8; i++) {
    const x = rand(70, 186), y = rand(70, 186), r = rand(50, 100);
    const hue = baseHue + rand(-25, 25);
    const grad = g.createRadialGradient(x, y, 0, x, y, r);
    grad.addColorStop(0, `hsla(${hue},80%,55%,0.35)`);
    grad.addColorStop(1, `hsla(${hue},80%,40%,0)`);
    g.fillStyle = grad;
    g.fillRect(0, 0, 256, 256);
  }
  return c;
};

export default function Starfield({
  starCount,
  speed = 0.08,
  streak = 1,
  className = "",
}: StarfieldProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    const reduced =
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const isMobile =
      typeof window.matchMedia === "function" &&
      window.matchMedia("(max-width: 768px), (pointer: coarse)").matches;

    const count = starCount ?? (isMobile ? 220 : 450);
    const maxBigStars = 2;
    const maxNebulas = isMobile ? 1 : 2;
    const dprCap = isMobile ? 1 : 1.5;

    let w = 0, h = 0, raf = 0, last = performance.now();
    let nextBig = 6, nextNebula = 4;
    let visible = true;

    const coolBuf = Array.from({ length: NUM_BUCKETS }, () => new Float32Array(count * 4));
    const warmBuf = Array.from({ length: NUM_BUCKETS }, () => new Float32Array(count * 4));
    const coolN = new Int32Array(NUM_BUCKETS);
    const warmN = new Int32Array(NUM_BUCKETS);

    const resetStar = (s: Star, far: boolean) => {
      s.x = rand(-1, 1);
      s.y = rand(-1, 1);
      s.z = far ? 1 : rand(0.02, 1);
      s.warm = Math.random() >= 0.7;
    };
    const stars: Star[] = Array.from({ length: count }, () => {
      const s = { x: 0, y: 0, z: 0, warm: false };
      resetStar(s, false);
      return s;
    });

    const bigStars: BigStar[] = [];
    const nebulas: Nebula[] = [];
    const sprites = maxNebulas > 0 ? [210, 275, 330].map(makeNebulaSprite) : [];

    const spawnBigStar = () => {
      if (bigStars.length >= maxBigStars) return;
      bigStars.push({
        x: (Math.random() < 0.5 ? -1 : 1) * rand(0.35, 0.9),
        y: rand(-0.7, 0.7),
        z: 1,
        hue: rand(190, 320),
        size: rand(0.04, 0.09),
      });
    };

    // Tuning: where nebulas may appear (as fractions of half the screen width/height)
    const NEBULA_MIN_OFFSET = 0.9;   // closest allowed to center: 70% of the way to the edge
    const NEBULA_MAX_OFFSET = 1.0;   // farthest: right at the screen edge
    const NEBULA_Y_RANGE = 0.1;      // vertical band: ±30% of half-height (keeps them off top/bottom)

    const spawnNebula = () => {
      if (nebulas.length >= maxNebulas || sprites.length === 0) return;

      const scale = (w + h) / 3;               // same formula the frame loop uses
      const side = Math.random() < 0.5 ? -1 : 1;

      // Position by screen fraction, converted back to the star-space units (z = 1)
      const x = (side * rand(NEBULA_MIN_OFFSET, NEBULA_MAX_OFFSET) * (w / 2)) / scale;
      const y = (rand(-NEBULA_Y_RANGE, NEBULA_Y_RANGE) * (h / 2)) / scale;

      // Cap size to half the distance from center so the inner edge never reaches the middle
      const size = Math.min(rand(0.25, 0.5), Math.abs(x) * 0.5);

      nebulas.push({
        x,
        y,
        z: 1,
        sprite: Math.floor(Math.random() * sprites.length),
        size,
        angle: rand(0, Math.PI * 2),
      });
    };

    // Size from the canvas itself (it's position: fixed, so the parent's size is irrelevant)
    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, dprCap);
      w = canvas.clientWidth;
      h = canvas.clientHeight;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);
    resize();

    const io = new IntersectionObserver(([e]) => { visible = e.isIntersecting; });
    io.observe(canvas);

    const flush = (bufs: Float32Array[], counts: Int32Array, hue: number) => {
      for (let i = 0; i < NUM_BUCKETS; i++) {
        const n = counts[i];
        if (n === 0) continue;
        const d = (i + 0.5) / NUM_BUCKETS;
        ctx.strokeStyle = `hsla(${hue},80%,85%,${(0.15 + d * 0.85).toFixed(2)})`;
        ctx.lineWidth = 0.4 + d * 1.8;
        ctx.beginPath();
        const buf = bufs[i];
        for (let j = 0; j < n; j += 4) {
          ctx.moveTo(buf[j], buf[j + 1]);
          ctx.lineTo(buf[j + 2], buf[j + 3]);
        }
        ctx.stroke();
        counts[i] = 0;
      }
    };

    const frame = (now: number) => {
      raf = requestAnimationFrame(frame);

      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      if (!visible || w === 0) return;

      ctx.clearRect(0, 0, w, h);
      ctx.globalCompositeOperation = "lighter";
      const cx = w / 2, cy = h / 2;
      const scale = (w + h) / 3;               // balanced for portrait and landscape
      const short = Math.min(w, h);
      const maxNebulaR = short * 1.0;           // relative to screen, not fixed px
      const maxStarR = short * 0.2;
      const move = reduced ? 0 : speed * dt;

      // Nebulas (behind stars)
      nextNebula -= dt;
      if (nextNebula <= 0 && !reduced) {
        spawnNebula();
        nextNebula = rand(25, 50);
      }
      for (let i = nebulas.length - 1; i >= 0; i--) {
        const n = nebulas[i];
        n.z -= move * 0.2;
        const sx = cx + (n.x / n.z) * scale;
        const sy = cy + (n.y / n.z) * scale;
        const r = Math.min((n.size / n.z) * scale, maxNebulaR);
        if (n.z < 0.25 || sx < -r || sx > w + r || sy < -r || sy > h + r) {
          nebulas.splice(i, 1);
          continue;
        }
        const alpha = Math.min(1, (1 - n.z) * 5) * Math.min(1, (n.z - 0.25) * 4) * 0.5;
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.translate(sx, sy);
        ctx.rotate(n.angle);
        ctx.drawImage(sprites[n.sprite], -r, -r, r * 2, r * 2);
        ctx.restore();
      }

      // Stars
      ctx.lineCap = "round";
      for (const s of stars) {
        const prevZ = s.z + speed * 0.05 * streak;
        s.z -= move;
        const sx = cx + (s.x / s.z) * scale;
        const sy = cy + (s.y / s.z) * scale;
        if (s.z < 0.02 || sx < -50 || sx > w + 50 || sy < -50 || sy > h + 50) {
          resetStar(s, true);
          continue;
        }
        const px = cx + (s.x / prevZ) * scale;
        const py = cy + (s.y / prevZ) * scale;
        const bi = Math.min(NUM_BUCKETS - 1, Math.floor((1 - s.z) * NUM_BUCKETS));
        const buf = s.warm ? warmBuf[bi] : coolBuf[bi];
        const counts = s.warm ? warmN : coolN;
        const k = counts[bi];
        buf[k] = px;
        buf[k + 1] = py;
        buf[k + 2] = sx + 0.01;
        buf[k + 3] = sy;
        counts[bi] = k + 4;
      }
      flush(coolBuf, coolN, 210);
      flush(warmBuf, warmN, 35);

      // Occasional big stars
      nextBig -= dt;
      if (nextBig <= 0 && !reduced) {
        spawnBigStar();
        nextBig = rand(15, 35);
      }
      for (let i = bigStars.length - 1; i >= 0; i--) {
        const b = bigStars[i];
        b.z -= move * 0.35;
        const sx = cx + (b.x / b.z) * scale;
        const sy = cy + (b.y / b.z) * scale;
        const r = Math.min((b.size / b.z) * scale, maxStarR);
        if (b.z < 0.2 || sx < -r || sx > w + r || sy < -r || sy > h + r) {
          bigStars.splice(i, 1);
          continue;
        }
        const alpha = Math.min(1, (1 - b.z) * 6) * Math.min(1, (b.z - 0.2) * 5);
        const g = ctx.createRadialGradient(sx, sy, 0, sx, sy, r);
        g.addColorStop(0, `hsla(${b.hue}, 60%, 98%, ${alpha})`);
        g.addColorStop(0.25, `hsla(${b.hue}, 90%, 75%, ${0.6 * alpha})`);
        g.addColorStop(1, `hsla(${b.hue}, 90%, 60%, 0)`);
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(sx, sy, r, 0, Math.PI * 2);
        ctx.fill();
      }
    };
    raf = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      io.disconnect();
    };
  }, [starCount, speed, streak]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden
      className={`fixed left-0 top-0 z-50 w-full h-[100lvh] pointer-events-none ${className}`}
    />
  );
}