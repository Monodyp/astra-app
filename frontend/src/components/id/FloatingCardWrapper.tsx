import React, { useState, useEffect, useCallback } from 'react';
import { X, ZoomIn } from 'lucide-react';

type FloatingCardWrapperProps = {
  children: React.ReactNode | ((props: { isZoomed: boolean }) => React.ReactNode);
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
  isPreview = true
}) => {
  // Base durations (prime-ish so layers never phase-sync). Divided by animationSpeed.
  const s = (base: number) => `${(base / animationSpeed).toFixed(2)}s`;
  const [isZoomed, setIsZoomed] = useState(false);

  const renderedChildren = typeof children === 'function' ? children({ isZoomed: false }) : children;
  const renderedZoomed = zoomedContent ?? (typeof children === 'function' ? children({ isZoomed: true }) : children);

  const handleOpenZoom = useCallback(() => {
    if (isPreview) return
    setIsZoomed(true);
  }, []);

  const handleCloseZoom = useCallback(() => {
    setIsZoomed(false);
  }, []);

  // Handle ESC key to dismiss the zoom overlay
  useEffect(() => {
    if (!isZoomed) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleCloseZoom();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isZoomed, handleCloseZoom]);

  // Lock body scroll while zoomed
  useEffect(() => {
    if (isZoomed) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [isZoomed]);

  return (
    <>
      <style>{`
  @keyframes astraDriftX {
    0%   { translate: 0px 0; }
    14%  { translate: -26px 0; }
    31%  { translate: 14px 0; }
    47%  { translate: -20px 0; }
    63%  { translate: 28px 0; }
    79%  { translate: -10px 0; }
    91%  { translate: 18px 0; }
    100% { translate: 0px 0; }
  }
  @keyframes astraDriftY {
    0%   { transform: translateY(0px); }
    17%  { transform: translateY(-22px); }
    34%  { transform: translateY(10px); }
    51%  { transform: translateY(-16px); }
    66%  { transform: translateY(20px); }
    81%  { transform: translateY(-8px); }
    93%  { transform: translateY(14px); }
    100% { transform: translateY(0px); }
  }
  @keyframes astraBreath {
    0%   { scale: 1; }
    22%  { scale: 1.035; }
    45%  { scale: 0.966; }
    68%  { scale: 1.028; }
    85%  { scale: 0.975; }
    100% { scale: 1; }
  }
  @keyframes astraSpin {
    0%   { rotate: 0deg; }
    13%  { rotate: -6deg; }
    28%  { rotate: 4.5deg; }
    44%  { rotate: -9deg; }
    59%  { rotate: 7deg; }
    73%  { rotate: -2.5deg; }
    87%  { rotate: 5.5deg; }
    100% { rotate: 0deg; }
  }

  /* One element, four independent animations (each on a different property) */
  .astra-active .astra-card {
    animation:
      astraDriftX ${s(23)} ease-in-out -5s infinite,
      astraDriftY ${s(31)} ease-in-out -11s infinite,
      astraBreath ${s(19)} ease-in-out -3s infinite,
      astraSpin   ${s(37)} ease-in-out -9s infinite;
  }

  .astra-paused .astra-card${!isPreview ? `,
  .astra-active:hover .astra-card` : ''} {
    animation-play-state: paused;
  }

  @media (prefers-reduced-motion: reduce) {
    .astra-card { animation: none !important; }
  }
`}</style>

      {/* Main Container */}
      <div
        className={`relative ${className} ${!disabled ? 'astra-active' : ''} ${isZoomed ? 'astra-paused' : ''
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
                onClick: handleOpenZoom,
                onKeyDown: (e: React.KeyboardEvent<HTMLDivElement>) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    handleOpenZoom();
                  }
                },
                role: 'button' as React.AriaRole,
                tabIndex: 0,
                'aria-label': 'Click to zoom in ID card',
                cursorClass: `${!isPreview ? 'cursor-zoom-in' : 'cursor-default'}`,
              },
            )
            : renderedChildren}

        </div>
        {!isPreview &&
          <div className="pointer-events-none absolute -bottom-16 -right-16 z-20 flex items-center gap-1.5 rounded-full border border-white/20 bg-black/60 px-3 py-1 text-[11px] font-astra font-medium text-white/90  transition-opacity duration-300 shadow-lg">
            <ZoomIn className="h-3.5 w-3.5 text-astra-primary-light" />
            <span>Click the card to enlarge</span>
          </div>
        }

        {/* Shadow */}
        <div
          aria-hidden="true"
          className="astra-shadow-drifter pointer-events-none absolute -bottom-8 left-1/2 h-10 w-3/4 -translate-x-1/2 rounded-[50%] blur-3xl"
          style={{ backgroundColor: glowColor }}
        />
      </div>

      {/* Zoom Lightbox Modal Overlay */}
      {isZoomed && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 sm:p-8 animate-in fade-in duration-200"
          onClick={handleCloseZoom}
          role="dialog"
          aria-modal="true"
          aria-label="Enlarged Digital ID"
        >
          {/* Top Bar with Dismiss and Instructions */}
          <div className="absolute top-5 left-0 right-0 mx-auto flex max-w-4xl items-center justify-between px-6 z-10">
            <span className="font-astra text-xs tracking-widest text-slate-400 uppercase">
              ASTRA / IDENTIFICATION OVERLAY · PRESS ESC TO CLOSE
            </span>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleCloseZoom();
              }}
              className="flex h-10 w-10 items-center justify-center rounded-full border border-white/20 bg-white/10 text-white transition-all hover:bg-white/20 hover:scale-105 focus:outline-none"
              aria-label="Close enlarged ID"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Centered Enlarged Card Showcase */}
          <div
            className="relative w-full max-w-2xl backdrop-blur-md transform transition-all animate-in zoom-in-95 duration-200 cursor-zoom-out"
            onClick={(e) => {
              // Click on card also closes or stops bubbling
              e.stopPropagation();
              handleCloseZoom();
            }}
          >
            <div className="relative rounded-3xl shadow-[0_0_90px_rgba(0,177,237,0.35)]">
              {renderedZoomed}
            </div>

            <p className="mt-4 text-center font-astra text-xs text-slate-400">
              Click anywhere on the card or background to dismiss
            </p>
          </div>
        </div>
      )}
    </>
  );
};
