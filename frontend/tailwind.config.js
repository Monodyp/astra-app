import plugin from 'tailwindcss/plugin.js';

/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ['class'],
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // Figma tokens, namespaced so existing white/black/muted/primary/secondary keep working
        astra: {
          black: '#0a0c0d',
          white: '#fdfcfa',
          primary: {
            dark: '#224573',
            light: '#00b1ed',
          },
          secondary: '#112154',
          thirdary: '#0c1029',
          gray: '#8a8a8a',
          disabled: '#18232c',
        },
        ascend: {
          page: 'var(--as-bg)',
          ink: 'var(--as-text)',
          muted: 'var(--as-muted)',
          tint: 'var(--as-tint)',
          input: 'var(--as-input)',
          panel: 'var(--as-panel)',
          form: 'var(--as-form-bg)',
          line: 'var(--as-border)',
          field: 'var(--as-input-border)',
          selected: 'var(--as-selected)',
          blue: 'var(--as-blue)',
          accent: 'var(--as-accent)',
          error: 'var(--as-error)',
        },
        brand: {
          primary: '#6366f1',
          primaryHover: '#4f46e5',
          background: '#0f172a',
          surface: '#1e293b',
          border: '#334155',
        },
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        destructive: 'hsl(var(--destructive))',
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        chart: {
          1: 'hsl(var(--chart-1))',
          2: 'hsl(var(--chart-2))',
          3: 'hsl(var(--chart-3))',
          4: 'hsl(var(--chart-4))',
          5: 'hsl(var(--chart-5))',
        },
        sidebar: {
          DEFAULT: 'hsl(var(--sidebar))',
          foreground: 'hsl(var(--sidebar-foreground))',
          primary: 'hsl(var(--sidebar-primary))',
          'primary-foreground': 'hsl(var(--sidebar-primary-foreground))',
          accent: 'hsl(var(--sidebar-accent))',
          'accent-foreground': 'hsl(var(--sidebar-accent-foreground))',
          border: 'hsl(var(--sidebar-border))',
          ring: 'hsl(var(--sidebar-ring))',
        },
      },
      fontFamily: {
        astrascend: ['ASTRAscend Urbanist', 'sans-serif'],
        // Figma font; use font-astra (or move this into `sans` to make it the app default)
        astra: ['"Space Grotesk"', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      // Figma text styles: size + line-height + letter-spacing. Weight via font-normal/medium/bold.
      fontSize: {
        h1: ['2.5rem', { lineHeight: '3rem', letterSpacing: '-0.02em' }],
        h2: ['2.25rem', { lineHeight: '2.75rem', letterSpacing: '-0.02em' }],
        h3: ['2rem', { lineHeight: '2.5rem', letterSpacing: '-0.02em' }],
        h4: ['1.75rem', { lineHeight: '2.25rem', letterSpacing: '-0.02em' }],
        h5: ['1.5rem', { lineHeight: '2rem', letterSpacing: '-0.02em' }],
        h6: ['1.25rem', { lineHeight: '1.75rem', letterSpacing: '-0.02em' }],
        paragraph: ['1rem', { lineHeight: '1.5rem' }],
        'label-lg': ['1rem', { lineHeight: '1.125rem' }],
        'label-md': ['0.875rem', { lineHeight: '1rem' }],
        'label-sm': ['0.75rem', { lineHeight: '0.875rem' }],
        'label-xs': ['0.625rem', { lineHeight: '0.875rem' }],
      },
      screens: {
        'as-wide': '1200px',
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
    },
  },
  plugins: [
    plugin(({ addVariant }) => {
      addVariant('as-dark', '.astrascend[data-theme="dark"] &');
      addVariant('as-tiny', '@media (max-width: 359px)');
      addVariant(
        'as-label',
        '@media (min-width: 480px) and (max-width: 1023px)'
      );
      // Keep compact overrides above standard responsive utilities without changing global screens.
      addVariant(
        'as-compact',
        '@media (min-width: 1024px) and (max-width: 1599px), (min-width: 1024px) and (max-height: 800px) { && }'
      );
    }),
    require('tailwindcss-animate'),
  ],
};
