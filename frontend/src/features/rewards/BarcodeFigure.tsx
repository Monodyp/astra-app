import React, { useEffect, useRef, useState } from 'react';
import JsBarcode from 'jsbarcode';

export const BarcodeFigure: React.FC<{ value: string; focus?: boolean }> = ({
  value,
  focus,
}) => {
  const svg = useRef<SVGSVGElement>(null);
  const figure = useRef<HTMLElement>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!svg.current) return;
    try {
      JsBarcode(svg.current, value, {
        format: 'CODE128',
        displayValue: false,
        height: 64,
        width: 2,
        margin: 16,
        background: '#ffffff',
        lineColor: '#000000',
      });
      setFailed(false);
      if (focus) {
        figure.current?.focus();
        figure.current?.scrollIntoView({ block: 'center' });
      }
    } catch {
      setFailed(true);
    }
  }, [value, focus]);

  return (
    <figure
      id="barcode"
      ref={figure}
      tabIndex={-1}
      className="mx-auto w-full max-w-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-astra-primary-light"
    >
      <svg
        ref={svg}
        role="img"
        aria-label="Voucher barcode"
        style={failed ? { display: 'none' } : undefined}
        className="h-auto w-full bg-white"
      />
      {failed ? (
        <p role="status" className="text-sm text-astra-gray">
          Barcode unavailable. Show the voucher code to staff.
        </p>
      ) : (
        <figcaption className="mt-2 text-center text-xs text-astra-gray">
          Demo CODE128 barcode. Works only with a compatible demo scanner.
        </figcaption>
      )}
    </figure>
  );
};
