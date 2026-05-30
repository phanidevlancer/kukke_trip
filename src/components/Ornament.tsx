import type { SVGProps } from 'react';

// Stylised kalasha + lotus pair — used as section-divider and section-header glyph.
// Drawn at 64×16 viewBox; scales fluidly. Single colour via currentColor.
export function Ornament(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 64 16" fill="none" stroke="currentColor" strokeWidth={1} {...props}>
      <line x1="0" y1="8" x2="22" y2="8" />
      <line x1="42" y1="8" x2="64" y2="8" />
      {/* lotus left */}
      <path d="M26 8 Q28 4 30 8 Q28 12 26 8 Z" fill="currentColor" stroke="none" opacity=".55" />
      {/* dot center */}
      <circle cx="32" cy="8" r="1.4" fill="currentColor" stroke="none" />
      {/* lotus right */}
      <path d="M34 8 Q36 4 38 8 Q36 12 34 8 Z" fill="currentColor" stroke="none" opacity=".55" />
    </svg>
  );
}

const ROMAN: Array<[number, string]> = [
  [10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I'],
];

export function roman(n: number): string {
  let out = '';
  let v = n;
  for (const [num, sym] of ROMAN) {
    while (v >= num) {
      out += sym;
      v -= num;
    }
  }
  return out;
}
