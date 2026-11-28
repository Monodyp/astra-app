import React, { useState, useCallback } from 'react';
import { ZoomIn } from 'lucide-react';
import { Modal } from '../portal/Modal.js';

type FloatingCardWrapperProps = {
  children:
    React.ReactNode | ((props: { isZoomed: boolean }) => React.ReactNode);
  zoomedContent?: React.ReactNode;
  className?: string;
  glowColor?: string;
  disabled?: boolean;
  /** Multiplier for animation speed. 1 = default, 0.5 = half speed, 2 = double speed. */
  animationSpeed?: number;
  isPreview?: boolean;
};

export const FloatingCardWrapper: React.FC<FloatingCardWrapperProps> = ({
  children,
  zoomedContent,
  className = '',
  glowColor = 'rgba(0, 177, 237, 0.22)',
  disabled = false,
  animationSpeed = 0.5,
  isPreview = true,
}) => {
  // Base durations (prime-ish so layers never phase-sync). Divided by animationSpeed.
  const s = (base: number) => `${(base / animationSpeed).toFixed(2)}s`;
  const [isZoomed, setIsZoomed] = useState(false);

  const renderedChildren =
    typeof children === 'function' ? children({ isZoomed: false }) : children;
  const renderedZoomed =
    zoomedContent ??
    (typeof children === 'function' ? children({ isZoomed: true }) : children);

  const handleOpenZoom = useCallback(() => {
    if (isPreview || disabled) return;
    setIsZoomed(true);
  }, [isPreview, disabled]);

  const handleCloseZoom = useCallback(() => {
    setIsZoomed(false);
  }, []);

  return (
    <>
      <style>{`
  @keyframes astraDriftX {
    0%   { translate: calc(0px * var(--astra-drift, 1)) 0; }
    14%  { translate: calc(-26px * var(--astra-drift, 1)) 0; }
    31%  { translate: calc(14px * var(--astra-drift, 1)) 0; }
    47%  { translate: calc(-20px * var(--astra-drift, 1)) 0; }
    63%  { translate: calc(28px * var(--astra-drift, 1)) 0; }
    79%  { translate: calc(-10px * var(--astra-drift, 1)) 0; }
    91%  { translate: calc(18px * var(--astra-drift, 1)) 0; }
    100% { translate: calc(0px * var(--astra-drift, 1)) 0; }
  }
  @keyframes astraDriftY {
    0%   { transform: translateY(calc(0px * var(--astra-drift, 1))); }
    17%  { transform: translateY(calc(-22px * var(--astra-drift, 1))); }
    34%  { transform: translateY(calc(10px * var(--astra-drift, 1))); }
    51%  { transform: translateY(calc(-16px * var(--astra-drift, 1))); }
    66%  { transform: translateY(calc(20px * var(--astra-drift, 1))); }
    81%  { transform: translateY(calc(-8px * var(--astra-drift, 1))); }
    93%  { transform: translateY(calc(14px * var(--astra-drift, 1))); }
    100% { transform: translateY(calc(0px * var(--astra-drift, 1))); }
  }
  @keyframes astraBreath {
    0%   { scale: 1; }
    22%  { scale: calc(1 + 0.035 * var(--astra-drift, 1)); }
    45%  { scale: calc(1 + -0.034 * var(--astra-drift, 1)); }
    68%  { scale: calc(1 + 0.028 * var(--astra-drift, 1)); }
    85%  { scale: calc(1 + -0.025 * var(--astra-drift, 1)); }
    100% { scale: 1; }
  }
  @keyframes astraSpin {
    0%   { rotate: calc(0deg * var(--astra-drift, 1)); }
    13%  { rotate: calc(-6deg * var(--astra-drift, 1)); }
    28%  { rotate: calc(4.5deg * var(--astra-drift, 1)); }
    44%  { rotate: calc(-9deg * var(--astra-drift, 1)); }
    59%  { rotate: calc(7deg * var(--astra-drift, 1)); }
    73%  { rotate: calc(-2.5deg * var(--astra-drift, 1)); }
    87%  { rotate: calc(5.5deg * var(--astra-drift, 1)); }
    100% { rotate: calc(0deg * var(--astra-drift, 1)); }
  }

  /* One element, four independent animations (each on a different property) */
  .astra-active .astra-card {
    animation:
      astraDriftX ${s(23)} ease-in-out -5s infinite,
      astraDriftY ${s(31)} ease-in-out -11s infinite,
      astraBreath ${s(19)} ease-in-out -3s infinite,
      astraSpin   ${s(37)} ease-in-out -9s infinite;
  }

  .astra-paused .astra-card,
  .astra-active:hover .astra-card {
    animation-play-state: paused;
  }

  @media (prefers-reduced-motion: reduce) {
    .astra-card { animation: none !important; }
  }
`}</style>

      {/* Main Container */}
      <div
        className={`group relative ${className} ${!disabled ? 'astra-active' : ''} ${
          isZoomed ? 'astra-paused' : ''
        }`}
      >
        <div className="astra-card relative">
          {React.isValidElement(renderedChildren)
            ? React.cloneElement(
                renderedChildren as React.ReactElement<{
                  onClick?: () => void;
                  onKeyDown?: (e: React.KeyboardEvent<HTMLDivElement>) => void;
                  role?: React.AriaRole;
                  tabIndex?: number;
                  'aria-label'?: string;
                  cursorClass?: string;
                }>,
                {
                  onClick: !isPreview && !disabled ? handleOpenZoom : undefined,
                  onKeyDown: (e: React.KeyboardEvent<HTMLDivElement>) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      handleOpenZoom();
                    }
                  },
                  role:
                    !isPreview && !disabled
                      ? ('button' as React.AriaRole)
                      : undefined,
                  tabIndex: !isPreview && !disabled ? 0 : undefined,
                  'aria-label':
                    !isPreview && !disabled
                      ? 'Click to zoom in ID card'
                      : undefined,
                  cursorClass: `${!isPreview ? 'cursor-zoom-in' : 'cursor-default'}`,
                }
              )
            : renderedChildren}
        </div>
        {!isPreview && (
          <div className="opacity-0 group-hover:opacity-100 pointer-events-none absolute -bottom-16 right-0 z-20 flex items-center gap-1.5 rounded-full border border-white/20 bg-black/60 px-3 py-1 text-[11px] font-astra font-medium text-white/90 transition-opacity duration-300 shadow-lg sm:-right-16">
            <ZoomIn className="h-3.5 w-3.5 text-astra-primary-light" />
            <span>Click the card to enlarge</span>
          </div>
        )}

        {/* Shadow */}
        <div
          aria-hidden="true"
          className="astra-shadow-drifter pointer-events-none absolute -bottom-8 left-1/2 h-10 w-3/4 -translate-x-1/2 rounded-[50%] blur-3xl"
          style={{ backgroundColor: glowColor }}
        />
      </div>

      {isZoomed && (
        <Modal label="Enlarged Digital ID" onClose={handleCloseZoom}>
          {renderedZoomed}
        </Modal>
      )}
    </>
  );
};
