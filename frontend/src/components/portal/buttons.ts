const buttonBase =
  'inline-flex min-h-11 items-center justify-center gap-2 rounded-full px-6 py-2.5 text-sm font-bold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-astra-white disabled:cursor-not-allowed';

export const primaryButton = `${buttonBase} bg-astra-primary-light text-astra-white hover:bg-[#19c0f7] disabled:bg-astra-disabled disabled:text-astra-gray`;

export const secondaryButton = `${buttonBase} border border-astra-primary-light text-astra-primary-light hover:bg-astra-primary-light/10 disabled:opacity-50`;
