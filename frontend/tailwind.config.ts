import type { Config } from 'tailwindcss';

// Farben kommen als RGB-Kanäle aus CSS-Variablen (globals.css), damit Hell/Dunkel und Alpha-Werte
// (z. B. bg-accent/10) mit einer einzigen Definition funktionieren.
const token = (name: string) => `rgb(var(--${name}) / <alpha-value>)`;

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  darkMode: 'media',
  theme: {
    extend: {
      colors: {
        canvas: token('canvas'),
        grouped: token('grouped'),
        surface: token('surface'),
        elevated: token('elevated'),
        label: token('label'),
        secondary: token('secondary'),
        tertiary: token('tertiary'),
        line: token('line'),
        fill: token('fill'),
        accent: token('accent'),
        'accent-strong': token('accent-strong'),
        danger: token('danger'),
        success: token('success'),
        warning: token('warning'),
      },
      fontFamily: {
        sans: [
          '-apple-system',
          'BlinkMacSystemFont',
          '"SF Pro Text"',
          '"SF Pro Display"',
          '"Segoe UI Variable"',
          '"Segoe UI"',
          'Roboto',
          '"Helvetica Neue"',
          'Arial',
          'sans-serif',
        ],
      },
      fontSize: {
        display: ['clamp(2.5rem, 6vw, 4.25rem)', { lineHeight: '1.05', letterSpacing: '-0.035em', fontWeight: '600' }],
        title1: ['2rem', { lineHeight: '1.125', letterSpacing: '-0.025em', fontWeight: '600' }],
        title2: ['1.5rem', { lineHeight: '1.2', letterSpacing: '-0.02em', fontWeight: '600' }],
        title3: ['1.25rem', { lineHeight: '1.25', letterSpacing: '-0.015em', fontWeight: '600' }],
        headline: ['1.0625rem', { lineHeight: '1.3', letterSpacing: '-0.01em', fontWeight: '600' }],
        body: ['1.0625rem', { lineHeight: '1.47', letterSpacing: '-0.011em' }],
        callout: ['1rem', { lineHeight: '1.4', letterSpacing: '-0.008em' }],
        subhead: ['0.9375rem', { lineHeight: '1.4', letterSpacing: '-0.006em' }],
        footnote: ['0.8125rem', { lineHeight: '1.35', letterSpacing: '-0.003em' }],
        caption: ['0.75rem', { lineHeight: '1.3' }],
      },
      borderRadius: {
        control: '0.75rem',
        card: '1.25rem',
        sheet: '1.75rem',
      },
      boxShadow: {
        card: '0 1px 2px rgb(0 0 0 / 0.04), 0 8px 28px rgb(0 0 0 / 0.06)',
        lift: '0 2px 6px rgb(0 0 0 / 0.06), 0 16px 40px rgb(0 0 0 / 0.10)',
        sheet: '0 24px 80px rgb(0 0 0 / 0.28)',
      },
      maxWidth: {
        content: '68rem',
        narrow: '30rem',
      },
      keyframes: {
        'fade-up': {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'fade-in': { '0%': { opacity: '0' }, '100%': { opacity: '1' } },
        'scale-in': {
          '0%': { opacity: '0', transform: 'scale(0.96)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
      },
      animation: {
        'fade-up': 'fade-up 0.4s cubic-bezier(0.22, 1, 0.36, 1) both',
        'fade-in': 'fade-in 0.25s ease-out both',
        'scale-in': 'scale-in 0.2s cubic-bezier(0.22, 1, 0.36, 1) both',
      },
    },
  },
  plugins: [],
};

export default config;
