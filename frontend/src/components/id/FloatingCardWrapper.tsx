import React, { useState, useEffect, useCallback } from 'react';
import { X, ZoomIn } from 'lucide-react';

type FloatingCardWrapperProps = {
  children: React.ReactNode | ((props: { isZoomed: boolean }) => React.ReactNode);
  zoomedContent?: React.ReactNode;
  className?: string;
  glowColor?: string;
  disabled?: boolean;
};

export const FloatingCardWrapper: React.FC<FloatingCardWrapperProps> = ({
  children,
  zoomedContent,
  className = '',
  glowColor = 'rgba(0, 177, 237, 0.22)',
  disabled = false,
}) => {
  const [isZoomed, setIsZoomed] = useState(false);

  const renderedChildren = typeof children === 'function' ? children({ isZoomed: false }) : children;
  const renderedZoomed = zoomedContent ?? (typeof children === 'function' ? children({ isZoomed: true }) : children);

  const handleOpenZoom = useCallback(() => {
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
      {/* Dynamic Keyframes for multi-axis space drift */}
      <style>{`
        @keyframes astraSpaceDrift {
          0% {
            transform: translate3d(0px, 0px, 0px) rotateX(0deg) rotateY(0deg) rotateZ(0deg);
          }
          20% {
            transform: translate3d(12px, -8px, 14px) rotateX(2.2deg) rotateY(-3.2deg) rotateZ(1.2deg);
          }
          40% {
            transform: translate3d(-8px, -15px, 6px) rotateX(-1.8deg) rotateY(3.8deg) rotateZ(-1.6deg);
          }
          60% {
            transform: translate3d(-14px, -4px, -10px) rotateX(-2.8deg) rotateY(1.4deg) rotateZ(1.1deg);
          }
          80% {
            transform: translate3d(8px, 9px, 8px) rotateX(1.9deg) rotateY(-2.4deg) rotateZ(-0.9deg);
          }
          100% {
            transform: translate3d(0px, 0px, 0px) rotateX(0deg) rotateY(0deg) rotateZ(0deg);
          }
        }

        @keyframes astraShadowDrift {
          0%, 100% {
            transform: translateX(-50%) scale(1) translate3d(0px, 0px, 0);
            opacity: 0.6;
          }
          30% {
            transform: translateX(-46%) scale(1.08) translate3d(8px, 0, 0);
            opacity: 0.45;
          }
          70% {
            transform: translateX(-54%) scale(0.94) translate3d(-8px, 0, 0);
            opacity: 0.75;
          }
        }

        .astra-space-drifter {
          animation: astraSpaceDrift 14s ease-in-out infinite;
          will-change: transform;
          transform-style: preserve-3d;
        }

        .astra-shadow-drifter {
          animation: astraShadowDrift 14s ease-in-out infinite;
          will-change: transform, opacity;
        }

        .astra-space-drifter.is-paused {
          animation-play-state: paused !important;
        }
      `}</style>

      {/* Main Container */}
      <div
        className={`relative ${className} ${!disabled ? 'astra-active' : ''} ${isZoomed ? 'astra-paused' : ''
          }`}
        style={{ perspective: '1000px' }}
      >
        <div className="astra-layer astra-x relative">
          <div className="astra-layer astra-y relative">
            <div className="astra-layer astra-tilt relative">
              {/* Card trigger (unchanged from your original) */}
              <div
                onClick={handleOpenZoom}
                className="group relative cursor-zoom-in transition-transform duration-200"
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    handleOpenZoom();
                  }
                }}
                aria-label="Click to zoom in ID card"
              >
                {renderedChildren}

                <div className="pointer-events-none absolute bottom-4 right-4 z-20 flex items-center gap-1.5 rounded-full border border-white/20 bg-black/60 px-3 py-1 text-[11px] font-astra font-medium text-white/90 backdrop-blur-md opacity-0 transition-opacity duration-300 group-hover:opacity-100 shadow-lg">
                  <ZoomIn className="h-3.5 w-3.5 text-astra-primary-light" />
                  <span>Click to enlarge</span>
                </div>
              </div>
            </div>
          </div>
        </div>

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
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 sm:p-8 animate-in fade-in duration-200"
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
            className="relative w-full max-w-2xl transform transition-all animate-in zoom-in-95 duration-200 cursor-zoom-out"
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
