import { useCallback, useEffect, useRef } from "react";
import { clamp, ease } from "../home/ui-util";

type TiltCardProps = {
  children: React.ReactNode;
  rotateX?: number;
  rotateY?: number;
  rotateZ?: number;
  perspective?: number;
  thickness?: number;
  intensity?: number;
  disabled?: boolean;
  className?: string;
  // Click / keyboard / accessibility passthrough onto the hover-area div
  onClick?: () => void;
  onKeyDown?: (e: React.KeyboardEvent<HTMLDivElement>) => void;
  role?: React.AriaRole;
  tabIndex?: number;
  'aria-label'?: string;
  cursorClass?: string;
  isInteractable?: boolean;
};

export const TiltCard: React.FC<TiltCardProps> = ({
  children,
  rotateX = 20,
  rotateY = 12,
  rotateZ = -20,
  perspective = 700,
  thickness = 14,
  intensity = 9,
  disabled = false,
  className = '',
  onClick,
  onKeyDown,
  role,
  tabIndex,
  'aria-label': ariaLabel,
  cursorClass,
  isInteractable=true
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
      glint.style.transform = `translateX(${-nx * 40 - ny * 20}%)`;
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
    if (!isInteractable || disabled || e.pointerType !== 'mouse') return;
    const rect = e.currentTarget.getBoundingClientRect();
    const nx = clamp(((e.clientX - rect.left) / rect.width) * 2 - 1);
    const ny = clamp(((e.clientY - rect.top) / rect.height) * 2 - 1);
    apply(nx, ny, 'transform 80ms ease-out');
  };

  useEffect(() => {
    if (!tiltRef.current) return;
    if (disabled) {
      tiltRef.current.style.transform = 'none';
      tiltRef.current.style.transition = 'transform 300ms ease-out';
      if (glintRef.current) glintRef.current.style.opacity = '0';
    } else {
      // Set the resting pose imperatively on mount and whenever disabled toggles off.
      // We do this here — NOT in JSX style prop — so React re-renders never overwrite
      // the transform that apply() has set via direct DOM writes.
      tiltRef.current.style.transform = transformFor(0, 0);
      tiltRef.current.style.transition = '';
    }
  }, [disabled, transformFor]);

  // Gyroscope on touch devices. Skipped on iOS, which needs a permission prompt.
  useEffect(() => {
    if (!isInteractable || disabled || typeof window === 'undefined' || !('DeviceOrientationEvent' in window)) return;
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
        className={`relative -m-3 p-3${cursorClass ? ` ${cursorClass}` : ''}`}
        onPointerMove={onPointerMove}
        onPointerLeave={(e) => {
          if (e.relatedTarget instanceof Node && e.currentTarget.contains(e.relatedTarget)) {
            return;
          }
          reset();
        }}
        onClick={onClick}
        onKeyDown={onKeyDown}
        role={role}
        tabIndex={tabIndex}
        aria-label={ariaLabel}
      >
        <div
          ref={tiltRef}
          className="relative"
          style={{ transformStyle: 'preserve-3d' }}
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
            <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden rounded-2xl">
              <div
                ref={glintRef}
                className="absolute inset-0"
                style={{
                  opacity: 0,
                  background:
                    'linear-gradient(115deg, transparent 32%, rgba(255,255,255,0.55) 50%, transparent 68%)',
                  transition: 'opacity 300ms ease-out, transform 120ms ease-out',
                  willChange: 'transform, opacity',
                }}
              />
            </div>
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