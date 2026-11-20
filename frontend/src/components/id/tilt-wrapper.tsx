import React, { useRef, useEffect, useCallback } from 'react';

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
  rotateX = 0,
  rotateY = 0,
  rotateZ = 0,
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

  const clamp = (val: number, min = -1, max = 1) =>
    Math.min(Math.max(val, min), max);

  const transformFor = useCallback(
    (nx: number, ny: number) => {
      const rx = rotateX - ny * intensity;
      const ry = rotateY + nx * intensity;
      return `rotateX(${rx}deg) rotateY(${ry}deg) rotateZ(${rotateZ}deg)`;
    },
    [rotateX, rotateY, rotateZ, intensity]
  );

  const apply = useCallback(
    (nx: number, ny: number, transition: string) => {
      const tilt = tiltRef.current;
      const glint = glintRef.current;
      if (!tilt || !glint) return;

      tilt.style.setProperty('--tilt-transition', transition);
      tilt.style.setProperty('--tilt-transform', transformFor(nx, ny));

      const mag = Math.min(1, Math.hypot(nx, ny));
      glint.style.setProperty('--gp', `${50 - nx * 40 - ny * 20}%`);
      glint.style.transform = `translateX(${-nx * 40 - ny * 20}%)`;
      glint.style.opacity = String(0.15 + 0.85 * mag);
    },
    [transformFor]
  );

  const reset = useCallback(() => {
    apply(0, 0, 'transform 300ms ease-out');
    if (glintRef.current) {
      glintRef.current.style.opacity = '0';
    }
  }, [apply]);

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isInteractable || disabled || e.pointerType !== 'mouse') return;
    if (desktopInteractionOnly && !window.matchMedia('(min-width: 1024px)').matches) return;
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
      tiltRef.current.style.setProperty('--tilt-transform', transformFor(0, 0));
      tiltRef.current.style.setProperty('--tilt-transition', '');
    }
  }, [disabled, transformFor]);

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
      typeof (DeviceOrientationEvent as unknown as { requestPermission?: unknown })
        .requestPermission === 'function';
    if (needsPermission) return;

    const onOrientation = (e: DeviceOrientationEvent) => {
      const gamma = clamp((e.gamma ?? 0) / 45);
      const beta = clamp(((e.beta ?? 0) - 45) / 45);
      apply(gamma, beta, 'transform 100ms ease-out');
    };
    window.addEventListener('deviceorientation', onOrientation);
    return () => window.removeEventListener('deviceorientation', onOrientation);
  }, [apply, desktopInteractionOnly, disabled, isInteractable]);

  return (
    <div
      className={`relative ${className}`}
      style={{ perspective: `${perspective}px` }}
    >
      {/* 
        Pointer layer: sits above the card, captures pointer moves, 
        absorbs clicks if not interactable, handles hover states.
      */}
      <div
        className={`relative h-full w-full ${isInteractable ? (cursorClass || 'cursor-pointer') : 'pointer-events-none'}`}
        onPointerMove={onPointerMove}
        onPointerLeave={reset}
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
            ['--tilt-rest-transform' as string]: transformFor(0, 0),
            ['--tilt-transform' as string]: transformFor(0, 0),
            ['--tilt-transition' as string]: 'none',
            transformStyle: 'preserve-3d',
          }}
        >
          {thickness > 0 && (
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0 rounded-2xl bg-[#097aaa]"
              style={{ transform: `translateZ(-${thickness}px)` }}
            />
          )}
          <div className="relative rounded-2xl shadow-[0_20px_50px_rgba(0,177,237,0.24)]">
            {children}
            {/* Glint overlay: sits on top of the card, so the card design is untouched */}
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
                  ['--gp' as string]: '50%',
                  background:
                    'linear-gradient(115deg, transparent calc(var(--gp) - 18%), rgba(255,255,255,0.55) var(--gp), transparent calc(var(--gp) + 18%))',
                  transition: 'opacity 300ms ease-out, transform 120ms ease-out',
                  willChange: 'transform, opacity',
                }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
