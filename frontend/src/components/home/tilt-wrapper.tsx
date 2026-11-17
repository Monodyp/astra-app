import { useCallback, useEffect, useRef } from "react";
import { clamp, ease } from "./ui-util";

type TiltCardProps = {
  children: React.ReactNode;
  rotateX?: number;
  rotateY?: number;
  rotateZ?: number;
  perspective?: number;
  thickness?: number;
  intensity?: number;
  className?: string;
};

export const TiltCard: React.FC<TiltCardProps> = ({
  children,
  rotateX = 20,
  rotateY = 12,
  rotateZ = -20,
  perspective = 700,
  thickness = 14,
  intensity = 9,
  className = '',
}) => {
  const tiltRef = useRef<HTMLDivElement>(null);
  const glintRef = useRef<HTMLDivElement>(null);

  const transformFor = useCallback(
    (nx: number, ny: number) =>
      `perspective(${perspective}px) rotateX(${rotateX - ease(ny) * intensity}deg) rotateY(${rotateY + ease(nx) * intensity}deg) rotateZ(${rotateZ}deg)`,
    [perspective, rotateX, rotateY, rotateZ, intensity],
  );

  // nx, ny in [-1, 1]; (0, 0) is the default pose. Writes straight to the DOM, no React state.
  const apply = useCallback(
    (nx: number, ny: number, transition: string) => {
      const tilt = tiltRef.current;
      const glint = glintRef.current;
      if (!tilt || !glint) return;

      tilt.style.transition = transition;
      tilt.style.transform = transformFor(nx, ny);

      const mag = Math.min(1, Math.hypot(nx, ny));
      glint.style.setProperty('--gp', `${50 - nx * 40 - ny * 20}%`);
      glint.style.opacity = String(0.15 + 0.85 * mag);
    },
    [transformFor],
  );

  const reset = useCallback(() => {
    const tilt = tiltRef.current;
    const glint = glintRef.current;
    if (!tilt || !glint) return;
    tilt.style.transition = 'transform 500ms ease-out';
    tilt.style.transform = transformFor(0, 0);
    glint.style.opacity = '0'; // fade out in place so the band doesn't jump
  }, [transformFor]);

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerType !== 'mouse') return;
    const rect = e.currentTarget.getBoundingClientRect();
    const nx = clamp(((e.clientX - rect.left) / rect.width) * 2 - 1);
    const ny = clamp(((e.clientY - rect.top) / rect.height) * 2 - 1);
    apply(nx, ny, 'transform 80ms ease-out');
  };

  // Gyroscope on touch devices. Skipped on iOS, which needs a permission prompt.
  useEffect(() => {
    if (typeof window === 'undefined' || !('DeviceOrientationEvent' in window)) return;
    const needsPermission =
      typeof (DeviceOrientationEvent as unknown as { requestPermission?: unknown })
        .requestPermission === 'function';
    if (needsPermission || !window.matchMedia('(hover: none)').matches) return;

    let base: { beta: number; gamma: number } | null = null;
    const onOrientation = (e: DeviceOrientationEvent) => {
      if (e.beta == null || e.gamma == null) return;
      if (!base) base = { beta: e.beta, gamma: e.gamma }; // first reading = neutral
      apply(
        clamp((e.gamma - base.gamma) / 30),
        clamp((e.beta - base.beta) / 30),
        'transform 100ms linear',
      );
    };
    window.addEventListener('deviceorientation', onOrientation);
    return () => window.removeEventListener('deviceorientation', onOrientation);
  }, [apply]);


  return (
    <div
      className={`relative ${className}`}
    >
      {/* Hover area: untransformed and only as big as the card, so it never moves while tilting */}
      <div
        className="relative -m-3 p-3"
        onPointerMove={onPointerMove}
        // onPointerLeave={reset}
        onPointerLeave={(e) => {
          console.log('left hover area, now over:', e.relatedTarget);
          reset();
        }}
      >
        <div
          ref={tiltRef}
          className="relative"
          style={{ transform: transformFor(0, 0), transformStyle: 'preserve-3d' }}
        >
          {thickness > 0 && (
            <div
              aria-hidden
              className="absolute -inset-2 rounded-[1.25rem] border border-white/30 bg-white/10"
              style={{ transform: `translateZ(-${thickness}px)` }}
            />
          )}
          <div className="relative rounded-2xl shadow-[0_20px_50px_rgba(0,177,237,0.24)]">
            {children}
            {/* Glint overlay: sits on top of the card, so the card design is untouched */}
            <div
              ref={glintRef}
              aria-hidden
              className="pointer-events-none absolute inset-0 rounded-2xl"
              style={{
                opacity: 0,
                ['--gp' as string]: '50%',
                background:
                  'linear-gradient(115deg, transparent calc(var(--gp) - 18%), rgba(255,255,255,0.55) var(--gp), transparent calc(var(--gp) + 18%))',
                transition: 'opacity 300ms ease-out',
              }}
            />
          </div>
        </div>
      </div>

      {/* Ground glow */}
      <div
        aria-hidden
        className="pointer-events-none absolute bottom-3 left-1/2 h-10 w-64 -translate-x-1/2 rounded-[50%] bg-cyan-400/10 blur-2xl"
      />
    </div>
  );
};