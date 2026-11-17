import { useEffect, useRef } from "react";

type StarfieldProps = {
  starCount?: number;   // number of stars
  speed?: number;       // travel speed; 0.08 is slow, 0.3+ is fast
  streak?: number;      // streak length multiplier; 0 gives plain dots
  className?: string;
};

type Star = { x: number; y: number; z: number; hue: number };
type Body = { x: number; y: number; z: number; kind: "galaxy" | "star"; hue: number; angle: number; tilt: number; size: number };

const rand = (a: number, b: number) => a + Math.random() * (b - a);

export default function Starfield({
  starCount = 450,
  speed = 0.08,
  streak = 1,
  className = "",
}: StarfieldProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const parent = canvas?.parentElement;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !parent || !ctx) return;
    const reduced =
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    let w = 0, h = 0, raf = 0, last = performance.now(), nextBody = 6;
    let visible = true;

    const newStar = (far = false): Star => ({
      x: rand(-1, 1),
      y: rand(-1, 1),
      z: far ? 1 : rand(0.02, 1),
      hue: Math.random() < 0.7 ? 210 : rand(20, 50), // mostly blue-white, a few warm
    });
    const stars: Star[] = Array.from({ length: starCount }, () => newStar());
    const bodies: Body[] = [];

    const spawnBody = () => {
      const side = Math.random() < 0.5 ? -1 : 1;
      bodies.push({
        x: side * rand(0.35, 0.9),
        y: rand(-0.7, 0.7),
        z: 1,
        kind: Math.random() < 0.6 ? "galaxy" : "star",
        hue: rand(190, 320),
        angle: rand(0, Math.PI),
        tilt: rand(0.3, 0.6),
        size: rand(0.04, 0.09),
      });
    };

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = parent.clientWidth;
      h = parent.clientHeight;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    const ro = new ResizeObserver(resize);
    ro.observe(parent);
    resize();

    const io = new IntersectionObserver(([e]) => { visible = e.isIntersecting; });
    io.observe(parent);

    const frame = (now: number) => {
      raf = requestAnimationFrame(frame);
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      if (!visible) return;

      ctx.clearRect(0, 0, w, h);
      ctx.globalCompositeOperation = "lighter";
      const cx = w / 2, cy = h / 2;
      const scale = Math.max(w, h) / 2;
      const move = reduced ? 0 : speed * dt;

      // stars
      ctx.lineCap = "round";
      for (const s of stars) {
        const prevZ = s.z + speed * 0.05 * streak; // streak start (farther away)
        s.z -= move;
        const sx = cx + (s.x / s.z) * scale;
        const sy = cy + (s.y / s.z) * scale;
        if (s.z < 0.02 || sx < -50 || sx > w + 50 || sy < -50 || sy > h + 50) {
          Object.assign(s, newStar(true));
          continue;
        }
        const px = cx + (s.x / prevZ) * scale;
        const py = cy + (s.y / prevZ) * scale;
        const depth = 1 - s.z;
        ctx.strokeStyle = `hsla(${s.hue}, 80%, 85%, ${0.15 + depth * 0.85})`;
        ctx.lineWidth = 0.4 + depth * 1.8;
        ctx.beginPath();
        ctx.moveTo(px, py);
        ctx.lineTo(sx + 0.01, sy); // tiny offset so zero-length dots still render
        ctx.stroke();
      }

      // occasional galaxies / big stars (slower than the stars, so they feel far away)
      nextBody -= dt;
      if (nextBody <= 0 && !reduced) {
        spawnBody();
        nextBody = rand(15, 35);
      }
      for (let i = bodies.length - 1; i >= 0; i--) {
        const b = bodies[i];
        b.z -= move * 0.35;
        const sx = cx + (b.x / b.z) * scale;
        const sy = cy + (b.y / b.z) * scale;
        const r = (b.size / b.z) * scale;
        if (b.z < 0.05 || sx < -r * 2 || sx > w + r * 2 || sy < -r * 2 || sy > h + r * 2) {
          bodies.splice(i, 1);
          continue;
        }
        const alpha = Math.min(1, (1 - b.z) * 6) * Math.min(1, b.z * 4);
        ctx.save();
        ctx.translate(sx, sy);
        if (b.kind === "galaxy") {
          ctx.rotate(b.angle);
          ctx.scale(1, b.tilt);
          const g = ctx.createRadialGradient(0, 0, 0, 0, 0, r * 2);
          g.addColorStop(0, `hsla(${b.hue + 30}, 90%, 90%, ${0.9 * alpha})`);
          g.addColorStop(0.15, `hsla(${b.hue}, 80%, 65%, ${0.5 * alpha})`);
          g.addColorStop(1, `hsla(${b.hue}, 80%, 50%, 0)`);
          ctx.fillStyle = g;
          ctx.beginPath();
          ctx.arc(0, 0, r * 2, 0, Math.PI * 2);
          ctx.fill();
        } else {
          const g = ctx.createRadialGradient(0, 0, 0, 0, 0, r);
          g.addColorStop(0, `hsla(${b.hue}, 60%, 98%, ${alpha})`);
          g.addColorStop(0.25, `hsla(${b.hue}, 90%, 75%, ${0.6 * alpha})`);
          g.addColorStop(1, `hsla(${b.hue}, 90%, 60%, 0)`);
          ctx.fillStyle = g;
          ctx.beginPath();
          ctx.arc(0, 0, r, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
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
      className={`z-50 fixed pointer-events-none inset-0 h-full w-full ${className}`}
    />
  );
}