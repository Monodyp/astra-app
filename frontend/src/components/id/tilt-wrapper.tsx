import { useCallback, useEffect, useRef } from 'react';
import { clamp, ease } from '../home/ui-util';

const DESKTOP_QUERY = '(min-width: 1024px)';

type TiltCardProps = {
  children: React.ReactNode;
  rotateX?: number;
  rotateY?: number;
  rotateZ?: number;
  perspective?: number;
  thickness?: number;
  intensity?: number;
  disabled?: boolean;
  desktopInteractionOnly?: boolean;
  className?: string;
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
  desktopInteractionOnly = false,
  className = '',
  onClick,
  onKeyDown,
  role,
  tabIndex,
  'aria-label': ariaLabel,
  cursorClass,
  isInteractable = true,
}) => {
  const tiltRef = useRef<HTMLDivElement>(null);
  const glintRef = useRef<HTMLDivElement>(null);

  const transformFor = useCallback(
    (nx: number, ny: number) =>
      `perspective(${perspective}px) rotateX(${rotateX - ease(ny) * intensity}deg) rotateY(${rotateY + ease(nx) * intensity}deg) rotateZ(${rotateZ}deg)`,
    [perspective, rotateX, rotateY, rotateZ, intensity]
  );

  // Pointer and sensor updates write CSS variables directly so React renders do not reset them.
  const apply = useCallback(
    (nx: number, ny: number, transition: string) => {
      const tilt = tiltRef.current;
      const glint = glintRef.current;
      if (!tilt || !glint) return;

      tilt.style.setProperty('--tilt-transition', transition);
      tilt.style.setProperty('--tilt-transform', transformFor(nx, ny));

      const mag = Math.min(1, Math.hypot(nx, ny));
      glint.style.transform = `translateX(${-nx * 40 - ny * 20}%)`;
      glint.style.opacity = String(0.15 + 0.85 * mag);
    },
    [transformFor]
  );

  const reset = useCallback(() => {
    const tilt = tiltRef.current;
    const glint = glintRef.current;
    if (!tilt || !glint) return;
    tilt.style.setProperty('--tilt-transition', 'transform 500ms ease-out');
    tilt.style.setProperty('--tilt-transform', transformFor(0, 0));
    glint.style.opacity = '0';
  }, [transformFor]);

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isInteractable || disabled || e.pointerType !== 'mouse') return;
    if (desktopInteractionOnly && !window.matchMedia(DESKTOP_QUERY).matches) {
      return;
    }
    const rect = e.currentTarget.getBoundingClientRect();
    const nx = clamp(((e.clientX - rect.left) / rect.width) * 2 - 1);
    const ny = clamp(((e.clientY - rect.top) / rect.height) * 2 - 1);
    apply(nx, ny, 'transform 80ms ease-out');
  };

  useEffect(() => {
    if (!disabled) return;
    tiltRef.current?.style.setProperty(
      '--tilt-transition',
      'transform 300ms ease-out'
    );
    if (glintRef.current) glintRef.current.style.opacity = '0';
  }, [disabled]);

  // Gyroscope on touch devices. Skipped on iOS, which needs a permission prompt.
  useEffect(() => {
    if (
      !isInteractable ||
      disabled ||
      desktopInteractionOnly ||
      typeof window === 'undefined' ||
      !('DeviceOrientationEvent' in window)
    )
      return;
    const needsPermission =
      typeof (
        DeviceOrientationEvent as unknown as { requestPermission?: unknown }
      ).requestPermission === 'function';
    if (needsPermission || !window.matchMedia('(hover: none)').matches) return;

    let base: { beta: number; gamma: number } | null = null;
    const onOrientation = (e: DeviceOrientationEvent) => {
      if (e.beta == null || e.gamma == null) return;
      if (!base) base = { beta: e.beta, gamma: e.gamma };
      apply(
        clamp((e.gamma - base.gamma) / 30),
        clamp((e.beta - base.beta) / 30),
        'transform 100ms linear'
      );
    };
    window.addEventListener('deviceorientation', onOrientation);
    return () => window.removeEventListener('deviceorientation', onOrientation);
  }, [apply, desktopInteractionOnly, disabled, isInteractable]);

  const rest = disabled ? 'none' : transformFor(0, 0);

  return (
    <div className={`relative ${className}`}>
      {/* Hover area: untransformed and only as big as the card, so it never moves while tilting */}
      <div
        className={`relative -m-3 p-3${cursorClass ? ` ${cursorClass}` : ''}`}
        onPointerMove={onPointerMove}
        onPointerLeave={(e) => {
          if (
            e.relatedTarget instanceof Node &&
            e.currentTarget.contains(e.relatedTarget)
          ) {
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
          className={`relative ${
            desktopInteractionOnly
              ? '[transform:var(--tilt-rest-transform)] [transition:none] lg:[transform:var(--tilt-transform)] lg:[transition:var(--tilt-transition)]'
              : '[transform:var(--tilt-transform)] [transition:var(--tilt-transition)]'
          }`}
          style={{
            ['--tilt-rest-transform' as string]: rest,
            ['--tilt-transform' as string]: rest,
            transformStyle: 'preserve-3d',
          }}
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
            <div
              aria-hidden
              className={`pointer-events-none absolute inset-0 overflow-hidden rounded-2xl ${
                desktopInteractionOnly ? 'hidden lg:block' : ''
              }`}
            >
              <div
                ref={glintRef}
                className="absolute inset-0"
                style={{
                  opacity: 0,
                  background:
                    'linear-gradient(115deg, transparent 32%, rgba(255,255,255,0.55) 50%, transparent 68%)',
                  transition:
                    'opacity 300ms ease-out, transform 120ms ease-out',
                  willChange: 'transform, opacity',
                }}
              />
            </div>
          </div>
        </div>
      </div>

      <div
        aria-hidden
        className="pointer-events-none absolute bottom-3 left-1/2 h-10 w-64 -translate-x-1/2 rounded-[50%] bg-cyan-400/10 blur-2xl"
      />
    </div>
  );
};
