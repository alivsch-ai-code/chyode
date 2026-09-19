'use client';

import { useId } from 'react';
import type { Season } from '@/data/mountain-ideas';

/** Vektor-Illustration einer Berglandschaft – ohne externe Bilder, schnell und datenschutzfreundlich. */
export function MountainArt({ hue, season = 'summer', className = '' }: { hue: number; season?: Season; className?: string }) {
  const gradientId = `sky-${useId().replace(/:/g, '')}`;
  const flip = Math.floor(hue / 10) % 2 === 1;

  const cool = season === 'winter';
  const skyTop = cool ? `hsl(${hue}, 35%, 82%)` : `hsl(${hue}, 65%, 84%)`;
  const skyBottom = cool ? `hsl(${hue}, 30%, 95%)` : `hsl(${hue + 20}, 75%, 95%)`;
  const back = `hsl(${hue}, 32%, ${cool ? 78 : 70}%)`;
  const mid = `hsl(${hue}, 38%, ${cool ? 62 : 55}%)`;
  const front = `hsl(${hue}, 42%, ${cool ? 40 : 34}%)`;

  const sunColor = season === 'autumn' ? 'hsl(28, 95%, 66%)' : season === 'winter' ? 'hsl(45, 30%, 96%)' : 'hsl(42, 100%, 72%)';

  return (
    <svg
      viewBox="0 0 400 220"
      preserveAspectRatio="xMidYMid slice"
      role="img"
      aria-label="Illustration einer Berglandschaft"
      className={className}
    >
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={skyTop} />
          <stop offset="1" stopColor={skyBottom} />
        </linearGradient>
      </defs>
      <rect width="400" height="220" fill={`url(#${gradientId})`} />
      <circle cx="318" cy="58" r="21" fill={sunColor} opacity="0.92" />
      <g transform={flip ? 'translate(400 0) scale(-1 1)' : undefined}>
        <path d="M0 170 60 100 100 130 160 60 220 135 270 90 330 140 400 100V220H0Z" fill={back} />
        <path d="M160 60 146 82l8-4 6 8 7-8 8 5Z" fill="#fff" opacity="0.92" />
        <path d="M270 90 259 106l6-3 5 6 6-6 6 4Z" fill="#fff" opacity="0.85" />
        <path d="M0 190 80 125 130 160 200 105 260 165 330 120 400 175V220H0Z" fill={mid} />
        <path d="M200 105 190 120l6-3 4 6 5-6 6 4Z" fill="#fff" opacity="0.8" />
        <path d="M0 205 90 165 170 195 250 160 330 195 400 175V220H0Z" fill={front} />
      </g>
    </svg>
  );
}
